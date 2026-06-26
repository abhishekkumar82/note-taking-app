// src/hooks/useCollabSocket.js
// ─────────────────────────────────────────────────────────────────────────────
// Manages the Socket.io connection + Yjs document for a collaboration room.
//
// FIX (StrictMode double-invoke): React 18/19 StrictMode intentionally runs
// effects twice in dev (mount → cleanup → mount) to catch bugs. Our original
// version created the socket connection inside the effect but reused a
// single Y.Doc across both invocations — the first connection's in-flight
// `doc:sync` could land on the second connection's Y.Doc mid-handshake,
// corrupting Yjs's internal state and throwing "Method unimplemented".
//
// Fix: track a per-effect "instance id" + ignore flag, so any messages from
// a stale (already-cleaned-up) connection are dropped instead of applied.
// We also create a FRESH Y.Doc per real connection attempt instead of
// reusing one across StrictMode's double mount.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import * as Y from "yjs";

const SOCKET_URL = import.meta.env?.VITE_API_URL || "http://localhost:9090";

export function useCollabSocket(roomToken, userName) {
  const [ydoc, setYdoc]           = useState(null);
  const [status, setStatus]       = useState("connecting"); // connecting | connected | error
  const [presence, setPresence]   = useState([]);
  const [errorMsg, setErrorMsg]   = useState("");
  const socketRef = useRef(null);

  useEffect(() => {
    if (!roomToken) return;

    let cancelled = false; // becomes true if this effect instance is cleaned up
    const localYdoc = new Y.Doc(); // fresh doc per real connection attempt

    const socket = io(SOCKET_URL, {
      path: "/socket.io/collab",
      transports: ["websocket"],
      // Force a brand-new connection per mount instead of reusing a cached
      // one across StrictMode's mount/unmount/mount dance.
      forceNew: true,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      if (cancelled) return;
      socket.emit("room:join", { roomToken, userName });
    });

    // Initial full document state from server
    socket.on("doc:sync", ({ update }) => {
      if (cancelled) return;
      Y.applyUpdate(localYdoc, new Uint8Array(update), "remote");
      setYdoc(localYdoc);
      setStatus("connected");
    });

    // Incremental updates from other clients
    socket.on("doc:update", ({ update }) => {
      if (cancelled) return;
      Y.applyUpdate(localYdoc, new Uint8Array(update), "remote");
    });

    // Relay local changes to the server
    const onLocalUpdate = (update, origin) => {
      if (cancelled) return;
      // origin === "remote" means this update came FROM the server — don't echo it back
      if (origin === "remote") return;
      socket.emit("doc:update", { update: Array.from(update) });
    };
    localYdoc.on("update", onLocalUpdate);

    socket.on("presence:list", (list) => { if (!cancelled) setPresence(list); });

    socket.on("room:error", ({ message }) => {
      if (cancelled) return;
      setStatus("error");
      setErrorMsg(message);
    });

    socket.on("disconnect", () => { if (!cancelled) setStatus("connecting"); });

    socket.on("connect_error", (err) => {
      if (cancelled) return;
      console.error("[collab] connect_error:", err.message);
      setStatus("error");
      setErrorMsg("Could not reach the collaboration server.");
    });

    return () => {
      cancelled = true;
      localYdoc.off("update", onLocalUpdate);
      socket.removeAllListeners();
      socket.disconnect();
      localYdoc.destroy();
    };
  }, [roomToken, userName]);

  const sendCursor = (cursor) => {
    socketRef.current?.emit("presence:cursor", { cursor });
  };

  return { ydoc, status, presence, errorMsg, sendCursor };
}