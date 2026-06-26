// src/Pages_Temp/CollabNotePage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// FIX 1: Content not showing  — doc:sync arrived before editorRef was set.
//         Solution: store pending sync HTML in a ref, apply it inside the
//         editor's onCreate callback (guaranteed to fire after mount).
// FIX 2: Changes not saving back to original note — collabSocket.js already
//         debounce-saves to DB, but the socket was connecting before the editor
//         existed so early "doc:sync" events were silently dropped.
//         Solution: single useEffect that wires socket + editor together,
//         using a pendingSyncRef to replay any sync that arrived early.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { io } from "socket.io-client";
import { Users, Wifi, WifiOff, Loader2, Bold, Italic, List, Code } from "lucide-react";
import api from "../utils/axiosInstance";
import "../index.css";

const SOCKET_URL = import.meta.env?.VITE_API_URL || "http://localhost:9090";

const COLORS = ["#6366f1","#ec4899","#f59e0b","#10b981","#3b82f6","#8b5cf6","#ef4444","#06b6d4"];
const randomName  = () => { const a=["Swift","Bright","Calm","Bold","Quiet","Sharp"]; const n=["Fox","Owl","Wren","Lynx","Hare","Bear"]; return `${a[Math.floor(Math.random()*a.length)]} ${n[Math.floor(Math.random()*n.length)]}`; };
const randomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];

// ── CollabNotePage ────────────────────────────────────────────────────────────
const CollabNotePage = () => {
  const { roomToken } = useParams();
  const [userName]    = useState(() => localStorage.getItem("wu_collab_name")  || randomName());
  const [userColor]   = useState(() => localStorage.getItem("wu_collab_color") || randomColor());

  const [meta, setMeta]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [status, setStatus]     = useState("connecting");
  const [errorMsg, setErrorMsg] = useState("");
  const [presence, setPresence] = useState([]);

  // Refs that don't need re-renders
  const socketRef      = useRef(null);
  const isSelf         = useRef(false);   // suppress echo when we apply remote HTML
  const pendingSync    = useRef(null);    // stores HTML if doc:sync fires before editor ready
  const initialBody    = useRef("");      // note body from REST — used as editor seed

  useEffect(() => {
    localStorage.setItem("wu_collab_name",  userName);
    localStorage.setItem("wu_collab_color", userColor);
  }, [userName, userColor]);

  // ── Step 1: fetch room metadata from REST ─────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/api/collab/${roomToken}`);
        setMeta(res.data);
        initialBody.current = res.data.body || "";   // seed for editor
      } catch (err) {
        setError(err.response?.data?.message || "This collaboration link is invalid or expired.");
      } finally {
        setLoading(false);
      }
    })();
  }, [roomToken]);

  // ── Step 2: build editor with initial content from REST ──────────────────
  // onCreate fires once the editor DOM is ready — safe to setContent here.
  const editor = useEditor({
    extensions: [StarterKit],
    content: "",          // start empty; we fill it in onCreate
    editable: meta ? meta.permission !== "view" : true,
    onCreate: ({ editor }) => {
      // Apply REST body as baseline
      if (initialBody.current) {
        editor.commands.setContent(initialBody.current, false);
      }
      // If doc:sync from socket arrived early, apply it now (it's more recent)
      if (pendingSync.current) {
        editor.commands.setContent(pendingSync.current, false);
        pendingSync.current = null;
      }
    },
    onUpdate: ({ editor }) => {
      if (isSelf.current) return;                          // don't echo received changes
      socketRef.current?.emit("doc:html", { html: editor.getHTML() });
    },
  });

  // When meta loads, update editable flag on the already-created editor
  useEffect(() => {
    if (!editor || !meta) return;
    editor.setEditable(meta.permission !== "view");
  }, [editor, meta]);

  // ── Step 3: Socket.io connection ──────────────────────────────────────────
  useEffect(() => {
    if (!roomToken) return;

    const socket = io(SOCKET_URL, {
      path: "/socket.io/collab",
      transports: ["websocket"],
      forceNew: true,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("room:join", { roomToken, userName, color: userColor });
      setStatus("connected");
    });

    // Server sends the authoritative HTML when we join.
    // If the editor isn't ready yet, park it in pendingSync — onCreate will pick it up.
    socket.on("doc:sync", ({ html }) => {
      if (!html) return;
      if (editor && !editor.isDestroyed) {
        isSelf.current = true;
        editor.commands.setContent(html, false);
        isSelf.current = false;
      } else {
        pendingSync.current = html;   // editor not ready yet — store for onCreate
      }
    });

    // Another peer typed something — apply without triggering our own onUpdate
    socket.on("doc:html", ({ html, from }) => {
      if (!editor || editor.isDestroyed) return;
      if (from === socket.id) return;           // ignore our own broadcast echo
      isSelf.current = true;
      const sel = editor.state.selection;
      editor.commands.setContent(html, false);
      try { editor.commands.setTextSelection({ from: sel.from, to: sel.to }); } catch {}
      isSelf.current = false;
    });

    socket.on("presence:list", (list) => setPresence(list));
    socket.on("room:error",   ({ message }) => { setStatus("error"); setErrorMsg(message); });
    socket.on("disconnect",   () => setStatus("connecting"));
    socket.on("connect_error",() => { setStatus("error"); setErrorMsg("Could not reach the collaboration server."); });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomToken, userName, userColor]);
  // NOTE: `editor` intentionally omitted — we access it via closure after mount

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={S.center}>
      <Loader2 size={28} style={{ animation: "spin 1s linear infinite" }} />
      <p style={{ color: "#64748b", marginTop: 8 }}>Loading collaboration room…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error) return (
    <div style={S.center}>
      <div style={S.errorCard}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔗</div>
        <h2 style={{ color: "#ef4444", fontWeight: 700, marginBottom: 8 }}>Link unavailable</h2>
        <p style={{ color: "#64748b", fontSize: 14 }}>{error}</p>
      </div>
    </div>
  );

  const isEditable = meta?.permission !== "view";

  return (
    <div style={S.wrap}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <h2 style={S.title}>{meta?.title || "Untitled note"}</h2>
          <div style={S.statusRow}>
            {status === "connected"
              ? <span style={S.live}><Wifi size={13}/> Live</span>
              : status === "error"
                ? <span style={S.errBadge}><WifiOff size={13}/> {errorMsg || "Connection error"}</span>
                : <span style={S.connecting}><WifiOff size={13}/> Connecting…</span>}
            {!isEditable && <span style={S.viewBadge}>Read-only</span>}
          </div>
        </div>

        {/* Presence */}
        <div style={S.presenceRow}>
          <Users size={15} style={{ color: "#64748b" }}/>
          {presence.map((p, i) => (
            <span key={i} title={p.name} style={{ ...S.avatar, background: p.color || "#6366f1" }}>
              {p.name?.[0]?.toUpperCase() || "?"}
            </span>
          ))}
          <span style={S.presenceCount}>{presence.length} online</span>
        </div>
      </div>

      {/* Editor */}
      <div style={{ ...S.editorCard, borderColor: meta?.color !== "#ffffff" ? meta?.color : "#e2e8f0" }}>
        {/* Toolbar */}
        {isEditable && editor && (
          <div style={S.toolbar}>
            {[
              { label: "Bold",       icon: <Bold size={14}/>,   action: () => editor.chain().focus().toggleBold().run(),      active: editor.isActive("bold") },
              { label: "Italic",     icon: <Italic size={14}/>, action: () => editor.chain().focus().toggleItalic().run(),    active: editor.isActive("italic") },
              { label: "List",       icon: <List size={14}/>,   action: () => editor.chain().focus().toggleBulletList().run(),active: editor.isActive("bulletList") },
              { label: "Code block", icon: <Code size={14}/>,   action: () => editor.chain().focus().toggleCodeBlock().run(), active: editor.isActive("codeBlock") },
            ].map(btn => (
              <button key={btn.label} title={btn.label}
                style={{ ...S.tbBtn, ...(btn.active ? S.tbBtnActive : {}) }}
                onClick={btn.action}
              >{btn.icon}</button>
            ))}
          </div>
        )}

        {editor
          ? <EditorContent editor={editor} className="tiptap-editor"/>
          : <p style={{ color: "#94a3b8", fontSize: 13 }}>Loading editor…</p>}
      </div>

      <p style={S.hint}>
        Editing as <strong style={{ color: userColor }}>{userName}</strong>
        {" "}— changes sync instantly and save automatically.
      </p>
    </div>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  wrap:        { maxWidth: 820, margin: "0 auto", padding: "32px 20px 60px", fontFamily: "'Inter','Segoe UI',sans-serif" },
  center:      { display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"70vh", gap:10 },
  errorCard:   { background:"#fff", borderRadius:16, padding:"40px 32px", textAlign:"center", border:"1.5px solid #fecaca", boxShadow:"0 4px 24px rgba(0,0,0,0.08)" },
  header:      { display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20, flexWrap:"wrap", gap:12 },
  title:       { fontSize:22, fontWeight:800, color:"#0f172a", marginBottom:6, letterSpacing:"-0.5px" },
  statusRow:   { display:"flex", gap:8, alignItems:"center" },
  live:        { display:"flex", alignItems:"center", gap:4, fontSize:12, fontWeight:600, color:"#16a34a", background:"#f0fdf4", padding:"3px 10px", borderRadius:20, border:"1px solid #bbf7d0" },
  connecting:  { display:"flex", alignItems:"center", gap:4, fontSize:12, fontWeight:600, color:"#d97706", background:"#fffbeb", padding:"3px 10px", borderRadius:20, border:"1px solid #fde68a" },
  errBadge:    { display:"flex", alignItems:"center", gap:4, fontSize:12, fontWeight:600, color:"#dc2626", background:"#fef2f2", padding:"3px 10px", borderRadius:20, border:"1px solid #fecaca" },
  viewBadge:   { fontSize:11, fontWeight:700, color:"#fff", background:"#64748b", padding:"2px 10px", borderRadius:20 },
  presenceRow: { display:"flex", alignItems:"center", gap:6 },
  avatar:      { width:28, height:28, borderRadius:"50%", color:"#fff", fontSize:12, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", border:"2px solid #fff", marginLeft:-6, boxShadow:"0 1px 4px rgba(0,0,0,0.15)" },
  presenceCount:{ fontSize:12, color:"#64748b", marginLeft:6 },
  editorCard:  { background:"#fff", border:"2px solid #e2e8f0", borderRadius:16, padding:"20px 24px", minHeight:420, boxShadow:"0 2px 16px rgba(0,0,0,0.05)" },
  toolbar:     { display:"flex", gap:4, marginBottom:12, paddingBottom:12, borderBottom:"1px solid #f1f5f9" },
  tbBtn:       { display:"flex", alignItems:"center", justifyContent:"center", width:32, height:32, borderRadius:8, border:"1.5px solid #e2e8f0", background:"#fafafa", cursor:"pointer", color:"#475569" },
  tbBtnActive: { background:"#eef2ff", borderColor:"#6366f1", color:"#6366f1" },
  hint:        { fontSize:12, color:"#94a3b8", textAlign:"center", marginTop:16 },
};

export default CollabNotePage;
