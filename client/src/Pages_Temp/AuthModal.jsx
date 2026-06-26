import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";

const API = "http://localhost:9090";

const GIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" style={{flexShrink:0}}>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

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

// ── 6-digit OTP boxes ─────────────────────────────────────────────────────────
const OtpInput = ({value, onChange}) => {
  const inputs = useRef([]);
  const digits = Array.from({length:6}, (_,i) => value[i]||"");
  const kd = (i,e) => {
    if(e.key==="Backspace"){
      e.preventDefault();
      const n=[...digits];
      if(n[i]){n[i]="";}else if(i>0){n[i-1]="";inputs.current[i-1]?.focus();}
      onChange(n.join(""));
    } else if(/^\d$/.test(e.key)){
      e.preventDefault();
      const n=[...digits];n[i]=e.key;onChange(n.join(""));
      if(i<5)inputs.current[i+1]?.focus();
    }
  };
  const paste = (e) => {
    e.preventDefault();
    const p=e.clipboardData.getData("text").replace(/\D/g,"").slice(0,6);
    onChange(p);inputs.current[Math.min(p.length,5)]?.focus();
  };
  return (
    <div style={{display:"flex",gap:8,justifyContent:"center",margin:"10px 0 6px"}}>
      {digits.map((d,i)=>(
        <input key={i} ref={el=>inputs.current[i]=el} type="text" inputMode="numeric"
          maxLength={1} value={d} onChange={()=>{}} onKeyDown={e=>kd(i,e)} onPaste={paste}
          onFocus={e=>e.target.select()}
          style={{width:44,height:52,textAlign:"center",fontSize:22,fontWeight:700,
            border:`2px solid ${d?"#6366f1":"#e2e8f0"}`,borderRadius:10,
            background:d?"#eef2ff":"#fafafa",outline:"none",
            transition:"border-color .15s,background .15s",
            color:"#1e293b",fontFamily:"inherit"}}/>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  AuthModal
//  method "otp"   → Email OTP (quick login, no password)
//  method "email" → Email + password (full account)
// ─────────────────────────────────────────────────────────────────────────────
const AuthModal = ({mode="login", onClose, onSwitchMode}) => {
  const navigate        = useNavigate();
  const [searchParams]  = useSearchParams();

  // Screens: "main" | "otp" | "forgotPw" | "forgotPwSent" | "verifyNotice" | "noPassword"
  const [screen, setScreen]     = useState("main");
  const [method, setMethod]     = useState("otp");
  const [otpEmail, setOtpEmail] = useState("");
  const [otp, setOtp]           = useState("");
  const [otpTimer, setOtpTimer] = useState(0);
  const [email, setEmail]       = useState("");
  const [password, setPw]       = useState("");
  const [name, setName]         = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [err, setErr]           = useState("");
  const [msg, setMsg]           = useState("");
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  // Stores the email of an OTP-only account that tried password login
  const [noPasswordEmail, setNoPasswordEmail] = useState("");

  const overlayRef  = useRef();
  const timerRef    = useRef();
  const isSignup    = mode === "signup";

  // Handle email verification redirect
  useEffect(() => {
    if (searchParams.get("verified") === "true") {
      setMsg("✅ Email verified! You can now sign in.");
      setScreen("main"); setMethod("email");
    }
    if (searchParams.get("error") === "token_expired") {
      setErr("Verification link expired. Please resend it.");
    }
  }, [searchParams]);

  useEffect(() => {
    if (otpTimer <= 0) return;
    timerRef.current = setTimeout(() => setOtpTimer(t => t-1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [otpTimer]);

  const reset    = () => { setErr(""); setMsg(""); };
  const loginOk  = (token) => { if (token) localStorage.setItem("wu_token", token); navigate("/dashboard"); };

  // ── Email OTP login ───────────────────────────────────────────────────────
  const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const sendOtp = async () => {
    if (!validEmail(otpEmail)) { setErr("Enter a valid email address"); return; }
    setLoading(true); reset();
    try {
      await axios.post(`${API}/api/auth/send-otp`, { email: otpEmail });
      setScreen("otp"); setOtpTimer(60);
      setMsg("OTP sent to your email! Check your inbox.");
    } catch(e) { setErr(e.response?.data?.message || "Failed to send OTP. Check your connection."); }
    finally { setLoading(false); }
  };

  const verifyOtp = async () => {
    if (otp.length < 6) { setErr("Enter the complete 6-digit OTP"); return; }
    setLoading(true); reset();
    try {
      const res = await axios.post(`${API}/api/auth/verify-otp`,
        { email: otpEmail, otp },
        { withCredentials: true }
      );
      loginOk(res.data.token);
    } catch(e) { setErr(e.response?.data?.message || "Wrong OTP. Try again."); }
    finally { setLoading(false); }
  };

  // ── Email + password auth ─────────────────────────────────────────────────
  const emailAuth = async () => {
    if (!validEmail(email)) { setErr("Enter a valid email address"); return; }
    if (password.length < 6) { setErr("Password must be at least 6 characters"); return; }
    if (isSignup && name.trim().length < 2) { setErr("Enter your full name"); return; }
    setLoading(true); reset();
    try {
      const ep  = isSignup ? "/api/auth/register" : "/api/auth/login";
      const pay = isSignup ? { name, email, password } : { email, password };
      const res = await axios.post(`${API}${ep}`, pay, { withCredentials: true });

      // Signup: server merged OTP account with new password (no verification needed)
      if (res.data.merged) {
        loginOk(res.data.token);
        return;
      }
      if (res.data.requiresVerification) {
        if (res.data.token) localStorage.setItem("wu_token", res.data.token);
        setScreen("verifyNotice"); setMsg(res.data.message);
        return;
      }
      loginOk(res.data.token);
    } catch(e) {
      const d = e.response?.data;

      // ── FIX: OTP-only account tried password login ────────────────────────
      if (d?.noPassword) {
        setNoPasswordEmail(d.email || email);
        setScreen("noPassword");
        return;
      }

      if (d?.requiresVerification) {
        setUnverifiedEmail(d.email || email);
        setScreen("verifyNotice"); setErr(d.message);
      } else {
        setErr(d?.message || "Authentication failed.");
      }
    } finally { setLoading(false); }
  };

  // ── Forgot password ───────────────────────────────────────────────────────
  const sendForgotPw = async () => {
    if (!validEmail(email)) { setErr("Enter a valid email address"); return; }
    setLoading(true); reset();
    try {
      const res = await axios.post(`${API}/api/auth/forgot-password`, { email });
      setScreen("forgotPwSent"); setMsg(res.data.message);
    } catch(e) { setErr(e.response?.data?.message || "Failed. Try again."); }
    finally { setLoading(false); }
  };

  // Prefill forgot-password form with the email that has no password
  const goToForgotPwForOtpAccount = () => {
    setEmail(noPasswordEmail);
    setScreen("forgotPw");
    reset();
  };

  // ── Resend verification ───────────────────────────────────────────────────
  const resendVerification = async () => {
    const target = unverifiedEmail || email;
    if (!target) return;
    setLoading(true); reset();
    try {
      const res = await axios.post(`${API}/api/auth/resend-verification`, { email: target });
      setMsg(res.data.message);
    } catch(e) { setErr(e.response?.data?.message || "Failed to resend."); }
    finally { setLoading(false); }
  };

  const mb12 = {marginBottom:12};

  return (
    <>
      {/* Backdrop */}
      <div ref={overlayRef}
        style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.45)",backdropFilter:"blur(4px)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
        onClick={e => e.target===overlayRef.current && onClose?.()}>

        <div style={{background:"#fff",borderRadius:24,padding:"36px 32px 28px",width:"100%",maxWidth:420,
          boxShadow:"0 24px 64px rgba(0,0,0,0.15)",border:"1px solid #e2e8f0",
          fontFamily:"'Inter','Segoe UI',sans-serif",position:"relative",maxHeight:"90vh",overflowY:"auto"}}>

          {/* Close */}
          <button onClick={onClose}
            style={{position:"absolute",top:16,right:18,background:"none",border:"none",cursor:"pointer",
              fontSize:20,color:"#94a3b8",lineHeight:1,padding:4}}>✕</button>

          {/* ── EMAIL NOT VERIFIED ── */}
          {screen==="verifyNotice" && (
            <>
              <div style={{textAlign:"center",marginBottom:20}}>
                <div style={{fontSize:40,marginBottom:12}}>📧</div>
                <div style={S.title}>Verify your email</div>
                <div style={S.sub}>{msg || err || "Check your inbox for a verification link."}</div>
              </div>
              {err && <div style={S.err}>{err}</div>}
              {msg && !err && <div style={S.msg}>{msg}</div>}
              <button className="wb" style={{...S.btn,marginBottom:10,opacity:loading?0.6:1}} disabled={loading} onClick={resendVerification}>
                {loading?"Sending…":"Resend verification email"}
              </button>
              <button style={S.link} onClick={()=>{setScreen("main");reset();}}>← Back to sign in</button>
            </>
          )}

          {/* ── NO PASSWORD SCREEN (OTP account tried password login) ── */}
          {screen==="noPassword" && (
            <>
              <div style={{textAlign:"center",marginBottom:20}}>
                <div style={{fontSize:40,marginBottom:12}}>🔑</div>
                <div style={S.title}>No password set</div>
                <div style={S.sub}>
                  <strong>{noPasswordEmail}</strong> was created with OTP login and has no password yet.
                </div>
              </div>

              {/* Option 1: switch to OTP */}
              <button className="wb" style={{...S.btn,marginBottom:10}}
                onClick={() => {
                  setOtpEmail(noPasswordEmail);
                  setMethod("otp");
                  setScreen("main");
                  reset();
                }}>
                Sign in with OTP instead →
              </button>

              {/* Option 2: set a password via forgot-password */}
              <button className="wb" style={{...S.btnOutline,marginBottom:10}}
                onClick={goToForgotPwForOtpAccount}>
                Set a password via email link
              </button>

              <button style={S.link} onClick={()=>{setScreen("main");reset();}}>← Back</button>
            </>
          )}

          {/* ── FORGOT PASSWORD — enter email ── */}
          {screen==="forgotPw" && (
            <>
              <button style={S.back} onClick={()=>{setScreen("main");reset();}}>← Back</button>
              <div style={S.title}>Reset password</div>
              <div style={S.sub}>Enter your email and we'll send a secure reset link. Works even if you've never set a password.</div>
              {err && <div style={S.err}>{err}</div>}
              {msg && <div style={S.msg}>{msg}</div>}
              <div style={mb12}>
                <label style={S.label}>Email address</label>
                <input className="wi" style={S.inp} type="email" placeholder="you@example.com"
                  value={email} onChange={e=>setEmail(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&sendForgotPw()}/>
              </div>
              <button className="wb" style={{...S.btn,opacity:loading?0.6:1}} disabled={loading} onClick={sendForgotPw}>
                {loading?"Sending…":"Send reset link →"}
              </button>
            </>
          )}

          {/* ── FORGOT PASSWORD — sent ── */}
          {screen==="forgotPwSent" && (
            <>
              <div style={{textAlign:"center",marginBottom:20}}>
                <div style={{fontSize:40,marginBottom:12}}>✉️</div>
                <div style={S.title}>Check your inbox</div>
                <div style={S.sub}>{msg||"A reset link has been sent. It expires in 1 hour."}</div>
              </div>
              <button className="wb" style={S.btn}
                onClick={()=>{setScreen("main");setMethod("email");reset();}}>
                Back to sign in
              </button>
            </>
          )}

          {/* ── OTP INPUT SCREEN ── */}
          {screen==="otp" && (
            <>
              <button style={S.back} onClick={()=>{setScreen("main");setOtp("");reset();}}>← Back</button>
              <div style={S.title}>Enter OTP</div>
              <div style={S.sub}>
                Sent to <strong>{otpEmail}</strong>.
                <br/><span style={{fontSize:12,color:"#94a3b8"}}>Check spam if not visible within a minute.</span>
              </div>
              {err && <div style={S.err}>{err}</div>}
              {msg && <div style={S.msg}>{msg}</div>}
              <OtpInput value={otp} onChange={setOtp}/>
              <div style={{textAlign:"right",marginBottom:16,marginTop:8}}>
                {otpTimer>0
                  ? <span style={{fontSize:12.5,color:"#94a3b8"}}>Resend in {otpTimer}s</span>
                  : <button style={S.resend} onClick={sendOtp}>Resend OTP</button>}
              </div>
              <button className="wb" style={{...S.btn,opacity:loading||otp.length<6?0.6:1}}
                disabled={loading||otp.length<6} onClick={verifyOtp}>
                {loading?"Verifying…":"Verify & Continue →"}
              </button>
            </>
          )}

          {/* ── MAIN FORM ── */}
          {screen==="main" && (
            <>
              <div style={S.title}>{isSignup?"Create account":"Welcome back"}</div>
              <div style={S.sub}>{isSignup?"Start your productivity journey.":"Sign in to your workspace."}</div>

              {/* Tabs */}
              <div style={S.tabRow}>
                <button style={S.tab(method==="otp")} onClick={()=>{setMethod("otp");reset();}}>Quick OTP</button>
                <button style={S.tab(method==="email")} onClick={()=>{setMethod("email");reset();}}>Email + Password</button>
              </div>

              {err && <div style={S.err}>{err}</div>}
              {msg && <div style={S.msg}>{msg}</div>}

              {/* ── OTP tab ── */}
              {method==="otp" && (
                <>
                  <div style={S.warn}>
                    📧 Enter your email to receive a one-time login code. No password needed.
                  </div>
                  <div style={mb12}>
                    <label style={S.label}>Email address</label>
                    <input className="wi" style={S.inp} type="email" placeholder="you@example.com"
                      value={otpEmail} onChange={e=>setOtpEmail(e.target.value)}
                      onKeyDown={e=>e.key==="Enter"&&sendOtp()}/>
                  </div>
                  <button className="wb" style={{...S.btn,opacity:loading?0.6:1}} disabled={loading} onClick={sendOtp}>
                    {loading?"Sending…":"Send OTP →"}
                  </button>
                </>
              )}

              {/* ── Email + Password tab ── */}
              {method==="email" && (
                <>
                  {isSignup && (
                    <div style={mb12}>
                      <label style={S.label}>Full name</label>
                      <input className="wi" style={S.inp} type="text" placeholder="Rahul Sharma"
                        value={name} onChange={e=>setName(e.target.value)}/>
                    </div>
                  )}
                  <div style={mb12}>
                    <label style={S.label}>Email address</label>
                    <input className="wi" style={S.inp} type="email" placeholder="you@example.com"
                      value={email} onChange={e=>setEmail(e.target.value)}/>
                  </div>
                  <div style={S.pwWrap}>
                    <label style={S.label}>Password</label>
                    <input className="wi" style={{...S.inp,paddingRight:42}}
                      type={showPw?"text":"password"} placeholder="Min 6 characters"
                      value={password} onChange={e=>setPw(e.target.value)}
                      onKeyDown={e=>e.key==="Enter"&&emailAuth()}/>
                    <button style={S.pwEye} onClick={()=>setShowPw(v=>!v)} type="button">
                      <EyeIcon open={showPw}/>
                    </button>
                  </div>
                  {!isSignup && (
                    <div style={{textAlign:"right",marginBottom:12,marginTop:-4}}>
                      <button style={{...S.link,fontSize:12.5}} onClick={()=>{setScreen("forgotPw");reset();}}>
                        Forgot password?
                      </button>
                    </div>
                  )}
                  <button className="wb" style={{...S.btn,opacity:loading?0.6:1}} disabled={loading} onClick={emailAuth}>
                    {loading?(isSignup?"Creating…":"Signing in…"):(isSignup?"Create account →":"Sign in →")}
                  </button>
                </>
              )}

              {/* Divider + Google */}
              <div style={S.div}><div style={S.dline}/> or <div style={S.dline}/></div>
              <button className="wg" style={S.btnSoft} onClick={()=>window.location.href=`${API}/auth/google`}>
                <span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
                  <GIcon/> Continue with Google
                </span>
              </button>

              <div style={S.sRow}>
                {isSignup?"Already have an account? ":"Don't have an account? "}
                <button style={S.link} onClick={onSwitchMode}>
                  {isSignup?"Sign in":"Sign up free"}
                </button>
              </div>
              <p style={{fontSize:11,color:"#94a3b8",textAlign:"center",marginTop:14}}>
                By continuing you agree to our <span style={{color:"#6366f1"}}>Terms</span> and{" "}
                <span style={{color:"#6366f1"}}>Privacy Policy</span>.
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  title:    {fontSize:22,fontWeight:800,color:"#0f172a",textAlign:"center",letterSpacing:"-0.5px",marginBottom:6},
  sub:      {fontSize:13.5,color:"#64748b",textAlign:"center",marginBottom:18,lineHeight:1.5},
  label:    {fontSize:12.5,fontWeight:600,color:"#374151",marginBottom:5,display:"block"},
  inp:      {width:"100%",border:"1.5px solid #e2e8f0",borderRadius:10,padding:"11px 14px",fontSize:14,fontFamily:"inherit",color:"#0f172a",background:"#fafafa",outline:"none",boxSizing:"border-box"},
  btn:      {width:"100%",padding:"12px",borderRadius:11,border:"none",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"inherit",marginTop:4,display:"block"},
  btnOutline:{width:"100%",padding:"12px",borderRadius:11,border:"2px solid #6366f1",background:"transparent",color:"#6366f1",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"block"},
  btnSoft:  {width:"100%",padding:"11px",borderRadius:11,border:"1.5px solid #e2e8f0",background:"#fff",color:"#374151",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"},
  err:      {background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"9px 12px",fontSize:13,color:"#dc2626",marginBottom:12},
  msg:      {background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:8,padding:"9px 12px",fontSize:13,color:"#166534",marginBottom:12},
  warn:     {background:"#fefce8",border:"1px solid #fef08a",borderRadius:8,padding:"9px 12px",fontSize:12.5,color:"#854d0e",marginBottom:14},
  tabRow:   {display:"flex",gap:6,marginBottom:18,background:"#f1f5f9",borderRadius:10,padding:4},
  tab:      (a)=>({flex:1,padding:"8px 0",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13.5,fontWeight:600,transition:"all .15s",background:a?"#fff":"transparent",color:a?"#6366f1":"#64748b",boxShadow:a?"0 1px 4px rgba(0,0,0,0.08)":"none"}),
  link:     {background:"none",border:"none",cursor:"pointer",color:"#6366f1",fontSize:13,fontWeight:600,fontFamily:"inherit",padding:0,display:"block",textAlign:"center",margin:"10px auto 0"},
  resend:   {background:"none",border:"none",cursor:"pointer",color:"#6366f1",fontSize:12.5,fontWeight:600,fontFamily:"inherit",padding:0},
  back:     {background:"none",border:"none",cursor:"pointer",color:"#64748b",fontSize:13,fontFamily:"inherit",padding:"0 0 12px",display:"block"},
  pwWrap:   {position:"relative",marginBottom:4},
  pwEye:    {position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#94a3b8",display:"flex",alignItems:"center"},
  div:      {display:"flex",alignItems:"center",gap:10,margin:"18px 0 12px",color:"#94a3b8",fontSize:12.5},
  dline:    {flex:1,height:1,background:"#e2e8f0"},
  sRow:     {textAlign:"center",marginTop:16,fontSize:13,color:"#64748b"},
};

export default AuthModal;
