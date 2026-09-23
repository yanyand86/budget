"use strict";
/* Sheet view — same data, same Drive file, same origin as the app. */

const GOOGLE_CLIENT_ID = "";
const LS_KEY = "nhs-budget-standalone:v1";
const LS_CLIENT = "nhs-budget:gclient";
const LS_DRIVE_ON = "nhs-budget:driveon";
const DRIVE_FILE = "budget.json";
const SCOPE = "https://www.googleapis.com/auth/drive.appdata";
/* the theme is saved per device (shared with the app view on the same device); it never syncs */
const LS_THEME = "nhs-budget:theme";
const THEMES = [
  { id:"violet", name:"Violet", meta:"#5B21B6" },
  { id:"sunset", name:"Sunset", meta:"#B0124A" },
  { id:"lagoon", name:"Lagoon", meta:"#13307A" },
  { id:"emerald", name:"Emerald", meta:"#053D2F" },
  { id:"berry", name:"Berry", meta:"#5B0F55" },
  { id:"night", name:"Night shift", meta:"#0D0B1E" }
];

const CAT = {
  rent:      { label: "Rent / Mortgage", color: "#7C3AED" },
  council:   { label: "Council tax",     color: "#6366F1" },
  electric:  { label: "Electricity",     color: "#F59E0B" },
  gas:       { label: "Gas / heating",   color: "#F97316" },
  water:     { label: "Water",           color: "#06B6D4" },
  internet:  { label: "Broadband",       color: "#3B82F6" },
  phone:     { label: "Mobile phone",    color: "#A855F7" },
  groceries: { label: "Groceries",       color: "#22C55E" },
  transport: { label: "Transport",       color: "#0EA5E9" },
  fuel:      { label: "Fuel",            color: "#EF4444" },
  subs:      { label: "Subscriptions",   color: "#EC4899" },
  insurance: { label: "Insurance",       color: "#14B8A6" },
  health:    { label: "Health / gym",    color: "#10B981" },
  dining:    { label: "Eating out",      color: "#FB7185" },
  childcare: { label: "Childcare",       color: "#F472B6" },
  savings:   { label: "Savings",         color: "#00C48C" },
  loan:      { label: "Loan / credit",   color: "#E11D48" },
  other:     { label: "Other",           color: "#64748B" }
};
const CAT_ORDER = ["rent","council","electric","gas","water","internet","phone","groceries","transport","fuel","subs","insurance","health","dining","childcare","savings","loan","other"];
const catOf = function(k){ return CAT[k] || CAT.other; };
const GOAL_GLYPHS = ["lifebuoy","plane","home","car","gift","diamond","cap","laptop","heart","coins","phone","sofa","target"];
const GLYPH_LABEL = { lifebuoy:"Lifebuoy", plane:"Plane", home:"House", car:"Car", gift:"Gift", diamond:"Diamond",
  cap:"Graduation", laptop:"Laptop", heart:"Heart", coins:"Coins", phone:"Phone", sofa:"Sofa", target:"Target" };
const GOAL_COLORS = ["#00C48C","#6D28D9","#F59E0B","#EF4444","#0EA5E9","#EC4899","#14B8A6","#F97316"];
const COLOR_LABEL = { "#00C48C":"Mint", "#6D28D9":"Violet", "#F59E0B":"Amber", "#EF4444":"Red",
  "#0EA5E9":"Sky", "#EC4899":"Pink", "#14B8A6":"Teal", "#F97316":"Orange" };

/* ------------------------------- helpers -------------------------------- */
const uid = function(){ return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2,8); };
const clamp = function(n,a,b){ return Math.max(a, Math.min(b,n)); };
const round2 = function(n){ return Math.round(n*100)/100; };
const num = function(v){ const n = parseFloat(String(v == null ? "" : v).replace(/[^0-9.\-]/g, "")); return isNaN(n) ? 0 : n; };
const CUR = function(){ return state.currency || "\u00A3"; };
function money0(n){ const v = Math.round(n||0); return (v<0?"-":"") + CUR() + Math.abs(v).toLocaleString("en-GB"); }
function money2(n){ n = Number(n||0); return CUR() + n.toLocaleString("en-GB",{minimumFractionDigits:(n%1===0?0:2), maximumFractionDigits:2}); }
function timeStr(ms){ return new Date(ms).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}); }

function getCycle(payDay, now){
  now = now || new Date();
  let m = now.getMonth(), y = now.getFullYear();
  if (now.getDate() < payDay){ m -= 1; if (m < 0){ m = 11; y -= 1; } }
  const start = new Date(y, m, payDay, 0,0,0,0);
  const end = new Date(y, m+1, payDay, 0,0,0,0);
  return { start: start, end: end, id: start.getFullYear() + "-" + String(start.getMonth()+1).padStart(2,"0") };
}
function shiftCycleId(id, delta){
  const p = id.split("-").map(Number); let y = p[0], m = p[1]-1+delta;
  y += Math.floor(m/12); m = ((m%12)+12)%12;
  return y + "-" + String(m+1).padStart(2,"0");
}

function el(tag, props){
  const e = document.createElement(tag);
  if (props) for (const k in props){
    const v = props[k];
    if (v == null || v === false) continue;
    if (k === "class") e.className = v;
    else if (k === "style" && typeof v === "object") Object.assign(e.style, v);
    else if (k.slice(0,2) === "on" && typeof v === "function") e.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v === true) e.setAttribute(k, "");
    else e.setAttribute(k, v);
  }
  for (let i=2;i<arguments.length;i++) kid(e, arguments[i]);
  return e;
}
function kid(e, k){
  if (k == null || k === false) return;
  if (Array.isArray(k)){ for (let i=0;i<k.length;i++) kid(e, k[i]); return; }
  e.appendChild(typeof k === "object" ? k : document.createTextNode(String(k)));
}

/* -------------------------------- state --------------------------------- */
function blank(){ return { salary:0, currency:"\u00A3", payDay:25, expenses:[], shifts:[], paid:{}, goals:[], history:[], lastCycleId:null, carryOver:true, carryEdits:{}, updatedAt:0 }; }
const EMOJI_MAP = { "\uD83D\uDEDF":"lifebuoy", "\u2708\uFE0F":"plane", "\uD83C\uDFE0":"home", "\uD83D\uDE97":"car",
  "\uD83C\uDF81":"gift", "\uD83D\uDC8D":"diamond", "\uD83C\uDF93":"cap", "\uD83D\uDCBB":"laptop",
  "\u2764\uFE0F":"heart", "\uD83D\uDC37":"coins", "\uD83D\uDCF1":"phone", "\uD83D\uDECB\uFE0F":"sofa" };
function normalize(o){
  const s = Object.assign(blank(), o || {});
  ["expenses","shifts","goals","history"].forEach(function(k){ if (!Array.isArray(s[k])) s[k] = []; });
  if (!s.paid || typeof s.paid !== "object") s.paid = {};
  if (!s.currency) s.currency = "\u00A3";
  if (!s.payDay) s.payDay = 25;
  if (typeof s.carryOver !== "boolean") s.carryOver = true;
  /* hand-edited carry-over amounts, keyed by the cycle they carry INTO ("YYYY-MM") - same rules as the app */
  const ce = {};
  if (s.carryEdits && typeof s.carryEdits === "object" && !Array.isArray(s.carryEdits)){
    Object.keys(s.carryEdits).forEach(function(k){ const v = Number(s.carryEdits[k]);
      if (/^\d{4}-\d{2}$/.test(k) && s.carryEdits[k] !== null && s.carryEdits[k] !== "" && Number.isFinite(v)) ce[k] = round2(v); });
  }
  s.carryEdits = ce;
  const dd = s.deductions || {};
  let nm = dd.niMode; if (!nm) nm = (dd.ni === 2) ? "upper" : (dd.ni === 0) ? "off" : "main";
  s.deductions = { on: typeof dd.on === "boolean" ? dd.on : true, tax: dd.tax != null ? dd.tax : 20,
    niMode: nm, niFreq: dd.niFreq || "weekly",
    pensionOn: typeof dd.pensionOn === "boolean" ? dd.pensionOn : !!(dd.pension > 0),
    pension: (dd.pension != null && dd.pension > 0) ? dd.pension : 9.8 };
  s.shifts = s.shifts.map(function(x){ if (x.gross == null) x.gross = x.amount || 0; return x; });
  s.goals = s.goals.map(function(g){
    if (!g.glyph) g.glyph = (g.emoji && EMOJI_MAP[g.emoji]) ? EMOJI_MAP[g.emoji] : "target";
    if (GOAL_COLORS.indexOf(g.color) < 0) g.color = GOAL_COLORS[0];
    return g;
  });
  return s;
}
function loadLocal(){ try { const raw = localStorage.getItem(LS_KEY); if (raw) return normalize(JSON.parse(raw)); } catch(e){} return blank(); }
function persistLocal(){ try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch(e){} }

let state = blank();
let NOW = new Date();
let tab = "expenses";
const sync = { status:"idle", last:null };

/* derived */
function cyc(){ return getCycle(state.payDay||25, NOW); }
function inCycle(s){ const C = cyc(); const t = new Date(s.date+"T00:00:00").getTime(); return t >= C.start.getTime() && t < C.end.getTime(); }
function bankTotal(){ return state.shifts.filter(inCycle).reduce(function(a,s){ return a+(s.amount||0); },0); }
function histFor(id){ return state.history.filter(function(x){ return x.cycleId === id; })[0] || null; }
/* carry-over: your edit for a cycle if you made one, otherwise what the previous cycle finished with */
function carryWorkedOut(id){ const p = histFor(shiftCycleId(id,-1)); return p ? (p.saved||0) : 0; }
function carryEdited(id){ const ce = state.carryEdits; const v = (ce && Object.prototype.hasOwnProperty.call(ce, id)) ? ce[id] : null;
  return (typeof v === "number" && Number.isFinite(v)) ? v : null; }
function carryFor(id){ if (!state.carryOver) return 0; const e = carryEdited(id); return e != null ? e : carryWorkedOut(id); }
function carriedOver(){ return carryFor(cyc().id); }
function income(){ return (state.salary||0) + bankTotal() + carriedOver(); }
const NI_THRESH = {
  weekly:      { pt:242,  uel:967,  label:"week" },
  fortnightly: { pt:484,  uel:1934, label:"fortnight" },
  fourweekly:  { pt:968,  uel:3868, label:"4 weeks" },
  monthly:     { pt:1048, uel:4189, label:"month" }
};
const EPOCH_MON = Date.UTC(1970,0,5);
function niPeriodKey(dateStr, freq){
  const d = new Date((dateStr||"")+"T00:00:00");
  if (isNaN(d.getTime())) return "na";
  if (freq === "monthly") return "m-" + d.getFullYear() + "-" + (d.getMonth()+1);
  const back = (d.getDay()+6)%7;
  const mon = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()-back);
  const span = freq === "fortnightly" ? 14 : freq === "fourweekly" ? 28 : 7;
  return freq + "-" + Math.floor((mon - EPOCH_MON) / (86400000 * span));
}
function niOnPeriod(gross, d){
  gross = Math.max(0, gross||0);
  if (!d || d.niMode === "off") return 0;
  if (d.niMode === "upper") return round2(gross * 0.02);
  const t = NI_THRESH[d.niFreq] || NI_THRESH.weekly;
  return round2(Math.max(0, Math.min(gross,t.uel) - t.pt)*0.08 + Math.max(0, gross - t.uel)*0.02);
}
function activeDed(){
  const d = state.deductions || {};
  if (!d.on) return { on:false, tax:0, niMode:"off", niFreq:d.niFreq||"weekly", pension:0 };
  return { on:true, tax:d.tax||0, niMode:d.niMode||"main", niFreq:d.niFreq||"weekly", pension: d.pensionOn ? (d.pension||0) : 0 };
}
function breakdownFor(gross, otherInPeriod, d){
  gross = Math.max(0, gross||0); otherInPeriod = Math.max(0, otherInPeriod||0);
  const pension = round2(gross*(d.pension||0)/100);
  const tax = round2(Math.max(0, gross-pension)*(d.tax||0)/100);
  const ni = round2(niOnPeriod(otherInPeriod+gross, d) - niOnPeriod(otherInPeriod, d));
  return { gross:gross, pension:pension, tax:tax, ni:ni, total:round2(pension+tax+ni), net:round2(gross-pension-tax-ni) };
}
function recalcShifts(){
  const d = activeDed(); const groups = {};
  state.shifts.forEach(function(s){
    if (s.gross == null) s.gross = s.amount||0;
    const k = niPeriodKey(s.date, d.niFreq);
    (groups[k] = groups[k]||[]).push(s);
  });
  Object.keys(groups).forEach(function(k){
    const rows = groups[k];
    const total = rows.reduce(function(a,s){ return a+(s.gross||0); },0);
    const niTotal = niOnPeriod(total, d);
    let alloc = 0;
    rows.forEach(function(s,i){
      const pension = round2((s.gross||0)*(d.pension||0)/100);
      const tax = round2(Math.max(0,(s.gross||0)-pension)*(d.tax||0)/100);
      let ni;
      if (i === rows.length-1) ni = round2(niTotal - alloc);
      else { ni = round2(total>0 ? niTotal*((s.gross||0)/total) : 0); alloc = round2(alloc+ni); }
      s.pensionAmt = pension; s.taxAmt = tax; s.niAmt = ni;
      s.amount = round2((s.gross||0) - pension - tax - ni);
      s.ded = { tax:d.tax, niMode:d.niMode, niFreq:d.niFreq, pension:d.pension };
    });
  });
}
function applyShift(){ recalcShifts(); }
function grossTotal(){ return state.shifts.filter(inCycle).reduce(function(a,x){ return a+(x.gross!=null?x.gross:x.amount||0); },0); }
function monthsBetween(a,b){ const x=a.split("-").map(Number), y=b.split("-").map(Number); return (y[0]*12+(y[1]-1))-(x[0]*12+(x[1]-1)); }
function expActiveIn(e, cycleId){ return !e.endsOn || e.endsOn >= (cycleId || cyc().id); }
function activeExpenses(cycleId){ return state.expenses.filter(function(e){ return expActiveIn(e, cycleId); }); }
function paymentsLeft(e){ if (!e.endsOn) return null; return Math.max(0, monthsBetween(cyc().id, e.endsOn)+1); }
function expTotal(){ return activeExpenses().reduce(function(a,e){ return a+(e.amount||0); },0); }
function remaining(){ return income() - expTotal(); }
function pk(id){ return cyc().id + "__" + id; }

function commit(){ state.updatedAt = Date.now(); persistLocal(); pushSoon(); }

/* -------------------------------- themes -------------------------------- */
function themeId(){ let t = null; try { t = localStorage.getItem(LS_THEME); } catch(e){} return THEMES.some(function(x){ return x.id === t; }) ? t : THEMES[0].id; }
function applyTheme(id){
  const th = THEMES.filter(function(x){ return x.id === id; })[0] || THEMES[0];
  if (document.documentElement) document.documentElement.setAttribute("data-theme", th.id);
  const m = document.querySelector ? document.querySelector('meta[name="theme-color"]') : null;
  if (m) m.setAttribute("content", th.meta);
}
const PALETTE_SVG = '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3C7 3 3 6.8 3 11.6 3 16.4 6.9 20 11.4 20c1.2 0 2-.8 2-1.8 0-.5-.2-.9-.5-1.2-.3-.4-.5-.8-.5-1.2 0-1 .8-1.8 1.8-1.8h2.3c3 0 5.5-2.3 5.5-5.3C22 5.2 17.6 3 12 3Z"/><circle cx="7.4" cy="11.6" r="1.65" fill="#FF4D7E" stroke="none"/><circle cx="9.9" cy="7.4" r="1.65" fill="#FF9F1C" stroke="none"/><circle cx="14.6" cy="6.9" r="1.65" fill="#2EE59D" stroke="none"/><circle cx="18" cy="10" r="1.65" fill="#7C5CFF" stroke="none"/></svg>';
function renderThemePicker(){
  const host = document.getElementById("sh-theme"); if (!host) return;
  host.innerHTML = "";
  const ic = el("span",{class:"sh-themeicon", "aria-hidden":"true"}); ic.innerHTML = PALETTE_SVG;
  const sel = el("select",{class:"sh-themesel", "aria-label":"Theme"});
  const now = themeId();
  THEMES.forEach(function(t){ const o = el("option",{value:t.id}, t.name); if (t.id === now) o.selected = true; sel.appendChild(o); });
  sel.addEventListener("change", function(){ try { localStorage.setItem(LS_THEME, sel.value); } catch(e){} applyTheme(sel.value); });
  host.appendChild(ic); host.appendChild(sel);
}

/* -------------------------------- toast --------------------------------- */
let toastT = null;
function toast(msg){
  const t = document.getElementById("sh-toast"); if (!t) return;
  t.textContent = msg; t.classList.add("sh-toast--on");
  clearTimeout(toastT); toastT = setTimeout(function(){ t.classList.remove("sh-toast--on"); }, 2300);
}

/* ------------------------------ google drive ----------------------------- */
function driveClientId(){ return (localStorage.getItem(LS_CLIENT) || GOOGLE_CLIENT_ID || "").trim(); }
const DRIVE = {
  token:null, tokenClient:null, fileId:null,
  ensure: function(){
    if (this.tokenClient) return true;
    if (!(window.google && google.accounts && google.accounts.oauth2)) return false;
    const id = driveClientId(); if (!id) return false;
    this.tokenClient = google.accounts.oauth2.initTokenClient({ client_id:id, scope:SCOPE, callback:function(){} });
    return true;
  },
  requestToken: function(interactive){
    const self = this;
    return new Promise(function(resolve, reject){
      if (!self.ensure()){ reject(new Error("google-not-ready")); return; }
      self.tokenClient.callback = function(r){ if (r && r.access_token){ self.token = r.access_token; resolve(r.access_token); } else reject(r || new Error("no-token")); };
      try { self.tokenClient.requestAccessToken({ prompt: interactive ? "consent" : "" }); } catch(e){ reject(e); }
    });
  },
  api: function(url, opts){
    const self = this; opts = opts || {};
    opts.headers = Object.assign({ Authorization: "Bearer " + self.token }, opts.headers || {});
    return fetch(url, opts).then(function(r){
      if (r.status === 401){ return self.requestToken(true).then(function(){ opts.headers.Authorization = "Bearer " + self.token; return fetch(url, opts); }); }
      return r;
    });
  },
  findFile: function(){
    const self = this, q = encodeURIComponent("name='" + DRIVE_FILE + "'");
    return self.api("https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&fields=files(id,modifiedTime)&q=" + q)
      .then(function(r){ return r.json(); })
      .then(function(j){ if (j.files && j.files.length){ self.fileId = j.files[0].id; return j.files[0]; } return null; });
  },
  pull: function(){
    const self = this;
    return (self.fileId ? Promise.resolve() : self.findFile()).then(function(){
      if (!self.fileId) return null;
      return self.api("https://www.googleapis.com/drive/v3/files/" + self.fileId + "?alt=media").then(function(r){ return r.ok ? r.json() : null; });
    });
  },
  push: function(data){
    const self = this, body = JSON.stringify(data);
    return (self.fileId ? Promise.resolve(self.fileId) : self.findFile()).then(function(){
      if (self.fileId){
        return self.api("https://www.googleapis.com/upload/drive/v3/files/" + self.fileId + "?uploadType=media",
          { method:"PATCH", headers:{ "Content-Type":"application/json" }, body:body });
      }
      const b = "b" + Math.random().toString(36).slice(2);
      const meta = { name: DRIVE_FILE, parents:["appDataFolder"] };
      const mp = "--"+b+"\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n"+JSON.stringify(meta)+"\r\n--"+b+"\r\nContent-Type: application/json\r\n\r\n"+body+"\r\n--"+b+"--";
      return self.api("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
        { method:"POST", headers:{ "Content-Type":"multipart/related; boundary="+b }, body:mp })
        .then(function(r){ return r.json(); }).then(function(j){ if (j && j.id) self.fileId = j.id; });
    });
  }
};
function whenGoogleReady(cb){ let n=0; (function chk(){ if (window.google && google.accounts && google.accounts.oauth2) cb(); else if (n++ < 50) setTimeout(chk, 150); })(); }

function setSync(status){ sync.status = status; renderSyncBar(); }

function syncPull(adopt){
  return DRIVE.pull().then(function(remote){
    if (remote){
      const r = remote.updatedAt || 0, l = state.updatedAt || 0;
      if (adopt && r > l){ state = normalize(remote); persistLocal(); renderAll(); return "adopted"; }
      if (l > r) return DRIVE.push(state).then(function(){ return "pushed"; });
      return "same";
    }
    return DRIVE.push(state).then(function(){ return "created"; });
  }).then(function(res){ sync.last = Date.now(); return res; });
}

let pushT = null;
function pushSoon(){
  if (localStorage.getItem(LS_DRIVE_ON) !== "1" || !DRIVE.token){ renderSyncBar(); return; }
  setSync("saving");
  clearTimeout(pushT);
  pushT = setTimeout(function(){
    DRIVE.push(state).then(function(){ sync.last = Date.now(); setSync("ok"); }).catch(function(){ setSync("error"); });
  }, 1000);
}

function connectDrive(){
  if (!driveClientId()){ toast("Paste your Google client ID first"); return Promise.resolve(); }
  setSync("connecting");
  return DRIVE.requestToken(true)
    .then(function(){ localStorage.setItem(LS_DRIVE_ON,"1"); return syncPull(true); })
    .then(function(){ setSync("ok"); toast("Drive connected"); })
    .catch(function(){ setSync("error"); toast("Couldn't connect to Drive"); });
}
function reloadFromDrive(){
  if (!driveClientId()){ toast("Paste your Google client ID first"); return Promise.resolve(); }
  setSync("connecting");
  return DRIVE.requestToken(false).catch(function(){ return DRIVE.requestToken(true); })
    .then(function(){ return DRIVE.pull(); })
    .then(function(remote){
      if (remote){ state = normalize(remote); persistLocal(); renderAll(); toast("Loaded latest from Drive"); }
      else toast("Nothing saved in Drive yet");
      sync.last = Date.now(); setSync("ok");
    })
    .catch(function(){ setSync("error"); toast("Could not reach Drive"); });
}

/* ------------------------------ grid engine ------------------------------ */
/* Column spec: {key,label,type,width,align,opts,get,set,render}
   type: text | num | date | month | select | check | calc */

function cellInput(col, row, rowIdx, onChange){
  if (col.type === "check"){
    const c = el("input",{ type:"checkbox", class:"sh-chk" });
    c.checked = !!col.get(row);
    c.addEventListener("change", function(){ col.set(row, c.checked); onChange(); });
    return el("div",{class:"sh-chkcell"}, c);
  }
  if (col.type === "select"){
    const s = el("select",{class:"sh-in"});
    col.opts.forEach(function(o){
      const op = el("option",{ value:o.value }, o.label);
      if (o.value === col.get(row)) op.selected = true;
      s.appendChild(op);
    });
    s.addEventListener("change", function(){ col.set(row, s.value); onChange(); });
    if (col.swatch){
      const sw = el("span",{class:"sh-swatch", style:{background: col.swatch(row)}});
      const wrap = el("div",{class:"sh-catcell"}, sw, s);
      s.addEventListener("change", function(){ sw.style.background = col.swatch(row); });
      return wrap;
    }
    return s;
  }
  if (col.type === "calc"){
    return el("div",{class:"sh-in sh-in--num", style:{color:"var(--ink-3)"}}, col.get(row));
  }
  const inp = el("input",{
    class: "sh-in" + (col.type === "num" ? " sh-in--num" : col.type === "date" || col.type === "month" ? " sh-in--date" : ""),
    type: col.type === "date" ? "date" : col.type === "month" ? "month" : "text",
    inputmode: col.type === "num" ? "decimal" : null,
    placeholder: col.placeholder || "",
    "data-col": col.key, "data-row": rowIdx
  });
  inp.value = col.get(row);
  inp.addEventListener("change", function(){ col.set(row, inp.value); onChange(); });
  inp.addEventListener("keydown", function(ev){ gridKey(ev, inp); });
  inp.addEventListener("paste", function(ev){ gridPaste(ev, inp, col.key, rowIdx); });
  if (col.type === "num") inp.addEventListener("blur", function(){ inp.value = col.get(row); });
  return inp;
}

function gridKey(ev, inp){
  if (ev.key !== "Enter") return;
  ev.preventDefault();
  const col = inp.getAttribute("data-col");
  const r = parseInt(inp.getAttribute("data-row"), 10);
  const next = document.querySelector('[data-col="'+col+'"][data-row="'+(ev.shiftKey ? r-1 : r+1)+'"]');
  if (next){ next.focus(); if (next.select) next.select(); }
  else if (!ev.shiftKey && CURRENT && CURRENT.addRow){ CURRENT.addRow(); setTimeout(function(){
    const n = document.querySelector('[data-col="'+col+'"][data-row="'+(r+1)+'"]'); if (n) n.focus();
  }, 30); }
}

/* paste a block copied from Excel / Sheets */
function gridPaste(ev, inp, colKey, rowIdx){
  const txt = (ev.clipboardData || window.clipboardData).getData("text");
  if (!txt || (txt.indexOf("\t") < 0 && txt.indexOf("\n") < 0)) return; // single value: let it through
  ev.preventDefault();
  if (!CURRENT || !CURRENT.cols) return;
  const rows = txt.replace(/\r/g,"").split("\n").filter(function(l){ return l.length; }).map(function(l){ return l.split("\t"); });
  const editable = CURRENT.cols.filter(function(c){ return c.type !== "calc" && c.set; });
  const startCol = editable.findIndex(function(c){ return c.key === colKey; });
  if (startCol < 0) return;
  rows.forEach(function(cells, ri){
    const target = rowIdx + ri;
    while (CURRENT.data().length <= target){ CURRENT.addRow(true); }
    const row = CURRENT.data()[target];
    cells.forEach(function(val, ci){
      const col = editable[startCol + ci];
      if (col && row) col.set(row, val.trim());
    });
  });
  commit(); renderAll();
  toast("Pasted " + rows.length + " row" + (rows.length===1?"":"s"));
}

let CURRENT = null;

function buildGrid(spec){
  CURRENT = spec;
  const rows = spec.data();
  const table = el("table",{class:"sh-grid"});
  const thead = el("thead"), htr = el("tr");
  htr.appendChild(el("th",{class:"sh-num"},"#"));
  spec.cols.forEach(function(c){ htr.appendChild(el("th",{ class:(c.align==="r"?"sh-r":""), style:c.width?{width:c.width}:null }, c.label)); });
  if (spec.onDelete) htr.appendChild(el("th",{class:"sh-delcell"},""));
  thead.appendChild(htr); table.appendChild(thead);

  const tbody = el("tbody");
  if (!rows.length){
    const td = el("td",{ colspan: String(spec.cols.length + (spec.onDelete?2:1)) }, el("div",{class:"sh-empty"}, spec.empty || "Nothing here yet."));
    tbody.appendChild(el("tr",{}, td));
  } else {
    rows.forEach(function(row, i){
      const tr = el("tr",{ class: spec.rowClass ? spec.rowClass(row) : null });
      tr.appendChild(el("td",{class:"sh-num"}, String(i+1)));
      spec.cols.forEach(function(c){
        tr.appendChild(el("td",{ class:(c.align==="r"?"sh-r":"") }, c.render ? c.render(row) : cellInput(c, row, i, function(){ commit(); softRefresh(); })));
      });
      if (spec.onDelete){
        tr.appendChild(el("td",{class:"sh-delcell"},
          el("button",{ class:"sh-del", title:"Delete row", "aria-label":"Delete row",
            onClick:function(){ spec.onDelete(row); commit(); renderAll(); } }, "\u2715")));
      }
      tbody.appendChild(tr);
    });
  }
  table.appendChild(tbody);

  if (spec.foot){
    const tf = el("tfoot"), ftr = el("tr");
    ftr.appendChild(el("td",{class:"sh-num"},""));
    spec.foot().forEach(function(f){ ftr.appendChild(el("td",{ class:(f.align==="r"?"sh-r":"")+(f.hint?" sh-foothint":"") }, f.node != null ? f.node : (f.text||""))); });
    if (spec.onDelete) ftr.appendChild(el("td",{}));
    tf.appendChild(ftr); table.appendChild(tf);
  }
  return table;
}

function softRefresh(){ renderPanel(); renderCycleLabel(); }

/* --------------------------------- CSV ---------------------------------- */
function toCSV(headers, rows){
  const esc = function(v){ v = (v == null ? "" : String(v)); return /[",\n]/.test(v) ? '"' + v.replace(/"/g,'""') + '"' : v; };
  return [headers.map(esc).join(",")].concat(rows.map(function(r){ return r.map(esc).join(","); })).join("\n");
}
function parseCSV(text){
  const rows = []; let row = [], cur = "", q = false;
  text = text.replace(/\r\n/g,"\n").replace(/\r/g,"\n");
  for (let i=0;i<text.length;i++){
    const ch = text[i];
    if (q){
      if (ch === '"'){ if (text[i+1] === '"'){ cur += '"'; i++; } else q = false; }
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ","){ row.push(cur); cur = ""; }
    else if (ch === "\n"){ row.push(cur); rows.push(row); row = []; cur = ""; }
    else cur += ch;
  }
  if (cur.length || row.length){ row.push(cur); rows.push(row); }
  return rows.filter(function(r){ return r.some(function(c){ return String(c).trim().length; }); });
}
function downloadText(name, text, mime){
  try {
    const blob = new Blob([text], { type: mime || "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = el("a",{ href:url, download:name });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 1500);
    toast("Downloaded " + name);
  } catch(e){ toast("Could not export"); }
}
function pickFile(accept, cb){
  const inp = el("input",{ type:"file", accept:accept, style:{display:"none"} });
  inp.addEventListener("change", function(){
    const f = inp.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = function(){ cb(String(rd.result)); };
    rd.readAsText(f);
  });
  document.body.appendChild(inp); inp.click();
  setTimeout(function(){ inp.remove(); }, 1000);
}

/* --------------------------------- tabs ---------------------------------- */
const TABS = [
  { id:"expenses", label:"Expenses",    count:function(){ return state.expenses.length; } },
  { id:"shifts",   label:"Bank shifts", count:function(){ return state.shifts.length; } },
  { id:"goals",    label:"Savings goals", count:function(){ return state.goals.length; } },
  { id:"history",  label:"History",     count:function(){ return state.history.length; } },
  { id:"setup",    label:"Setup",       count:null }
];

const catOpts = CAT_ORDER.map(function(k){ return { value:k, label:CAT[k].label }; });
const glyphOpts = GOAL_GLYPHS.map(function(g){ return { value:g, label:GLYPH_LABEL[g]||g }; });
const colorOpts = GOAL_COLORS.map(function(c){ return { value:c, label:COLOR_LABEL[c]||c }; });

function panelCard(title, hint, acts, body, addLabel, onAdd){
  return el("div",{class:"sh-card"},
    el("div",{class:"sh-cardbar"},
      el("div",{}, el("h2",{class:"sh-cardtitle"}, title), hint ? el("div",{class:"sh-cardhint"}, hint) : null),
      el("div",{class:"sh-cardacts"}, acts)),
    el("div",{class:"sh-scroll"}, body),
    onAdd ? el("div",{class:"sh-addbar"}, el("button",{class:"sh-add", onClick:onAdd}, "+ " + addLabel)) : null
  );
}
function csvBtn(label, fn){ return el("button",{class:"sh-btn", onClick:fn}, label); }

/* ------------------------------- expenses -------------------------------- */
function expensesPanel(){
  const spec = {
    data: function(){ return state.expenses; },
    cols: [
      { key:"name", label:"Expense", type:"text", placeholder:"e.g. Rent",
        get:function(r){ return r.name||""; }, set:function(r,v){ r.name = v; } },
      { key:"category", label:"Category", type:"select", opts:catOpts, width:"210px",
        swatch:function(r){ return catOf(r.category).color; },
        get:function(r){ return r.category||"other"; }, set:function(r,v){ r.category = v; } },
      { key:"amount", label:"Amount / month", type:"num", align:"r", width:"150px",
        get:function(r){ return r.amount != null ? String(r.amount) : ""; },
        set:function(r,v){ r.amount = Math.max(0, round2(num(v))); } },
      { key:"endsOn", label:"Ends", type:"month", width:"150px",
        get:function(r){ return r.endsOn||""; }, set:function(r,v){ r.endsOn = v || null; } },
      { key:"left", label:"Left", type:"calc", align:"r", width:"140px",
        get:function(r){ const n=paymentsLeft(r); return n==null ? "\u2014" : (n===0 ? "finished" : n+" \u00B7 "+money0(n*(r.amount||0))); },
        render: function(r){ const n=paymentsLeft(r);
          if (n==null) return el("div",{class:"sh-in sh-in--num", style:{color:"var(--ink-4)"}},"\u2014");
          if (n===0) return el("div",{style:{padding:"11px 12px",textAlign:"right"}}, el("span",{class:"sh-pill sh-pill--manual"},"finished"));
          return el("div",{class:"sh-in sh-in--num", style:{color:n<=1?"var(--hot)":"var(--accent-ink)",fontWeight:"700"}}, n+" \u00D7 \u00B7 "+money0(n*(r.amount||0))); } },
      { key:"paid", label:"Paid", type:"check", align:"r", width:"70px",
        get:function(r){ return !!state.paid[pk(r.id)]; },
        set:function(r,v){ const k = pk(r.id); if (v) state.paid[k] = true; else delete state.paid[k]; } }
    ],
    rowClass: function(r){ return (!expActiveIn(r, cyc().id) || state.paid[pk(r.id)]) ? "sh-row--done" : null; },
    onDelete: function(r){ state.expenses = state.expenses.filter(function(x){ return x.id !== r.id; }); },
    addRow: function(silent){ state.expenses.push({ id:uid(), name:"", category:"other", amount:0, endsOn:null }); if (!silent){ commit(); renderAll(); } },
    empty: "No expenses yet — add your monthly bills.",
    foot: function(){
      const live = activeExpenses();
      const paidN = live.filter(function(e){ return state.paid[pk(e.id)]; }).length;
      const finN = state.expenses.length - live.length;
      return [ { text: finN ? ("Total \u00B7 " + finN + " finished") : "Total", hint:true }, { text:"" },
        { node: el("strong",{}, money2(expTotal())), align:"r" },
        { text:"" },
        { text:"" },
        { text: paidN + "/" + live.length, align:"r", hint:true } ];
    }
  };
  const acts = [
    csvBtn("Export CSV", function(){
      downloadText("expenses.csv", toCSV(["Expense","Category","Amount","Ends","Paid"],
        state.expenses.map(function(e){ return [e.name, catOf(e.category).label, e.amount, e.endsOn||"", state.paid[pk(e.id)] ? "yes" : "no"]; })));
    }),
    csvBtn("Import CSV", function(){
      pickFile(".csv,text/csv", function(txt){
        const rows = parseCSV(txt); if (!rows.length) return toast("Nothing to import");
        const body = /expense|name/i.test(rows[0][0]||"") ? rows.slice(1) : rows;
        const labelToKey = {}; CAT_ORDER.forEach(function(k){ labelToKey[CAT[k].label.toLowerCase()] = k; labelToKey[k] = k; });
        body.forEach(function(r){
          const nm = (r[0]||"").trim(); if (!nm) return;
          const key = labelToKey[(r[1]||"").trim().toLowerCase()] || "other";
          const ends = (r[3]||"").trim();
          state.expenses.push({ id:uid(), name:nm, category:key, amount:Math.max(0, round2(num(r[2]))), endsOn: /^\d{4}-\d{2}$/.test(ends) ? ends : null });
        });
        commit(); renderAll(); toast("Imported " + body.length + " rows");
      });
    })
  ];
  return panelCard("Monthly expenses", "Set \u201CEnds\u201D on loans or credit cards \u2014 the month of the final payment. They stop counting after that.",
    acts, buildGrid(spec), "Add expense", function(){ spec.addRow(); });
}

/* -------------------------------- shifts --------------------------------- */
function shiftsPanel(){
  const spec = {
    data: function(){ return state.shifts.slice().sort(function(a,b){ return a.date < b.date ? 1 : -1; }); },
    cols: [
      { key:"date", label:"Date", type:"date", width:"160px",
        get:function(r){ return r.date||""; }, set:function(r,v){ r.date = v; } },
      { key:"label", label:"Shift", type:"text", placeholder:"e.g. Long day \u00B7 Renal",
        get:function(r){ return r.label||""; }, set:function(r,v){ r.label = v; } },
      { key:"hours", label:"Hours", type:"num", align:"r", width:"100px",
        get:function(r){ return r.hours != null ? String(r.hours) : ""; },
        set:function(r,v){ r.hours = v === "" ? null : num(v); if (r.hours && r.rate){ r.gross = round2(r.hours*r.rate); applyShift(r); } } },
      { key:"rate", label:"Rate / hr", type:"num", align:"r", width:"110px",
        get:function(r){ return r.rate != null ? String(r.rate) : ""; },
        set:function(r,v){ r.rate = v === "" ? null : num(v); if (r.hours && r.rate){ r.gross = round2(r.hours*r.rate); applyShift(r); } } },
      { key:"gross", label:"Gross", type:"num", align:"r", width:"120px",
        get:function(r){ return r.gross != null ? String(r.gross) : ""; },
        set:function(r,v){ r.gross = Math.max(0, round2(num(v))); applyShift(r); } },
      { key:"net", label:"Take-home", type:"calc", align:"r", width:"130px",
        get:function(r){ return money2(r.amount||0); },
        render:function(r){ return el("div",{class:"sh-in sh-in--num sh-pos"}, money2(r.amount||0)); } },
      { key:"cyc", label:"Cycle", type:"calc", width:"110px",
        get:function(r){ return inCycle(r) ? "this cycle" : ""; },
        render: function(r){ return el("div",{style:{padding:"11px 12px"}}, inCycle(r) ? el("span",{class:"sh-pill sh-pill--now"},"this cycle") : el("span",{style:{color:"var(--ink-4)",fontSize:"12.5px"}},"\u2014")); } }
    ],
    onDelete: function(r){ state.shifts = state.shifts.filter(function(x){ return x.id !== r.id; }); },
    addRow: function(silent){ state.shifts.push({ id:uid(), date:new Date().toISOString().slice(0,10), label:"", hours:null, rate:null, gross:0, amount:0 }); if (!silent){ commit(); renderAll(); } },
    empty: "No bank shifts logged.",
    foot: function(){
      const allGross = state.shifts.reduce(function(a,s){ return a+(s.gross!=null?s.gross:s.amount||0); },0);
      const allNet = state.shifts.reduce(function(a,s){ return a+(s.amount||0); },0);
      return [ { text:"Totals", hint:true }, { text:"" }, { text:"" }, { text:"" },
        { node: el("strong",{}, money2(allGross)), align:"r" },
        { node: el("strong",{class:"sh-pos"}, money2(allNet)), align:"r" },
        { node: el("span",{class:"sh-pos"}, "cycle " + money2(bankTotal())), align:"r" } ];
    }
  };
  const acts = [ csvBtn("Export CSV", function(){
    downloadText("bank-shifts.csv", toCSV(["Date","Shift","Hours","Rate","Gross","Take-home"],
      state.shifts.map(function(s){ return [s.date, s.label, s.hours, s.rate, (s.gross!=null?s.gross:s.amount), s.amount]; })));
  }) ];
  return panelCard("Bank shifts", "Enter gross pay (or hours \u00D7 rate) \u2014 take-home is worked out from your deduction settings. Only shifts in the current cycle count towards this month.",
    acts, buildGrid(spec), "Add shift", function(){ spec.addRow(); });
}

/* --------------------------------- goals --------------------------------- */
function goalsPanel(){
  const spec = {
    data: function(){ return state.goals; },
    cols: [
      { key:"name", label:"Goal", type:"text", placeholder:"e.g. Emergency fund",
        get:function(r){ return r.name||""; }, set:function(r,v){ r.name = v; } },
      { key:"glyph", label:"Icon", type:"select", opts:glyphOpts, width:"150px",
        get:function(r){ return r.glyph||"target"; }, set:function(r,v){ r.glyph = v; } },
      { key:"color", label:"Colour", type:"select", opts:colorOpts, width:"150px",
        swatch:function(r){ return r.color; },
        get:function(r){ return r.color||GOAL_COLORS[0]; }, set:function(r,v){ r.color = v; } },
      { key:"target", label:"Target", type:"num", align:"r", width:"130px",
        get:function(r){ return r.target != null ? String(r.target) : ""; },
        set:function(r,v){ r.target = Math.max(0, round2(num(v))); } },
      { key:"saved", label:"Saved", type:"num", align:"r", width:"130px",
        get:function(r){ return r.saved != null ? String(r.saved) : ""; },
        set:function(r,v){ r.saved = Math.max(0, round2(num(v))); } },
      { key:"targetDate", label:"By", type:"month", width:"150px",
        get:function(r){ return r.targetDate||""; }, set:function(r,v){ r.targetDate = v || null; } },
      { key:"pct", label:"Progress", type:"calc", align:"r", width:"110px",
        get:function(r){ return (r.target>0 ? Math.round(clamp(r.saved/r.target,0,1)*100) : 0) + "%"; } }
    ],
    onDelete: function(r){ state.goals = state.goals.filter(function(x){ return x.id !== r.id; }); },
    addRow: function(silent){ state.goals.push({ id:uid(), glyph:"target", name:"", color:GOAL_COLORS[0], target:0, saved:0, targetDate:null }); if (!silent){ commit(); renderAll(); } },
    empty: "No savings goals yet.",
    foot: function(){
      const t = state.goals.reduce(function(a,g){ return a+(g.target||0); },0);
      const s = state.goals.reduce(function(a,g){ return a+(g.saved||0); },0);
      return [ { text:"Totals", hint:true }, { text:"" }, { text:"" },
        { node: el("strong",{}, money2(t)), align:"r" },
        { node: el("strong",{class:"sh-pos"}, money2(s)), align:"r" }, { text:"" },
        { text: (t>0 ? Math.round(s/t*100) : 0) + "%", align:"r" } ];
    }
  };
  const acts = [ csvBtn("Export CSV", function(){
    downloadText("savings-goals.csv", toCSV(["Goal","Target","Saved","By"],
      state.goals.map(function(g){ return [g.name, g.target, g.saved, g.targetDate||""]; })));
  }) ];
  return panelCard("Savings goals", "Editing \u201CSaved\u201D here sets the total directly \u2014 the phone app's + button adds to it.",
    acts, buildGrid(spec), "Add goal", function(){ spec.addRow(); });
}

/* -------------------------------- history -------------------------------- */
function historyPanel(){
  const spec = {
    data: function(){ return state.history.slice().sort(function(a,b){ return a.cycleId < b.cycleId ? 1 : -1; }); },
    cols: [
      { key:"cycleId", label:"Month", type:"month", width:"170px",
        get:function(r){ return r.cycleId||""; },
        set:function(r,v){ if (!v) return; r.cycleId = v; const p = v.split("-").map(Number);
          r.label = new Date(p[0], p[1]-1, 1).toLocaleDateString("en-GB",{month:"short",year:"numeric"}); } },
      { key:"income", label:"Money in", type:"num", align:"r", width:"140px",
        get:function(r){ return r.income != null ? String(r.income) : ""; },
        set:function(r,v){ r.income = round2(num(v)); r.saved = round2((r.income||0)-(r.expenses||0)); } },
      { key:"expenses", label:"Money out", type:"num", align:"r", width:"140px",
        get:function(r){ return r.expenses != null ? String(r.expenses) : ""; },
        set:function(r,v){ r.expenses = round2(num(v)); r.saved = round2((r.income||0)-(r.expenses||0)); } },
      { key:"saved", label:"Saved", type:"calc", align:"r", width:"130px",
        get:function(r){ return money0(r.saved||0); },
        render: function(r){ return el("div",{class:"sh-in sh-in--num " + ((r.saved||0)>=0?"sh-pos":"sh-neg")}, money0(r.saved||0)); } },
      { key:"src", label:"Source", type:"calc", width:"120px",
        get:function(r){ return r.manual ? "added" : "auto"; },
        render: function(r){ return el("div",{style:{padding:"11px 12px"}},
          el("span",{class:"sh-pill " + (r.manual ? "sh-pill--manual" : "sh-pill--auto")}, r.manual ? "added" : "auto")); } }
    ],
    onDelete: function(r){ state.history = state.history.filter(function(x){ return x.cycleId !== r.cycleId; }); },
    addRow: function(silent){
      const d = new Date(); const p = new Date(d.getFullYear(), d.getMonth()-1, 1);
      let id = p.getFullYear() + "-" + String(p.getMonth()+1).padStart(2,"0");
      while (histFor(id)) id = shiftCycleId(id, -1);
      const q = id.split("-").map(Number);
      state.history.push({ cycleId:id, label:new Date(q[0], q[1]-1, 1).toLocaleDateString("en-GB",{month:"short",year:"numeric"}),
        income:0, expenses:0, saved:0, manual:true });
      if (!silent){ commit(); renderAll(); }
    },
    empty: "No months recorded yet. Finished cycles are saved automatically each payday \u2014 or add past months here.",
    foot: function(){
      const inc = state.history.reduce(function(a,r){ return a+(r.income||0); },0);
      const out = state.history.reduce(function(a,r){ return a+(r.expenses||0); },0);
      return [ { text:"Totals", hint:true },
        { node: el("strong",{}, money2(inc)), align:"r" },
        { node: el("strong",{}, money2(out)), align:"r" },
        { node: el("strong",{class:(inc-out)>=0?"sh-pos":"sh-neg"}, money0(inc-out)), align:"r" },
        { text:"" } ];
    }
  };
  const acts = [
    csvBtn("Export CSV", function(){
      downloadText("month-history.csv", toCSV(["Month","Label","Money in","Money out","Saved","Source"],
        spec.data().map(function(r){ return [r.cycleId, r.label, r.income, r.expenses, r.saved, r.manual?"added":"auto"]; })));
    }),
    csvBtn("Import CSV", function(){
      pickFile(".csv,text/csv", function(txt){
        const rows = parseCSV(txt); if (!rows.length) return toast("Nothing to import");
        const body = /month/i.test(rows[0][0]||"") ? rows.slice(1) : rows;
        let n = 0;
        body.forEach(function(r){
          const m = (r[0]||"").trim(); if (!/^\d{4}-\d{2}$/.test(m)) return;
          const inc = round2(num(r[2] !== undefined && r[2] !== "" ? r[2] : r[1]));
          const out = round2(num(r[3] !== undefined && r[3] !== "" ? r[3] : r[2]));
          const p = m.split("-").map(Number);
          state.history = state.history.filter(function(x){ return x.cycleId !== m; });
          state.history.push({ cycleId:m, label:new Date(p[0],p[1]-1,1).toLocaleDateString("en-GB",{month:"short",year:"numeric"}),
            income:inc, expenses:out, saved:round2(inc-out), manual:true });
          n++;
        });
        commit(); renderAll(); toast("Imported " + n + " months");
      });
    })
  ];
  return panelCard("Month-to-month history", "Saved updates itself from money in minus money out. Months use the YYYY-MM format.",
    acts, buildGrid(spec), "Add a month", function(){ spec.addRow(); });
}

/* --------------------------------- setup --------------------------------- */
function setupPanel(){
  function fld(label, input, hint){ return el("div",{class:"sh-field"}, el("label",{}, label), input, hint ? el("div",{class:"sh-fhint"}, hint) : null); }
  const salary = el("input",{ type:"text", inputmode:"decimal", value:String(state.salary||0) });
  salary.addEventListener("change", function(){ state.salary = Math.max(0, round2(num(salary.value))); salary.value = String(state.salary); commit(); softRefresh(); });
  const payday = el("input",{ type:"number", min:"1", max:"28", value:String(state.payDay||25) });
  payday.addEventListener("change", function(){ state.payDay = clamp(parseInt(payday.value,10)||25,1,28); payday.value = String(state.payDay); commit(); renderAll(); });
  const cur = el("input",{ type:"text", maxlength:"3", value:state.currency||"\u00A3" });
  cur.addEventListener("change", function(){ state.currency = cur.value.trim() || "\u00A3"; commit(); renderAll(); });
  const carry = el("select",{}, el("option",{value:"on"},"On \u2014 roll leftovers forward"), el("option",{value:"off"},"Off \u2014 each cycle starts clean"));
  carry.value = state.carryOver ? "on" : "off";
  carry.addEventListener("change", function(){ state.carryOver = carry.value === "on"; commit(); renderAll(); });
  /* carried in this cycle: blank = use last cycle's leftover; a number = your figure (minus for overspent) */
  const cyId = cyc().id, carryAuto = carryWorkedOut(cyId), carryEd = carryEdited(cyId);
  const carryAmt = el("input",{ type:"text", inputmode:"decimal", "aria-label":"Carried in this cycle",
    value: carryEd != null ? String(carryEd) : "", placeholder: (Math.round(carryAuto*100)/100).toFixed(2) });
  if (!state.carryOver) carryAmt.disabled = true;
  carryAmt.addEventListener("change", function(){
    const raw = carryAmt.value.replace(/\u2212/g, "-").trim();
    if (!state.carryEdits || typeof state.carryEdits !== "object") state.carryEdits = {};
    if (raw === "") delete state.carryEdits[cyId];
    else { const v = round2(num(raw)); if (v === round2(carryAuto)) delete state.carryEdits[cyId]; else state.carryEdits[cyId] = v; }
    commit(); renderAll();
  });
  const carryHint = !state.carryOver ? "Carry over is off, so nothing comes across."
    : carryEd != null ? "You changed this. Worked out from last cycle: " + money2(carryAuto) + " \u2014 clear the box to use that."
    : "Worked out from last cycle. Type an amount to change it \u2014 use a minus sign if you overspent.";

  function sel(opts, cur, onch){
    const s2 = el("select",{});
    opts.forEach(function(o){ const op = el("option",{value:String(o.v)}, o.l); if (Number(o.v)===Number(cur)) op.selected = true; s2.appendChild(op); });
    s2.addEventListener("change", function(){ onch(parseFloat(s2.value)||0); });
    return s2;
  }
  const TAX_OPTS = [ {v:0,l:"None"}, {v:20,l:"20% \u2014 basic / BR"}, {v:40,l:"40% \u2014 higher"}, {v:45,l:"45% \u2014 additional"} ];
  const PEN_OPTS = [ {v:5.2,l:"5.2%"}, {v:6.5,l:"6.5%"}, {v:8.3,l:"8.3%"}, {v:9.8,l:"9.8%"}, {v:10.7,l:"10.7%"}, {v:12.5,l:"12.5%"} ];
  function selS(opts, cur, onch){ const s2=el("select",{});
    opts.forEach(function(o){ const op=el("option",{value:String(o.v)},o.l); if(String(o.v)===String(cur)) op.selected=true; s2.appendChild(op); });
    s2.addEventListener("change", function(){ onch(s2.value); }); return s2; }
  const NIMODE_OPTS = [ {v:"main",l:"Standard \u2014 8% above threshold"}, {v:"upper",l:"2% flat"}, {v:"off",l:"None"} ];
  const FREQ_OPTS = [ {v:"weekly",l:"Weekly"}, {v:"fortnightly",l:"Fortnightly"}, {v:"fourweekly",l:"Every 4 weeks"}, {v:"monthly",l:"Monthly"} ];
  const penOnOff = el("select",{}, el("option",{value:"off"},"Off \u2014 not pensionable"), el("option",{value:"on"},"On"));
  penOnOff.value = state.deductions.pensionOn ? "on" : "off";
  penOnOff.addEventListener("change", function(){ state.deductions.pensionOn = penOnOff.value==="on"; recalcShifts(); commit(); renderAll(); });
  const onOff = el("select",{}, el("option",{value:"on"},"On \u2014 deduct tax, NI, pension"), el("option",{value:"off"},"Off \u2014 use amounts as entered"));
  onOff.value = state.deductions.on ? "on" : "off";
  onOff.addEventListener("change", function(){ state.deductions.on = onOff.value === "on"; recalcShifts(); commit(); renderAll(); });
  const stat = function(lab, val, cls){ return el("div",{class:"sh-stat"}, el("div",{class:"sh-statlab"}, lab), el("div",{class:"sh-statval " + (cls||"")}, val)); };
  const rem = remaining();

  return el("div",{class:"sh-card"},
    el("div",{class:"sh-cardbar"},
      el("div",{}, el("h2",{class:"sh-cardtitle"},"Setup & summary"), el("div",{class:"sh-cardhint"},"These match the app's Settings screen.")),
      el("div",{class:"sh-cardacts"},
        el("button",{class:"sh-btn", onClick:function(){ downloadText("budget-backup-" + new Date().toISOString().slice(0,10) + ".json", JSON.stringify(state,null,2), "application/json"); }}, "Export backup (.json)"),
        el("button",{class:"sh-btn", onClick:function(){
          pickFile("application/json,.json", function(txt){
            try { state = normalize(JSON.parse(txt)); state.updatedAt = Date.now(); persistLocal(); pushSoon(); renderAll(); toast("Backup imported"); }
            catch(e){ toast("That file could not be read"); }
          });
        }}, "Import backup")
      )),
    el("div",{class:"sh-form"},
      fld("Monthly salary (take-home)", salary),
      fld("Payday", payday, "Everything resets on this day of the month."),
      fld("Currency symbol", cur),
      fld("Carry over leftovers", carry, "Adds last cycle's remainder to this cycle's income."),
      fld("Carried in this cycle", carryAmt, carryHint),
      fld("Bank shift take-home", onOff, "Turns gross shift pay into what reaches your bank."),
      fld("Income tax on extra earnings", sel(TAX_OPTS, state.deductions.tax, function(v){ state.deductions.tax=v; recalcShifts(); commit(); renderAll(); }), "Your marginal rate."),
      fld("National Insurance", selS(NIMODE_OPTS, state.deductions.niMode, function(v){ state.deductions.niMode=v; recalcShifts(); commit(); renderAll(); })),
      fld("How often you're paid", selS(FREQ_OPTS, state.deductions.niFreq, function(v){ state.deductions.niFreq=v; recalcShifts(); commit(); renderAll(); }), "NI is 8% only above " + money0((NI_THRESH[state.deductions.niFreq]||NI_THRESH.weekly).pt) + " per " + (NI_THRESH[state.deductions.niFreq]||NI_THRESH.weekly).label + "."),
      fld("NHS pension on bank pay", penOnOff, "Leave off if your payslip shows PENSION CONTS 0.00."),
      fld("Pension tier", sel(PEN_OPTS, state.deductions.pension, function(v){ state.deductions.pension=v; recalcShifts(); commit(); renderAll(); }), "Taken before income tax.")
    ),
    el("div",{class:"sh-stats"},
      stat("Income this cycle", money2(income()), "sh-pos"),
      stat("Expenses", money2(expTotal())),
      stat("Left this cycle", money0(rem), rem>=0 ? "sh-pos" : "sh-neg"),
      stat("Carried in", money0(carriedOver())),
      stat("Bank shifts (gross)", money2(grossTotal())),
      stat("Bank shifts (take-home)", money2(bankTotal()), "sh-pos")
    )
  );
}

/* -------------------------------- render --------------------------------- */
function renderCycleLabel(){
  const lab = document.getElementById("sh-cyclelabel"); if (!lab) return;
  const C = cyc(), last = new Date(C.end.getTime() - 86400000);
  const f = function(d){ return d.toLocaleDateString("en-GB",{day:"numeric",month:"short"}); };
  lab.textContent = "Cycle " + f(C.start) + " \u2013 " + f(last) + "  \u00B7  left " + money0(remaining());
}

function renderSyncBar(){
  const bar = document.getElementById("sh-syncbar"); if (!bar) return;
  bar.innerHTML = "";
  const on = localStorage.getItem(LS_DRIVE_ON) === "1";
  const hasId = !!driveClientId();
  let led = "sh-led", msg = "Saved on this device only";
  if (sync.status === "saving" || sync.status === "connecting"){ led += " sh-led--busy"; msg = sync.status === "saving" ? "Saving\u2026" : "Connecting\u2026"; }
  else if (sync.status === "error"){ led += " sh-led--warn"; msg = "Sync problem \u2014 try Reload from Drive"; }
  else if (on && sync.status === "ok"){ led += " sh-led--ok"; msg = "Synced with your phone app"; }
  else if (on){ led += " sh-led--ok"; msg = "Connected to Drive"; }

  bar.appendChild(el("span",{class:led}));
  const m = el("div",{class:"sh-syncmsg"}, msg);
  if (sync.last) m.appendChild(el("span",{}, "  \u00B7 " + timeStr(sync.last)));
  bar.appendChild(m);

  if (!on){
    const cid = el("input",{ class:"sh-cid", placeholder:"Paste your Google client ID (same one as the app)", value: driveClientId() });
    cid.addEventListener("change", function(){
      const v = cid.value.trim();
      if (v) localStorage.setItem(LS_CLIENT, v); else localStorage.removeItem(LS_CLIENT);
      DRIVE.tokenClient = null; renderSyncBar();
    });
    bar.appendChild(cid);
    const b = el("button",{ class:"sh-btn sh-btn--primary", onClick:function(){ connectDrive(); } }, "Connect Drive");
    if (!hasId) b.disabled = true;
    bar.appendChild(b);
  } else {
    bar.appendChild(el("button",{ class:"sh-btn sh-btn--mint", onClick:function(){
      setSync("saving"); DRIVE.push(state).then(function(){ sync.last = Date.now(); setSync("ok"); toast("Pushed to Drive"); }).catch(function(){ setSync("error"); });
    }}, "Save to Drive now"));
  }
}

function renderTabs(){
  const t = document.getElementById("sh-tabs"); if (!t) return;
  t.innerHTML = "";
  TABS.forEach(function(x){
    const b = el("button",{ class:"sh-tab" + (tab===x.id ? " sh-tab--on" : ""), onClick:function(){ tab = x.id; renderTabs(); renderPanel(); } }, x.label);
    if (x.count) b.appendChild(el("span",{class:"sh-tabcount"}, String(x.count())));
    t.appendChild(b);
  });
}

function renderPanel(){
  const p = document.getElementById("sh-panel"); if (!p) return;
  p.innerHTML = "";
  p.appendChild(tab === "expenses" ? expensesPanel()
    : tab === "shifts" ? shiftsPanel()
    : tab === "goals" ? goalsPanel()
    : tab === "history" ? historyPanel()
    : setupPanel());
}

function renderAll(){ renderCycleLabel(); renderSyncBar(); renderTabs(); renderPanel(); }

/* --------------------------------- boot ---------------------------------- */
function boot(){
  applyTheme(themeId());
  state = loadLocal();
  renderAll();
  renderThemePicker();
  /* the app view changed the theme in another tab on this device */
  window.addEventListener("storage", function(e){ if (e.key === LS_THEME){ applyTheme(themeId()); renderThemePicker(); } });
  const rl = document.getElementById("sh-reload");
  if (rl) rl.addEventListener("click", function(){ reloadFromDrive(); });
  if (localStorage.getItem(LS_DRIVE_ON) === "1" && driveClientId()){
    whenGoogleReady(function(){
      setSync("connecting");
      DRIVE.requestToken(false)
        .then(function(){ return syncPull(true); })
        .then(function(){ setSync("ok"); })
        .catch(function(){ setSync("idle"); });
    });
  }
  if ("serviceWorker" in navigator){
    window.addEventListener("load", function(){ navigator.serviceWorker.register("sw.js").catch(function(){}); });
  }
  /* pick up changes made on the phone when returning to the tab */
  document.addEventListener("visibilitychange", function(){
    if (!document.hidden && localStorage.getItem(LS_DRIVE_ON) === "1" && DRIVE.token){
      syncPull(true).then(function(){ setSync("ok"); }).catch(function(){});
    }
  });
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
