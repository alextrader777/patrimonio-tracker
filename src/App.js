import { useState, useEffect, useMemo, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, AreaChart, Area } from "recharts";
import { auth, db, loginGoogle, logout, loadData, saveData } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";

const MONTHS = ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SEP","OCT","NOV","DIC"];
const KEY = "patrimonio_lg_v1";

const ACOLORS = {
  QQQ:"#818cf8",SMALLCAPS:"#34d399",BTC:"#f59e0b",ETH:"#c084fc",
  "DÓLARES":"#60a5fa","DÓLARES/ARQ":"#60a5fa","DOLLAR":"#60a5fa","DOLARAPP":"#60a5fa",
  "DOLARES FISICOS":"#60a5fa",EFECTIVO:"#94a3b8",GOTA:"#f472b6",
  VOO:"#38bdf8",NU:"#2dd4bf",FUTUROS:"#fb7185",GOOGL:"#86efac",
  NVDA:"#a78bfa",TSLA:"#fcd34d",BASE:"#e2e8f0","BASE ACCIONES":"#e2e8f0",D:"#64748b"
};
const YCOLS = {2025:"#818cf8",2026:"#34d399",2027:"#f59e0b",2028:"#f472b6"};
const SECTORS = {
  Acciones:["QQQ","SMALLCAPS","VOO","NU","GOOGL","NVDA","TSLA","BASE","BASE ACCIONES"],
  Crypto:["BTC","ETH"],
  Liquidez:["EFECTIVO","DÓLARES","DÓLARES/ARQ","DOLLAR","DOLARAPP","DOLARES FISICOS","FUTUROS"],
  GOTA:["GOTA"],
};

const gc = n => ACOLORS[n]||ACOLORS.D;
const yc = y => YCOLS[y]||"#94a3b8";
const fmt = n => n>0?new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0}).format(n):n<0?`-${new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0}).format(Math.abs(n))}`:"—";
const fmtU = n => n>0?`$${new Intl.NumberFormat("en-US",{maximumFractionDigits:0}).format(n)}`:"—";
const fmtP = n => `${n>=0?"+":""}${n.toFixed(1)}%`;
const num = v => { const n=parseFloat(String(v).replace(/[^0-9.-]/g,"")); return isNaN(n)?0:n; };
const emptyY = y => ({year:y,pi:0,meta:0,months:Object.fromEntries(MONTHS.map(m=>[m,{t:0,a:[],ing:0,gas:0}]))});
const filled = yd => MONTHS.filter(m=>yd.months[m]?.t>0);
const lastP = yd => { const f=filled(yd); return f.length?yd.months[f[f.length-1]].t:0; };
const proj = yd => {
  const f=filled(yd); if(f.length<2)return null;
  const last=yd.months[f[f.length-1]].t, first=yd.months[f[0]].t;
  const mg=(last-first)/Math.max(f.length-1,1), left=12-MONTHS.indexOf(f[f.length-1])-1;
  return last+mg*left;
};
const sects = activos => {
  const r={};
  for(const [s,ns] of Object.entries(SECTORS)){
    const v=activos.filter(a=>ns.includes(a.n)).reduce((x,a)=>x+a.c,0);
    if(v>0) r[s]=v;
  }
  return r;
};

const DATA = {
  ay:2026,
  years:{
    2025:{year:2025,pi:26994146,meta:50000000,months:{
      ENE:{t:26994146,a:[{n:"VOO",c:513675,u:140},{n:"NU",c:3474644,u:947},{n:"BTC",c:726483,u:198},{n:"ETH",c:517344,u:141},{n:"EFECTIVO",c:11262000,u:0},{n:"GOTA",c:10500000,u:0}],ing:0,gas:0},
      FEB:{t:27400776,a:[{n:"VOO",c:517344,u:141},{n:"NU",c:4417605,u:1204},{n:"BTC",c:759505,u:207},{n:"ETH",c:484322,u:132},{n:"EFECTIVO",c:10722000,u:0},{n:"GOTA",c:10500000,u:0}],ing:0,gas:0},
      MAR:{t:28234402,a:[{n:"VOO",c:2513338,u:685},{n:"QQQ",c:2638088,u:719},{n:"NVDA",c:154102,u:42},{n:"NU",c:3738820,u:1019},{n:"GOOGL",c:649432,u:177},{n:"BTC",c:612741,u:167},{n:"ETH",c:322881,u:88},{n:"EFECTIVO",c:8605000,u:0},{n:"GOTA",c:9000000,u:0}],ing:0,gas:0},
      ABR:{t:30404935,a:[{n:"VOO",c:2726146,u:743},{n:"NU",c:3467306,u:945},{n:"GOOGL",c:796196,u:217},{n:"NVDA",c:143095,u:39},{n:"QQQ",c:3184785,u:868},{n:"BTC",c:983321,u:268},{n:"ETH",c:631086,u:172},{n:"EFECTIVO",c:9473000,u:0},{n:"GOTA",c:9000000,u:0}],ing:0,gas:0},
      MAY:{t:33709870,a:[{n:"VOO",c:2770176,u:755},{n:"QQQ",c:3716805,u:1013},{n:"NVDA",c:150433,u:41},{n:"NU",c:4193789,u:1143},{n:"GOOGL",c:825549,u:225},{n:"BTC",c:2707801,u:738},{n:"ETH",c:634755,u:173},{n:"BASE ACCIONES",c:289859,u:79},{n:"DOLARAPP",c:3562703,u:971},{n:"EFECTIVO",c:5858000,u:0},{n:"GOTA",c:9000000,u:0}],ing:0,gas:0},
      JUN:{t:37964315,a:[{n:"VOO",c:2905933,u:792},{n:"QQQ",c:4278178,u:1166},{n:"NU",c:3977312,u:1084},{n:"GOOGL",c:884255,u:241},{n:"NVDA",c:183455,u:50},{n:"BTC",c:4531347,u:1235},{n:"ETH",c:4978978,u:1357},{n:"DOLLAR",c:3294858,u:898},{n:"EFECTIVO",c:3930000,u:0},{n:"GOTA",c:9000000,u:0}],ing:0,gas:0},
      JUL:{t:42924239,a:[{n:"GOOGL",c:906269,u:247},{n:"TSLA",c:179786,u:49},{n:"VOO",c:3041689,u:829},{n:"QQQ",c:4524009,u:1233},{n:"BASE",c:4424943,u:1206},{n:"BTC",c:4865236,u:1326},{n:"ETH",c:4971640,u:1355},{n:"FUTUROS",c:3008668,u:820},{n:"GOTA",c:9000000,u:0},{n:"EFECTIVO",c:8002000,u:0}],ing:0,gas:0},
      AGO:{t:47162041,a:[{n:"TSLA",c:183455,u:50},{n:"GOOGL",c:975982,u:266},{n:"VOO",c:3107733,u:847},{n:"QQQ",c:4582714,u:1249},{n:"FUTUROS",c:2843558,u:775},{n:"DOLLAR",c:3364571,u:917},{n:"BTC",c:5283514,u:1440},{n:"ETH",c:7789514,u:2123},{n:"GOTA",c:9000000,u:0},{n:"EFECTIVO",c:10031000,u:0}],ing:0,gas:0},
      SEP:{t:34079724,a:[{n:"QQQ",c:4707464,u:1283},{n:"BTC",c:6897921,u:1880},{n:"ETH",c:11821862,u:3222},{n:"FUTUROS",c:2722477,u:742},{n:"EFECTIVO",c:430000,u:0},{n:"GOTA",c:7500000,u:0}],ing:0,gas:0},
      OCT:{t:34606012,a:[{n:"QQQ",c:4975309,u:1356},{n:"BTC",c:7066700,u:1926},{n:"ETH",c:10992644,u:2996},{n:"FUTUROS",c:2546360,u:694},{n:"EFECTIVO",c:1525000,u:0},{n:"GOTA",c:7500000,u:0}],ing:0,gas:0},
      NOV:{t:36667627,a:[{n:"QQQ",c:4945956,u:1348},{n:"BTC",c:6993317,u:1906},{n:"ETH",c:9616729,u:2621},{n:"FUTUROS",c:2443625,u:666},{n:"EFECTIVO",c:5168000,u:0},{n:"GOTA",c:7500000,u:0}],ing:0,gas:0},
      DIC:{t:48859057,a:[{n:"QQQ",c:5100058,u:1390},{n:"BTC",c:6171438,u:1682},{n:"ETH",c:8684776,u:2367},{n:"SMALLCAPS",c:9172767,u:2500},{n:"EFECTIVO",c:11199000,u:0},{n:"GOTA",c:7500000,u:0},{n:"DOLARES FISICOS",c:1031019,u:281}],ing:0,gas:0},
    }},
    2026:{year:2026,pi:41140637,meta:80000000,months:{
      ENE:{t:41140637,a:[{n:"QQQ",c:5182313,u:1395},{n:"SMALLCAPS",c:9287300,u:2500},{n:"BTC",c:5386634,u:1450},{n:"ETH",c:6779729,u:1825},{n:"DÓLARES",c:1359661,u:366},{n:"EFECTIVO",c:5645000,u:0},{n:"GOTA",c:7500000,u:0}],ing:0,gas:0},
      FEB:{t:41958484,a:[{n:"QQQ",c:5003997,u:1347},{n:"SMALLCAPS",c:9276155,u:2497},{n:"BTC",c:4762527,u:1282},{n:"ETH",c:5862144,u:1578},{n:"DÓLARES",c:1359661,u:366},{n:"EFECTIVO",c:8194000,u:0},{n:"GOTA",c:7500000,u:0}],ing:0,gas:0},
      MAR:{t:43677967,a:[{n:"QQQ",c:5119160,u:1378},{n:"SMALLCAPS",c:8139390,u:2191},{n:"BTC",c:4959418,u:1335},{n:"ETH",c:6452816,u:1737},{n:"DÓLARES/ARQ",c:3581183,u:964},{n:"EFECTIVO",c:7926000,u:0},{n:"GOTA",c:7500000,u:0}],ing:0,gas:0},
      ABR:{t:48297035,a:[{n:"QQQ",c:5642963,u:1519},{n:"SMALLCAPS",c:7667595,u:2064},{n:"BTC",c:5616959,u:1512},{n:"ETH",c:6980335,u:1879},{n:"DÓLARES/ARQ",c:3581183,u:964},{n:"EFECTIVO",c:11308000,u:0},{n:"GOTA",c:7500000,u:0}],ing:0,gas:0},
      MAY:{t:0,a:[],ing:0,gas:0},JUN:{t:0,a:[],ing:0,gas:0},JUL:{t:0,a:[],ing:0,gas:0},
      AGO:{t:0,a:[],ing:0,gas:0},SEP:{t:0,a:[],ing:0,gas:0},OCT:{t:0,a:[],ing:0,gas:0},
      NOV:{t:0,a:[],ing:0,gas:0},DIC:{t:0,a:[],ing:0,gas:0},
    }}
  }
};

const G = {
  card:`
    background: rgba(255,255,255,0.06);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 20px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.1);
  `,
  cardHover:`
    background: rgba(255,255,255,0.09);
    border-color: rgba(255,255,255,0.18);
  `,
  pill:`
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 100px;
    backdrop-filter: blur(12px);
  `,
};

// ── Modal ─────────────────────────────────────────────────────────────────────
function Modal({ mes, data, onSave, onClose }) {
  const [activos, setAct] = useState(data.a?.length>0?data.a.map(a=>({...a})):[{n:"",c:"",u:""}]);
  const [ing, setIng] = useState(data.ing||"");
  const [gas, setGas] = useState(data.gas||"");
  const upd=(i,f,v)=>{const a=[...activos];a[i]={...a[i],[f]:v};setAct(a);};
  const total=activos.reduce((s,a)=>s+num(a.c),0);
  const ahorro=num(ing)-num(gas);
  const tasa=num(ing)>0?(ahorro/num(ing)*100).toFixed(0):null;
  const save=()=>{
    const mapped=activos.filter(a=>String(a.n).trim()).map(a=>({n:String(a.n).trim(),c:num(a.c),u:num(a.u)}));
    onSave(mes,{t:total,a:mapped,ing:num(ing),gas:num(gas)});
    onClose();
  };
  const inp={
    background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)",
    borderRadius:10, padding:"9px 12px", color:"#f1f5f9", fontSize:"0.85rem",
    width:"100%", outline:"none", fontFamily:"inherit"
  };
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(8px)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"rgba(15,18,35,0.92)",backdropFilter:"blur(32px)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:24,padding:28,width:"100%",maxWidth:520,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 64px rgba(0,0,0,0.5)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
          <h2 style={{margin:0,background:"linear-gradient(135deg,#e2e8f0,#94a3b8)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",fontSize:"1.4rem",fontWeight:600,letterSpacing:"-0.02em"}}>{mes}</h2>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,color:"#94a3b8",fontSize:"1.1rem",cursor:"pointer",width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>

        <div style={{background:"rgba(255,255,255,0.04)",borderRadius:14,padding:"14px 16px",marginBottom:18,border:"1px solid rgba(255,255,255,0.07)"}}>
          <p style={{color:"rgba(148,163,184,0.7)",fontSize:"0.6rem",letterSpacing:"0.14em",textTransform:"uppercase",margin:"0 0 12px"}}>Flujo del mes</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div><label style={{color:"#64748b",fontSize:"0.72rem",display:"block",marginBottom:5}}>Ingresos</label><input value={ing} onChange={e=>setIng(e.target.value)} placeholder="9000000" style={inp} type="number"/></div>
            <div><label style={{color:"#64748b",fontSize:"0.72rem",display:"block",marginBottom:5}}>Gastos</label><input value={gas} onChange={e=>setGas(e.target.value)} placeholder="5000000" style={inp} type="number"/></div>
          </div>
          {tasa!==null&&(
            <div style={{marginTop:10,display:"flex",gap:16}}>
              <span style={{color:"#64748b",fontSize:"0.75rem"}}>Ahorro: <span style={{color:ahorro>=0?"#34d399":"#f87171",fontWeight:600}}>{fmt(ahorro)}</span></span>
              <span style={{color:"#64748b",fontSize:"0.75rem"}}>Tasa: <span style={{color:Number(tasa)>=30?"#34d399":Number(tasa)>=15?"#f59e0b":"#f87171",fontWeight:600}}>{tasa}%</span></span>
            </div>
          )}
        </div>

        <div style={{marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <p style={{color:"rgba(148,163,184,0.7)",fontSize:"0.6rem",letterSpacing:"0.14em",textTransform:"uppercase",margin:0}}>Activos</p>
            <button onClick={()=>setAct([...activos,{n:"",c:"",u:""}])} style={{...inp,width:"auto",padding:"4px 12px",color:"#818cf8",cursor:"pointer",fontSize:"0.75rem"}}>+ agregar</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"14px 2fr 2fr 1.4fr 14px",gap:"0 8px",marginBottom:6}}>
            {["","activo","COP","USD",""].map((h,i)=><span key={i} style={{color:"rgba(100,116,139,0.6)",fontSize:"0.58rem",letterSpacing:"0.12em",textTransform:"uppercase"}}>{h}</span>)}
          </div>
          {activos.map((a,i)=>(
            <div key={i} style={{display:"grid",gridTemplateColumns:"14px 2fr 2fr 1.4fr 14px",gap:"0 8px",marginBottom:7,alignItems:"center"}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:gc(a.n),boxShadow:`0 0 8px ${gc(a.n)}60`}}/>
              <input value={a.n} onChange={e=>upd(i,"n",e.target.value)} placeholder="BTC" style={inp}/>
              <input value={a.c} onChange={e=>upd(i,"c",e.target.value)} placeholder="5600000" style={inp} type="number"/>
              <input value={a.u} onChange={e=>upd(i,"u",e.target.value)} placeholder="0" style={inp} type="number"/>
              <button onClick={()=>setAct(activos.filter((_,idx)=>idx!==i))} style={{background:"none",border:"none",color:"#374151",cursor:"pointer",fontSize:"0.9rem",padding:0}}>×</button>
            </div>
          ))}
        </div>

        <div style={{background:"rgba(52,211,153,0.08)",border:"1px solid rgba(52,211,153,0.2)",borderRadius:12,padding:"12px 16px",marginBottom:18,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{color:"rgba(148,163,184,0.7)",fontSize:"0.72rem",letterSpacing:"0.08em",textTransform:"uppercase"}}>Total calculado</span>
          <span style={{color:"#34d399",fontWeight:600,fontSize:"1.05rem"}}>{fmt(total)}</span>
        </div>
        <button onClick={save} style={{width:"100%",background:"linear-gradient(135deg,rgba(99,102,241,0.8),rgba(139,92,246,0.8))",border:"1px solid rgba(139,92,246,0.4)",borderRadius:12,padding:13,color:"white",fontSize:"0.95rem",fontWeight:600,cursor:"pointer",backdropFilter:"blur(8px)",letterSpacing:"0.01em"}}>
          Guardar {mes}
        </button>
      </div>
    </div>
  );
}

// ── Settings Modal ────────────────────────────────────────────────────────────
function SettingsModal({ yd, year, onSave, onClose }) {
  const [meta, setMeta] = useState(yd.meta||"");
  const [pi,   setPi]   = useState(yd.pi||"");
  const inp={background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:10,padding:"10px 14px",color:"#f1f5f9",fontSize:"0.9rem",width:"100%",outline:"none",fontFamily:"inherit"};
  const progress=num(meta)>0&&num(pi)>0?Math.min((num(pi)/num(meta))*100,100):0;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(8px)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"rgba(15,18,35,0.92)",backdropFilter:"blur(32px)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:24,padding:28,width:"100%",maxWidth:400,boxShadow:"0 24px 64px rgba(0,0,0,0.5)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
          <h2 style={{margin:0,background:"linear-gradient(135deg,#e2e8f0,#94a3b8)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",fontSize:"1.3rem",fontWeight:600}}>Configurar {year}</h2>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,color:"#94a3b8",fontSize:"1.1rem",cursor:"pointer",width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>
        <div style={{marginBottom:14}}>
          <label style={{color:"#64748b",fontSize:"0.72rem",display:"block",marginBottom:6,letterSpacing:"0.08em",textTransform:"uppercase"}}>Patrimonio inicial</label>
          <input value={pi} onChange={e=>setPi(e.target.value)} placeholder="40000000" style={inp} type="number"/>
          {num(pi)>0&&<p style={{color:"#64748b",fontSize:"0.72rem",margin:"5px 0 0"}}>{fmt(num(pi))}</p>}
        </div>
        <div style={{marginBottom:24}}>
          <label style={{color:"#64748b",fontSize:"0.72rem",display:"block",marginBottom:6,letterSpacing:"0.08em",textTransform:"uppercase"}}>Meta {year}</label>
          <input value={meta} onChange={e=>setMeta(e.target.value)} placeholder="80000000" style={inp} type="number"/>
          {num(meta)>0&&<>
            <p style={{color:"#64748b",fontSize:"0.72rem",margin:"5px 0 8px"}}>{fmt(num(meta))}</p>
            <div style={{background:"rgba(255,255,255,0.06)",borderRadius:6,height:5,overflow:"hidden",border:"1px solid rgba(255,255,255,0.08)"}}>
              <div style={{width:`${progress}%`,height:"100%",background:"linear-gradient(90deg,#6366f1,#34d399)",borderRadius:6,transition:"width 0.4s",boxShadow:"0 0 8px #34d39960"}}/>
            </div>
            <p style={{color:"#64748b",fontSize:"0.7rem",margin:"5px 0 0"}}>{progress.toFixed(1)}% del camino</p>
          </>}
        </div>
        <button onClick={()=>{onSave({meta:num(meta),pi:num(pi)});onClose();}} style={{width:"100%",background:"linear-gradient(135deg,rgba(99,102,241,0.8),rgba(139,92,246,0.8))",border:"1px solid rgba(139,92,246,0.4)",borderRadius:12,padding:13,color:"white",fontSize:"0.95rem",fontWeight:600,cursor:"pointer"}}>Guardar</button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [app,      setApp]      = useState(DATA);
  const [selM,     setSelM]     = useState("ABR");
  const [editing,  setEditing]  = useState(null);
  const [settings, setSettings] = useState(false);
  const [usd,      setUsd]      = useState(null);
  const [rateOk,   setRateOk]   = useState("loading");
  const [loaded,   setLoaded]   = useState(false);
  const [view,     setView]     = useState("month");

  const yr = app.ay;
  const yd = app.years[yr];

  const [user,    setUser]    = useState(null);
  const [syncing, setSyncing] = useState(false);

  // Auth listener
  useEffect(()=>{
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if(u){
        setSyncing(true);
        try{
          const cloud = await loadData(u.uid);
          if(cloud) setApp(cloud);
          else {
            // first time: load from localStorage if exists
            try{ const s=localStorage.getItem(KEY); if(s) setApp(JSON.parse(s)); }catch(_){}
          }
        }catch(_){}
        setSyncing(false);
      } else {
        // not logged in: use localStorage
        try{ const s=localStorage.getItem(KEY); if(s) setApp(JSON.parse(s)); }catch(_){}
      }
      setLoaded(true);
    });
    return ()=>unsub();
  },[]);

  // Save: cloud if logged in, else localStorage
  useEffect(()=>{
    if(!loaded) return;
    if(user){
      saveData(user.uid, app).catch(_=>{}); 
    } else {
      try{ localStorage.setItem(KEY,JSON.stringify(app)); }catch(_){}
    }
  },[app,loaded,user]);

  useEffect(()=>{
    const fetch_rate=async()=>{
      setRateOk("loading");
      try{const r=await fetch("https://api.frankfurter.dev/v2/latest?base=USD&symbols=COP");if(r.ok){const d=await r.json();if(d?.rates?.COP){setUsd(Math.round(d.rates.COP));setRateOk("ok");return;}}}catch(_){}
      try{const r=await fetch("https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json");if(r.ok){const d=await r.json();if(d?.usd?.cop){setUsd(Math.round(d.usd.cop));setRateOk("ok");return;}}}catch(_){}
      setRateOk("error");
    };
    fetch_rate();
    const t=setInterval(fetch_rate,5*60*1000);
    return()=>clearInterval(t);
  },[]);

  const dolar = usd||3900;
  const setYear = useCallback(y=>setApp(p=>({...p,ay:y})),[]);
  const addYear = useCallback(()=>{
    const ys=Object.keys(app.years).map(Number);
    const ny=Math.max(...ys)+1;
    const lp=lastP(app.years[Math.max(...ys)]);
    const nyd=emptyY(ny); nyd.pi=lp;
    setApp(p=>({...p,ay:ny,years:{...p.years,[ny]:nyd}}));
  },[app.years]);
  const saveMonth=useCallback((m,md)=>{
    setApp(p=>({...p,years:{...p.years,[yr]:{...p.years[yr],months:{...p.years[yr].months,[m]:md}}}}));
  },[yr]);
  const saveSettings=useCallback(s=>{
    setApp(p=>({...p,years:{...p.years,[yr]:{...p.years[yr],...s}}}));
  },[yr]);

  const fl = filled(yd);
  const lp = lastP(yd);
  const gYTD = yd.pi>0?((lp-yd.pi)/yd.pi)*100:0;
  const mp = yd.meta>0&&lp>0?Math.min((lp/yd.meta)*100,100):0;
  const prj = proj(yd);

  const chartData = useMemo(()=>MONTHS.map(m=>({m,v:yd.months[m].t||null})).filter(d=>d.v),[yd]);

  const selData = yd.months[selM];
  const selIdx  = MONTHS.indexOf(selM);
  const prevM   = selIdx>0?MONTHS[selIdx-1]:null;
  const prevPat = prevM?yd.months[prevM].t:0;
  const mg      = prevPat>0&&selData.t>0?((selData.t-prevPat)/prevPat)*100:null;
  const totalA  = selData.a.reduce((s,a)=>s+a.c,0);
  const secData = sects(selData.a);
  const ing=selData.ing||0,gas=selData.gas||0,aho=ing-gas;
  const tasa=ing>0?(aho/ing*100):null;
  const alerts=[];
  selData.a.forEach(a=>{const p=totalA>0?(a.c/totalA)*100:0;if(p>40)alerts.push({msg:`${a.n} es el ${p.toFixed(0)}% del portafolio`,color:"#f59e0b"});});
  if(tasa!==null&&tasa<15)alerts.push({msg:`Tasa de ahorro baja (${tasa.toFixed(0)}%)`,color:"#f87171"});

  const histData = useMemo(()=>{
    const ys=Object.keys(app.years).sort().map(Number);
    return MONTHS.map(m=>{
      const p={m};
      ys.forEach(y=>{const v=app.years[y].months[m]?.t;if(v>0)p[y]=v;});
      return p;
    }).filter(p=>Object.keys(p).length>1);
  },[app]);

  const projData = useMemo(()=>{
    if(!prj)return [];
    const lastIdx=fl.length>0?MONTHS.indexOf(fl[fl.length-1]):-1;
    return MONTHS.map((m,i)=>{
      const real=yd.months[m].t||null;
      let pv=null;
      if(i>lastIdx&&fl.length>=2){
        const last=lp,first=yd.months[fl[0]].t;
        const mg2=(last-first)/Math.max(fl.length-1,1);
        pv=last+mg2*(i-lastIdx);
        if(pv<0)pv=null;
      }
      return {m,real,pv};
    });
  },[yd,prj,fl,lp]);

  const tip=color=>({active,payload})=>!active||!payload?.length?null:(
    <div style={{background:"rgba(10,12,25,0.95)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"8px 14px",backdropFilter:"blur(16px)"}}>
      <p style={{color:"rgba(148,163,184,0.7)",margin:"0 0 2px",fontSize:"0.68rem"}}>{payload[0]?.payload?.m}</p>
      <p style={{color:color,margin:0,fontWeight:600,fontSize:"0.88rem"}}>{fmt(payload[0]?.value)}</p>
    </div>
  );

  const multiTip=({active,payload,label})=>!active||!payload?.length?null:(
    <div style={{background:"rgba(10,12,25,0.95)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"10px 14px",backdropFilter:"blur(16px)"}}>
      <p style={{color:"rgba(148,163,184,0.7)",margin:"0 0 6px",fontSize:"0.68rem"}}>{label}</p>
      {payload.filter(p=>p.value).map((p,i)=>(
        <p key={i} style={{color:p.name==="pv"?"#f59e0b":yc(Number(p.dataKey)),margin:"2px 0",fontWeight:600,fontSize:"0.82rem"}}>
          {p.name==="pv"?"↗ proyección":p.dataKey}: {fmt(p.value)}
        </p>
      ))}
    </div>
  );

  const rc=rateOk==="ok"?"#34d399":rateOk==="loading"?"#f59e0b":"#f87171";
  const ycc=yc(yr);

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#060812 0%,#0a0f1e 40%,#080d1a 100%)",color:"#e2e8f0",padding:"20px 14px",fontFamily:"'DM Sans',sans-serif",position:"relative",overflow:"hidden"}}>
      {/* Background orbs */}
      <div style={{position:"fixed",top:"-20%",right:"-10%",width:500,height:500,borderRadius:"50%",background:`radial-gradient(circle,${ycc}15 0%,transparent 70%)`,pointerEvents:"none",zIndex:0}}/>
      <div style={{position:"fixed",bottom:"-20%",left:"-10%",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,#6366f115 0%,transparent 70%)",pointerEvents:"none",zIndex:0}}/>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');*{box-sizing:border-box}input{outline:none}input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}@keyframes shimmer{0%{opacity:0.7}50%{opacity:1}100%{opacity:0.7}}`}</style>

      <div style={{maxWidth:860,margin:"0 auto",position:"relative",zIndex:1}}>

        {/* ── Header ── */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:24}}>
          <div>
            <p style={{color:"rgba(148,163,184,0.4)",fontSize:"0.6rem",letterSpacing:"0.2em",textTransform:"uppercase",margin:"0 0 4px",fontFamily:"'DM Mono',monospace"}}>NET WORTH TRACKER</p>
            <h1 style={{margin:0,fontSize:"2.2rem",fontWeight:300,letterSpacing:"-0.03em",background:"linear-gradient(135deg,#f1f5f9 30%,rgba(148,163,184,0.6) 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",lineHeight:1}}>Patrimonio</h1>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            {/* Auth button */}
            {user ? (
              <div style={{display:"flex",alignItems:"center",gap:8,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:14,padding:"6px 12px"}}>
                <img src={user.photoURL} alt="" style={{width:22,height:22,borderRadius:"50%"}}/>
                <span style={{color:"rgba(148,163,184,0.7)",fontSize:"0.75rem",maxWidth:100,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.displayName?.split(" ")[0]}</span>
                <button onClick={logout} style={{background:"none",border:"none",color:"rgba(100,116,139,0.5)",fontSize:"0.7rem",cursor:"pointer",padding:0}}
                  onMouseOver={e=>e.currentTarget.style.color="#f87171"} onMouseOut={e=>e.currentTarget.style.color="rgba(100,116,139,0.5)"}>salir</button>
              </div>
            ) : (
              <button onClick={loginGoogle} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:12,padding:"7px 14px",color:"rgba(226,232,240,0.8)",fontSize:"0.75rem",cursor:"pointer",display:"flex",alignItems:"center",gap:6,backdropFilter:"blur(8px)"}}
                onMouseOver={e=>e.currentTarget.style.background="rgba(255,255,255,0.1)"}
                onMouseOut={e=>e.currentTarget.style.background="rgba(255,255,255,0.06)"}>
                <svg width="14" height="14" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Iniciar sesión
              </button>
            )}
            {syncing && <span style={{color:"rgba(100,116,139,0.4)",fontSize:"0.65rem",fontFamily:"'DM Mono',monospace"}}>sincronizando...</span>}
            <button onClick={()=>{
              const fl2=filled(yd),lp2=lastP(yd),g=yd.pi>0?((lp2-yd.pi)/yd.pi*100).toFixed(1):0,prj2=proj(yd);
              const rows=fl2.map(m=>{const d=yd.months[m],pv=MONTHS[MONTHS.indexOf(m)-1],pp=pv?yd.months[pv]?.t:0,pct=pp>0?((d.t-pp)/pp*100).toFixed(1):"—";return`<tr><td>${m}</td><td>${fmt(d.t)}</td><td>${fmtU(Math.round(d.t/dolar))}</td><td style="color:${Number(pct)>=0?'#059669':'#dc2626'}">${pct!=="—"?(Number(pct)>=0?"+":"")+pct+"%":"—"}</td></tr>`;}).join("");
              const html=`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Patrimonio ${yr}</title><style>body{font-family:'Helvetica Neue',sans-serif;color:#111;padding:40px;max-width:860px;margin:0 auto}h1{font-size:1.8rem;margin-bottom:4px;font-weight:300;letter-spacing:-0.02em}p.sub{color:#666;font-size:0.88rem;margin-bottom:28px}.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:28px}.kpi{background:#f8fafc;border-radius:10px;padding:12px 14px;border:1px solid #e2e8f0}.kpi label{display:block;font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:#94a3b8;margin-bottom:3px}.kpi span{font-size:1rem;font-weight:600}table{width:100%;border-collapse:collapse;font-size:0.88rem}th{text-align:left;padding:8px 10px;border-bottom:2px solid #e2e8f0;font-size:0.68rem;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8}td{padding:9px 10px;border-bottom:1px solid #f1f5f9}</style></head><body><h1>Patrimonio ${yr}</h1><p class="sub">${new Date().toLocaleDateString("es-CO")} · USD/COP ${dolar.toLocaleString()}</p><div class="kpis"><div class="kpi"><label>Inicio ${yr}</label><span>${fmt(yd.pi)}</span></div><div class="kpi"><label>Actual</label><span>${fmt(lp2)}</span></div><div class="kpi"><label>YTD</label><span style="color:${Number(g)>=0?'#059669':'#dc2626'}">${(Number(g)>=0?"+":"")+g}%</span></div><div class="kpi"><label>Proyección DIC</label><span style="color:#d97706">${prj2?fmt(Math.round(prj2)):"—"}</span></div></div><table><thead><tr><th>Mes</th><th>COP</th><th>USD</th><th>Δ</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
              const w=window.open("","_blank");w.document.write(html);w.document.close();setTimeout(()=>w.print(),400);
            }} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:12,padding:"7px 14px",color:"rgba(148,163,184,0.7)",fontSize:"0.75rem",cursor:"pointer",backdropFilter:"blur(8px)",transition:"all 0.2s"}}
              onMouseOver={e=>{e.currentTarget.style.background="rgba(255,255,255,0.1)";e.currentTarget.style.color="#e2e8f0";}}
              onMouseOut={e=>{e.currentTarget.style.background="rgba(255,255,255,0.06)";e.currentTarget.style.color="rgba(148,163,184,0.7)";}}>
              ↓ PDF
            </button>
            <div style={{display:"flex",alignItems:"center",gap:8,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:14,padding:"7px 14px",backdropFilter:"blur(12px)"}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:rc,boxShadow:`0 0 8px ${rc}`,animation:rateOk==="loading"?"pulse 1.5s infinite":undefined}}/>
              <div>
                <p style={{margin:0,color:"rgba(100,116,139,0.6)",fontSize:"0.52rem",letterSpacing:"0.12em",textTransform:"uppercase",fontFamily:"'DM Mono',monospace"}}>USD/COP {rateOk==="ok"?"live":rateOk==="loading"?"...":"—"}</p>
                <p style={{margin:0,fontFamily:"'DM Mono',monospace",fontSize:"0.88rem",fontWeight:500,color:rateOk==="ok"?"#e2e8f0":"rgba(148,163,184,0.4)"}}>${dolar.toLocaleString("es-CO")}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Year + View selectors ── */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
          <div style={{display:"flex",gap:5,flexWrap:"wrap",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:14,padding:"4px"}}>
            {Object.keys(app.years).sort().map(y=>{
              const yn=Number(y),active=yn===yr,c=yc(yn);
              return <button key={y} onClick={()=>setYear(yn)} style={{padding:"5px 14px",borderRadius:10,fontSize:"0.8rem",fontWeight:active?500:400,border:"none",background:active?`${c}20`:"transparent",color:active?c:"rgba(100,116,139,0.6)",fontFamily:"'DM Mono',monospace",cursor:"pointer",transition:"all 0.2s",boxShadow:active?`inset 0 0 0 1px ${c}40`:undefined}}>{y}</button>;
            })}
            <button onClick={addYear} style={{padding:"5px 12px",borderRadius:10,border:"1px dashed rgba(255,255,255,0.1)",background:"transparent",color:"rgba(100,116,139,0.4)",fontSize:"0.75rem",cursor:"pointer",transition:"all 0.2s"}}
              onMouseOver={e=>{e.currentTarget.style.color="#818cf8";e.currentTarget.style.borderColor="rgba(129,140,248,0.4)";}}
              onMouseOut={e=>{e.currentTarget.style.color="rgba(100,116,139,0.4)";e.currentTarget.style.borderColor="rgba(255,255,255,0.1)";}}>+ año</button>
          </div>
          <div style={{display:"flex",gap:5,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:14,padding:"4px"}}>
            {[["month","mes"],["summary","resumen"]].map(([v,l])=>(
              <button key={v} onClick={()=>setView(v)} style={{padding:"5px 12px",borderRadius:10,fontSize:"0.75rem",border:"none",background:view===v?"rgba(255,255,255,0.08)":"transparent",color:view===v?"#e2e8f0":"rgba(100,116,139,0.5)",cursor:"pointer",transition:"all 0.2s"}}>{l}</button>
            ))}
            <button onClick={()=>setSettings(true)} style={{padding:"5px 10px",borderRadius:10,fontSize:"0.8rem",border:"none",background:"transparent",color:"rgba(100,116,139,0.5)",cursor:"pointer",transition:"all 0.2s"}}
              onMouseOver={e=>e.currentTarget.style.color="#e2e8f0"} onMouseOut={e=>e.currentTarget.style.color="rgba(100,116,139,0.5)"}>⚙</button>
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:12}}>
          {[
            {label:"patrimonio actual",val:lp>0?fmt(lp):"—",sub:lp>0?fmtU(Math.round(lp/dolar)):"ingresa tus datos →",color:"#f1f5f9"},
            {label:"crecimiento ytd",val:lp>0?fmtP(gYTD):"—",sub:lp>0?fmt(lp-yd.pi):"",color:gYTD>=0?"#34d399":"#f87171"},
            {label:`meta ${yr}`,val:yd.meta>0?fmt(yd.meta):"sin meta",sub:yd.meta>0?`${mp.toFixed(0)}% alcanzado`:"configura en ⚙",color:"rgba(148,163,184,0.5)"},
          ].map((k,i)=>(
            <div key={i} style={{background:"rgba(255,255,255,0.05)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:18,padding:"16px 18px",boxShadow:"inset 0 1px 0 rgba(255,255,255,0.07)"}}>
              <p style={{color:"rgba(100,116,139,0.6)",fontSize:"0.58rem",letterSpacing:"0.14em",textTransform:"uppercase",margin:"0 0 6px",fontFamily:"'DM Mono',monospace"}}>{k.label}</p>
              <p style={{color:k.color,fontSize:"1.05rem",fontWeight:500,margin:"0 0 3px",letterSpacing:"-0.01em"}}>{k.val}</p>
              <p style={{color:"rgba(100,116,139,0.4)",fontSize:"0.7rem",margin:0,fontFamily:"'DM Mono',monospace"}}>{k.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Meta progress bar ── */}
        {yd.meta>0&&lp>0&&(
          <div style={{background:"rgba(255,255,255,0.04)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:16,padding:"12px 18px",marginBottom:12,boxShadow:"inset 0 1px 0 rgba(255,255,255,0.06)"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8,alignItems:"center"}}>
              <span style={{color:"rgba(100,116,139,0.5)",fontSize:"0.58rem",letterSpacing:"0.14em",textTransform:"uppercase",fontFamily:"'DM Mono',monospace"}}>avance meta {yr}</span>
              <span style={{color:"#34d399",fontSize:"0.78rem",fontWeight:500,fontFamily:"'DM Mono',monospace"}}>{mp.toFixed(1)}%</span>
            </div>
            <div style={{background:"rgba(255,255,255,0.06)",borderRadius:6,height:5,overflow:"hidden",border:"1px solid rgba(255,255,255,0.06)"}}>
              <div style={{width:`${mp}%`,height:"100%",background:`linear-gradient(90deg,${ycc},#34d399)`,borderRadius:6,boxShadow:`0 0 10px #34d39940`}}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:6,alignItems:"center"}}>
              <span style={{color:"rgba(100,116,139,0.35)",fontSize:"0.62rem",fontFamily:"'DM Mono',monospace"}}>{fmt(lp)}</span>
              {prj&&<span style={{color:"rgba(148,163,184,0.5)",fontSize:"0.68rem"}}>
                ↗ DIC: <span style={{color:"#f59e0b",fontWeight:500}}>{fmt(Math.round(prj))}</span>
                <span style={{color:prj>=yd.meta?"#34d399":"#f87171",marginLeft:6,fontSize:"0.65rem"}}>{prj>=yd.meta?"✓ meta alcanzable":`faltan ${fmt(Math.round(yd.meta-prj))}`}</span>
              </span>}
              <span style={{color:"rgba(100,116,139,0.35)",fontSize:"0.62rem",fontFamily:"'DM Mono',monospace"}}>{fmt(yd.meta)}</span>
            </div>
          </div>
        )}

        {/* ── Chart (month view) ── */}
        {view==="month"&&chartData.length>1&&(
          <div style={{background:"rgba(255,255,255,0.04)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:18,padding:"16px 18px",marginBottom:12,boxShadow:"inset 0 1px 0 rgba(255,255,255,0.06)"}}>
            <p style={{color:"rgba(100,116,139,0.4)",fontSize:"0.58rem",letterSpacing:"0.14em",textTransform:"uppercase",margin:"0 0 12px",fontFamily:"'DM Mono',monospace"}}>{yr} — evolución</p>
            <ResponsiveContainer width="100%" height={130}>
              <AreaChart data={chartData} margin={{left:0,right:0,top:4,bottom:0}}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={ycc} stopOpacity={0.2}/>
                    <stop offset="95%" stopColor={ycc} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="m" tick={{fill:"rgba(100,116,139,0.4)",fontSize:10}} axisLine={false} tickLine={false}/>
                <YAxis hide/>
                <Tooltip content={tip(ycc)}/>
                <Area type="monotone" dataKey="v" stroke={ycc} strokeWidth={2} fill="url(#areaGrad)" dot={{fill:ycc,r:3,strokeWidth:0}} activeDot={{r:5,fill:ycc,strokeWidth:0}}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── Month selector ── */}
        {view==="month"&&(
          <>
            <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:12}}>
              {MONTHS.map(m=>{
                const has=yd.months[m]?.t>0,active=m===selM;
                return (
                  <button key={m} onClick={()=>setSelM(m)} style={{
                    padding:"5px 10px",borderRadius:10,
                    background:active?`${ycc}18`:"rgba(255,255,255,0.03)",
                    border:active?`1px solid ${ycc}50`:"1px solid rgba(255,255,255,0.06)",
                    color:active?ycc:has?"rgba(148,163,184,0.5)":"rgba(100,116,139,0.25)",
                    fontSize:"0.72rem",fontWeight:active?500:400,cursor:"pointer",
                    fontFamily:"'DM Mono',monospace",display:"flex",alignItems:"center",gap:4,
                    backdropFilter:"blur(8px)",transition:"all 0.2s",
                    boxShadow:active?`0 0 12px ${ycc}20`:undefined
                  }}>
                    {m}
                    {has&&<span style={{width:3,height:3,borderRadius:"50%",background:active?ycc:"#34d399",display:"inline-block",boxShadow:active?`0 0 4px ${ycc}`:undefined}}/>}
                  </button>
                );
              })}
            </div>

            {/* Month detail card */}
            <div style={{background:"rgba(255,255,255,0.05)",backdropFilter:"blur(24px)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:22,padding:"20px 22px",boxShadow:"0 8px 32px rgba(0,0,0,0.2),inset 0 1px 0 rgba(255,255,255,0.08)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10,marginBottom:16}}>
                <div>
                  <div style={{display:"flex",alignItems:"baseline",gap:10}}>
                    <h2 style={{margin:0,fontSize:"1.4rem",fontWeight:400,letterSpacing:"-0.02em",background:"linear-gradient(135deg,#f1f5f9,rgba(148,163,184,0.7))",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>{selM} {yr}</h2>
                    {mg!==null&&<span style={{fontSize:"0.78rem",color:mg>=0?"#34d399":"#f87171",fontWeight:500}}>{fmtP(mg)}</span>}
                  </div>
                  {selData.t>0&&<p style={{color:"rgba(100,116,139,0.5)",margin:"3px 0 0",fontSize:"0.75rem",fontFamily:"'DM Mono',monospace"}}>{fmt(selData.t)} · {fmtU(Math.round(selData.t/dolar))}</p>}
                </div>
                <button onClick={()=>setEditing(selM)} style={{background:"rgba(129,140,248,0.1)",border:"1px solid rgba(129,140,248,0.25)",borderRadius:11,padding:"6px 14px",color:"rgba(129,140,248,0.8)",fontSize:"0.78rem",cursor:"pointer",backdropFilter:"blur(8px)",transition:"all 0.2s"}}
                  onMouseOver={e=>{e.currentTarget.style.background="rgba(129,140,248,0.2)";e.currentTarget.style.color="#818cf8";}}
                  onMouseOut={e=>{e.currentTarget.style.background="rgba(129,140,248,0.1)";e.currentTarget.style.color="rgba(129,140,248,0.8)";}}>
                  ✎ editar
                </button>
              </div>

              {selData.a.length>0?(
                <>
                  {alerts.map((al,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:7,background:`${al.color}10`,border:`1px solid ${al.color}25`,borderRadius:10,padding:"7px 12px",marginBottom:8}}>
                      <span style={{color:al.color,fontSize:"0.75rem"}}>⚠</span>
                      <span style={{color:"rgba(148,163,184,0.7)",fontSize:"0.76rem"}}>{al.msg}</span>
                    </div>
                  ))}

                  {(ing>0||gas>0)&&(
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:16,padding:"12px 0",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
                      {[
                        {l:"ingresos",v:fmt(ing),c:"#34d399"},
                        {l:"gastos",v:fmt(gas),c:"#f87171"},
                        {l:"ahorro",v:tasa!==null?`${tasa.toFixed(0)}%`:"—",c:tasa>=30?"#34d399":tasa>=15?"#f59e0b":"#f87171",s:fmt(aho)},
                      ].map((k,i)=>(
                        <div key={i}>
                          <p style={{color:"rgba(100,116,139,0.5)",fontSize:"0.58rem",letterSpacing:"0.12em",textTransform:"uppercase",margin:"0 0 3px",fontFamily:"'DM Mono',monospace"}}>{k.l}</p>
                          <p style={{color:k.c,fontSize:"0.9rem",fontWeight:500,margin:0}}>{k.v}</p>
                          {k.s&&<p style={{color:"rgba(100,116,139,0.4)",fontSize:"0.68rem",margin:0,fontFamily:"'DM Mono',monospace"}}>{k.s}</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Allocation bar */}
                  <div style={{display:"flex",height:4,borderRadius:4,overflow:"hidden",marginBottom:16,gap:1}}>
                    {selData.a.map((a,i)=>(
                      <div key={i} title={`${a.n}: ${totalA>0?((a.c/totalA)*100).toFixed(1):0}%`}
                        style={{width:`${totalA>0?(a.c/totalA)*100:0}%`,background:gc(a.n),boxShadow:`0 0 6px ${gc(a.n)}60`}}/>
                    ))}
                  </div>

                  {/* ── Donut chart — distribución % ── */}
                  <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:16,padding:"16px 18px",marginBottom:18}}>
                    <p style={{color:"rgba(100,116,139,0.45)",fontSize:"0.56rem",letterSpacing:"0.14em",textTransform:"uppercase",margin:"0 0 14px",fontFamily:"'DM Mono',monospace"}}>distribución del portafolio</p>
                    <div style={{display:"flex",alignItems:"center",gap:24}}>
                      {/* SVG donut grande */}
                      <svg width="140" height="140" viewBox="0 0 140 140" style={{flexShrink:0}}>
                        {(()=>{
                          const r=54,cx=70,cy=70,stroke=18;
                          const circ=2*Math.PI*r;
                          let offset=0;
                          const sorted=[...selData.a].sort((a,b)=>b.c-a.c);
                          return sorted.map((a,i)=>{
                            const pct=totalA>0?a.c/totalA:0;
                            const dash=pct*circ;
                            const gap=circ-dash;
                            const el=(
                              <circle key={i} cx={cx} cy={cy} r={r}
                                fill="none" stroke={gc(a.n)} strokeWidth={stroke}
                                strokeDasharray={`${dash} ${gap}`}
                                strokeDashoffset={-offset*circ}
                                strokeLinecap="butt"
                                style={{transform:"rotate(-90deg)",transformOrigin:"70px 70px",filter:`drop-shadow(0 0 5px ${gc(a.n)}70)`}}
                              />
                            );
                            offset+=pct;
                            return el;
                          });
                        })()}
                        <text x="70" y="64" textAnchor="middle" fill="rgba(226,232,240,0.9)" fontSize="15" fontWeight="500" fontFamily="'DM Mono',monospace">{selData.a.length}</text>
                        <text x="70" y="79" textAnchor="middle" fill="rgba(100,116,139,0.4)" fontSize="10" fontFamily="'DM Mono',monospace">activos</text>
                      </svg>
                      {/* Legend — dos columnas si hay muchos activos */}
                      <div style={{flex:1,display:"grid",gridTemplateColumns:selData.a.length>5?"1fr 1fr":"1fr",gap:"6px 20px"}}>
                        {[...selData.a].sort((a,b)=>b.c-a.c).map((a,i)=>{
                          const pct=totalA>0?((a.c/totalA)*100).toFixed(1):0;
                          return (
                            <div key={i} style={{display:"flex",alignItems:"center",gap:7,minWidth:0}}>
                              <div style={{width:8,height:8,borderRadius:"50%",background:gc(a.n),flexShrink:0,boxShadow:`0 0 6px ${gc(a.n)}90`}}/>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:4}}>
                                  <span style={{color:"rgba(148,163,184,0.7)",fontSize:"0.72rem",fontFamily:"'DM Mono',monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.n}</span>
                                  <span style={{color:gc(a.n),fontSize:"0.72rem",fontFamily:"'DM Mono',monospace",fontWeight:500,flexShrink:0}}>{pct}%</span>
                                </div>
                                <div style={{marginTop:2,height:2,borderRadius:2,background:"rgba(255,255,255,0.06)",overflow:"hidden"}}>
                                  <div style={{width:`${pct}%`,height:"100%",background:gc(a.n),opacity:0.6,borderRadius:2}}/>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Assets */}
                  <div>
                    <div style={{display:"grid",gridTemplateColumns:"12px 1fr 1fr 90px",gap:"0 10px",paddingBottom:6,marginBottom:2}}>
                      {["","activo","COP","USD"].map((h,i)=><span key={i} style={{color:"rgba(100,116,139,0.35)",fontSize:"0.58rem",letterSpacing:"0.12em",textTransform:"uppercase",fontFamily:"'DM Mono',monospace"}}>{h}</span>)}
                    </div>
                    {selData.a.map((a,i)=>{
                      const pct=totalA>0?((a.c/totalA)*100).toFixed(1):0;
                      const high=Number(pct)>40;
                      return (
                        <div key={i} style={{display:"grid",gridTemplateColumns:"12px 1fr 1fr 90px",gap:"0 10px",padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,0.04)",transition:"background 0.15s",borderRadius:6,paddingLeft:4,paddingRight:4,cursor:"default"}}
                          onMouseOver={e=>e.currentTarget.style.background="rgba(255,255,255,0.03)"}
                          onMouseOut={e=>e.currentTarget.style.background="transparent"}>
                          <div style={{display:"flex",alignItems:"center"}}>
                            <div style={{width:6,height:6,borderRadius:"50%",background:gc(a.n),boxShadow:high?`0 0 8px ${gc(a.n)}`:undefined}}/>
                          </div>
                          <span style={{color:"rgba(226,232,240,0.85)",fontSize:"0.84rem",fontWeight:400,display:"flex",alignItems:"center"}}>{a.n}</span>
                          <div style={{display:"flex",flexDirection:"column",justifyContent:"center"}}>
                            <span style={{color:"rgba(148,163,184,0.7)",fontSize:"0.78rem",fontFamily:"'DM Mono',monospace"}}>{fmt(a.c)}</span>
                            <span style={{color:high?"rgba(245,158,11,0.6)":"rgba(100,116,139,0.35)",fontSize:"0.63rem",fontFamily:"'DM Mono',monospace"}}>{pct}%</span>
                          </div>
                          <span style={{color:"rgba(100,116,139,0.35)",fontSize:"0.78rem",fontFamily:"'DM Mono',monospace",display:"flex",alignItems:"center"}}>{a.u>0?fmtU(a.u):"—"}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Sectors */}
                  {Object.keys(secData).length>0&&(
                    <div style={{display:"flex",gap:7,flexWrap:"wrap",marginTop:14,paddingTop:12,borderTop:"1px solid rgba(255,255,255,0.05)"}}>
                      {Object.entries(secData).map(([s,v],i)=>{
                        const sc={Acciones:"#818cf8",Crypto:"#f59e0b",Liquidez:"#94a3b8",GOTA:"#f472b6"};
                        const c=sc[s]||"#64748b";
                        const pct=totalA>0?((v/totalA)*100).toFixed(1):0;
                        return (
                          <div key={i} style={{background:`${c}08`,border:`1px solid ${c}20`,borderRadius:12,padding:"8px 13px",backdropFilter:"blur(8px)"}}>
                            <p style={{color:"rgba(100,116,139,0.5)",fontSize:"0.58rem",letterSpacing:"0.1em",textTransform:"uppercase",margin:"0 0 3px",fontFamily:"'DM Mono',monospace"}}>{s}</p>
                            <p style={{color:c,fontSize:"0.85rem",fontWeight:500,margin:0}}>{fmt(v)}</p>
                            <p style={{color:`${c}60`,fontSize:"0.65rem",margin:0,fontFamily:"'DM Mono',monospace"}}>{pct}%</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ):(
                <div style={{textAlign:"center",padding:"36px 20px"}}>
                  <p style={{color:"rgba(100,116,139,0.2)",fontSize:"2.5rem",margin:"0 0 8px",fontWeight:100}}>○</p>
                  <p style={{color:"rgba(100,116,139,0.4)",margin:"0 0 14px",fontSize:"0.85rem"}}>Sin datos para {selM} {yr}</p>
                  <button onClick={()=>setEditing(selM)} style={{background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.25)",borderRadius:10,padding:"8px 20px",color:"rgba(129,140,248,0.8)",fontSize:"0.82rem",cursor:"pointer",backdropFilter:"blur(8px)"}}>+ ingresar datos</button>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Summary view ── */}
        {view==="summary"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {histData.length>1&&(
              <div style={{background:"rgba(255,255,255,0.04)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:20,padding:"18px 20px",boxShadow:"inset 0 1px 0 rgba(255,255,255,0.06)"}}>
                <p style={{color:"rgba(100,116,139,0.4)",fontSize:"0.58rem",letterSpacing:"0.14em",textTransform:"uppercase",margin:"0 0 10px",fontFamily:"'DM Mono',monospace"}}>histórico multi-año</p>
                <div style={{display:"flex",gap:14,marginBottom:12}}>
                  {Object.keys(app.years).sort().map(y=>(
                    <div key={y} style={{display:"flex",alignItems:"center",gap:5}}>
                      <div style={{width:16,height:2,background:yc(Number(y)),borderRadius:1,boxShadow:`0 0 4px ${yc(Number(y))}`}}/>
                      <span style={{color:"rgba(100,116,139,0.5)",fontSize:"0.68rem",fontFamily:"'DM Mono',monospace"}}>{y}</span>
                    </div>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={histData} margin={{left:0,right:0,top:4,bottom:0}}>
                    <XAxis dataKey="m" tick={{fill:"rgba(100,116,139,0.35)",fontSize:10}} axisLine={false} tickLine={false}/>
                    <YAxis hide/>
                    <Tooltip content={multiTip}/>
                    {Object.keys(app.years).sort().map(y=>(
                      <Line key={y} type="monotone" dataKey={String(y)} stroke={yc(Number(y))} strokeWidth={2}
                        dot={{fill:yc(Number(y)),r:3,strokeWidth:0}} activeDot={{r:5}} connectNulls/>
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {fl.length>=2&&prj&&(
              <div style={{background:"rgba(255,255,255,0.04)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:20,padding:"18px 20px",boxShadow:"inset 0 1px 0 rgba(255,255,255,0.06)"}}>
                <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8,marginBottom:12}}>
                  <p style={{color:"rgba(100,116,139,0.4)",fontSize:"0.58rem",letterSpacing:"0.14em",textTransform:"uppercase",margin:0,fontFamily:"'DM Mono',monospace"}}>{yr} — real + proyección</p>
                  <p style={{color:"#f59e0b",fontWeight:500,margin:0,fontSize:"0.9rem"}}>{fmt(Math.round(prj))}</p>
                </div>
                <ResponsiveContainer width="100%" height={150}>
                  <LineChart data={projData} margin={{left:0,right:0,top:4,bottom:0}}>
                    <XAxis dataKey="m" tick={{fill:"rgba(100,116,139,0.35)",fontSize:10}} axisLine={false} tickLine={false}/>
                    <YAxis hide/>
                    <Tooltip content={multiTip}/>
                    {yd.meta>0&&<ReferenceLine y={yd.meta} stroke="#34d399" strokeDasharray="4 4" strokeOpacity={0.3}/>}
                    <Line type="monotone" dataKey="real" stroke={ycc} strokeWidth={2.5} dot={{fill:ycc,r:4,strokeWidth:0}} activeDot={{r:5}} connectNulls name={String(yr)}/>
                    <Line type="monotone" dataKey="pv" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="5 4" dot={{fill:"#f59e0b",r:3,strokeWidth:0}} activeDot={{r:4}} connectNulls name="pv"/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            <div style={{background:"rgba(255,255,255,0.04)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:20,padding:"18px 20px",boxShadow:"inset 0 1px 0 rgba(255,255,255,0.06)"}}>
              <p style={{color:"rgba(100,116,139,0.4)",fontSize:"0.58rem",letterSpacing:"0.14em",textTransform:"uppercase",margin:"0 0 14px",fontFamily:"'DM Mono',monospace"}}>comparación anual</p>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:"0.82rem"}}>
                <thead><tr>
                  <th style={{color:"rgba(100,116,139,0.3)",fontWeight:400,textAlign:"left",padding:"4px 0 10px",fontSize:"0.62rem",letterSpacing:"0.08em",textTransform:"uppercase"}}></th>
                  {Object.keys(app.years).sort().map(y=><th key={y} style={{color:yc(Number(y)),fontFamily:"'DM Mono',monospace",fontWeight:500,textAlign:"right",padding:"4px 8px 10px"}}>{y}</th>)}
                </tr></thead>
                <tbody>
                  {[
                    {l:"inicio",    fn:y=>fmt(app.years[y].pi)},
                    {l:"actual/fin",fn:y=>{const l=lastP(app.years[y]);return l>0?fmt(l):"—";}},
                    {l:"crecimiento",fn:y=>{const l=lastP(app.years[y]);if(!l)return"—";const p=((l-app.years[y].pi)/app.years[y].pi)*100;return <span style={{color:p>=0?"#34d399":"#f87171",fontFamily:"'DM Mono',monospace"}}>{fmtP(p)}</span>;}},
                    {l:"meta",      fn:y=>app.years[y].meta>0?fmt(app.years[y].meta):"—"},
                    {l:"USD actual",fn:y=>{const l=lastP(app.years[y]);return l>0?fmtU(Math.round(l/dolar)):"—";}},
                  ].map((row,i)=>(
                    <tr key={i} style={{borderTop:"1px solid rgba(255,255,255,0.04)"}}>
                      <td style={{color:"rgba(100,116,139,0.45)",padding:"8px 0",fontSize:"0.73rem",textTransform:"lowercase"}}>{row.l}</td>
                      {Object.keys(app.years).sort().map(y=><td key={y} style={{color:"rgba(148,163,184,0.6)",padding:"8px",textAlign:"right",fontFamily:"'DM Mono',monospace",fontSize:"0.78rem"}}>{row.fn(Number(y))}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p style={{textAlign:"center",color:"rgba(100,116,139,0.2)",fontSize:"0.58rem",marginTop:20,fontFamily:"'DM Mono',monospace",letterSpacing:"0.08em"}}>
          patrimonio tracker · {rateOk==="ok"?`usd/cop ${dolar.toLocaleString()} live`:"sin conexión"} · datos guardados localmente
        </p>
      </div>

      {editing&&<Modal mes={editing} data={yd.months[editing]} onSave={saveMonth} onClose={()=>setEditing(null)}/>}
      {settings&&<SettingsModal yd={yd} year={yr} onSave={saveSettings} onClose={()=>setSettings(false)}/>}
    </div>
  );
}
