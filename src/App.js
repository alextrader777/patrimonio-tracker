import { useState, useEffect, useMemo, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, AreaChart, Area } from "recharts";
import { auth, db, loginGoogle, logout, loadData, saveData } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import "./index.css";

const MONTHS = ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SEP","OCT","NOV","DIC"];
const KEY = "patrimonio_lg_v1";

const ACOLORS = {
  QQQ: "#8b5cf6", // Violet
  SMALLCAPS: "#ec4899", // Pink
  BTC: "#f59e0b", // Gold
  ETH: "#a855f7", // Purple
  "DÓLARES": "#06b6d4", // Cyan
  "DÓLARES/ARQ": "#06b6d4",
  DOLLAR: "#06b6d4",
  DOLARAPP: "#06b6d4",
  "DOLARES FISICOS": "#06b6d4",
  EFECTIVO: "#64748b", // Slate
  GOTA: "#f43f5e", // Rose
  VOO: "#3b82f6", // Blue
  NU: "#10b981", // Emerald
  FUTUROS: "#f43f5e",
  GOOGL: "#14b8a6",
  NVDA: "#22c55e",
  TSLA: "#eab308",
  BASE: "#64748b",
  "BASE ACCIONES": "#64748b",
  D: "#475569"
};

const YCOLS = {
  2025: "#8b5cf6", // Violet
  2026: "#06b6d4", // Cyan
  2027: "#10b981", // Emerald
  2028: "#f59e0b"  // Amber
};

const SECTORS = {
  Acciones: ["QQQ", "SMALLCAPS", "VOO", "NU", "GOOGL", "NVDA", "TSLA", "BASE", "BASE ACCIONES"],
  Crypto: ["BTC", "ETH"],
  Liquidez: ["EFECTIVO", "DÓLARES", "DÓLARES/ARQ", "DOLLAR", "DOLARAPP", "DOLARES FISICOS", "FUTUROS"],
  GOTA: ["GOTA"],
};

const gc = n => ACOLORS[n] || ACOLORS.D;
const yc = y => YCOLS[y] || "#94a3b8";
const fmt = n => n > 0 ? new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n) : n < 0 ? `-${new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Math.abs(n))}` : "—";
const fmtU = n => n > 0 ? `$${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n)}` : "—";
const fmtP = n => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
const num = v => { const n = parseFloat(String(v).replace(/[^0-9.-]/g, "")); return isNaN(n) ? 0 : n; };
const emptyY = y => ({ year: y, pi: 0, meta: 0, months: Object.fromEntries(MONTHS.map(m => [m, { t: 0, a: [], ing: 0, gas: 0 }])) });
const filled = yd => MONTHS.filter(m => yd.months[m]?.t > 0);
const lastP = yd => { const f = filled(yd); return f.length ? yd.months[f[f.length - 1]].t : 0; };
const proj = yd => {
  const f = filled(yd); if (f.length < 2) return null;
  const last = yd.months[f[f.length - 1]].t, first = yd.months[f[0]].t;
  const mg = (last - first) / Math.max(f.length - 1, 1), left = 12 - MONTHS.indexOf(f[f.length - 1]) - 1;
  return last + mg * left;
};
const sects = activos => {
  const r = {};
  for (const [s, ns] of Object.entries(SECTORS)) {
    const v = activos.filter(a => ns.includes(a.n)).reduce((x, a) => x + a.c, 0);
    if (v > 0) r[s] = v;
  }
  return r;
};

const DATA = {
  ay: 2026,
  years: {
    2025: {
      year: 2025, pi: 26994146, meta: 50000000, months: {
        ENE: { t: 26994146, a: [{ n: "VOO", c: 513675, u: 140 }, { n: "NU", c: 3474644, u: 947 }, { n: "BTC", c: 726483, u: 198 }, { n: "ETH", c: 517344, u: 141 }, { n: "EFECTIVO", c: 11262000, u: 0 }, { n: "GOTA", c: 10500000, u: 0 }], ing: 0, gas: 0 },
        FEB: { t: 27400776, a: [{ n: "VOO", c: 517344, u: 141 }, { n: "NU", c: 4417605, u: 1204 }, { n: "BTC", c: 759505, u: 207 }, { n: "ETH", c: 484322, u: 132 }, { n: "EFECTIVO", c: 10722000, u: 0 }, { n: "GOTA", c: 10500000, u: 0 }], ing: 0, gas: 0 },
        MAR: { t: 28234402, a: [{ n: "VOO", c: 2513338, u: 685 }, { n: "QQQ", c: 2638088, u: 719 }, { n: "NVDA", c: 154102, u: 42 }, { n: "NU", c: 3738820, u: 1019 }, { n: "GOOGL", c: 649432, u: 177 }, { n: "BTC", c: 612741, u: 167 }, { n: "ETH", c: 322881, u: 88 }, { n: "EFECTIVO", c: 8605000, u: 0 }, { n: "GOTA", c: 9000000, u: 0 }], ing: 0, gas: 0 },
        ABR: { t: 30404935, a: [{ n: "VOO", c: 2726146, u: 743 }, { n: "NU", c: 3467306, u: 945 }, { n: "GOOGL", c: 796196, u: 217 }, { n: "NVDA", c: 143095, u: 39 }, { n: "QQQ", c: 3184785, u: 868 }, { n: "BTC", c: 983321, u: 268 }, { n: "ETH", c: 631086, u: 172 }, { n: "EFECTIVO", c: 9473000, u: 0 }, { n: "GOTA", c: 9000000, u: 0 }], ing: 0, gas: 0 },
        MAY: { t: 33709870, a: [{ n: "VOO", c: 2770176, u: 755 }, { n: "QQQ", c: 3716805, u: 1013 }, { n: "NVDA", c: 150433, u: 41 }, { n: "NU", c: 4193789, u: 1143 }, { n: "GOOGL", c: 825549, u: 225 }, { n: "BTC", c: 2707801, u: 738 }, { n: "ETH", c: 634755, u: 173 }, { n: "BASE ACCIONES", c: 289859, u: 79 }, { n: "DOLARAPP", c: 3562703, u: 971 }, { n: "EFECTIVO", c: 5858000, u: 0 }, { n: "GOTA", c: 9000000, u: 0 }], ing: 0, gas: 0 },
        JUN: { t: 37964315, a: [{ n: "VOO", c: 2905933, u: 792 }, { n: "QQQ", c: 4278178, u: 1166 }, { n: "NU", c: 3977312, u: 1084 }, { n: "GOOGL", c: 884255, u: 241 }, { n: "NVDA", c: 183455, u: 50 }, { n: "BTC", c: 4531347, u: 1235 }, { n: "ETH", c: 4978978, u: 1357 }, { n: "DOLLAR", c: 3294858, u: 898 }, { n: "EFECTIVO", c: 3930000, u: 0 }, { n: "GOTA", c: 9000000, u: 0 }], ing: 0, gas: 0 },
        JUL: { t: 42924239, a: [{ n: "GOOGL", c: 906269, u: 247 }, { n: "TSLA", c: 179786, u: 49 }, { n: "VOO", c: 3041689, u: 829 }, { n: "QQQ", c: 4524009, u: 1233 }, { n: "BASE", c: 4424943, u: 1206 }, { n: "BTC", c: 4865236, u: 1326 }, { n: "ETH", c: 4971640, u: 1355 }, { n: "FUTUROS", c: 3008668, u: 820 }, { n: "GOTA", c: 9000000, u: 0 }, { n: "EFECTIVO", c: 8002000, u: 0 }], ing: 0, gas: 0 },
        AGO: { t: 47162041, a: [{ n: "TSLA", c: 183455, u: 50 }, { n: "GOOGL", c: 975982, u: 266 }, { n: "VOO", c: 3107733, u: 847 }, { n: "QQQ", c: 4582714, u: 1249 }, { n: "FUTUROS", c: 2843558, u: 775 }, { n: "DOLLAR", c: 3364571, u: 917 }, { n: "BTC", c: 5283514, u: 1440 }, { n: "ETH", c: 7789514, u: 2123 }, { n: "GOTA", c: 9000000, u: 0 }, { n: "EFECTIVO", c: 10031000, u: 0 }], ing: 0, gas: 0 },
        SEP: { t: 34079724, a: [{ n: "QQQ", c: 4707464, u: 1283 }, { n: "BTC", c: 6897921, u: 1880 }, { n: "ETH", c: 11821862, u: 3222 }, { n: "FUTUROS", c: 2722477, u: 742 }, { n: "EFECTIVO", c: 430000, u: 0 }, { n: "GOTA", c: 7500000, u: 0 }], ing: 0, gas: 0 },
        OCT: { t: 34606012, a: [{ n: "QQQ", c: 4975309, u: 1356 }, { n: "BTC", c: 7066700, u: 1926 }, { n: "ETH", c: 10992644, u: 2996 }, { n: "FUTUROS", c: 2546360, u: 694 }, { n: "EFECTIVO", c: 1525000, u: 0 }, { n: "GOTA", c: 7500000, u: 0 }], ing: 0, gas: 0 },
        NOV: { t: 36667627, a: [{ n: "QQQ", c: 4945956, u: 1348 }, { n: "BTC", c: 6993317, u: 1906 }, { n: "ETH", c: 9616729, u: 2621 }, { n: "FUTUROS", c: 2443625, u: 666 }, { n: "EFECTIVO", c: 5168000, u: 0 }, { n: "GOTA", c: 7500000, u: 0 }], ing: 0, gas: 0 },
        DIC: { t: 48859057, a: [{ n: "QQQ", c: 5100058, u: 1390 }, { n: "BTC", c: 6171438, u: 1682 }, { n: "ETH", c: 8684776, u: 2367 }, { n: "SMALLCAPS", c: 9172767, u: 2500 }, { n: "EFECTIVO", c: 11199000, u: 0 }, { n: "GOTA", c: 7500000, u: 0 }, { n: "DOLARES FISICOS", c: 1031019, u: 281 }], ing: 0, gas: 0 },
      }
    },
    2026: {
      year: 2026, pi: 41140637, meta: 80000000, months: {
        ENE: { t: 41140637, a: [{ n: "QQQ", c: 5182313, u: 1395 }, { n: "SMALLCAPS", c: 9287300, u: 2500 }, { n: "BTC", c: 5386634, u: 1450 }, { n: "ETH", c: 6779729, u: 1825 }, { n: "DÓLARES", c: 1359661, u: 366 }, { n: "EFECTIVO", c: 5645000, u: 0 }, { n: "GOTA", c: 7500000, u: 0 }], ing: 0, gas: 0 },
        FEB: { t: 41958484, a: [{ n: "QQQ", c: 5003997, u: 1347 }, { n: "SMALLCAPS", c: 9276155, u: 2497 }, { n: "BTC", c: 4762527, u: 1282 }, { n: "ETH", c: 5862144, u: 1578 }, { n: "DÓLARES", c: 1359661, u: 366 }, { n: "EFECTIVO", c: 8194000, u: 0 }, { n: "GOTA", c: 7500000, u: 0 }], ing: 0, gas: 0 },
        MAR: { t: 43677967, a: [{ n: "QQQ", c: 5119160, u: 1378 }, { n: "SMALLCAPS", c: 8139390, u: 2191 }, { n: "BTC", c: 4959418, u: 1335 }, { n: "ETH", c: 6452816, u: 1737 }, { n: "DÓLARES/ARQ", c: 3581183, u: 964 }, { n: "EFECTIVO", c: 7926000, u: 0 }, { n: "GOTA", c: 7500000, u: 0 }], ing: 0, gas: 0 },
        ABR: { t: 48297035, a: [{ n: "QQQ", c: 5642963, u: 1519 }, { n: "SMALLCAPS", c: 7667595, u: 2064 }, { n: "BTC", c: 5616959, u: 1512 }, { n: "ETH", c: 6980335, u: 1879 }, { n: "DÓLARES/ARQ", c: 3581183, u: 964 }, { n: "EFECTIVO", c: 11308000, u: 0 }, { n: "GOTA", c: 7500000, u: 0 }], ing: 0, gas: 0 },
        MAY: { t: 0, a: [], ing: 0, gas: 0 }, JUN: { t: 0, a: [], ing: 0, gas: 0 }, JUL: { t: 0, a: [], ing: 0, gas: 0 },
        AGO: { t: 0, a: [], ing: 0, gas: 0 }, SEP: { t: 0, a: [], ing: 0, gas: 0 }, OCT: { t: 0, a: [], ing: 0, gas: 0 },
        NOV: { t: 0, a: [], ing: 0, gas: 0 }, DIC: { t: 0, a: [], ing: 0, gas: 0 },
      }
    }
  }
};

// ── Modal ─────────────────────────────────────────────────────────────────────
function Modal({ mes, data, onSave, onClose, dolar }) {
  const [activos, setAct] = useState(data.a?.length > 0 ? data.a.map(a => ({ ...a })) : [{ n: "", c: "", u: "" }]);
  const [ing, setIng] = useState(data.ing || "");
  const [gas, setGas] = useState(data.gas || "");
  const [showFlujo, setFlujo] = useState(false);

  const upd = (i, f, v) => {
    const a = [...activos];
    if (f === "u" && dolar && num(v) > 0) {
      a[i] = { ...a[i], u: v, c: Math.round(num(v) * dolar) };
    } else {
      a[i] = { ...a[i], [f]: v };
    }
    setAct(a);
  };

  const total = activos.reduce((s, a) => s + num(a.c), 0);
  const ahorro = num(ing) - num(gas);
  const tasa = num(ing) > 0 ? (ahorro / num(ing) * 100).toFixed(0) : null;

  const save = () => {
    const mapped = activos.filter(a => String(a.n).trim()).map(a => ({ n: String(a.n).trim(), c: num(a.c), u: num(a.u) }));
    onSave(mes, { t: total, a: mapped, ing: num(ing), gas: num(gas) });
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ margin: 0, background: "var(--accent-gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontSize: "1.45rem", fontWeight: 700 }}>Editar {mes}</h2>
          <button onClick={onClose} className="btn-secondary" style={{ padding: 0, width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifySelf: "center", justifyContent: "center", fontSize: "1.2rem" }}>×</button>
        </div>

        {/* Activos */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <p className="form-label" style={{ margin: 0 }}>Listado de Activos</p>
            <button onClick={() => setAct([...activos, { n: "", c: "", u: "" }])} className="btn-secondary" style={{ padding: "4px 10px", fontSize: "0.72rem", color: "var(--accent-cyan)", borderColor: "rgba(6,182,212,0.2)" }}>+ agregar</button>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "14px 2fr 2fr 1.3fr 14px", gap: "0 8px", marginBottom: 8 }}>
            {["", "activo", "COP", "USD", ""].map((h, i) => (
              <span key={i} style={{ color: "var(--text-muted)", fontSize: "0.58rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>{h}</span>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {activos.map((a, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "14px 2fr 2fr 1.3fr 14px", gap: "0 8px", alignItems: "center" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: gc(a.n), boxShadow: `0 0 8px ${gc(a.n)}` }} />
                <input value={a.n} onChange={e => upd(i, "n", e.target.value)} placeholder="BTC" className="form-input" style={{ padding: "8px 10px", fontSize: "0.8rem" }} />
                <input value={a.c} onChange={e => upd(i, "c", e.target.value)} placeholder="COP" className="form-input" style={{ padding: "8px 10px", fontSize: "0.8rem" }} type="number" />
                <input value={a.u} onChange={e => upd(i, "u", e.target.value)} placeholder="USD" className="form-input form-input-cyan" style={{ padding: "8px 10px", fontSize: "0.8rem" }} type="number" />
                <button onClick={() => setAct(activos.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "1.1rem", padding: 0 }} onMouseOver={e => e.currentTarget.style.color = "var(--color-danger)"} onMouseOut={e => e.currentTarget.style.color = "var(--text-muted)"}>×</button>
              </div>
            ))}
          </div>
          
          <p style={{ color: "var(--text-muted)", fontSize: "0.65rem", marginTop: 8, fontStyle: "italic" }}>
            💡 Ingresar USD calcula COP automáticamente a tasa de ${dolar?.toLocaleString("es-CO")}
          </p>
        </div>

        {/* Total */}
        <div style={{ background: "var(--color-success-bg)", border: "1px solid var(--color-success-border)", borderRadius: 12, padding: "14px 16px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "var(--text-secondary)", fontSize: "0.78rem", fontWeight: 500 }}>Total Calculado</span>
          <span className="mono-nums" style={{ color: "var(--color-success)", fontWeight: 700, fontSize: "1.15rem" }}>{fmt(total)}</span>
        </div>

        {/* Flujo colapsable */}
        <button onClick={() => setFlujo(!showFlujo)} className="btn-secondary" style={{ width: "100%", padding: "10px 14px", fontSize: "0.72rem", marginBottom: showFlujo ? 0 : 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Flujo de caja (ingresos / gastos)</span>
          <span style={{ fontSize: "0.6rem" }}>{showFlujo ? "▲" : "▼"}</span>
        </button>

        {showFlujo && (
          <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.04)", borderTop: "none", borderRadius: "0 0 12px 12px", padding: "16px 18px", marginBottom: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label className="form-label">Ingresos</label>
                <input value={ing} onChange={e => setIng(e.target.value)} placeholder="0" className="form-input" type="number" />
              </div>
              <div>
                <label className="form-label">Gastos</label>
                <input value={gas} onChange={e => setGas(e.target.value)} placeholder="0" className="form-input" type="number" />
              </div>
            </div>
            {tasa !== null && (
              <div style={{ marginTop: 12, display: "flex", gap: 16, borderTop: "1px solid rgba(255,255,255,0.03)", paddingTop: 10 }}>
                <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>Ahorro: <span className="mono-nums" style={{ color: ahorro >= 0 ? "var(--color-success)" : "var(--color-danger)", fontWeight: 600 }}>{fmt(ahorro)}</span></span>
                <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>Tasa: <span className="mono-nums" style={{ color: Number(tasa) >= 30 ? "var(--color-success)" : Number(tasa) >= 15 ? "var(--color-warning)" : "var(--color-danger)", fontWeight: 600 }}>{tasa}%</span></span>
              </div>
            )}
          </div>
        )}

        <button onClick={save} className="btn-primary" style={{ width: "100%" }}>
          Guardar {mes}
        </button>
      </div>
    </div>
  );
}

// ── Settings Modal ────────────────────────────────────────────────────────────
function SettingsModal({ yd, year, onSave, onClose }) {
  const [meta, setMeta] = useState(yd.meta || "");
  const [pi, setPi] = useState(yd.pi || "");
  const progress = num(meta) > 0 && num(pi) > 0 ? Math.min((num(pi) / num(meta)) * 100, 100) : 0;
  
  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 400 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ margin: 0, background: "var(--accent-gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontSize: "1.3rem", fontWeight: 700 }}>Configurar {year}</h2>
          <button onClick={onClose} className="btn-secondary" style={{ padding: 0, width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>×</button>
        </div>
        
        <div className="form-group">
          <label className="form-label">Patrimonio Inicial</label>
          <input value={pi} onChange={e => setPi(e.target.value)} placeholder="COP" className="form-input" type="number" />
          {num(pi) > 0 && <p className="mono-nums" style={{ color: "var(--text-secondary)", fontSize: "0.72rem", marginTop: 6 }}>{fmt(num(pi))}</p>}
        </div>
        
        <div className="form-group" style={{ marginBottom: 28 }}>
          <label className="form-label">Meta {year}</label>
          <input value={meta} onChange={e => setMeta(e.target.value)} placeholder="COP" className="form-input" type="number" />
          {num(meta) > 0 && (
            <div style={{ marginTop: 8 }}>
              <p className="mono-nums" style={{ color: "var(--text-secondary)", fontSize: "0.72rem", marginBottom: 8 }}>{fmt(num(meta))}</p>
              <div className="progress-bar-bg" style={{ height: 4 }}>
                <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
              </div>
              <p style={{ color: "var(--text-muted)", fontSize: "0.7rem", marginTop: 4 }}>{progress.toFixed(1)}% del camino recorrido</p>
            </div>
          )}
        </div>
        
        <button onClick={() => { onSave({ meta: num(meta), pi: num(pi) }); onClose(); }} className="btn-primary" style={{ width: "100%" }}>Guardar Configuración</button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [app, setApp] = useState(DATA);
  const [selM, setSelM] = useState("ABR");
  const [editing, setEditing] = useState(null);
  const [settings, setSettings] = useState(false);
  const [usd, setUsd] = useState(null);
  const [rateOk, setRateOk] = useState("loading");
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState("month");

  const yr = app.ay;
  const yd = app.years[yr];

  const [user, setUser] = useState(null);
  const [syncing, setSyncing] = useState(false);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        setSyncing(true);
        try {
          const cloud = await loadData(u.uid);
          if (cloud) setApp(cloud);
          else {
            try { const s = localStorage.getItem(KEY); if (s) setApp(JSON.parse(s)); } catch (_) { }
          }
        } catch (_) { }
        setSyncing(false);
      } else {
        try { const s = localStorage.getItem(KEY); if (s) setApp(JSON.parse(s)); } catch (_) { }
      }
      setLoaded(true);
    });
    return () => unsub();
  }, []);

  // Save: cloud if logged in, else localStorage
  useEffect(() => {
    if (!loaded) return;
    if (user) {
      saveData(user.uid, app).catch(_ => { });
    } else {
      try { localStorage.setItem(KEY, JSON.stringify(app)); } catch (_) { }
    }
  }, [app, loaded, user]);

  useEffect(() => {
    const fetch_rate = async () => {
      setRateOk("loading");
      try {
        const r = await fetch("https://api.frankfurter.dev/v2/latest?base=USD&symbols=COP");
        if (r.ok) {
          const d = await r.json();
          if (d?.rates?.COP) {
            setUsd(Math.round(d.rates.COP));
            setRateOk("ok");
            return;
          }
        }
      } catch (_) { }
      try {
        const r = await fetch("https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json");
        if (r.ok) {
          const d = await r.json();
          if (d?.usd?.cop) {
            setUsd(Math.round(d.usd.cop));
            setRateOk("ok");
            return;
          }
        }
      } catch (_) { }
      setRateOk("error");
    };
    fetch_rate();
    const t = setInterval(fetch_rate, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  const dolar = usd || 3900;
  const setYear = useCallback(y => setApp(p => ({ ...p, ay: y })), []);
  const addYear = useCallback(() => {
    const ys = Object.keys(app.years).map(Number);
    const ny = Math.max(...ys) + 1;
    const lp = lastP(app.years[Math.max(...ys)]);
    const nyd = emptyY(ny); nyd.pi = lp;
    setApp(p => ({ ...p, ay: ny, years: { ...p.years, [ny]: nyd } }));
  }, [app.years]);
  const saveMonth = useCallback((m, md) => {
    setApp(p => ({ ...p, years: { ...p.years, [yr]: { ...p.years[yr], months: { ...p.years[yr].months, [m]: md } } } }));
  }, [yr]);
  const saveSettings = useCallback(s => {
    setApp(p => ({ ...p, years: { ...p.years, [yr]: { ...p.years[yr], ...s } } }));
  }, [yr]);

  const fl = filled(yd);
  const lp = lastP(yd);
  const gYTD = yd.pi > 0 ? ((lp - yd.pi) / yd.pi) * 100 : 0;
  const mp = yd.meta > 0 && lp > 0 ? Math.min((lp / yd.meta) * 100, 100) : 0;
  const prj = proj(yd);

  const chartData = useMemo(() => MONTHS.map(m => ({ m, v: yd.months[m].t || null })).filter(d => d.v), [yd]);

  const selData = yd.months[selM];
  const selIdx = MONTHS.indexOf(selM);
  const prevM = selIdx > 0 ? MONTHS[selIdx - 1] : null;
  const prevPat = prevM ? yd.months[prevM].t : 0;
  const mg = prevPat > 0 && selData.t > 0 ? ((selData.t - prevPat) / prevPat) * 100 : null;
  const totalA = selData.a.reduce((s, a) => s + a.c, 0);
  const secData = sects(selData.a);
  const ing = selData.ing || 0, gas = selData.gas || 0, aho = ing - gas;
  const tasa = ing > 0 ? (aho / ing * 100) : null;
  const alerts = [];
  
  selData.a.forEach(a => {
    const p = totalA > 0 ? (a.c / totalA) * 100 : 0;
    if (p > 40) alerts.push({ msg: `${a.n} representa el ${p.toFixed(0)}% de tu portafolio`, color: "var(--color-warning)" });
  });
  if (tasa !== null && tasa < 15) alerts.push({ msg: `Tasa de ahorro sub-óptima (${tasa.toFixed(0)}%)`, color: "var(--color-danger)" });

  const histData = useMemo(() => {
    const ys = Object.keys(app.years).sort().map(Number);
    return MONTHS.map(m => {
      const p = { m };
      ys.forEach(y => { const v = app.years[y].months[m]?.t; if (v > 0) p[y] = v; });
      return p;
    }).filter(p => Object.keys(p).length > 1);
  }, [app]);

  const projData = useMemo(() => {
    if (!prj) return [];
    const lastIdx = fl.length > 0 ? MONTHS.indexOf(fl[fl.length - 1]) : -1;
    return MONTHS.map((m, i) => {
      const real = yd.months[m].t || null;
      let pv = null;
      if (i > lastIdx && fl.length >= 2) {
        const last = lp, first = yd.months[fl[0]].t;
        const mg2 = (last - first) / Math.max(fl.length - 1, 1);
        pv = last + mg2 * (i - lastIdx);
        if (pv < 0) pv = null;
      }
      return { m, real, pv };
    });
  }, [yd, prj, fl, lp]);

  const tip = color => ({ active, payload }) => !active || !payload?.length ? null : (
    <div style={{ background: "rgba(5, 5, 12, 0.95)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 10, padding: "8px 12px", backdropFilter: "blur(12px)", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 4px", fontSize: "0.68rem", fontWeight: 600 }}>{payload[0]?.payload?.m}</p>
      <p className="mono-nums" style={{ color: color, margin: 0, fontWeight: 700, fontSize: "0.9rem" }}>{fmt(payload[0]?.value)}</p>
    </div>
  );

  const multiTip = ({ active, payload, label }) => !active || !payload?.length ? null : (
    <div style={{ background: "rgba(5, 5, 12, 0.95)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 10, padding: "10px 14px", backdropFilter: "blur(12px)", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
      <p style={{ color: "var(--text-secondary)", margin: "0 0 6px", fontSize: "0.68rem", fontWeight: 600 }}>{label}</p>
      {payload.filter(p => p.value).map((p, i) => (
        <p key={i} className="mono-nums" style={{ color: p.name === "pv" ? "var(--color-warning)" : yc(Number(p.dataKey)), margin: "3px 0", fontWeight: 600, fontSize: "0.8rem" }}>
          {p.name === "pv" ? "↗ proyección" : p.dataKey}: {fmt(p.value)}
        </p>
      ))}
    </div>
  );

  const rc = rateOk === "ok" ? "var(--color-success)" : rateOk === "loading" ? "var(--color-warning)" : "var(--color-danger)";
  const ycc = yc(yr);

  return (
    <div style={{ position: "relative", overflow: "hidden", minHeight: "100vh" }}>
      {/* Decorative Orbs */}
      <div className="bg-orb-1" />
      <div className="bg-orb-2" />

      <div className="app-container">
        
        {/* ── Header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
          <div>
            <p style={{ color: "var(--accent-cyan)", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 6 }}>Patrimonio Personal</p>
            <h1 style={{ margin: 0, fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.03em", background: "linear-gradient(to right, #ffffff, var(--text-secondary))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Vault Tracker</h1>
          </div>
          
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            
            {/* Google Authentication */}
            {user ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, padding: "5px 12px" }}>
                <img src={user.photoURL} alt="" style={{ width: 22, height: 22, borderRadius: "50%", border: "1px solid var(--accent-violet)" }} />
                <span style={{ color: "var(--text-primary)", fontSize: "0.78rem", fontWeight: 500, maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.displayName?.split(" ")[0]}</span>
                <button onClick={logout} className="btn-secondary" style={{ padding: "2px 6px", fontSize: "0.68rem", border: "none", background: "transparent" }}>salir</button>
              </div>
            ) : (
              <button onClick={loginGoogle} className="btn-secondary" style={{ gap: 8, fontSize: "0.78rem" }}>
                <svg width="14" height="14" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                Conectar
              </button>
            )}
            
            {syncing && <span style={{ color: "var(--text-muted)", fontSize: "0.68rem", animation: "pulseGlow 1.5s infinite" }}>sincronizando...</span>}
            
            {/* PDF Exporter */}
            <button onClick={() => {
              const fl2 = filled(yd), lp2 = lastP(yd), g = yd.pi > 0 ? ((lp2 - yd.pi) / yd.pi * 100).toFixed(1) : 0, prj2 = proj(yd);
              const rows = fl2.map(m => { const d = yd.months[m], pv = MONTHS[MONTHS.indexOf(m) - 1], pp = pv ? yd.months[pv]?.t : 0, pct = pp > 0 ? ((d.t - pp) / pp * 100).toFixed(1) : "—"; return `<tr><td>${m}</td><td>${fmt(d.t)}</td><td>${fmtU(Math.round(d.t / dolar))}</td><td style="color:${Number(pct) >= 0 ? '#10b981' : '#ef4444'}">${pct !== "—" ? (Number(pct) >= 0 ? "+" : "") + pct + "%" : "—"}</td></tr>`; }).join("");
              const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Reporte Patrimonio ${yr}</title><style>body{font-family:'Helvetica Neue',sans-serif;color:#0f172a;padding:40px;max-width:800px;margin:0 auto}h1{font-size:1.8rem;margin-bottom:4px;font-weight:700;color:#1e1b4b}p.sub{color:#64748b;font-size:0.85rem;margin-bottom:28px}.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:28px}.kpi{background:#f8fafc;border-radius:12px;padding:14px;border:1px solid #e2e8f0}.kpi label{display:block;font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:#94a3b8;margin-bottom:4px}.kpi span{font-size:0.95rem;font-weight:700;color:#0f172a}table{width:100%;border-collapse:collapse;font-size:0.85rem}th{text-align:left;padding:10px;border-bottom:2px solid #e2e8f0;font-size:0.68rem;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8}td{padding:12px 10px;border-bottom:1px solid #f1f5f9}</style></head><body><h1>Patrimonio Personal — Año ${yr}</h1><p class="sub">Tasa oficial: USD/COP $${dolar.toLocaleString()} · Generado el ${new Date().toLocaleDateString("es-CO")}</p><div class="kpis"><div class="kpi"><label>Patrimonio Inicial</label><span>${fmt(yd.pi)}</span></div><div class="kpi"><label>Actual</label><span>${fmt(lp2)}</span></div><div class="kpi"><label>Rendimiento YTD</label><span style="color:${Number(g) >= 0 ? '#10b981' : '#ef4444'}">${(Number(g) >= 0 ? "+" : "") + g}%</span></div><div class="kpi"><label>Proyección Diciembre</label><span style="color:#d97706">${prj2 ? fmt(Math.round(prj2)) : "—"}</span></div></div><table><thead><tr><th>Mes</th><th>COP</th><th>USD</th><th>Variación</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
              const w = window.open("", "_blank"); w.document.write(html); w.document.close(); setTimeout(() => w.print(), 400);
            }} className="btn-secondary">
              Reporte PDF
            </button>
            
            {/* Live Exchange Status Indicator */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, padding: "5px 12px" }}>
              <div className="live-pulse-dot" style={{ background: rc }} />
              <div>
                <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.5rem", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>USD/COP</p>
                <p className="mono-nums" style={{ margin: 0, fontSize: "0.82rem", fontWeight: 600, color: rateOk === "ok" ? "var(--accent-cyan)" : "var(--text-secondary)" }}>${dolar.toLocaleString("es-CO")}</p>
              </div>
            </div>

          </div>
        </div>

        {/* ── Year + View selectors ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          
          <div className="year-pills-container">
            {Object.keys(app.years).sort().map(y => {
              const yn = Number(y), active = yn === yr, c = yc(yn);
              return (
                <button key={y} onClick={() => setYear(yn)} className={`year-pill ${active ? "active" : ""}`} style={active ? { color: c, background: `${c}10`, boxShadow: `inset 0 0 0 1px ${c}25` } : {}}>
                  {y}
                </button>
              );
            })}
            <button onClick={addYear} className="year-pill" style={{ border: "1px dashed rgba(255,255,255,0.08)", borderRadius: 8, padding: "5px 12px", fontSize: "0.72rem", color: "var(--text-muted)" }}>+ año</button>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div className="tab-container">
              {[["month", "Vista Mensual"], ["summary", "Análisis Anual"]].map(([v, l]) => (
                <button key={v} onClick={() => setView(v)} className={`tab-btn ${view === v ? "active" : ""}`}>{l}</button>
              ))}
            </div>
            
            <button onClick={() => setSettings(true)} className="btn-secondary" style={{ padding: 0, width: 32, height: 32, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.95rem" }} title="Configuración de metas">⚙</button>
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div className="kpi-container">
          {[
            { label: "Patrimonio Neto", val: lp > 0 ? fmt(lp) : "—", sub: lp > 0 ? fmtU(Math.round(lp / dolar)) : "esperando datos...", isGrowth: null },
            { label: "Rendimiento YTD", val: lp > 0 ? fmtP(gYTD) : "—", sub: lp > 0 ? fmt(lp - yd.pi) : "", isGrowth: gYTD >= 0 },
            { label: `Meta de Ahorro ${yr}`, val: yd.meta > 0 ? fmt(yd.meta) : "Sin definir", sub: yd.meta > 0 ? `${mp.toFixed(1)}% completado` : "click en ⚙ para agregar", isGrowth: null },
          ].map((k, i) => (
            <div key={i} className={`glass-card kpi-card ${i === 1 && k.val !== "—" ? (k.isGrowth ? "glass-card-cyan" : "") : ""}`}>
              <p className="kpi-label">{k.label}</p>
              <p className={`kpi-value ${k.isGrowth !== null ? (k.isGrowth ? "growth" : "loss") : ""}`}>{k.val}</p>
              <p className="kpi-subtext mono-nums">{k.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Meta progress bar ── */}
        {yd.meta > 0 && lp > 0 && (
          <div className="meta-status-container glass-card">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, alignItems: "center" }}>
              <span className="form-label" style={{ fontSize: "0.62rem", margin: 0 }}>Avance hacia la meta</span>
              <span className="mono-nums" style={{ color: "var(--accent-cyan)", fontSize: "0.8rem", fontWeight: 700 }}>{mp.toFixed(1)}%</span>
            </div>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: `${mp}%`, background: `linear-gradient(90deg, ${ycc} 0%, var(--accent-cyan) 100%)` }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, alignItems: "center" }}>
              <span className="mono-nums" style={{ color: "var(--text-muted)", fontSize: "0.65rem" }}>{fmt(lp)}</span>
              {prj && (
                <span style={{ color: "var(--text-secondary)", fontSize: "0.72rem" }}>
                  Proyección DIC: <span className="mono-nums" style={{ color: "var(--color-warning)", fontWeight: 600 }}>{fmt(Math.round(prj))}</span>
                  <span style={{ color: prj >= yd.meta ? "var(--color-success)" : "var(--color-danger)", marginLeft: 8, fontSize: "0.68rem", fontWeight: 500 }}>
                    {prj >= yd.meta ? "✓ Alcanzable" : `Faltan ${fmt(Math.round(yd.meta - prj))}`}
                  </span>
                </span>
              )}
              <span className="mono-nums" style={{ color: "var(--text-muted)", fontSize: "0.65rem" }}>{fmt(yd.meta)}</span>
            </div>
          </div>
        )}

        {/* ── Chart (month view) ── */}
        {view === "month" && chartData.length > 1 && (
          <div className="glass-card" style={{ marginBottom: 20 }}>
            <p className="kpi-label" style={{ marginBottom: 16 }}>Gráfico de evolución temporal</p>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chartData} margin={{ left: -10, right: 10, top: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={ycc} stopOpacity={0.12} />
                    <stop offset="95%" stopColor={ycc} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="m" tick={{ fill: "var(--text-muted)", fontSize: 10, fontWeight: 500 }} axisLine={false} tickLine={false} />
                <YAxis hide domain={['auto', 'auto']} />
                <Tooltip content={tip(ycc)} cursor={{ stroke: "rgba(255,255,255,0.04)" }} />
                <Area type="monotone" dataKey="v" stroke={ycc} strokeWidth={1.5} fill="url(#areaGrad)" dot={{ fill: ycc, r: 2.5, strokeWidth: 0 }} activeDot={{ r: 4.5, fill: ycc, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── Month selector ── */}
        {view === "month" && (
          <>
            <div className="month-pills-grid">
              {MONTHS.map(m => {
                const has = yd.months[m]?.t > 0, active = m === selM;
                return (
                  <button key={m} onClick={() => setSelM(m)} className={`month-pill ${active ? "active" : ""}`} style={active ? { color: ycc, borderColor: `${ycc}40`, background: `${ycc}08`, boxShadow: `0 0 16px ${ycc}10` } : {}}>
                    <span className="mono-nums">{m}</span>
                    {has && <span className="month-dot" style={active ? { background: ycc, boxShadow: `0 0 6px ${ycc}` } : { background: "var(--color-success)" }} />}
                  </button>
                );
              })}
            </div>

            {/* Month detail card */}
            <div className="glass-card" style={{ padding: "26px 28px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                    <h2 style={{ margin: 0, fontSize: "1.45rem", fontWeight: 700, color: "white" }}>Balance de {selM} {yr}</h2>
                    {mg !== null && <span className="mono-nums" style={{ fontSize: "0.8rem", color: mg >= 0 ? "var(--color-success)" : "var(--color-danger)", fontWeight: 600 }}>{fmtP(mg)}</span>}
                  </div>
                  {selData.t > 0 && <p className="mono-nums" style={{ color: "var(--text-secondary)", margin: "4px 0 0", fontSize: "0.8rem" }}>{fmt(selData.t)} · {fmtU(Math.round(selData.t / dolar))}</p>}
                </div>
                <button onClick={() => setEditing(selM)} className="btn-secondary btn-action-edit">
                  ✎ Editar balances
                </button>
              </div>

              {selData.a.length > 0 ? (
                <>
                  {alerts.map((al, i) => (
                    <div key={i} className="alert-box" style={{ background: al.color === "var(--color-danger)" ? "var(--color-danger-bg)" : "var(--color-warning-bg)", borderColor: al.color === "var(--color-danger)" ? "var(--color-danger-border)" : "var(--color-warning-border)" }}>
                      <span style={{ color: al.color, fontSize: "0.85rem", fontWeight: "bold" }}>⚠</span>
                      <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>{al.msg}</span>
                    </div>
                  ))}

                  {(ing > 0 || gas > 0) && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20, padding: "16px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      {[
                        { l: "ingresos del mes", v: fmt(ing), c: "var(--color-success)" },
                        { l: "gastos del mes", v: fmt(gas), c: "var(--color-danger)" },
                        { l: "tasa de ahorro", v: tasa !== null ? `${tasa.toFixed(0)}%` : "—", c: tasa >= 30 ? "var(--color-success)" : tasa >= 15 ? "var(--color-warning)" : "var(--color-danger)", s: fmt(aho) },
                      ].map((k, i) => (
                        <div key={i}>
                          <p className="form-label" style={{ fontSize: "0.58rem", marginBottom: 4 }}>{k.l}</p>
                          <p className="mono-nums" style={{ color: k.c, fontSize: "0.95rem", fontWeight: 700 }}>{k.v}</p>
                          {k.s && <p className="mono-nums" style={{ color: "var(--text-muted)", fontSize: "0.72rem", marginTop: 2 }}>{k.s}</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Allocation bar */}
                  <div style={{ display: "flex", height: 5, borderRadius: 10, overflow: "hidden", marginBottom: 20, gap: 1 }}>
                    {selData.a.map((a, i) => (
                      <div key={i} title={`${a.n}: ${totalA > 0 ? ((a.c / totalA) * 100).toFixed(1) : 0}%`}
                        style={{ width: `${totalA > 0 ? (a.c / totalA) * 100 : 0}%`, background: gc(a.n), boxShadow: `0 0 6px ${gc(a.n)}50` }} />
                    ))}
                  </div>

                  {/* ── Donut chart — distribución % ── */}
                  <div style={{ background: "rgba(255, 255, 255, 0.01)", border: "1px solid rgba(255, 255, 255, 0.03)", borderRadius: 16, padding: "20px", marginBottom: 20 }}>
                    <p className="form-label" style={{ marginBottom: 16 }}>Distribución del portafolio</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap" }}>
                      {/* SVG donut grande */}
                      <svg width="120" height="120" viewBox="0 0 140 140" style={{ flexShrink: 0, margin: "0 auto" }}>
                        {(() => {
                          const r = 54, cx = 70, cy = 70, stroke = 14;
                          const circ = 2 * Math.PI * r;
                          let offset = 0;
                          const sorted = [...selData.a].sort((a, b) => b.c - a.c);
                          return sorted.map((a, i) => {
                            const pct = totalA > 0 ? a.c / totalA : 0;
                            const dash = pct * circ;
                            const gap = circ - dash;
                            const el = (
                              <circle key={i} cx={cx} cy={cy} r={r}
                                fill="none" stroke={gc(a.n)} strokeWidth={stroke}
                                strokeDasharray={`${dash} ${gap}`}
                                strokeDashoffset={-offset * circ}
                                strokeLinecap="butt"
                                style={{ transform: "rotate(-90deg)", transformOrigin: "70px 70px" }}
                              />
                            );
                            offset += pct;
                            return el;
                          });
                        })()}
                        <text x="70" y="66" textAnchor="middle" fill="#ffffff" fontSize="16" fontWeight="700" fontFamily="'JetBrains Mono', monospace">{selData.a.length}</text>
                        <text x="70" y="80" textAnchor="middle" fill="var(--text-secondary)" fontSize="9" fontWeight="600" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>activos</text>
                      </svg>
                      
                      {/* Legend */}
                      <div style={{ flex: 1, display: "grid", gridTemplateColumns: selData.a.length > 5 ? "1fr 1fr" : "1fr", gap: "8px 24px", minWidth: 200 }}>
                        {[...selData.a].sort((a, b) => b.c - a.c).map((a, i) => {
                          const pct = totalA > 0 ? ((a.c / totalA) * 100).toFixed(1) : 0;
                          return (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                              <div style={{ width: 8, height: 8, borderRadius: "50%", background: gc(a.n), flexShrink: 0, boxShadow: `0 0 8px ${gc(a.n)}40` }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                                  <span style={{ color: "var(--text-primary)", fontSize: "0.78rem", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.n}</span>
                                  <span className="mono-nums" style={{ color: gc(a.n), fontSize: "0.75rem", fontWeight: 700 }}>{pct}%</span>
                                </div>
                                <div style={{ marginTop: 4, height: 2, borderRadius: 2, background: "rgba(255,255,255,0.03)", overflow: "hidden" }}>
                                  <div style={{ width: `${pct}%`, height: "100%", background: gc(a.n), opacity: 0.8 }} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Assets Grid List */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "16px 1.5fr 1fr 90px", gap: "0 12px", paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      {["", "activo", "COP", "USD"].map((h, i) => <span key={i} className="form-label" style={{ fontSize: "0.58rem", margin: 0 }}>{h}</span>)}
                    </div>
                    
                    {selData.a.map((a, i) => {
                      const pct = totalA > 0 ? ((a.c / totalA) * 100).toFixed(1) : 0;
                      const high = Number(pct) > 40;
                      return (
                        <div key={i} className="asset-grid-row">
                          <div style={{ display: "flex", alignItems: "center" }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: gc(a.n), boxShadow: high ? `0 0 8px ${gc(a.n)}` : undefined }} />
                          </div>
                          <span style={{ color: "#ffffff", fontSize: "0.82rem", fontWeight: 600 }}>{a.n}</span>
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span className="mono-nums" style={{ color: "var(--text-primary)", fontSize: "0.8rem", fontWeight: 500 }}>{fmt(a.c)}</span>
                            <span className="mono-nums" style={{ color: high ? "var(--color-warning)" : "var(--text-muted)", fontSize: "0.65rem", fontWeight: 500 }}>{pct}% del total</span>
                          </div>
                          <span className="mono-nums" style={{ color: "var(--text-secondary)", fontSize: "0.78rem" }}>{a.u > 0 ? fmtU(a.u) : "—"}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Sectors */}
                  {Object.keys(secData).length > 0 && (
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 24, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                      {Object.entries(secData).map(([s, v], i) => {
                        const sc = { Acciones: "var(--accent-violet)", Crypto: "var(--color-warning)", Liquidez: "var(--text-secondary)", GOTA: "#f43f5e" };
                        const c = sc[s] || "#64748b";
                        const pct = totalA > 0 ? ((v / totalA) * 100).toFixed(1) : 0;
                        return (
                          <div key={i} className="sector-badge">
                            <p className="form-label" style={{ color: "var(--text-muted)", fontSize: "0.58rem", marginBottom: 2 }}>{s}</p>
                            <p className="mono-nums" style={{ color: c, fontSize: "0.88rem", fontWeight: 700 }}>{fmt(v)}</p>
                            <p className="mono-nums" style={{ color: "var(--text-secondary)", fontSize: "0.65rem", marginTop: 2 }}>{pct}%</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ textAlign: "center", padding: "40px 20px" }}>
                  <p style={{ color: "var(--text-muted)", fontSize: "2rem", margin: "0 0 12px" }}>○</p>
                  <p style={{ color: "var(--text-secondary)", margin: "0 0 16px", fontSize: "0.85rem" }}>Sin balances registrados para {selM} {yr}</p>
                  <button onClick={() => setEditing(selM)} className="btn-primary" style={{ padding: "8px 20px", fontSize: "0.8rem" }}>+ agregar datos</button>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Summary view ── */}
        {view === "summary" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            
            {/* Multi-year evolution */}
            {histData.length > 1 && (
              <div className="glass-card">
                <p className="kpi-label" style={{ marginBottom: 16 }}>Comparativa Histórica Multi-Año</p>
                <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
                  {Object.keys(app.years).sort().map(y => (
                    <div key={y} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 14, height: 2, background: yc(Number(y)), borderRadius: 1 }} />
                      <span className="mono-nums" style={{ color: "var(--text-secondary)", fontSize: "0.72rem", fontWeight: 600 }}>{y}</span>
                    </div>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={histData} margin={{ left: -10, right: 10, top: 4, bottom: 0 }}>
                    <XAxis dataKey="m" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis hide domain={['auto', 'auto']} />
                    <Tooltip content={multiTip} cursor={{ stroke: "rgba(255,255,255,0.03)" }} />
                    {Object.keys(app.years).sort().map(y => (
                      <Line key={y} type="monotone" dataKey={String(y)} stroke={yc(Number(y))} strokeWidth={1.5}
                        dot={{ fill: yc(Number(y)), r: 2, strokeWidth: 0 }} activeDot={{ r: 4 }} connectNulls />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Current projection chart */}
            {fl.length >= 2 && prj && (
              <div className="glass-card">
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 16, alignItems: "center" }}>
                  <p className="kpi-label" style={{ margin: 0 }}>Real vs Proyección Lineal {yr}</p>
                  <p className="mono-nums" style={{ color: "var(--color-warning)", fontWeight: 700, margin: 0, fontSize: "0.95rem" }}>Dic Proyectado: {fmt(Math.round(prj))}</p>
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={projData} margin={{ left: -10, right: 10, top: 4, bottom: 0 }}>
                    <XAxis dataKey="m" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis hide domain={['auto', 'auto']} />
                    <Tooltip content={multiTip} cursor={{ stroke: "rgba(255,255,255,0.03)" }} />
                    {yd.meta > 0 && <ReferenceLine y={yd.meta} stroke="rgba(16, 185, 129, 0.25)" strokeDasharray="5 5" />}
                    <Line type="monotone" dataKey="real" stroke={ycc} strokeWidth={2} dot={{ fill: ycc, r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} connectNulls name={String(yr)} />
                    <Line type="monotone" dataKey="pv" stroke="var(--color-warning)" strokeWidth={1.5} strokeDasharray="6 4" dot={{ fill: "var(--color-warning)", r: 2.5, strokeWidth: 0 }} activeDot={{ r: 4 }} connectNulls name="pv" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Annual comparison table */}
            <div className="glass-card" style={{ padding: "24px 28px" }}>
              <p className="kpi-label" style={{ marginBottom: 16 }}>Resumen de Métricas Anuales</p>
              <div style={{ overflowX: "auto" }}>
                <table className="summary-table">
                  <thead>
                    <tr>
                      <th>métrica</th>
                      {Object.keys(app.years).sort().map(y => <th key={y} className="mono-nums" style={{ color: yc(Number(y)), textAlign: "right" }}>{y}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { l: "patrimonio inicial", fn: y => fmt(app.years[y].pi) },
                      { l: "patrimonio de cierre", fn: y => { const l = lastP(app.years[y]); return l > 0 ? fmt(l) : "en progreso"; } },
                      { l: "variación anual", fn: y => { const l = lastP(app.years[y]); if (!l) return "—"; const p = ((l - app.years[y].pi) / app.years[y].pi) * 100; return <span className="mono-nums" style={{ color: p >= 0 ? "var(--color-success)" : "var(--color-danger)", fontWeight: 600 }}>{fmtP(p)}</span>; } },
                      { l: "meta anual de ahorro", fn: y => app.years[y].meta > 0 ? fmt(app.years[y].meta) : "sin meta" },
                      { l: "patrimonio (USD)", fn: y => { const l = lastP(app.years[y]); return l > 0 ? fmtU(Math.round(l / dolar)) : "—"; } },
                    ].map((row, i) => (
                      <tr key={i}>
                        <td style={{ color: "var(--text-secondary)", fontWeight: 500 }}>{row.l}</td>
                        {Object.keys(app.years).sort().map(y => <td key={y} className="mono-nums" style={{ color: "var(--text-primary)", textAlign: "right", fontWeight: 500 }}>{row.fn(Number(y))}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.6rem", marginTop: 32, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          Vault Tracker v2 · {rateOk === "ok" ? "TASA CONECTADA EN VIVO" : "MODO SIN CONEXIÓN"} · SEGURIDAD LOCAL + NUBE GOOGLE ACTIVA
        </p>
      </div>

      {editing && <Modal mes={editing} data={yd.months[editing]} onSave={saveMonth} onClose={() => setEditing(null)} dolar={dolar} />}
      {settings && <SettingsModal yd={yd} year={yr} onSave={saveSettings} onClose={() => setSettings(false)} />}
    </div>
  );
}
