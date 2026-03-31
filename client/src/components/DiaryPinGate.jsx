// src/components/DiaryPinGate.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Secure diary PIN gate with:
//   • First visit → set new PIN
//   • Returning visit → enter PIN
//   • Forgot PIN → backend OTP flow (email or phone) — NO window.confirm()
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useRef } from "react";
import api from "../utils/axiosInstance";

// ── Simple hash (djb2) — PIN stored in localStorage as hash only ──────────────
const hashPin = (pin) => {
  let h = 5381;
  for (let i = 0; i < pin.length; i++) {
    h = ((h << 5) + h) + pin.charCodeAt(i);
    h = h & h;
  }
  return h.toString(16);
};

// ── Eye icon ──────────────────────────────────────────────────────────────────
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

// ── OTP boxes ─────────────────────────────────────────────────────────────────
const OtpInput = ({value, onChange}) => {
  const refs = useRef([]);
  const digits = Array.from({length:6}, (_,i) => value[i]||"");
  const kd = (i,e) => {
    if(e.key==="Backspace"){e.preventDefault();const n=[...digits];if(n[i]){n[i]="";}else if(i>0){n[i-1]="";refs.current[i-1]?.focus();}onChange(n.join(""));}
    else if(/^\d$/.test(e.key)){e.preventDefault();const n=[...digits];n[i]=e.key;onChange(n.join(""));if(i<5)refs.current[i+1]?.focus();}
  };
  const paste = (e) => { e.preventDefault(); const p=e.clipboardData.getData("text").replace(/\D/g,"").slice(0,6); onChange(p); refs.current[Math.min(p.length,5)]?.focus(); };
  return (
    <div style={{display:"flex",gap:8,justifyContent:"center",margin:"10px 0 16px"}}>
      {digits.map((d,i)=>(
        <input key={i} ref={el=>refs.current[i]=el} type="text" inputMode="numeric"
          maxLength={1} value={d} onChange={()=>{}} onKeyDown={e=>kd(i,e)} onPaste={paste} onFocus={e=>e.target.select()}
          style={{width:42,height:50,textAlign:"center",fontSize:20,fontWeight:700,
            border:`2px solid ${d?"#6366f1":"#e2e8f0"}`,borderRadius:10,
            background:d?"#eef2ff":"#fafafa",outline:"none",transition:"all .15s",
            color:"#1e293b",fontFamily:"inherit"}}/>
      ))}
    </div>
  );
};

// ── Main DiaryPinGate ─────────────────────────────────────────────────────────
const DiaryPinGate = ({userId, onUnlocked}) => {
  const pinKey    = `diary_pin_${userId}`;
  const hasPin    = !!localStorage.getItem(pinKey);

  // screen: "enter" | "set" | "confirm" | "forgotStep1" | "forgotStep2"
  const [screen, setScreen]       = useState(hasPin ? "enter" : "set");
  const [pin, setPin]             = useState("");
  const [confirmPin, setConfirm]  = useState("");
  const [showPin, setShowPin]     = useState(false);
  const [resetOtp, setResetOtp]   = useState("");
  const [err, setErr]             = useState("");
  const [msg, setMsg]             = useState("");
  const [loading, setLoading]     = useState(false);
  const [shake, setShake]         = useState(false);
  const [sentVia, setSentVia]     = useState("");

  const trigShake = () => { setShake(true); setTimeout(() => setShake(false), 400); };
  const clr = () => { setErr(""); setMsg(""); };

  const S = {
    wrap:   {display:"flex",alignItems:"center",justifyContent:"center",minHeight:"60vh",padding:24},
    card:   {background:"#fff",borderRadius:20,padding:"36px 32px 28px",width:"100%",maxWidth:380,boxShadow:"0 8px 40px rgba(0,0,0,0.1)",border:"1px solid #e2e8f0",transition:"transform .08s"},
    icon:   {width:52,height:52,borderRadius:"50%",background:"linear-gradient(135deg,#eef2ff,#e0e7ff)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 18px"},
    title:  {fontSize:20,fontWeight:800,color:"#0f172a",textAlign:"center",marginBottom:6,letterSpacing:"-0.3px"},
    sub:    {fontSize:13.5,color:"#64748b",textAlign:"center",marginBottom:22,lineHeight:1.5},
    label:  {fontSize:12.5,fontWeight:600,color:"#374151",marginBottom:5,display:"block"},
    inpWrap:{position:"relative",marginBottom:12},
    inp:    {width:"100%",border:"1.5px solid #e2e8f0",borderRadius:10,padding:"11px 40px 11px 14px",fontSize:15,fontFamily:"inherit",color:"#0f172a",background:"#fafafa",outline:"none",boxSizing:"border-box",transition:"border .15s",letterSpacing:2},
    eye:    {position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#94a3b8",display:"flex",alignItems:"center"},
    btn:    {width:"100%",padding:"12px",borderRadius:11,border:"none",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"opacity .15s,transform .15s",marginBottom:10},
    link:   {background:"none",border:"none",cursor:"pointer",color:"#6366f1",fontWeight:600,fontSize:13,fontFamily:"inherit",textAlign:"center",display:"block",margin:"0 auto"},
    back:   {background:"none",border:"none",cursor:"pointer",color:"#6366f1",fontWeight:600,fontSize:13,fontFamily:"inherit",display:"flex",alignItems:"center",gap:4,marginBottom:16,padding:0},
    err:    {background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"9px 12px",fontSize:13,color:"#dc2626",marginBottom:12},
    msg:    {background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:8,padding:"9px 12px",fontSize:13,color:"#15803d",marginBottom:12,lineHeight:1.5},
  };

  // ── Set PIN ─────────────────────────────────────────────────────────────────
  const doSet = () => {
    if (pin.length < 4) { setErr("PIN must be at least 4 characters"); return; }
    setScreen("confirm"); clr();
  };

  // ── Confirm PIN ─────────────────────────────────────────────────────────────
  const doConfirm = () => {
    if (pin !== confirmPin) { setErr("PINs do not match"); setConfirm(""); trigShake(); return; }
    localStorage.setItem(pinKey, hashPin(pin));
    onUnlocked();
  };

  // ── Enter PIN ───────────────────────────────────────────────────────────────
  const doEnter = () => {
    const stored = localStorage.getItem(pinKey);
    if (hashPin(pin) === stored) {
      onUnlocked();
    } else {
      setErr("Wrong PIN. Try again.");
      setPin("");
      trigShake();
    }
  };

  // ── Forgot PIN — Step 1: request OTP from backend ────────────────────────────
  const requestPinReset = async () => {
    setLoading(true); clr();
    try {
      const res = await api.post("/api/auth/diary/request-pin-reset");
      setMsg(res.data.message);
      setSentVia(res.data.sentVia || "email");
      setScreen("forgotStep2");
    } catch(e) {
      setErr(e.response?.data?.message || "Failed to send reset code. Try again.");
    } finally { setLoading(false); }
  };

  // ── Forgot PIN — Step 2: verify OTP then allow new PIN ───────────────────────
  const verifyPinReset = async () => {
    if (resetOtp.length < 6) { setErr("Enter the complete 6-digit code"); return; }
    setLoading(true); clr();
    try {
      const res = await api.post("/api/auth/diary/verify-pin-reset", { otp: resetOtp });
      // Backend verified OTP — store the short-lived pinResetToken so we can allow PIN update
      if (res.data.pinResetToken) {
        sessionStorage.setItem("pin_reset_token", res.data.pinResetToken);
      }
      // Clear old PIN from localStorage so user can set a new one
      localStorage.removeItem(pinKey);
      setMsg("Code verified! Please set your new Diary PIN.");
      setPin(""); setConfirm(""); setResetOtp("");
      setScreen("set");
    } catch(e) {
      setErr(e.response?.data?.message || "Wrong code. Try again.");
    } finally { setLoading(false); }
  };

  return (
    <div style={S.wrap}>
      <div style={{...S.card, transform: shake ? "translateX(-4px)" : "none"}}>

        {/* ── ENTER PIN ── */}
        {screen === "enter" && (
          <>
            <div style={S.icon}>
              <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="#6366f1" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
            </div>
            <div style={S.title}>Personal Diary</div>
            <div style={S.sub}>Enter your PIN to unlock.</div>
            {err && <div style={S.err}>{err}</div>}
            {msg && <div style={S.msg}>{msg}</div>}
            <div style={S.inpWrap}>
              <label style={S.label}>PIN</label>
              <input style={S.inp} type={showPin?"text":"password"} placeholder="Enter PIN"
                value={pin} onChange={e=>setPin(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doEnter()} autoFocus/>
              <button style={S.eye} onClick={()=>setShowPin(v=>!v)} type="button"><EyeIcon open={showPin}/></button>
            </div>
            <button style={S.btn} onClick={doEnter}>Unlock 🔓</button>
            <button style={{...S.link,color:"#ef4444"}} onClick={() => { setScreen("forgotStep1"); clr(); }}>Forgot PIN?</button>
          </>
        )}

        {/* ── SET NEW PIN ── */}
        {screen === "set" && (
          <>
            <div style={S.icon}>
              <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="#6366f1" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
            </div>
            <div style={S.title}>Set Diary PIN</div>
            <div style={S.sub}>Create a PIN to protect your personal diary. You'll enter this every time you open it.</div>
            {err && <div style={S.err}>{err}</div>}
            {msg && <div style={S.msg}>{msg}</div>}
            <div style={S.inpWrap}>
              <label style={S.label}>New PIN (min 4 characters)</label>
              <input style={S.inp} type={showPin?"text":"password"} placeholder="Choose a PIN"
                value={pin} onChange={e=>setPin(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doSet()} autoFocus/>
              <button style={S.eye} onClick={()=>setShowPin(v=>!v)} type="button"><EyeIcon open={showPin}/></button>
            </div>
            <button style={S.btn} onClick={doSet}>Set PIN →</button>
          </>
        )}

        {/* ── CONFIRM PIN ── */}
        {screen === "confirm" && (
          <>
            <button style={S.back} onClick={() => { setScreen("set"); setConfirm(""); clr(); }}>← Back</button>
            <div style={S.title}>Confirm PIN</div>
            <div style={S.sub}>Enter your new PIN again to confirm.</div>
            {err && <div style={S.err}>{err}</div>}
            <div style={S.inpWrap}>
              <label style={S.label}>Confirm PIN</label>
              <input style={S.inp} type={showPin?"text":"password"} placeholder="Repeat PIN"
                value={confirmPin} onChange={e=>setConfirm(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doConfirm()} autoFocus/>
              <button style={S.eye} onClick={()=>setShowPin(v=>!v)} type="button"><EyeIcon open={showPin}/></button>
            </div>
            <button style={S.btn} onClick={doConfirm}>Confirm & Open Diary →</button>
          </>
        )}

        {/* ── FORGOT PIN — Step 1: info + send code ── */}
        {screen === "forgotStep1" && (
          <>
            <button style={S.back} onClick={() => { setScreen("enter"); clr(); }}>← Back</button>
            <div style={S.icon}>
              <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="#f59e0b" strokeWidth="2">
                <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              </svg>
            </div>
            <div style={S.title}>Reset Diary PIN</div>
            <div style={S.sub}>
              We'll send a 6-digit verification code to your registered email or phone.
              Your diary entries will <strong>not</strong> be deleted.
            </div>
            {err && <div style={S.err}>{err}</div>}
            {msg && <div style={S.msg}>{msg}</div>}
            <button style={{...S.btn,opacity:loading?0.6:1}} disabled={loading} onClick={requestPinReset}>
              {loading ? "Sending…" : "Send verification code →"}
            </button>
          </>
        )}

        {/* ── FORGOT PIN — Step 2: enter OTP ── */}
        {screen === "forgotStep2" && (
          <>
            <button style={S.back} onClick={() => { setScreen("forgotStep1"); setResetOtp(""); clr(); }}>← Back</button>
            <div style={S.title}>Enter code</div>
            <div style={S.sub}>
              Enter the 6-digit code sent to your{" "}
              <strong>{sentVia === "phone" ? "phone" : "email"}</strong>.
              Valid for 10 minutes.
            </div>
            {err && <div style={S.err}>{err}</div>}
            {msg && <div style={S.msg}>{msg}</div>}
            <OtpInput value={resetOtp} onChange={setResetOtp}/>
            <button style={{...S.btn,opacity:loading||resetOtp.length<6?0.6:1}} disabled={loading||resetOtp.length<6} onClick={verifyPinReset}>
              {loading ? "Verifying…" : "Verify code →"}
            </button>
            <button style={{...S.link,marginTop:4,color:"#94a3b8"}} onClick={requestPinReset}>
              Resend code
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default DiaryPinGate;
