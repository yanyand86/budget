"use strict";
/* Sheet view — same data, same Drive file, same origin as the app. */

const GOOGLE_CLIENT_ID = "";
const LS_KEY = "nhs-budget-standalone:v1";
const LS_CLIENT = "nhs-budget:gclient";
const LS_DRIVE_ON = "nhs-budget:driveon";
const DRIVE_FILE = "budget.json";
const SCOPE = "https://www.googleapis.com/auth/drive.appdata";

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
function blank(){ return { salary:0, currency:"\u00A3", payDay:25, expenses:[], shifts:[], paid:{}, goals:[], history:[], lastCycleId:null, carryOver:true, updatedAt:0 }; }
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
  const dd = s.deductions || {};
  s.deductions = { on: typeof dd.on === "boolean" ? dd.on : true,
    tax: dd.tax != null ? dd.tax : 20, ni: dd.ni != null ? dd.ni : 8, pension: dd.pension != null ? dd.pension : 0 };
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
function carriedOver(){ if (!state.carryOver) return 0; const p = histFor(shiftCycleId(cyc().id,-1)); return p ? (p.saved||0) : 0; }
function income(){ return (state.salary||0) + bankTotal() + carriedOver(); }
function netFromGross(gross, d){
  gross = Math.max(0, gross||0); d = d || {tax:0,ni:0,pension:0};
  const pension = round2(gross*(d.pension||0)/100);
  const tax = round2(Math.max(0, gross-pension)*(d.tax||0)/100);
  const ni = round2(gross*(d.ni||0)/100);
  return { gross:gross, pension:pension, tax:tax, ni:ni, total:round2(pension+tax+ni), net:round2(gross-pension-tax-ni) };
}
function activeDed(){ const d = state.deductions||{}; return d.on ? {tax:d.tax||0, ni:d.ni||0, pension:d.pension||0} : {tax:0,ni:0,pension:0}; }
function applyShift(r){ const x = netFromGross(r.gross||0, activeDed()); r.amount = x.net; r.ded = activeDed(); }
function recalcShifts(){ state.shifts.forEach(applyShift); }
function grossTotal(){ return state.shifts.filter(inCycle).reduce(function(a,x){ return a+(x.gross!=null?x.gross:x.amount||0); },0); }
function monthsBetween(a,b){ const x=a.split("-").map(Number), y=b.split("-").map(Number); return (y[0]*12+(y[1]-1))-(x[0]*12+(x[1]-1)); }
function expActiveIn(e, cycleId){ return !e.endsOn || e.endsOn >= (cycleId || cyc().id); }
function activeExpenses(cycleId){ return state.expenses.filter(function(e){ return expActiveIn(e, cycleId); }); }
function paymentsLeft(e){ if (!e.endsOn) return null; return Math.max(0, monthsBetween(cyc().id, e.endsOn)+1); }
function expTotal(){ return activeExpenses().reduce(function(a,e){ return a+(e.amount||0); },0); }
function remaining(){ return income() - expTotal(); }
function pk(id){ return cyc().id + "__" + id; }

function commit(){ state.updatedAt = Date.now(); persistLocal(); pushSoon(); }

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
    return el("div",{class:"sh-in sh-in--num", style:{color:"#8C86A0"}}, col.get(row));
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
          if (n==null) return el("div",{class:"sh-in sh-in--num", style:{color:"#C6BEDA"}},"\u2014");
          if (n===0) return el("div",{style:{padding:"11px 12px",textAlign:"right"}}, el("span",{class:"sh-pill sh-pill--manual"},"finished"));
          return el("div",{class:"sh-in sh-in--num", style:{color:n<=1?"#C2410C":"#6D28D9",fontWeight:"700"}}, n+" \u00D7 \u00B7 "+money0(n*(r.amount||0))); } },
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
        render: function(r){ return el("div",{style:{padding:"11px 12px"}}, inCycle(r) ? el("span",{class:"sh-pill sh-pill--now"},"this cycle") : el("span",{style:{color:"#B0A9C4",fontSize:"12.5px"}},"\u2014")); } }
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

  function sel(opts, cur, onch){
    const s2 = el("select",{});
    opts.forEach(function(o){ const op = el("option",{value:String(o.v)}, o.l); if (Number(o.v)===Number(cur)) op.selected = true; s2.appendChild(op); });
    s2.addEventListener("change", function(){ onch(parseFloat(s2.value)||0); });
    return s2;
  }
  const TAX_OPTS = [ {v:0,l:"None"}, {v:20,l:"20% \u2014 basic"}, {v:40,l:"40% \u2014 higher"}, {v:45,l:"45% \u2014 additional"} ];
  const NI_OPTS  = [ {v:0,l:"None"}, {v:8,l:"8% \u2014 main"}, {v:2,l:"2% \u2014 above upper limit"} ];
  const PEN_OPTS = [ {v:0,l:"Not pensionable"}, {v:5.2,l:"5.2%"}, {v:6.5,l:"6.5%"}, {v:8.3,l:"8.3%"}, {v:9.8,l:"9.8%"}, {v:10.7,l:"10.7%"}, {v:12.5,l:"12.5%"} ];
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
      fld("Bank shift take-home", onOff, "Turns gross shift pay into what reaches your bank."),
      fld("Income tax on extra earnings", sel(TAX_OPTS, state.deductions.tax, function(v){ state.deductions.tax=v; recalcShifts(); commit(); renderAll(); }), "Your marginal rate."),
      fld("National Insurance", sel(NI_OPTS, state.deductions.ni, function(v){ state.deductions.ni=v; recalcShifts(); commit(); renderAll(); })),
      fld("NHS pension on bank pay", sel(PEN_OPTS, state.deductions.pension, function(v){ state.deductions.pension=v; recalcShifts(); commit(); renderAll(); }), "Taken before income tax.")
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
  state = loadLocal();
  renderAll();
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
