import React, { useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import axios from "axios";

const ProtectedRoute = ({ children }) => {
  const [status, setStatus] = useState("checking");
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    // Google OAuth callback passes ?token=JWT — save it and clean the URL
    const urlToken = searchParams.get("token");
    if (urlToken) {
      localStorage.setItem("wu_token", urlToken);
      searchParams.delete("token");
      setSearchParams(searchParams, { replace: true });
      setStatus("ok");
      return;
    }

    const token = localStorage.getItem("wu_token");
    if (token) {
      setStatus("ok");
      return;
    }

    // Fallback: session cookie check (local dev Google OAuth)
    axios
      .get(`${import.meta.env.VITE_API_URL || 'http://localhost:9090'}/api/auth/me`, { withCredentials: true })
      .then(() => setStatus("ok"))
      .catch(() => setStatus("denied"));
  }, []);

  if (status === "checking") {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100vh", background: "#f8fafc",
        fontFamily: "'Inter', sans-serif", color: "#64748b", fontSize: 15,
        gap: 10,
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5"
          style={{ animation: "spin 1s linear infinite" }}>
          <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity=".3"/>
          <path d="M21 12a9 9 0 01-9 9" strokeLinecap="round"/>
        </svg>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        Checking access…
      </div>
    );
  }

  if (status === "denied") {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
