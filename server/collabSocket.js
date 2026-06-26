// server/collabSocket.js
// ─────────────────────────────────────────────────────────────────────────────
// FIX: Replaced Yjs binary sync with plain HTML broadcast.
// Root cause of the crash: @tiptap/extension-collaboration's internal
// call to el.toArray() fails when the Yjs peer dep version doesn't match
// the version bundled with the extension — no clean way to pin this across
// npm installs. Plain HTML broadcast is simpler, zero extra deps, and works
// perfectly for notes collaboration where sub-millisecond CRDT merge is
// not required.
//
// Protocol:
//   Client → Server:  "room:join"  { roomToken, userName, color }
//   Client → Server:  "doc:html"   { html }        (user typed something)
//   Server → Client:  "doc:sync"   { html }        (on join — full current doc)
//   Server → Client:  "doc:html"   { html, from }  (broadcast to other peers)
//   Server → Client:  "presence:list" [ { name, color, id } ]
//   Server → Client:  "room:error" { message }
// ─────────────────────────────────────────────────────────────────────────────

const { Server } = require("socket.io");
const SharedSession = require("./models/SharedSession");
const Note          = require("./models/Notes");

// In-memory store: roomToken → { html, sockets: Map<id, { name, color }> }
const rooms = new Map();

const getRoom = (token) => {
  if (!rooms.has(token)) rooms.set(token, { html: null, sockets: new Map() });
  return rooms.get(token);
};

module.exports = function initCollabSocket(server) {
  const io = new Server(server, {
    path: "/socket.io/collab",
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    let currentRoom = null;

    // ── JOIN ROOM ────────────────────────────────────────────────────────────
    socket.on("room:join", async ({ roomToken, userName, color }) => {
      try {
        // Validate session
        const session = await SharedSession.findOne({
          roomToken,
          isActive: true,
        }).populate("note", "title body color");

        if (!session) {
          socket.emit("room:error", { message: "Invalid or expired collaboration link." });
          return;
        }

        if (session.expiresAt && new Date() > session.expiresAt) {
          socket.emit("room:error", { message: "This share link has expired." });
          return;
        }

        // Join the Socket.io room
        socket.join(roomToken);
        currentRoom = roomToken;

        const room = getRoom(roomToken);

        // Register this socket in presence map
        room.sockets.set(socket.id, {
          name:  userName || "Anonymous",
          color: color    || "#6366f1",
          id:    socket.id,
        });

        // Send the current HTML state to the joining client
        // Priority: in-memory (most recent edits) → DB body (saved state)
        const currentHtml = room.html || session.note?.body || "";
        socket.emit("doc:sync", { html: currentHtml });

        // Broadcast updated presence list to everyone in the room
        broadcastPresence(io, roomToken, room);

        console.log(`[collab] ${userName} joined room ${roomToken} (${room.sockets.size} online)`);
      } catch (err) {
        console.error("[collab] room:join error:", err.message);
        socket.emit("room:error", { message: "Failed to join collaboration room." });
      }
    });

    // ── RECEIVE HTML UPDATE FROM A CLIENT ────────────────────────────────────
    socket.on("doc:html", ({ html }) => {
      if (!currentRoom) return;

      const room = getRoom(currentRoom);

      // Store latest HTML in memory
      room.html = html;

      // Broadcast to everyone EXCEPT the sender
      // Pass socket.id as "from" so the receiver can ignore its own echo
      socket.to(currentRoom).emit("doc:html", { html, from: socket.id });

      // Persist to DB with debounce (every ~2 seconds of no changes)
      scheduleDbSave(currentRoom, html);
    });

    // ── DISCONNECT ────────────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      if (!currentRoom) return;

      const room = rooms.get(currentRoom);
      if (room) {
        room.sockets.delete(socket.id);
        broadcastPresence(io, currentRoom, room);

        // If room is empty, do a final DB save and clean up memory
        if (room.sockets.size === 0) {
          if (room.html) {
            saveToDb(currentRoom, room.html);
          }
          rooms.delete(currentRoom);
        }
      }

      console.log(`[collab] socket ${socket.id} left room ${currentRoom}`);
    });
  });

  return io;
};

// ── Presence broadcast ────────────────────────────────────────────────────────
function broadcastPresence(io, roomToken, room) {
  const list = Array.from(room.sockets.values()).map(({ name, color }) => ({ name, color }));
  io.to(roomToken).emit("presence:list", list);
}

// ── Debounced DB save — prevents hammering Mongo on every keystroke ───────────
const saveTimers = new Map();

function scheduleDbSave(roomToken, html) {
  if (saveTimers.has(roomToken)) clearTimeout(saveTimers.get(roomToken));

  saveTimers.set(roomToken, setTimeout(async () => {
    await saveToDb(roomToken, html);
    saveTimers.delete(roomToken);
  }, 2000)); // save 2s after last change
}

async function saveToDb(roomToken, html) {
  try {
    const session = await SharedSession.findOne({ roomToken, isActive: true });
    if (!session) return;

    await Note.findByIdAndUpdate(session.note, {
      body:      html,
      updatedAt: new Date(),
    });

    console.log(`[collab] Auto-saved room ${roomToken} to DB`);
  } catch (err) {
    console.error("[collab] DB save error:", err.message);
  }
}
