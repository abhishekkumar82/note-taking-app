// src/pages/ResetPasswordPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Handles the GET /reset-password?token=... link clicked from email.
// Shows a form to enter + confirm new password.
// Add <Route path="/reset-password" element={<ResetPasswordPage />} /> to App.jsx
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";

const API = "http://localhost:9090";

const EyeIcon = ({open}) => open ? (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
) : (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const ResetPasswordPage = () => {
  const [searchParams]    = useSearchParams();
  const navigate          = useNavigate();
  const token             = searchParams.get("token");

  const [password, setPw]     = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState("");
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div style={wrap}>
        <div style={card}>
          <div style={{fontSize:40,textAlign:"center",marginBottom:16}}>❌</div>
          <h2 style={title}>Invalid link</h2>
          <p style={sub}>This password reset link is invalid or missing. Please request a new one.</p>
          <button style={btn} onClick={() => navigate("/")}>Go to home</button>
        </div>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (password.length < 6) { setErr("Password must be at least 6 characters"); return; }
    if (password !== confirm) { setErr("Passwords do not match"); return; }
    setLoading(true); setErr("");
    try {
      await axios.post(`${API}/api/auth/reset-password`, { token, password });
      setSuccess(true);
    } catch(e) { setErr(e.response?.data?.message || "Reset failed. The link may have expired."); }
    finally { setLoading(false); }
  };

  if (success) {
    return (
      <div style={wrap}>
        <div style={card}>
          <div style={{fontSize:40,textAlign:"center",marginBottom:16}}>✅</div>
          <h2 style={title}>Password updated</h2>
          <p style={sub}>Your password has been changed successfully. You can now sign in with your new password.</p>
          <button style={btn} onClick={() => navigate("/")}>Sign in now →</button>
        </div>
      </div>
    );
  }

  return (
    <div style={wrap}>
      <div style={card}>
        <div style={{fontSize:36,textAlign:"center",marginBottom:16}}>🔐</div>
        <h2 style={title}>Set new password</h2>
        <p style={sub}>Choose a strong password for your WriteUp account.</p>

        {err && <div style={errBox}>{err}</div>}

        <div style={{marginBottom:12}}>
          <label style={label}>New password</label>
          <div style={{position:"relative"}}>
            <input style={{...inp,paddingRight:42}} type={showPw?"text":"password"}
              placeholder="Min 6 characters" value={password} onChange={e=>setPw(e.target.value)}/>
            <button style={eye} onClick={()=>setShowPw(v=>!v)} type="button"><EyeIcon open={showPw}/></button>
          </div>
        </div>

        <div style={{marginBottom:16}}>
          <label style={label}>Confirm password</label>
          <input style={inp} type="password" placeholder="Repeat password"
            value={confirm} onChange={e=>setConfirm(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&handleSubmit()}/>
        </div>

        <button style={{...btn,opacity:loading?0.6:1}} disabled={loading} onClick={handleSubmit}>
          {loading ? "Updating…" : "Update password →"}
        </button>
      </div>
    </div>
  );
};

// ── styles ────────────────────────────────────────────────────────────────────
const wrap   = {minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f8fafc",padding:16,fontFamily:"'Inter','Segoe UI',sans-serif"};
const card   = {background:"#fff",borderRadius:20,padding:"36px 32px 28px",width:"100%",maxWidth:400,boxShadow:"0 8px 40px rgba(0,0,0,0.1)",border:"1px solid #e2e8f0"};
const title  = {fontSize:22,fontWeight:800,color:"#0f172a",textAlign:"center",letterSpacing:"-0.5px",marginBottom:6};
const sub    = {fontSize:13.5,color:"#64748b",textAlign:"center",marginBottom:22,lineHeight:1.5};
const label  = {fontSize:12.5,fontWeight:600,color:"#374151",marginBottom:5,display:"block"};
const inp    = {width:"100%",border:"1.5px solid #e2e8f0",borderRadius:10,padding:"11px 14px",fontSize:14,fontFamily:"inherit",color:"#0f172a",background:"#fafafa",outline:"none",boxSizing:"border-box",transition:"border .15s"};
const eye    = {position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#94a3b8",display:"flex",alignItems:"center"};
const btn    = {width:"100%",padding:"12px",borderRadius:11,border:"none",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"inherit",marginTop:4};
const errBox = {background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"9px 12px",fontSize:13,color:"#dc2626",marginBottom:12};

export default ResetPasswordPage;
