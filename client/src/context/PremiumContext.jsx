// src/context/PremiumContext.jsx
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "../utils/axiosInstance";

const PremiumContext = createContext({
  isPremium:        false,
  isTrial:          false,
  trialEndsAt:      null,
  premiumPlan:      null,
  premiumExpiresAt: null,
  loading:          true,
  refresh:          () => {},
});

export const PremiumProvider = ({ children }) => {
  const [isPremium,        setIsPremium]        = useState(false);
  const [isTrial,          setIsTrial]          = useState(false);
  const [trialEndsAt,      setTrialEndsAt]      = useState(null);
  const [premiumPlan,      setPremiumPlan]      = useState(null);
  const [premiumExpiresAt, setPremiumExpiresAt] = useState(null);
  const [loading,          setLoading]          = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/payment/status");
      setIsPremium(res.data.isPremium || false);
      setIsTrial(res.data.isTrial || false);
      setTrialEndsAt(res.data.trialEndsAt || null);
      setPremiumPlan(res.data.premiumPlan || null);
      setPremiumExpiresAt(res.data.premiumExpiresAt || null);
    } catch {
      setIsPremium(false);
      setIsTrial(false);
      setTrialEndsAt(null);
      setPremiumPlan(null);
      setPremiumExpiresAt(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <PremiumContext.Provider value={{ isPremium, isTrial, trialEndsAt, premiumPlan, premiumExpiresAt, loading, refresh }}>
      {children}
    </PremiumContext.Provider>
  );
};

export const usePremium = () => useContext(PremiumContext);