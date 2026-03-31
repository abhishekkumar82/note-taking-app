// src/context/PremiumContext.jsx
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "../utils/axiosInstance";

const PremiumContext = createContext({
  isPremium:        false,
  premiumPlan:      null,
  premiumExpiresAt: null,
  loading:          true,
  refresh:          () => {},
});

export const PremiumProvider = ({ children }) => {
  const [isPremium,        setIsPremium]        = useState(false);
  const [premiumPlan,      setPremiumPlan]      = useState(null);
  const [premiumExpiresAt, setPremiumExpiresAt] = useState(null);
  const [loading,          setLoading]          = useState(true); // ← start true

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/payment/status");
      setIsPremium(res.data.isPremium || false);
      setPremiumPlan(res.data.premiumPlan || null);
      setPremiumExpiresAt(res.data.premiumExpiresAt || null);
    } catch {
      // 401 = not logged in, 403 = expired — both mean not premium
      setIsPremium(false);
      setPremiumPlan(null);
      setPremiumExpiresAt(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <PremiumContext.Provider value={{ isPremium, premiumPlan, premiumExpiresAt, loading, refresh }}>
      {children}
    </PremiumContext.Provider>
  );
};

export const usePremium = () => useContext(PremiumContext);