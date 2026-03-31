import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  LineChart, Line, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";
import { Plus, Target, CheckCircle2, XCircle, Trash2 } from "lucide-react";
import "../index.css";
import api from "../utils/axiosInstance";
const API = "/api/habits";
// ─────────────────────────────────────────────────────────────────────────────
// ROOT CAUSE:  ResponsiveContainer uses React.useContext internally.
// When there are two copies of React in the bundle (app + recharts peer dep),
// useContext reads from null and hard-crashes.
//
// FIX: Remove ResponsiveContainer entirely. Use a ResizeObserver hook to
// measure each chart container in real pixels, then pass those pixels
// directly as width/height props to the chart. No context needed.
// ─────────────────────────────────────────────────────────────────────────────

const useWidth = (ref) => {
  const [width, setWidth] = useState(500);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect?.width;
      if (w > 0) setWidth(Math.floor(w));
    });
    ro.observe(ref.current);
    // Read initial size immediately
    const initial = ref.current.getBoundingClientRect().width;
    if (initial > 0) setWidth(Math.floor(initial));
    return () => ro.disconnect();
  }, [ref]);
  return width;
};

const COLORS = ["#22c55e", "#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899"];
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];


const toDateStr = (d) => d.toISOString().split("T")[0];
const todayStr  = () => toDateStr(new Date());

const cellColor = (count, max) => {
  if (!count) return "#ebedf0";
  const pct = count / Math.max(max, 1);
  if (pct < 0.25) return "#9be9a8";
  if (pct < 0.5)  return "#40c463";
  if (pct < 0.75) return "#30a14e";
  return "#216e39";
};

const HabitTracker = ({ showToastMsg }) => {
  const [habits, setHabits]     = useState([]);
  const [logs, setLogs]         = useState([]);
  const [newHabit, setNewHabit] = useState({ name: "", freq: "daily", color: COLORS[0] });
  const [showForm, setShowForm] = useState(false);
  const [view, setView]         = useState("today");
  const [loading, setLoading]   = useState(true);
  const [calMonth, setCalMonth] = useState(new Date());
  const today                   = todayStr();

  // One ref per chart container — ResizeObserver gives us real pixel width
  const weekRef  = React.useRef(null);
  const monthRef = React.useRef(null);
  const yearRef  = React.useRef(null);
  const pieRef   = React.useRef(null);

  const weekW  = useWidth(weekRef);
  const monthW = useWidth(monthRef);
  const yearW  = useWidth(yearRef);
  const pieW   = useWidth(pieRef);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [hRes, lRes] = await Promise.all([
       api.get(API),
       api.get(`${API}/logs`),
      ]);
      setHabits(hRes.data || []);
      setLogs(lRes.data || []);
    } catch (e) {
      console.error("Habit fetch failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const handleAddHabit = async () => {
    if (!newHabit.name.trim()) { showToastMsg?.("Enter habit name", "error"); return; }
    try {
      const res = await api.post(API, newHabit);
      setHabits(p => [...p, res.data]);
      setNewHabit({ name: "", freq: "daily", color: COLORS[0] });
      setShowForm(false);
      showToastMsg?.("✅ Habit added", "success");
    } catch { showToastMsg?.("Failed to add", "error"); }
  };

  const handleDeleteHabit = async (id) => {
    try {
      await  api.delete(`${API}/${id}`)
      setHabits(p => p.filter(h => h._id !== id));
      setLogs(p => p.filter(l => l.habitId !== id));
      showToastMsg?.("Habit removed", "error");
    } catch {}
  };

  const toggleLog = async (habitId, date, currentStatus) => {
    const next = currentStatus === "completed" ? "missed"
               : currentStatus === "missed"    ? null
               : "completed";
    try {
      if (next === null) {
        await api.delete(`${API}/logs/${habitId}/${date}`);
        setLogs(p => p.filter(l => !(l.habitId === habitId && l.date === date)));
      } else {
        const res = await api.post(`${API}/logs`, { habitId, date, status: next }, );
        setLogs(p => {
          const idx = p.findIndex(l => l.habitId === habitId && l.date === date);
          if (idx >= 0) { const n = [...p]; n[idx] = res.data; return n; }
          return [...p, res.data];
        });
      }
    } catch { showToastMsg?.("Update failed", "error"); }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getLog = (habitId, date) => logs.find(l => l.habitId === habitId && l.date === date);

  const streak = (habitId) => {
    let count = 0;
    const d = new Date();
    while (true) {
      const l = getLog(habitId, toDateStr(d));
      if (!l || l.status !== "completed") break;
      count++;
      d.setDate(d.getDate() - 1);
    }
    return count;
  };

  const completionRate = (habitId, days = 7) => {
    let done = 0;
    for (let i = 0; i < days; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      if (getLog(habitId, toDateStr(d))?.status === "completed") done++;
    }
    return Math.round((done / days) * 100);
  };

  // ── Chart data builders ───────────────────────────────────────────────────
  const weeklyChartData = () => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = toDateStr(d);
      data.push({
        day: DAYS[d.getDay()],
        completed: habits.filter(h => getLog(h._id, ds)?.status === "completed").length,
        missed:    habits.filter(h => getLog(h._id, ds)?.status === "missed").length,
      });
    }
    return data;
  };

  const monthlyChartData = () => {
    const data = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = toDateStr(d);
      const rate = habits.length
        ? Math.round((habits.filter(h => getLog(h._id, ds)?.status === "completed").length / habits.length) * 100)
        : 0;
      data.push({ date: `${d.getDate()}/${d.getMonth()+1}`, rate });
    }
    return data;
  };

  const pieData = () => {
    const completed = logs.filter(l => l.status === "completed").length;
    const missed    = logs.filter(l => l.status === "missed").length;
    const pending   = Math.max(0, habits.length * 7 - completed - missed);
    return [
      { name: "Completed", value: completed },
      { name: "Missed",    value: missed },
      { name: "Pending",   value: pending },
    ];
  };

  const calendarDays = () => {
    const yr = calMonth.getFullYear(), mo = calMonth.getMonth();
    const first = new Date(yr, mo, 1).getDay();
    const days  = new Date(yr, mo + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < first; i++) cells.push(null);
    for (let d = 1; d <= days; d++) cells.push(new Date(yr, mo, d));
    return cells;
  };

  const todayCompleted = habits.filter(h => getLog(h._id, today)?.status === "completed").length;
  const todayProgress  = habits.length ? Math.round((todayCompleted / habits.length) * 100) : 0;

  if (loading) return (
    <div className="ht-loading">
      <div className="loading-spinner" />
      <p>Loading your habits…</p>
    </div>
  );

  return (
    <div className="ht-shell">

      {/* ── Header ── */}
      <div className="ht-header">
        <div>
          <h2 className="ht-title">Habit Tracker</h2>
          <p className="ht-subtitle">{habits.length} habits · {todayCompleted} done today</p>
        </div>
        <button className="ht-add-btn" onClick={() => setShowForm(v => !v)}>
          <Plus size={18} /> New Habit
        </button>
      </div>

      {/* ── Add form ── */}
      {showForm && (
        <div className="ht-form-card">
          <input
            className="ht-form-input"
            placeholder="Habit name (e.g. Morning run)"
            value={newHabit.name}
            onChange={e => setNewHabit(p => ({ ...p, name: e.target.value }))}
            onKeyDown={e => e.key === "Enter" && handleAddHabit()}
          />
          <select
            className="ht-form-select"
            value={newHabit.freq}
            onChange={e => setNewHabit(p => ({ ...p, freq: e.target.value }))}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
          <div className="ht-color-row">
            {COLORS.map(c => (
              <div
                key={c}
                className={`ht-color-dot ${newHabit.color === c ? "selected" : ""}`}
                style={{ background: c }}
                onClick={() => setNewHabit(p => ({ ...p, color: c }))}
              />
            ))}
          </div>
          <div className="ht-form-actions">
            <button className="ht-form-cancel" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="ht-form-save"   onClick={handleAddHabit}>Add</button>
          </div>
        </div>
      )}

      {/* ── Progress bar ── */}
      <div className="ht-progress-card">
        <div className="ht-progress-top">
          <span>Today — {todayCompleted}/{habits.length} completed</span>
          <span className="ht-progress-pct">{todayProgress}%</span>
        </div>
        <div className="ht-progress-track">
          <div className="ht-progress-fill" style={{ width: `${todayProgress}%` }} />
        </div>
      </div>

      {/* ── View tabs ── */}
      <div className="ht-tabs">
        {["today","week","month","year","calendar"].map(v => (
          <button
            key={v}
            className={`ht-tab ${view === v ? "active" : ""}`}
            onClick={() => setView(v)}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>

      {/* ════ TODAY ════ */}
      {view === "today" && (
        <div className="ht-today-grid">
          {habits.length === 0 && (
            <div className="ht-empty">
              <Target size={40} style={{ opacity: 0.3 }} />
              <p>No habits yet. Add one above!</p>
            </div>
          )}
          {habits.map(h => {
            const log    = getLog(h._id, today);
            const status = log?.status || null;
            const s      = streak(h._id);
            const rate   = completionRate(h._id, 7);
            return (
              <div
                key={h._id}
                className={`ht-habit-card ${status === "completed" ? "ht-hc--done" : status === "missed" ? "ht-hc--missed" : ""}`}
              >
                <div className="ht-hc-left">
                  <div className="ht-hc-dot" style={{ background: h.color || "#3b82f6" }} />
                  <div>
                    <p className="ht-hc-name">{h.name}</p>
                    <p className="ht-hc-meta">
                      {h.freq} · {s > 0 && <span>🔥 {s} streak · </span>}{rate}% this week
                    </p>
                  </div>
                </div>
                <div className="ht-hc-actions">
                  <button
                    className={`ht-check-btn ht-check--done ${status === "completed" ? "active" : ""}`}
                    onClick={() => toggleLog(h._id, today, status)}
                    title="Completed"
                  ><CheckCircle2 size={22} /></button>
                  <button
                    className={`ht-check-btn ht-check--miss ${status === "missed" ? "active" : ""}`}
                    onClick={() => toggleLog(h._id, today, status === "missed" ? "missed" : null)}
                    title="Missed"
                  ><XCircle size={22} /></button>
                  <button
                    className="ht-delete-btn"
                    onClick={() => handleDeleteHabit(h._id)}
                    title="Delete"
                  ><Trash2 size={16} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ════ WEEK ════ */}
      {view === "week" && (
        <div className="ht-charts">
          <div className="ht-chart-card">
            <h3 className="ht-chart-title">Weekly Completion</h3>
            {/* ref div measured by ResizeObserver → width passed directly, no ResponsiveContainer */}
            <div ref={weekRef} style={{ width: "100%", overflowX: "auto" }}>
              <BarChart width={weekW} height={220} data={weeklyChartData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="completed" fill="#22c55e" radius={[4,4,0,0]} name="Completed" />
                <Bar dataKey="missed"    fill="#ef4444" radius={[4,4,0,0]} name="Missed" />
              </BarChart>
            </div>
          </div>

          <div className="ht-chart-card">
            <h3 className="ht-chart-title">Per-habit (7 days)</h3>
            <div className="ht-habit-bars">
              {habits.map(h => (
                <div key={h._id} className="ht-hb-row">
                  <span className="ht-hb-name">{h.name}</span>
                  <div className="ht-hb-track">
                    <div
                      className="ht-hb-fill"
                      style={{ width: `${completionRate(h._id, 7)}%`, background: h.color || "#3b82f6" }}
                    />
                  </div>
                  <span className="ht-hb-pct">{completionRate(h._id, 7)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ════ MONTH ════ */}
      {view === "month" && (
        <div className="ht-charts">
          <div className="ht-chart-card ht-chart-card--wide">
            <h3 className="ht-chart-title">30-day Completion Rate</h3>
            <div ref={monthRef} style={{ width: "100%", overflowX: "auto" }}>
              <LineChart width={monthW} height={240} data={monthlyChartData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" fontSize={10} interval={4} />
                <YAxis domain={[0,100]} fontSize={12} unit="%" />
                <Tooltip formatter={v => `${v}%`} />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  name="Completion %"
                />
              </LineChart>
            </div>
          </div>

          <div className="ht-chart-card">
            <h3 className="ht-chart-title">Distribution</h3>
            <div ref={pieRef} style={{ width: "100%" }}>
              <PieChart width={pieW} height={200}>
                <Pie
                  data={pieData()}
                  cx={Math.floor(pieW / 2)}
                  cy={90}
                  outerRadius={70}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
                >
                  {pieData().map((_, i) => (
                    <Cell key={i} fill={["#22c55e","#ef4444","#e5e7eb"][i]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </div>
          </div>
        </div>
      )}

      {/* ════ YEAR ════ */}
      {view === "year" && (
        <div className="ht-charts">
          <div className="ht-chart-card ht-chart-card--wide">
            <h3 className="ht-chart-title">Monthly Average (this year)</h3>
            <div ref={yearRef} style={{ width: "100%", overflowX: "auto" }}>
              <BarChart
                width={yearW}
                height={220}
                data={MONTHS.map((m, i) => {
                  const yr   = new Date().getFullYear();
                  const days = new Date(yr, i+1, 0).getDate();
                  let total  = 0;
                  for (let d = 1; d <= days; d++) {
                    const ds = toDateStr(new Date(yr, i, d));
                    total += habits.filter(h => getLog(h._id, ds)?.status === "completed").length;
                  }
                  const max = habits.length * days;
                  return { month: m, rate: max ? Math.round((total / max) * 100) : 0 };
                })}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis domain={[0,100]} unit="%" fontSize={12} />
                <Tooltip formatter={v => `${v}%`} />
                <Bar dataKey="rate" fill="#8b5cf6" radius={[4,4,0,0]} name="Avg completion" />
              </BarChart>
            </div>
          </div>
        </div>
      )}

      {/* ════ CALENDAR ════ */}
      {view === "calendar" && (
        <div className="ht-calendar-wrap">
          <div className="ht-cal-nav">
            <button onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth()-1, 1))}>‹</button>
            <span>{MONTHS[calMonth.getMonth()]} {calMonth.getFullYear()}</span>
            <button onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth()+1, 1))}>›</button>
          </div>
          <div className="ht-cal-grid">
            {DAYS.map(d => <div key={d} className="ht-cal-dayname">{d}</div>)}
            {calendarDays().map((date, i) => (
              <div
                key={i}
                className={`ht-cal-cell ${date && toDateStr(date) === today ? "ht-cal-today" : ""}`}
                style={{
                  background: date
                    ? cellColor(
                        habits.filter(h => getLog(h._id, toDateStr(date))?.status === "completed").length,
                        habits.length
                      )
                    : "transparent"
                }}
                title={
                  date
                    ? `${date.getDate()} ${MONTHS[date.getMonth()]}: ${habits.filter(h => getLog(h._id, toDateStr(date))?.status === "completed").length}/${habits.length} done`
                    : ""
                }
              >
                {date ? <span className="ht-cal-num">{date.getDate()}</span> : null}
              </div>
            ))}
          </div>
          <div className="ht-cal-legend">
            <span>Less</span>
            {["#ebedf0","#9be9a8","#40c463","#30a14e","#216e39"].map(c => (
              <div key={c} style={{ width: 14, height: 14, borderRadius: 3, background: c }} />
            ))}
            <span>More</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default HabitTracker;
