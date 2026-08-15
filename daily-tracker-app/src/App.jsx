import React, { useState, useEffect, useCallback, useRef } from "react";

// Simple localStorage-backed storage helper (replaces the Claude-artifact
// window.storage API so this component runs as a standalone website).
const storage = {
  get(key) {
    const value = window.localStorage.getItem(key);
    return Promise.resolve(value === null ? null : { key, value });
  },
  set(key, value) {
    window.localStorage.setItem(key, value);
    return Promise.resolve({ key, value });
  },
};

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const WEEKDAYS = ["S","M","T","W","T","F","S"];
const DEFAULT_ITEMS = ["GATE", "AI/ML", "DSA", "Course", "Web D", "Project"];

function daysInMonth(year, monthIdx) {
  return new Date(year, monthIdx + 1, 0).getDate();
}
function firstWeekday(year, monthIdx) {
  return new Date(year, monthIdx, 1).getDay();
}
function pad(n) { return String(n).padStart(2, "0"); }
function dateKey(year, monthIdx, day) {
  return `${year}-${pad(monthIdx + 1)}-${pad(day)}`;
}

function ScribbleCheck({ checked, onClick, size = 30 }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={checked}
      aria-label={checked ? "Mark as not done" : "Mark as done"}
      style={{
        width: size, height: size, minWidth: size,
        background: "transparent", border: "none", cursor: "pointer",
        padding: 0, display: "grid", placeItems: "center",
      }}
    >
      <svg width={size} height={size} viewBox="0 0 40 40">
        <path
          d="M20.5 4.2C11 3.6 4.4 9.8 4.6 19.4c0.2 9.8 7 16.1 16 16.3 9.4 0.2 16.4-6.6 16.2-15.9C36.6 11 30.8 4.9 20.5 4.2Z"
          fill="none"
          stroke={checked ? "#5B7A52" : "#3A3530"}
          strokeWidth={checked ? 2.6 : 2.1}
          strokeLinecap="round"
          opacity={checked ? 1 : 0.75}
        />
        {checked && (
          <path
            d="M11 20.5 L17.5 27 L29.5 12"
            fill="none"
            stroke="#8A3B2C"
            strokeWidth={3.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </button>
  );
}

function DayCell({ day, isSelected, isToday, done, total, onClick }) {
  const pct = total > 0 ? done / total : 0;
  const full = total > 0 && done === total;
  const ringColor = full ? "#5B7A52" : "#B8925A";

  return (
    <button
      onClick={onClick}
      style={{
        position: "relative",
        aspectRatio: "1 / 1",
        width: "100%",
        border: "none",
        background: "transparent",
        cursor: "pointer",
        padding: 0,
        display: "grid",
        placeItems: "center",
      }}
    >
      <div style={{
        width: "78%",
        height: "78%",
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        background: full
          ? ringColor
          : pct > 0
            ? `conic-gradient(${ringColor} ${pct * 360}deg, #E7E2D4 0deg)`
            : "transparent",
        border: isSelected
          ? "2px solid #8A3B2C"
          : pct === 0
            ? "1.5px solid #D8D2C0"
            : "none",
        boxSizing: "border-box",
      }}>
        <div style={{
          width: full ? "100%" : pct > 0 ? "72%" : "100%",
          height: full ? "100%" : pct > 0 ? "72%" : "100%",
          borderRadius: "50%",
          background: pct > 0 && !full ? "#FBF8F1" : "transparent",
          display: "grid",
          placeItems: "center",
        }}>
          <span style={{
            fontSize: 13,
            fontWeight: isToday ? 800 : 600,
            color: full ? "#FBF8F1" : isToday ? "#8A3B2C" : "#26241F",
            fontFamily: "'Inter', sans-serif",
          }}>
            {day}
          </span>
        </div>
      </div>
    </button>
  );
}

const YEAR_RANGE = 4; // years back/forward from current year to offer

export default function DailyTracker() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [monthIdx, setMonthIdx] = useState(today.getMonth());
  const [day, setDay] = useState(today.getDate());
  const [items, setItems] = useState(DEFAULT_ITEMS);
  const [checks, setChecks] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [monthChecks, setMonthChecks] = useState({});
  const [note, setNote] = useState("");
  const [noteStatus, setNoteStatus] = useState("");
  const inputRef = useRef(null);
  const noteSaveTimer = useRef(null);
  const years = Array.from({ length: YEAR_RANGE * 2 + 1 }, (_, i) => today.getFullYear() - YEAR_RANGE + i);

  const key = dateKey(year, monthIdx, day);
  const totalDays = daysInMonth(year, monthIdx);
  const startWeekday = firstWeekday(year, monthIdx);

  useEffect(() => {
    (async () => {
      try {
        const res = await storage.get("items", false);
        if (res && res.value) {
          const parsed = JSON.parse(res.value);
          if (Array.isArray(parsed) && parsed.length) setItems(parsed);
        }
      } catch (e) {}
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    (async () => {
      try {
        const res = await storage.get(`checks:${key}`, false);
        setChecks(res && res.value ? JSON.parse(res.value) : {});
      } catch (e) {
        setChecks({});
      }
      try {
        const res2 = await storage.get(`notes:${key}`, false);
        setNote(res2 && res2.value ? res2.value : "");
      } catch (e) {
        setNote("");
      }
      setNoteStatus("");
    })();
  }, [key, loaded]);

  useEffect(() => {
    if (!loaded) return;
    let cancelled = false;
    (async () => {
      const entries = {};
      for (let d = 1; d <= totalDays; d++) {
        const k = dateKey(year, monthIdx, d);
        try {
          const res = await storage.get(`checks:${k}`, false);
          if (res && res.value) {
            const obj = JSON.parse(res.value);
            entries[d] = Object.values(obj).filter(Boolean).length;
          }
        } catch (e) {}
      }
      if (!cancelled) setMonthChecks(entries);
    })();
    return () => { cancelled = true; };
  }, [monthIdx, year, totalDays, loaded, checks]);

  const saveItems = useCallback(async (list) => {
    try { await storage.set("items", JSON.stringify(list), false); } catch (e) {}
  }, []);
  const saveChecks = useCallback(async (k, obj) => {
    try { await storage.set(`checks:${k}`, JSON.stringify(obj), false); } catch (e) {}
  }, []);

  const handleNoteChange = (text) => {
    setNote(text);
    setNoteStatus("saving...");
    if (noteSaveTimer.current) clearTimeout(noteSaveTimer.current);
    noteSaveTimer.current = setTimeout(async () => {
      try {
        await storage.set(`notes:${key}`, text, false);
        setNoteStatus("saved");
      } catch (e) {
        setNoteStatus("");
      }
    }, 500);
  };

  const toggle = (name) => {
    const next = { ...checks, [name]: !checks[name] };
    setChecks(next);
    saveChecks(key, next);
  };

  const addItem = () => {
    const name = newItem.trim();
    if (!name || items.includes(name)) return;
    const next = [...items, name];
    setItems(next);
    saveItems(next);
    setNewItem("");
    inputRef.current && inputRef.current.focus();
  };

  const removeItem = (name) => {
    const next = items.filter((i) => i !== name);
    setItems(next);
    saveItems(next);
    if (name in checks) {
      const nc = { ...checks };
      delete nc[name];
      setChecks(nc);
      saveChecks(key, nc);
    }
  };

  const doneCount = items.filter((i) => checks[i]).length;
  const isToday = (d) => year === today.getFullYear() && monthIdx === today.getMonth() && d === today.getDate();
  const selectedIsToday = isToday(day);

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#F6E9EC",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "28px 14px 60px",
      fontFamily: "'Inter', system-ui, sans-serif",
      boxSizing: "border-box",
      gap: 20,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        select { font-family: 'Inter', sans-serif; }
        .task-row:hover .del-btn { opacity: 1; }
      `}</style>

      <div style={{
        width: "100%",
        maxWidth: 480,
        background: "#FBF8F1",
        borderRadius: 3,
        boxShadow: "0 1px 2px rgba(40,35,25,0.06), 0 12px 30px rgba(40,35,25,0.10)",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 22,
          background: "repeating-linear-gradient(90deg, transparent 0 18px, #C7BFAE 18px 20px)",
          opacity: 0.55,
        }} />
        <div style={{
          position: "absolute", top: 0, bottom: 0, left: 54,
          width: 1.5, background: "#C87A6A", opacity: 0.4,
        }} />

        <div style={{ position: "relative", padding: "34px 26px 30px 66px" }}>
          <div style={{ marginBottom: 18 }}>
            <h1 style={{
              fontFamily: "'Caveat', cursive",
              fontWeight: 700,
              fontSize: 40,
              lineHeight: 1,
              color: "#233A2E",
              margin: 0,
            }}>
              Daily Revision &amp; Test
            </h1>
            <div style={{
              fontFamily: "'Caveat', cursive",
              fontWeight: 500,
              fontSize: 22,
              color: "#8A3B2C",
              marginTop: 2,
            }}>
              daily schedule
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 14, gap: 10, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 8 }}>
              <label style={{ display: "flex", flexDirection: "column", fontSize: 11, color: "#6B675E", fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase" }}>
                Month
                <select
                  value={monthIdx}
                  onChange={(e) => {
                    const mi = Number(e.target.value);
                    setMonthIdx(mi);
                    const dim = daysInMonth(year, mi);
                    if (day > dim) setDay(dim);
                  }}
                  style={{
                    marginTop: 4, padding: "7px 10px", borderRadius: 6,
                    border: "1px solid #D8D2C0", background: "#fff",
                    fontSize: 14, color: "#26241F", fontWeight: 600, cursor: "pointer",
                  }}
                >
                  {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                </select>
              </label>

              <label style={{ display: "flex", flexDirection: "column", fontSize: 11, color: "#6B675E", fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase" }}>
                Year
                <select
                  value={year}
                  onChange={(e) => {
                    const y = Number(e.target.value);
                    setYear(y);
                    const dim = daysInMonth(y, monthIdx);
                    if (day > dim) setDay(dim);
                  }}
                  style={{
                    marginTop: 4, padding: "7px 10px", borderRadius: 6,
                    border: "1px solid #D8D2C0", background: "#fff",
                    fontSize: 14, color: "#26241F", fontWeight: 600, cursor: "pointer",
                  }}
                >
                  {years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </label>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "#8A857A", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>
                {selectedIsToday ? "Today" : `${MONTHS[monthIdx].slice(0,3)} ${day}`}
              </div>
              <div style={{ fontFamily: "'Caveat', cursive", fontSize: 22, color: "#233A2E", fontWeight: 700, lineHeight: 1.1 }}>
                {doneCount}/{items.length} done
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 6 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 4 }}>
              {WEEKDAYS.map((w, i) => (
                <div key={i} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "#A39C8B", padding: "2px 0" }}>
                  {w}
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", rowGap: 2 }}>
              {cells.map((d, i) => (
                d === null
                  ? <div key={i} />
                  : (
                    <DayCell
                      key={i}
                      day={d}
                      isSelected={d === day}
                      isToday={isToday(d)}
                      done={monthChecks[d] || 0}
                      total={items.length}
                      onClick={() => setDay(d)}
                    />
                  )
              ))}
            </div>
          </div>

          <div style={{ borderTop: "1px dashed #D8D2C0", margin: "16px 0 14px" }} />

          <div>
            {items.map((name) => (
              <div key={name} className="task-row" style={{
                display: "flex", alignItems: "center", gap: 12,
                height: 44,
              }}>
                <ScribbleCheck checked={!!checks[name]} onClick={() => toggle(name)} />
                <span style={{
                  fontSize: 17,
                  color: checks[name] ? "#7C7A72" : "#26241F",
                  textDecoration: checks[name] ? "line-through" : "none",
                  textDecorationColor: "#8A3B2C",
                  textDecorationThickness: "1.5px",
                  fontWeight: 500,
                  flex: 1,
                }}>
                  {name}
                </span>
                <button
                  className="del-btn"
                  onClick={() => removeItem(name)}
                  aria-label={`Remove ${name}`}
                  style={{
                    opacity: 0, transition: "opacity 0.15s",
                    border: "none", background: "transparent", cursor: "pointer",
                    color: "#B5533C", fontSize: 16, padding: "2px 6px",
                  }}
                >
                  ×
                </button>
              </div>
            ))}

            <div style={{ display: "flex", alignItems: "center", gap: 12, height: 44, marginTop: 2 }}>
              <div style={{ width: 30, minWidth: 30, display: "grid", placeItems: "center", color: "#B7B2A4", fontSize: 20 }}>+</div>
              <input
                ref={inputRef}
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addItem(); }}
                placeholder="Add a subject..."
                style={{
                  flex: 1, border: "none", borderBottom: "1px solid #D8D2C0",
                  background: "transparent", fontSize: 15, padding: "6px 2px",
                  outline: "none", color: "#26241F", fontFamily: "'Inter', sans-serif",
                }}
              />
              <button
                onClick={addItem}
                style={{
                  border: "none", background: "#233A2E", color: "#F4F1E8",
                  fontSize: 13, fontWeight: 600, padding: "7px 14px",
                  borderRadius: 6, cursor: "pointer",
                }}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Second page: today's brief */}
      <div style={{
        width: "100%",
        maxWidth: 480,
        background: "#FBF8F1",
        borderRadius: 3,
        boxShadow: "0 1px 2px rgba(40,35,25,0.06), 0 12px 30px rgba(40,35,25,0.10)",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 22,
          background: "repeating-linear-gradient(90deg, transparent 0 18px, #C7BFAE 18px 20px)",
          opacity: 0.55,
        }} />
        <div style={{
          position: "absolute", top: 0, bottom: 0, left: 54,
          width: 1.5, background: "#C87A6A", opacity: 0.4,
        }} />
        <div style={{
          position: "absolute", top: 96, bottom: 0, left: 0, right: 0,
          backgroundImage: "repeating-linear-gradient(to bottom, transparent 0 30px, #C9D3DB 30px 31px)",
          opacity: 0.5,
        }} />

        <div style={{ position: "relative", padding: "26px 26px 30px 66px" }}>
          <h2 style={{
            fontFamily: "'Caveat', cursive",
            fontWeight: 700,
            fontSize: 30,
            lineHeight: 1,
            color: "#233A2E",
            margin: "0 0 4px",
          }}>
            What I did today
          </h2>
          <div style={{ fontSize: 12, color: "#8A857A", fontWeight: 600, marginBottom: 10 }}>
            {MONTHS[monthIdx]} {day}, {year}
            {noteStatus && <span style={{ marginLeft: 8, fontStyle: "italic", color: "#A39C8B" }}>{noteStatus}</span>}
          </div>
          <textarea
            value={note}
            onChange={(e) => handleNoteChange(e.target.value)}
            placeholder="Brief yourself on today... what did you cover, what's left, anything to remember for tomorrow."
            rows={7}
            style={{
              width: "100%",
              border: "none",
              outline: "none",
              background: "transparent",
              resize: "vertical",
              fontFamily: "'Inter', sans-serif",
              fontSize: 15,
              lineHeight: "31px",
              color: "#26241F",
              paddingTop: 2,
            }}
          />
        </div>
      </div>
    </div>
  );
}
