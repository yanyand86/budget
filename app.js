"use strict";

/* ===== OPTIONAL: paste your Google OAuth client ID here, or enter it in Settings -> Sync ===== */
const GOOGLE_CLIENT_ID = "";

/* ---------------------------------- config --------------------------------- */
const LS_KEY = "nhs-budget-standalone:v1";
const LS_CLIENT = "nhs-budget:gclient";
const LS_DRIVE_ON = "nhs-budget:driveon";
const DRIVE_FILE = "budget.json";
const SCOPE = "https://www.googleapis.com/auth/drive.appdata";

const CAT = {
  rent:      { label: "Rent / Mortgage", emoji: "\uD83C\uDFE0", color: "#4E7A93" },
  council:   { label: "Council tax",     emoji: "\uD83C\uDFDB\uFE0F", color: "#6E7C8A" },
  electric:  { label: "Electricity",     emoji: "\u26A1", color: "#C9974E" },
  gas:       { label: "Gas / heating",   emoji: "\uD83D\uDD25", color: "#C07358" },
  water:     { label: "Water",           emoji: "\uD83D\uDCA7", color: "#5E8FA8" },
  internet:  { label: "Broadband",       emoji: "\uD83D\uDCF6", color: "#5C7AA8" },
  phone:     { label: "Mobile phone",    emoji: "\uD83D\uDCF1", color: "#8B7FA6" },
  groceries: { label: "Groceries",       emoji: "\uD83D\uDED2", color: "#5C9A86" },
  transport: { label: "Transport",       emoji: "\uD83D\uDE8C", color: "#5E8FA8" },
  fuel:      { label: "Fuel",            emoji: "\u26FD", color: "#7C7163" },
  subs:      { label: "Subscriptions",   emoji: "\uD83D\uDCFA", color: "#BC7E92" },
  insurance: { label: "Insurance",       emoji: "\uD83D\uDEE1\uFE0F", color: "#5C7AA8" },
  health:    { label: "Health / gym",    emoji: "\uD83C\uDFCB\uFE0F", color: "#5C9A86" },
  dining:    { label: "Eating out",      emoji: "\uD83C\uDF7D\uFE0F", color: "#C07358" },
  childcare: { label: "Childcare",       emoji: "\uD83D\uDC76", color: "#BC7E92" },
  savings:   { label: "Savings",         emoji: "\uD83D\uDC37", color: "#3F9D8A" },
  loan:      { label: "Loan / credit",   emoji: "\uD83D\uDCB3", color: "#C26B57" },
  other:     { label: "Other",           emoji: "\uD83E\uDDFE", color: "#8A94A6" }
};
const CAT_ORDER = ["rent","council","electric","gas","water","internet","phone","groceries","transport","fuel","subs","insurance","health","dining","childcare","savings","loan","other"];
const catOf = (k) => CAT[k] || CAT.other;

const GOAL_EMOJI = ["\uD83D\uDEDF","\u2708\uFE0F","\uD83C\uDFE0","\uD83D\uDE97","\uD83C\uDF81","\uD83D\uDC8D","\uD83C\uDF93","\uD83D\uDCBB","\u2764\uFE0F","\uD83D\uDC37","\uD83D\uDCF1","\uD83D\uDECB\uFE0F"];
const GOAL_COLORS = ["#3F9D8A","#5C7AA8","#C9974E","#C07358","#8B7FA6","#5C9A86","#BC7E92","#4E7A93"];

const SVG = {
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14"/></svg>',
  x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 6"/></svg>',
  gear:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.1 5.1l2.1 2.1M16.8 16.8l2.1 2.1M18.9 5.1 16.8 7.2M7.2 16.8 5.1 18.9" stroke-linecap="round"/></svg>',
  cloud:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19a4.5 4.5 0 0 0 .5-9 6 6 0 0 0-11.6-1.5A4 4 0 0 0 6.5 19Z"/></svg>',
  rotate:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
  download:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"/></svg>',
  upload:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21V9m0 0 4 4m-4-4-4 4M5 3h14"/></svg>'
};

/* ---------------------------------- helpers -------------------------------- */
const uid = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const round2 = (n) => Math.round(n * 100) / 100;
function tint(hex, a){ const s = hex.replace("#",""); const r=parseInt(s.slice(0,2),16), g=parseInt(s.slice(2,4),16), b=parseInt(s.slice(4,6),16); return "rgba("+r+","+g+","+b+","+a+")"; }
const ordinal = (n) => { const s=["th","st","nd","rd"], v=n%100; return n+(s[(v-20)%10]||s[v]||s[0]); };
const CUR = () => state.currency || "\u00A3";
function money0(n){ const v=Math.round(n); return (v<0?"-":"")+CUR()+Math.abs(v).toLocaleString("en-GB"); }
function money2(n){ n=Number(n||0); return CUR()+n.toLocaleString("en-GB",{minimumFractionDigits:(n%1===0?0:2),maximumFractionDigits:2}); }
function timeStr(ms){ return new Date(ms).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}); }
function onKey(fn){ return function(ev){ if (ev.key === "Enter" || ev.key === " "){ ev.preventDefault(); fn(); } }; }

function getCycle(payDay, now){
  now = now || new Date();
  let m = now.getMonth(), y = now.getFullYear();
  if (now.getDate() < payDay) { m -= 1; if (m < 0) { m = 11; y -= 1; } }
  const start = new Date(y, m, payDay, 0,0,0,0);
  const end = new Date(y, m+1, payDay, 0,0,0,0);
  const id = start.getFullYear() + "-" + String(start.getMonth()+1).padStart(2,"0");
  return { start: start, end: end, id: id };
}

/* tiny DOM builders */
function h(tag, props){
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
  for (let i = 2; i < arguments.length; i++) addKids(e, arguments[i]);
  return e;
}
function addKids(e, kid){
  if (kid == null || kid === false) return;
  if (Array.isArray(kid)) { for (let i=0;i<kid.length;i++) addKids(e, kid[i]); return; }
  e.appendChild(typeof kid === "object" ? kid : document.createTextNode(String(kid)));
}
function svgEl(tag, props){
  const e = document.createElementNS("http://www.w3.org/2000/svg", tag);
  if (props) for (const k in props) e.setAttribute(k, props[k]);
  for (let i = 2; i < arguments.length; i++) if (arguments[i]) e.appendChild(arguments[i]);
  return e;
}
function icon(name, size){ size = size || 18; const s = document.createElement("span"); s.style.display="inline-flex"; s.style.width=size+"px"; s.style.height=size+"px"; s.style.flex="0 0 auto"; s.innerHTML = (SVG[name]||"").replace("<svg ", '<svg width="100%" height="100%" '); return s; }

/* --------------------------------- state ----------------------------------- */
const SEED_BY = (function(){ const d = new Date(); d.setMonth(d.getMonth()+8); return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0"); })();
function makeDefaults(){
  return {
    salary: 2400, currency: "\u00A3", payDay: 25,
    expenses: [
      { id: uid(), name: "Rent", category: "rent", amount: 850 },
      { id: uid(), name: "Council tax", category: "council", amount: 140 },
      { id: uid(), name: "Electricity & gas", category: "electric", amount: 110 },
      { id: uid(), name: "Broadband", category: "internet", amount: 32 },
      { id: uid(), name: "Mobile", category: "phone", amount: 18 },
      { id: uid(), name: "Groceries", category: "groceries", amount: 280 },
      { id: uid(), name: "Travel", category: "transport", amount: 90 },
      { id: uid(), name: "Savings", category: "savings", amount: 200 }
    ],
    shifts: [], paid: {},
    goals: [
      { id: uid(), emoji: "\uD83D\uDEDF", name: "Emergency fund", target: 3000, saved: 750, color: "#3F9D8A", targetDate: null },
      { id: uid(), emoji: "\u2708\uFE0F", name: "Holiday", target: 1500, saved: 420, color: "#5C7AA8", targetDate: SEED_BY }
    ],
    history: [], lastCycleId: null, updatedAt: 0
  };
}
function blank(){ return { salary:0, currency:"\u00A3", payDay:25, expenses:[], shifts:[], paid:{}, goals:[], history:[], lastCycleId:null, updatedAt:0 }; }
function normalize(o){
  const s = Object.assign(blank(), o || {});
  ["expenses","shifts","goals","history"].forEach(function(k){ if (!Array.isArray(s[k])) s[k] = []; });
  if (!s.paid || typeof s.paid !== "object") s.paid = {};
  if (!s.currency) s.currency = "\u00A3";
  if (!s.payDay) s.payDay = 25;
  return s;
}
function loadLocal(){ try { const raw = localStorage.getItem(LS_KEY); if (raw) return normalize(JSON.parse(raw)); } catch(e){} return makeDefaults(); }
function persistLocal(){ try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch(e){} }

let state = blank();
let NOW = new Date();
let FIRST = true;
let pendingGrow = [];
const sync = { status: "unconfigured", last: null };

/* derived */
function cyc(){ return getCycle(state.payDay || 25, NOW); }
function cycleShifts(){ const C = cyc(); return state.shifts.filter(function(s){ const t = new Date(s.date+"T00:00:00").getTime(); return t >= C.start.getTime() && t < C.end.getTime(); }); }
function bankTotal(){ return cycleShifts().reduce(function(a,s){ return a+(s.amount||0); }, 0); }
function income(){ return (state.salary||0) + bankTotal(); }
function expTotal(){ return state.expenses.reduce(function(a,e){ return a+(e.amount||0); }, 0); }
function remaining(){ return income() - expTotal(); }
function pctRemain(){ const i = income(); return i > 0 ? remaining()/i : 0; }
function ringColor(){ const r = remaining(), i = income(); return r < 0 ? "#E08A74" : (i > 0 && r/i < 0.15) ? "#E2B45E" : "#5FD0B6"; }
const pk = (id) => cyc().id + "__" + id;
function monthlySavings(){ return state.expenses.filter(function(e){ return e.category==="savings"; }).reduce(function(a,e){ return a+(e.amount||0); }, 0); }

/* ------------------------------- mutations --------------------------------- */
function commit(){ state.updatedAt = Date.now(); persistLocal(); renderApp(); pushSoon(); }
function upsertExpense(e){ const i = state.expenses.findIndex(function(x){ return x.id===e.id; }); if (i<0) state.expenses.push(e); else state.expenses[i]=e; commit(); }
function delExpense(id){ state.expenses = state.expenses.filter(function(x){ return x.id!==id; }); commit(); }
function togglePaid(id){ const k = pk(id); if (state.paid[k]) delete state.paid[k]; else state.paid[k]=true; commit(); }
function upsertShift(s){ const i = state.shifts.findIndex(function(x){ return x.id===s.id; }); if (i<0) state.shifts.push(s); else state.shifts[i]=s; commit(); }
function delShift(id){ state.shifts = state.shifts.filter(function(x){ return x.id!==id; }); commit(); }
function upsertGoal(g){ const i = state.goals.findIndex(function(x){ return x.id===g.id; }); if (i<0) state.goals.push(g); else state.goals[i]=g; commit(); }
function delGoal(id){ state.goals = state.goals.filter(function(x){ return x.id!==id; }); commit(); }
function addContribution(id, amt){ const g = state.goals.find(function(x){ return x.id===id; }); if (g) g.saved = round2((g.saved||0)+amt); commit(); }
function addHistory(rec){ state.history = state.history.filter(function(x){ return x.cycleId!==rec.cycleId; }); state.history.push(rec); commit(); }
function delHistory(cycleId){ state.history = state.history.filter(function(x){ return x.cycleId!==cycleId; }); commit(); }
function doReset(){ state = makeDefaults(); state.updatedAt = Date.now(); persistLocal(); renderApp(); pushSoon(); closeSheet(); toast("Reset to starter setup"); }

function archiveIfRolled(){
  const curId = getCycle(state.payDay||25, NOW).id;
  if (!state.lastCycleId){ state.lastCycleId = curId; persistLocal(); return; }
  if (state.lastCycleId === curId) return;
  if (!state.history.some(function(x){ return x.cycleId===state.lastCycleId; })){
    const parts = state.lastCycleId.split("-").map(Number); const Y = parts[0], M = parts[1];
    const start = new Date(Y, M-1, state.payDay||25), end = new Date(Y, M, state.payDay||25);
    const shiftsTotal = state.shifts.reduce(function(a,s){ const t=new Date(s.date+"T00:00:00").getTime(); return (t>=start.getTime()&&t<end.getTime())?a+(s.amount||0):a; }, 0);
    const expenses = state.expenses.reduce(function(a,e){ return a+(e.amount||0); }, 0);
    const inc = (state.salary||0)+shiftsTotal;
    const label = start.toLocaleDateString("en-GB",{month:"short",year:"numeric"});
    state.history.push({ cycleId: state.lastCycleId, label: label, income: inc, expenses: expenses, saved: inc-expenses, salary: state.salary||0, shiftsTotal: shiftsTotal });
  }
  state.lastCycleId = curId; state.updatedAt = Date.now(); persistLocal();
}

/* ------------------------------ grow helpers ------------------------------- */
function growW(el, pct){ const val = (clamp(pct,0,1)*100)+"%"; if (FIRST){ el.style.width="0%"; pendingGrow.push({el:el,prop:"width",val:val}); } else el.style.width = val; }
function growH(el, px){ const val = px+"px"; if (FIRST){ el.style.height="0px"; pendingGrow.push({el:el,prop:"height",val:val}); } else el.style.height = val; }
function flushGrow(){
  if (!FIRST){ pendingGrow = []; return; }
  const items = pendingGrow; pendingGrow = [];
  requestAnimationFrame(function(){ requestAnimationFrame(function(){ items.forEach(function(g){ g.el.style[g.prop] = g.val; }); }); });
}

/* ----------------------------- render helpers ------------------------------ */
const root = function(){ return document.getElementById("app"); };
const sheetRoot = function(){ return document.getElementById("sheet"); };
function cardHead(title, totalTxt, cls){ return h("div",{class:"pf-cardhead"}, h("h2",{class:"pf-cardtitle"}, title), h("span",{class:"pf-cardtot"+(cls?" "+cls:"")}, totalTxt)); }
function addBtn(txt, onClick){ return h("button",{class:"pf-add", onClick:onClick}, icon("plus",17), " "+txt); }
function emptyNode(txt){ return h("div",{class:"pf-empty"}, txt); }

function syncChip(){
  const s = sync.status; let cls = "pf-syncchip"; const kids = [];
  if (s === "connected"){ cls+=" pf-syncchip--ok"; kids.push(icon("check",15), "Synced", sync.last ? h("span",{class:"pf-synctime"}," \u00B7 "+timeStr(sync.last)) : null); }
  else if (s === "syncing" || s === "connecting"){ kids.push(h("span",{class:"pf-spin"}), s==="connecting"?"Connecting\u2026":"Syncing\u2026"); }
  else if (s === "configured"){ cls+=" pf-syncchip--go"; kids.push(icon("cloud",15), "Connect Google Drive to sync"); }
  else if (s === "error"){ cls+=" pf-syncchip--warn"; kids.push(icon("cloud",15), "Sync paused \u2014 tap to retry"); }
  else { cls+=" pf-syncchip--muted"; kids.push(icon("cloud",15), "Set up cross-device sync"); }
  return h("button",{class:cls, id:"syncchip", onClick:onSyncTap}, kids);
}
function setSync(status){ sync.status = status; const c = document.getElementById("syncchip"); if (c) c.replaceWith(syncChip()); }
function onSyncTap(){ const on = localStorage.getItem(LS_DRIVE_ON)==="1"; if (on) syncNow(); else if (driveClientId()) connectDrive(); else openSettings(); }

function buildRing(pct, color){
  const size=178, stroke=15, r=(size-stroke)/2, c=2*Math.PI*r, p=clamp(pct,0,1);
  const bg = svgEl("circle",{cx:size/2,cy:size/2,r:r,fill:"none",stroke:"rgba(255,255,255,0.14)","stroke-width":stroke});
  const fg = svgEl("circle",{"class":"pf-ringfill",cx:size/2,cy:size/2,r:r,fill:"none",stroke:color,"stroke-width":stroke,"stroke-linecap":"round","stroke-dasharray":c});
  const finalOff = c*(1-p);
  if (FIRST){ fg.style.strokeDashoffset = c; pendingGrow.push({el:fg, prop:"strokeDashoffset", val:String(finalOff)}); } else fg.style.strokeDashoffset = finalOff;
  return svgEl("svg",{width:size,height:size,style:"transform:rotate(-90deg)"}, bg, fg);
}

/* --------------------------------- render ---------------------------------- */
function renderApp(){
  const app = root(); if (!app) return;
  app.innerHTML = "";
  const C = cyc();
  const lastDay = new Date(C.end.getTime() - 86400000);
  const titleRange = C.start.toLocaleDateString("en-GB",{month:"long"}) + " \u2013 " + lastDay.toLocaleDateString("en-GB",{month:"long"});
  const fmtD = function(d){ return d.toLocaleDateString("en-GB",{day:"numeric",month:"short"}); };
  const today0 = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate()).getTime();
  const isPayday = NOW.getDate() === (state.payDay||25);
  const daysToPay = Math.max(0, Math.round((C.end.getTime()-today0)/86400000));
  const elapsed = clamp((NOW.getTime()-C.start.getTime())/(C.end.getTime()-C.start.getTime()), 0, 1);

  /* header + sync */
  app.appendChild(h("header",{class:"pf-header"},
    h("div",{}, h("div",{class:"pf-eyebrow"},"Pay cycle"), h("h1",{class:"pf-h1"}, titleRange)),
    h("button",{class:"pf-gear","aria-label":"Settings", onClick:openSettings}, icon("gear",19))
  ));
  app.appendChild(h("div",{class:"pf-syncbar"}, syncChip()));

  /* hero */
  const ringWrap = h("div",{class:"pf-ringwrap", style:{width:"178px",height:"178px"}});
  ringWrap.appendChild(buildRing(pctRemain(), ringColor()));
  ringWrap.appendChild(h("div",{class:"pf-ringcenter"},
    h("span",{class:"pf-ringlab"},"Left this cycle"),
    h("span",{class:"pf-ringnum", style:{color: remaining()<0?"#FFC9B8":"#FFFFFF"}}, money0(remaining())),
    h("span",{class:"pf-ringsub"}, income()>0 ? "of "+money0(income())+" in" : "set your salary below")
  ));
  const cycFill = h("div",{class:"pf-cyclefill"}); growW(cycFill, elapsed);
  const cycDot = h("div",{class:"pf-cycledot"});
  if (FIRST){ cycDot.style.left="0%"; pendingGrow.push({el:cycDot,prop:"left",val:(elapsed*100)+"%"}); } else cycDot.style.left=(elapsed*100)+"%";
  app.appendChild(h("section",{class:"pf-hero"},
    ringWrap,
    h("div",{class:"pf-cycle"},
      h("div",{class:"pf-cycleline"}, cycFill, cycDot),
      h("div",{class:"pf-cyclelabels"},
        h("span",{}, fmtD(C.start)),
        h("span",{class:"pf-cyclepay"}, isPayday ? "\uD83C\uDF89 Payday today" : daysToPay+" "+(daysToPay===1?"day":"days")+" to payday"),
        h("span",{}, fmtD(lastDay))
      )
    ),
    h("div",{class:"pf-pills"},
      h("div",{class:"pf-pill"}, h("span",{class:"pf-pilllab"},"Income"), h("span",{class:"pf-pillval"}, money0(income()))),
      h("div",{class:"pf-pilldiv"}),
      h("div",{class:"pf-pill"}, h("span",{class:"pf-pilllab"},"Expenses"), h("span",{class:"pf-pillval"}, money0(expTotal())))
    )
  ));

  /* income card */
  const shifts = cycleShifts().slice().sort(function(a,b){ return a.date<b.date?1:-1; });
  const incomeCard = h("section",{class:"pf-card"});
  incomeCard.appendChild(cardHead("Income", money2(income()), "pf-pos"));
  incomeCard.appendChild(h("div",{class:"pf-exp", role:"button", tabindex:"0", onClick:openSalary, onKeydown:onKey(openSalary)},
    h("span",{class:"pf-ic", style:{background:tint("#3F9D8A",0.14)}}, "\uD83D\uDCB7"),
    h("div",{class:"pf-expmid"}, h("span",{class:"pf-expname"},"Monthly salary"), h("span",{class:"pf-expcat"},"Paid on the "+ordinal(state.payDay)+" \u00B7 take-home")),
    h("span",{class:"pf-expamt"}, money2(state.salary))
  ));
  incomeCard.appendChild(h("div",{class:"pf-subhead"},
    h("span",{class:"pf-subtitle"}, "Bank shifts ", h("span",{class:"pf-count"}, String(shifts.length))),
    h("span",{class:"pf-pos pf-subtot"}, "+"+money2(bankTotal()))
  ));
  const shiftList = h("div",{class:"pf-list"});
  if (shifts.length){
    shifts.forEach(function(s){
      shiftList.appendChild(h("div",{class:"pf-exp", role:"button", tabindex:"0", onClick:function(){ openShift(s); }, onKeydown:onKey(function(){ openShift(s); })},
        h("span",{class:"pf-ic pf-ic--bank"}, "\uD83C\uDFE6"),
        h("div",{class:"pf-expmid"},
          h("span",{class:"pf-expname"}, s.label || "Bank shift"),
          h("span",{class:"pf-expcat"}, new Date(s.date+"T00:00:00").toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"}) + ((s.hours&&s.rate) ? " \u00B7 "+s.hours+"h \u00D7 "+CUR()+s.rate : ""))
        ),
        h("span",{class:"pf-expamt pf-pos"}, "+"+money2(s.amount))
      ));
    });
  } else shiftList.appendChild(emptyNode("No bank shifts logged yet. Tap add when you pick one up."));
  incomeCard.appendChild(shiftList);
  incomeCard.appendChild(addBtn("Add bank shift", function(){ openShift(); }));
  app.appendChild(incomeCard);

  /* savings goals card */
  const goalsCard = h("section",{class:"pf-card"});
  goalsCard.appendChild(cardHead("Savings goals", money2(state.goals.reduce(function(a,g){ return a+(g.saved||0); },0)), "pf-pos"));
  const goalsWrap = h("div",{class:"pf-goals"});
  if (state.goals.length){
    state.goals.forEach(function(g){
      const pct = g.target>0 ? clamp(g.saved/g.target,0,1) : 0;
      const left = Math.max(0,(g.target||0)-(g.saved||0));
      let hint = null;
      if (pct>=1) hint = {txt:"Reached \u2014 nice one", tone:"ok"};
      else if (g.targetDate){
        const tp = g.targetDate.split("-").map(Number); const Y=tp[0], M=tp[1];
        const monthsLeft = (Y*12+(M-1)) - (NOW.getFullYear()*12+NOW.getMonth());
        const byLabel = new Date(Y,M-1,1).toLocaleDateString("en-GB",{month:"short",year:"numeric"});
        if (monthsLeft<=0) hint = {txt: money0(left)+" to go \u00B7 due "+byLabel, tone:"warn"};
        else { const per = left/monthsLeft; const tone = monthlySavings()>0 ? (monthlySavings()>=per?"ok":"warn") : "plain"; hint = {txt: money0(per)+"/mo to reach by "+byLabel, tone:tone}; }
      }
      const fill = h("div",{class:"pf-goalfill", style:{background:g.color}}); growW(fill, pct);
      const row = h("div",{class:"pf-goalrow", role:"button", tabindex:"0", onClick:function(){ openGoal(g); }, onKeydown:onKey(function(){ openGoal(g); })},
        h("span",{class:"pf-goalemoji", style:{background:tint(g.color,0.14)}}, g.emoji),
        h("div",{class:"pf-goalmid"},
          h("div",{class:"pf-goaltop"},
            h("span",{class:"pf-goalname"}, g.name),
            h("span",{class:"pf-goalnums"}, h("strong",{}, money0(g.saved)), " ", h("span",{class:"pf-goalof"}, "/ "+money0(g.target)))
          ),
          h("div",{class:"pf-goalbar"}, fill),
          h("div",{class:"pf-goalmeta"},
            h("span",{class:"pf-goalhint"+(hint&&hint.tone==="ok"?" pf-goalhint--ok":hint&&hint.tone==="warn"?" pf-goalhint--warn":"")}, hint?hint.txt:money0(left)+" to go"),
            h("span",{class:"pf-goalpct"}, Math.round(pct*100)+"%")
          )
        )
      );
      goalsWrap.appendChild(h("div",{class:"pf-goal"}, row,
        h("button",{class:"pf-goaladd","aria-label":"Add to "+g.name, onClick:function(){ openContrib(g); }}, icon("plus",16))
      ));
    });
  } else goalsWrap.appendChild(emptyNode("No goals yet. Add something you're saving towards."));
  goalsCard.appendChild(goalsWrap);
  goalsCard.appendChild(addBtn("Add goal", function(){ openGoal(); }));
  app.appendChild(goalsCard);

  /* expenses card */
  const expCard = h("section",{class:"pf-card"});
  expCard.appendChild(cardHead("Monthly expenses", money2(expTotal())));
  const byCat = {};
  state.expenses.forEach(function(e){ byCat[e.category] = (byCat[e.category]||0) + (e.amount||0); });
  const total = expTotal();
  const comp = h("div",{class:"pf-compbar"});
  if (total>0){
    CAT_ORDER.forEach(function(k){ if (byCat[k]){ const seg = h("div",{class:"pf-seg", style:{background:catOf(k).color}}); growW(seg, byCat[k]/total); comp.appendChild(seg); } });
  } else comp.appendChild(h("div",{class:"pf-seg pf-seg--empty", style:{width:"100%"}}));
  expCard.appendChild(comp);
  const paidTotal = state.expenses.reduce(function(a,e){ return a + (state.paid[pk(e.id)] ? (e.amount||0) : 0); }, 0);
  const paidCount = state.expenses.filter(function(e){ return state.paid[pk(e.id)]; }).length;
  expCard.appendChild(h("div",{class:"pf-expmeta"},
    h("span",{}, "Still to pay ", h("strong",{}, money2(Math.max(0,total-paidTotal)))),
    h("span",{}, paidCount + "/" + state.expenses.length + " paid")
  ));
  const expList = h("div",{class:"pf-list"});
  if (state.expenses.length){
    state.expenses.slice().sort(function(a,b){ return (b.amount||0)-(a.amount||0); }).forEach(function(e){
      const c = catOf(e.category); const isPaid = !!state.paid[pk(e.id)];
      const chk = h("button",{class:"pf-check"+(isPaid?" pf-check--on":""), "aria-label":isPaid?"Mark as not paid":"Mark as paid", onClick:function(ev){ ev.stopPropagation(); togglePaid(e.id); }});
      if (isPaid) chk.appendChild(icon("check",14));
      expList.appendChild(h("div",{class:"pf-exp"+(isPaid?" pf-exp--paid":""), role:"button", tabindex:"0", onClick:function(){ openExpense(e); }, onKeydown:onKey(function(){ openExpense(e); })},
        h("span",{class:"pf-ic", style:{background:tint(c.color,0.16)}}, c.emoji),
        h("div",{class:"pf-expmid"}, h("span",{class:"pf-expname"}, e.name), h("span",{class:"pf-expcat"}, c.label)),
        h("span",{class:"pf-expamt"}, money2(e.amount)),
        chk
      ));
    });
  } else expList.appendChild(emptyNode("No expenses yet. Add your monthly bills to get started."));
  expCard.appendChild(expList);
  expCard.appendChild(addBtn("Add expense", function(){ openExpense(); }));
  app.appendChild(expCard);

  /* history card */
  const history = state.history.slice().sort(function(a,b){ return a.cycleId<b.cycleId?-1:1; });
  const past = history.filter(function(hh){ return hh.cycleId !== C.id; });
  const archivedSaved = past.reduce(function(a,hh){ return a+(hh.saved||0); }, 0);
  const avgSaved = past.length ? archivedSaved/past.length : 0;
  const liveMonth = { cycleId: C.id, label: "Now", income: income(), expenses: expTotal(), saved: remaining(), live: true };
  const chartMonths = past.slice(-6).concat([liveMonth]);
  let chartMax = 1; chartMonths.forEach(function(m){ chartMax = Math.max(chartMax, m.income||0, m.expenses||0); });
  const listMonths = past.slice(-12).reverse();

  const histCard = h("section",{class:"pf-card"});
  histCard.appendChild(h("div",{class:"pf-cardhead"},
    h("h2",{class:"pf-cardtitle"},"Month-to-month"),
    h("span",{class:"pf-histlegend"}, h("i",{class:"pf-dot pf-dot--in"}), "In", h("i",{class:"pf-dot pf-dot--out"}), "Out")
  ));
  const chart = h("div",{class:"pf-chart"});
  chartMonths.forEach(function(m){
    const ih = Math.round(((m.income||0)/chartMax)*108), eh = Math.round(((m.expenses||0)/chartMax)*108);
    const inBar = h("div",{class:"pf-cbar pf-cbar--in", title:"In "+money0(m.income)}); growH(inBar, ih);
    const outBar = h("div",{class:"pf-cbar pf-cbar--out", title:"Out "+money0(m.expenses)}); growH(outBar, eh);
    chart.appendChild(h("div",{class:"pf-cgroup"+(m.live?" pf-cgroup--live":"")},
      h("div",{class:"pf-cbars"}, inBar, outBar),
      h("span",{class:"pf-clabel"}, m.label)
    ));
  });
  histCard.appendChild(chart);
  if (past.length){
    histCard.appendChild(h("div",{class:"pf-histstats"},
      h("div",{}, h("span",{class:"pf-statlab"}, "Saved over "+past.length+" "+(past.length===1?"month":"months")), h("span",{class:"pf-statval "+(archivedSaved>=0?"pf-pos":"pf-neg")}, money0(archivedSaved))),
      h("div",{class:"pf-statdiv"}),
      h("div",{}, h("span",{class:"pf-statlab"}, "Average / month"), h("span",{class:"pf-statval "+(avgSaved>=0?"pf-pos":"pf-neg")}, money0(avgSaved)))
    ));
  } else {
    histCard.appendChild(emptyNode("Finished months land here automatically each payday \u2014 the striped bar is this month so far. You can also add a past month below."));
  }
  if (listMonths.length){
    const histList = h("div",{class:"pf-histlist"});
    listMonths.forEach(function(m){
      histList.appendChild(h("div",{class:"pf-histrow", role:"button", tabindex:"0", onClick:function(){ openHistView(m); }, onKeydown:onKey(function(){ openHistView(m); })},
        h("div",{class:"pf-histmid"},
          h("span",{class:"pf-histmonth"}, m.label, m.manual?h("span",{class:"pf-tag"},"added"):null),
          h("span",{class:"pf-histsub"}, "in "+money0(m.income)+" \u00B7 out "+money0(m.expenses))
        ),
        h("span",{class:"pf-histsaved "+((m.saved||0)>=0?"pf-pos":"pf-neg")}, ((m.saved||0)>=0?"+":"")+money0(m.saved))
      ));
    });
    histCard.appendChild(histList);
  }
  histCard.appendChild(addBtn("Add a past month", function(){ openHistAdd(); }));
  app.appendChild(histCard);

  app.appendChild(h("p",{class:"pf-foot"}, "Tap any item to edit \u00B7 tick a bill once it leaves your account \u00B7 everything resets on the "+ordinal(state.payDay)));

  flushGrow();
  FIRST = false;
}

/* --------------------------------- sheets ---------------------------------- */
function openSheet(title, contentNode){
  const sheet = h("div",{class:"pf-sheet", role:"dialog","aria-modal":"true","aria-label":title, onClick:function(e){ e.stopPropagation(); }},
    h("div",{class:"pf-grab"}),
    h("div",{class:"pf-sheethead"}, h("h3",{class:"pf-sheettitle"}, title), h("button",{class:"pf-x","aria-label":"Close", onClick:closeSheet}, icon("x",20))),
    contentNode
  );
  const back = h("div",{class:"pf-backdrop", onClick:closeSheet}, sheet);
  sheetRoot().innerHTML = ""; sheetRoot().appendChild(back);
}
function closeSheet(){ sheetRoot().innerHTML = ""; }
function field(labelTxt, inputNode, hintTxt){ return h("div",{class:"pf-field"}, h("label",{class:"pf-lab"}, labelTxt), inputNode, hintTxt?h("span",{class:"pf-hint"}, hintTxt):null); }
function amtInput(value){ const inp = h("input",{class:"pf-input pf-input--amt", inputmode:"decimal", placeholder:"0", value:(value==null?"":String(value))}); const wrap = h("div",{class:"pf-amtinput"}, h("span",{class:"pf-cursign"}, CUR()), inp); wrap._input = inp; return wrap; }
function actions(){ const a = h("div",{class:"pf-actions"}); for (let i=0;i<arguments.length;i++) if (arguments[i]) a.appendChild(arguments[i]); return a; }
function primaryBtn(txt, onClick){ return h("button",{class:"pf-btn pf-btn--primary", onClick:onClick}, txt); }
function dangerBtn(onClick){ return h("button",{class:"pf-btn pf-btn--danger", onClick:onClick}, icon("trash",17), " Delete"); }

function openSalary(){
  const amt = amtInput(state.salary);
  const content = h("div",{},
    h("p",{class:"pf-help"},"Your usual monthly take-home pay, after tax, NI and pension."),
    field("Monthly salary (take-home)", amt),
    actions(primaryBtn("Save", function(){ state.salary = Math.max(0, parseFloat(amt._input.value)||0); commit(); closeSheet(); }))
  );
  openSheet("Monthly salary", content);
}

function openExpense(existing){
  let cat = existing ? existing.category : "other";
  const name = h("input",{class:"pf-input", placeholder:"e.g. Rent", value: existing?existing.name:""});
  const amt = amtInput(existing?existing.amount:"");
  const grid = h("div",{class:"pf-catgrid"});
  function paint(){
    grid.innerHTML = "";
    CAT_ORDER.forEach(function(k){
      const c = CAT[k]; const sel = k===cat;
      const chip = h("button",{type:"button", class:"pf-catchip"+(sel?" pf-catchip--on":""), onClick:function(){ cat=k; if (!name.value.trim()) name.value=c.label; paint(); }},
        h("span",{class:"pf-catic", style:{background:tint(c.color,0.16), color:c.color}}, c.emoji),
        h("span",{class:"pf-catlab"}, c.label));
      if (sel){ chip.style.borderColor = c.color; chip.style.background = tint(c.color,0.10); }
      grid.appendChild(chip);
    });
  }
  paint();
  const act = h("div",{class:"pf-actions"});
  if (existing) act.appendChild(dangerBtn(function(){ delExpense(existing.id); closeSheet(); }));
  act.appendChild(primaryBtn("Save", function(){
    const nm = name.value.trim(); const a = parseFloat(amt._input.value);
    if (!nm || isNaN(a)) return;
    upsertExpense({ id: existing?existing.id:uid(), name:nm, category:cat, amount:Math.max(0,a||0) }); closeSheet();
  }));
  openSheet(existing?"Edit expense":"Add expense", h("div",{}, field("Name", name), field("Amount per month", amt), field("Category", grid), act));
}

function openShift(existing){
  const today = new Date().toISOString().slice(0,10);
  const date = h("input",{class:"pf-input", type:"date", value: existing?existing.date:today});
  const label = h("input",{class:"pf-input", placeholder:"e.g. Long day \u00B7 Renal", value: existing?existing.label:""});
  const hours = h("input",{class:"pf-input", inputmode:"decimal", placeholder:"0", value: (existing&&existing.hours!=null)?existing.hours:""});
  const rate = amtInput((existing&&existing.rate!=null)?existing.rate:"");
  const amt = amtInput(existing?existing.amount:"");
  function recalc(){ const a = (parseFloat(hours.value)||0)*(parseFloat(rate._input.value)||0); if (a) amt._input.value = String(round2(a)); }
  hours.addEventListener("input", recalc); rate._input.addEventListener("input", recalc);
  const act = h("div",{class:"pf-actions"});
  if (existing) act.appendChild(dangerBtn(function(){ delShift(existing.id); closeSheet(); }));
  act.appendChild(primaryBtn("Save", function(){
    const a = round2(parseFloat(amt._input.value)||0); if (!(a>0)) return;
    upsertShift({ id: existing?existing.id:uid(), date:date.value, label:label.value.trim(), hours:parseFloat(hours.value)||null, rate:parseFloat(rate._input.value)||null, amount:a }); closeSheet();
  }));
  openSheet(existing?"Edit bank shift":"Add bank shift", h("div",{},
    h("p",{class:"pf-help"},"Log extra shifts you pick up through the bank. They count towards this pay cycle only."),
    field("Date worked", date),
    field("Label (optional)", label),
    h("div",{class:"pf-grid2"}, field("Hours", hours), field("Rate / hr", rate)),
    field("Pay for this shift", amt, "Fills in from hours \u00D7 rate \u2014 or type a flat amount."),
    act
  ));
}

function openGoal(existing){
  let emoji = existing?existing.emoji:"\uD83D\uDC37";
  let color = existing?existing.color:GOAL_COLORS[0];
  const name = h("input",{class:"pf-input", placeholder:"e.g. Emergency fund", value: existing?existing.name:""});
  const target = amtInput(existing?existing.target:"");
  const saved = amtInput((existing&&existing.saved!=null)?existing.saved:"");
  const by = h("input",{class:"pf-input", type:"month", value: (existing&&existing.targetDate)?existing.targetDate:""});
  const egrid = h("div",{class:"pf-emojigrid"});
  const crow = h("div",{class:"pf-colorrow"});
  function paintE(){ egrid.innerHTML=""; GOAL_EMOJI.forEach(function(e){ const sel=e===emoji; const b=h("button",{type:"button", class:"pf-emoji"+(sel?" pf-emoji--on":""), onClick:function(){ emoji=e; paintE(); }}, e); if (sel){ b.style.borderColor=color; b.style.background=tint(color,0.12); } egrid.appendChild(b); }); }
  function paintC(){ crow.innerHTML=""; GOAL_COLORS.forEach(function(c){ const sel=c===color; const b=h("button",{type:"button", class:"pf-swatch"+(sel?" pf-swatch--on":""), style:{background:c}, "aria-label":"Pick colour", onClick:function(){ color=c; paintE(); paintC(); }}); crow.appendChild(b); }); }
  paintE(); paintC();
  const act = h("div",{class:"pf-actions"});
  if (existing) act.appendChild(dangerBtn(function(){ delGoal(existing.id); closeSheet(); }));
  act.appendChild(primaryBtn("Save", function(){
    const nm = name.value.trim(); const t = parseFloat(target._input.value); if (!nm || !(t>0)) return;
    upsertGoal({ id: existing?existing.id:uid(), emoji:emoji, name:nm, color:color, target:Math.max(0,t||0), saved:Math.max(0,parseFloat(saved._input.value)||0), targetDate:by.value||null }); closeSheet();
  }));
  openSheet(existing?"Edit goal":"New savings goal", h("div",{},
    field("Icon", egrid),
    field("Goal name", name),
    h("div",{class:"pf-grid2"}, field("Target", target), field("Saved so far", saved)),
    field("Target date (optional)", by, "Add a date and we'll show how much to set aside each month."),
    field("Colour", crow),
    act
  ));
}

function openContrib(goal){
  const amt = amtInput("");
  const preview = h("div",{class:"pf-newtotal", style:{display:"none"}});
  function upd(){
    const a = parseFloat(amt._input.value)||0;
    if (a>0){ preview.style.display=""; const tot=(goal.saved||0)+a; preview.innerHTML="";
      preview.appendChild(document.createTextNode("New total: ")); preview.appendChild(h("strong",{}, CUR()+Math.round(tot).toLocaleString("en-GB")));
      if (goal.target>0 && tot>=goal.target) preview.appendChild(document.createTextNode(" \u00B7 goal reached \uD83C\uDF89"));
    } else preview.style.display="none";
  }
  amt._input.addEventListener("input", upd);
  const quick = h("div",{class:"pf-quickrow"});
  [50,100,200].forEach(function(q){ quick.appendChild(h("button",{type:"button", class:"pf-quick", onClick:function(){ amt._input.value=String(round2((parseFloat(amt._input.value)||0)+q)); upd(); }}, "+"+CUR()+q)); });
  quick.appendChild(h("button",{type:"button", class:"pf-quick", onClick:function(){ amt._input.value=""; upd(); }}, "Clear"));
  const help = h("p",{class:"pf-help"}); help.appendChild(document.createTextNode("Adding to ")); help.appendChild(h("strong",{}, goal.emoji+" "+goal.name)); help.appendChild(document.createTextNode(" \u2014 currently "+CUR()+Math.round(goal.saved||0).toLocaleString("en-GB")+" of "+CUR()+Math.round(goal.target||0).toLocaleString("en-GB")+"."));
  const fAmt = field("Amount to add", amt); fAmt.appendChild(quick);
  openSheet("Add to savings", h("div",{}, help, fAmt, preview, actions(primaryBtn("Add to savings", function(){ const a=round2(parseFloat(amt._input.value)||0); if (!(a>0)) return; addContribution(goal.id, a); closeSheet(); }))));
}

function openHistAdd(){
  const d = new Date(); const prev = new Date(d.getFullYear(), d.getMonth()-1, 1);
  const def = prev.getFullYear()+"-"+String(prev.getMonth()+1).padStart(2,"0");
  const month = h("input",{class:"pf-input", type:"month", value:def});
  const inc = amtInput(""); const out = amtInput("");
  const prev2 = h("div",{class:"pf-newtotal"});
  function upd(){ const i=parseFloat(inc._input.value)||0, o=parseFloat(out._input.value)||0, net=i-o; prev2.innerHTML="";
    prev2.appendChild(document.createTextNode("Saved that month: ")); prev2.appendChild(h("strong",{style:{color:net>=0?"#2F8E7B":"#C25840"}}, (net<0?"-":"")+CUR()+Math.abs(Math.round(net)).toLocaleString("en-GB"))); }
  inc._input.addEventListener("input", upd); out._input.addEventListener("input", upd); upd();
  openSheet("Add a past month", h("div",{},
    h("p",{class:"pf-help"},"Add a month you already know the figures for. Finished months are saved automatically each payday."),
    field("Month", month),
    h("div",{class:"pf-grid2"}, field("Money in", inc), field("Money out", out)),
    prev2,
    actions(primaryBtn("Save month", function(){
      const i=parseFloat(inc._input.value)||0, o=parseFloat(out._input.value)||0;
      if (!month.value || (inc._input.value==="" && out._input.value==="")) return;
      const mp = month.value.split("-").map(Number); const lbl = new Date(mp[0],mp[1]-1,1).toLocaleDateString("en-GB",{month:"short",year:"numeric"});
      addHistory({ cycleId:month.value, label:lbl, income:round2(i), expenses:round2(o), saved:round2(i-o), manual:true }); closeSheet();
    }))
  ));
}

function openHistView(m){
  const content = h("div",{},
    h("div",{class:"pf-histdetail"},
      h("div",{class:"pf-hdrow"}, h("span",{},"Money in"), h("strong",{class:"pf-pos"}, money2(m.income))),
      h("div",{class:"pf-hdrow"}, h("span",{},"Money out"), h("strong",{}, money2(m.expenses))),
      h("div",{class:"pf-hdrow pf-hdrow--tot"}, h("span",{},"Saved"), h("strong",{class:(m.saved||0)>=0?"pf-pos":"pf-neg"}, money0(m.saved)))
    ),
    (m.shiftsTotal>0)?h("p",{class:"pf-hint"},"Includes "+money2(m.shiftsTotal)+" from bank shifts."):null,
    (!m.manual)?h("p",{class:"pf-hint"},"Saved automatically at payday, using your setup at the time."):null,
    actions(
      dangerBtn(function(){ delHistory(m.cycleId); closeSheet(); }),
      h("button",{class:"pf-btn pf-btn--ghost", onClick:closeSheet}, "Close")
    )
  );
  openSheet(m.label, content);
}

function exportData(){
  try {
    const blob = new Blob([JSON.stringify(state, null, 2)], {type:"application/json"});
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = "budget-backup-" + new Date().toISOString().slice(0,10) + ".json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 1500);
    toast("Backup downloaded");
  } catch(e){ toast("Could not export"); }
}

let toastT = null;
function toast(msg){ const t = document.getElementById("pf-toast"); if (!t) return; t.textContent = msg; t.classList.add("pf-toast--on"); clearTimeout(toastT); toastT = setTimeout(function(){ t.classList.remove("pf-toast--on"); }, 2300); }

/* -------------------------------- settings --------------------------------- */
function openSettings(){
  const payday = h("input",{class:"pf-input", type:"number", min:"1", max:"28", inputmode:"numeric", value:String(state.payDay)});
  const curIn = h("input",{class:"pf-input", maxlength:"3", value:state.currency});
  const saveBtn = primaryBtn("Save", function(){ state.payDay = clamp(parseInt(payday.value,10)||25,1,28); state.currency = (curIn.value.trim()||"\u00A3"); commit(); closeSheet(); });

  /* sync box */
  const clientIn = h("input",{class:"pf-input", placeholder:"Paste your Google client ID", value: localStorage.getItem(LS_CLIENT)||""});
  clientIn.addEventListener("change", function(){ const v = clientIn.value.trim(); if (v) localStorage.setItem(LS_CLIENT, v); else localStorage.removeItem(LS_CLIENT); DRIVE.tokenClient = null; refreshSyncBox(); });
  const statLine = h("div",{class:"pf-syncstat"});
  const btnRow = h("div",{class:"pf-row2"});
  function refreshSyncBox(){
    const connected = localStorage.getItem(LS_DRIVE_ON)==="1";
    const hasId = !!driveClientId();
    statLine.innerHTML = "";
    statLine.appendChild(h("span",{class:"pf-dotled"+(connected?" pf-dotled--ok":hasId?"":" pf-dotled--warn")}));
    statLine.appendChild(document.createTextNode(connected ? ("Connected"+(sync.last?(" \u00B7 last sync "+timeStr(sync.last)):"")) : (hasId ? "Not connected" : "Add your client ID to enable")));
    btnRow.innerHTML = "";
    if (connected){
      btnRow.appendChild(h("button",{class:"pf-btn pf-btn--sec", onClick:function(){ syncNow().then(refreshSyncBox); }}, "Sync now"));
      btnRow.appendChild(h("button",{class:"pf-btn pf-btn--ghost", onClick:function(){ localStorage.removeItem(LS_DRIVE_ON); DRIVE.token=null; setSync(hasId?"configured":"unconfigured"); toast("Drive disconnected"); refreshSyncBox(); }}, "Disconnect"));
    } else {
      const b = h("button",{class:"pf-btn pf-btn--primary", onClick:function(){ connectDrive().then(refreshSyncBox); }}, "Connect Google Drive");
      if (!hasId) b.disabled = true;
      btnRow.appendChild(b);
    }
  }
  refreshSyncBox();
  const syncBox = h("div",{class:"pf-syncbox"},
    h("div",{class:"pf-divlabel", style:{margin:"0 0 10px"}},"Sync across devices"),
    statLine, btnRow,
    field("Google client ID", clientIn),
    h("button",{class:"pf-linkbtn", onClick:openSetupHelp},"How do I get a client ID? \u2192"),
    h("p",{class:"pf-mini"},"Your finances live in a private folder of your own Google Drive. Open this app on another device, paste the same client ID, connect, and it syncs.")
  );

  /* backup */
  const fileInput = h("input",{type:"file", accept:"application/json,.json", style:{display:"none"}});
  fileInput.addEventListener("change", function(ev){
    const f = ev.target.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = function(){ try { const obj = JSON.parse(rd.result); state = normalize(obj); state.updatedAt = Date.now(); persistLocal(); FIRST = true; renderApp(); pushSoon(); toast("Backup imported"); closeSheet(); } catch(err){ toast("That file could not be read"); } };
    rd.readAsText(f);
  });
  const backupBox = h("div",{},
    h("div",{class:"pf-divlabel"},"Backup"),
    h("div",{class:"pf-row2"},
      h("button",{class:"pf-btn pf-btn--ghost", onClick:exportData}, icon("download",16), " Export"),
      h("button",{class:"pf-btn pf-btn--ghost", onClick:function(){ fileInput.click(); }}, icon("upload",16), " Import")
    ),
    fileInput,
    h("p",{class:"pf-mini"},"Export saves a .json file (e.g. to Files or iCloud Drive) you can import on another device.")
  );

  /* reset */
  const resetZone = h("div",{class:"pf-resetzone"});
  let confirming = false;
  function paintReset(){
    resetZone.innerHTML = "";
    if (!confirming){
      resetZone.appendChild(h("button",{class:"pf-btn pf-btn--ghostdanger", onClick:function(){ confirming=true; paintReset(); }}, icon("rotate",15), " Reset all data"));
    } else {
      resetZone.appendChild(h("div",{class:"pf-confirm"},
        h("span",{},"This clears every expense, bank shift, savings goal and month of history, back to the starter setup. This can't be undone."),
        h("div",{class:"pf-actions"},
          h("button",{class:"pf-btn pf-btn--ghost", onClick:function(){ confirming=false; paintReset(); }}, "Keep my data"),
          h("button",{class:"pf-btn pf-btn--danger", style:{flex:"1"}, onClick:doReset}, "Reset everything")
        )
      ));
    }
  }
  paintReset();

  openSheet("Settings", h("div",{},
    field("Payday \u2014 the day everything resets", payday, "Your cycle runs from this day to the day before it, next month."),
    field("Currency symbol", curIn),
    actions(saveBtn),
    h("div",{style:{height:"6px"}}),
    syncBox,
    backupBox,
    resetZone
  ));
}

function openSetupHelp(){
  const origin = (location.protocol==="file:") ? "(host the app first \u2014 see step 2)" : location.origin;
  openSheet("Turn on Google Drive sync", h("div",{},
    h("p",{class:"pf-help"},"A one-time setup. It takes about ten minutes and is free. You only do steps 1\u20132 once; then paste the ID on each device."),
    h("ol",{class:"pf-steps"},
      h("li",{}, "Put these app files online at an https web address (GitHub Pages, Netlify, Cloudflare Pages or Vercel \u2014 all have free tiers). Google won't allow Drive access from a file opened directly off your device."),
      h("li",{}, "At ", h("code",{},"console.cloud.google.com"), " create a project, then search ", h("strong",{},"Google Drive API"), " and Enable it."),
      h("li",{}, "Open ", h("strong",{},"Google Auth Platform \u2192 Get started"), ": set an app name, choose ", h("strong",{},"External"), ", add your email, Create."),
      h("li",{}, h("strong",{},"Audience \u2192 Test users \u2192 Add users"), ": add your own Google email."),
      h("li",{}, h("strong",{},"Clients \u2192 Create client \u2192 Web application"), ". Under Authorised JavaScript origins add exactly: ", h("code",{}, origin), " (bare domain, no path)."),
      h("li",{}, "Copy the Client ID, come back here to Settings \u2192 Sync, paste it in, and tap Connect Google Drive.")
    ),
    h("div",{class:"pf-callout"},"The first time you connect, Google may warn that the app isn't verified \u2014 that's expected for a personal app. Choose Advanced \u2192 Continue. You're only granting access to this app's own private folder, nothing else in your Drive."),
    actions(h("button",{class:"pf-btn pf-btn--ghost", onClick:openSettings}, "Back to settings"))
  ));
}

/* ----------------------------- google drive -------------------------------- */
function driveClientId(){ return (localStorage.getItem(LS_CLIENT) || GOOGLE_CLIENT_ID || "").trim(); }
const DRIVE = {
  token: null, tokenClient: null, fileId: null,
  ensure: function(){
    if (this.tokenClient) return true;
    if (!(window.google && google.accounts && google.accounts.oauth2)) return false;
    const id = driveClientId(); if (!id) return false;
    this.tokenClient = google.accounts.oauth2.initTokenClient({ client_id: id, scope: SCOPE, callback: function(){} });
    return true;
  },
  requestToken: function(interactive){
    const self = this;
    return new Promise(function(resolve, reject){
      if (!self.ensure()){ reject(new Error("google-not-ready")); return; }
      self.tokenClient.callback = function(resp){ if (resp && resp.access_token){ self.token = resp.access_token; resolve(resp.access_token); } else reject(resp || new Error("no-token")); };
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
    const self = this;
    const q = encodeURIComponent("name='" + DRIVE_FILE + "'");
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
    const self = this; const body = JSON.stringify(data);
    return (self.fileId ? Promise.resolve(self.fileId) : self.findFile()).then(function(){
      if (self.fileId){
        return self.api("https://www.googleapis.com/upload/drive/v3/files/" + self.fileId + "?uploadType=media", { method:"PATCH", headers:{ "Content-Type":"application/json" }, body: body });
      }
      const boundary = "b" + Math.random().toString(36).slice(2);
      const meta = { name: DRIVE_FILE, parents: ["appDataFolder"] };
      const multipart = "--" + boundary + "\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n" + JSON.stringify(meta) + "\r\n--" + boundary + "\r\nContent-Type: application/json\r\n\r\n" + body + "\r\n--" + boundary + "--";
      return self.api("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", { method:"POST", headers:{ "Content-Type":"multipart/related; boundary=" + boundary }, body: multipart })
        .then(function(r){ return r.json(); }).then(function(j){ if (j && j.id) self.fileId = j.id; });
    });
  }
};

function whenGoogleReady(cb){ let n = 0; (function chk(){ if (window.google && google.accounts && google.accounts.oauth2){ cb(); } else if (n++ < 50){ setTimeout(chk, 150); } })(); }

function syncPull(adoptIfNewer){
  return DRIVE.pull().then(function(remote){
    if (remote){
      const rUpd = remote.updatedAt || 0, lUpd = state.updatedAt || 0;
      if (adoptIfNewer && rUpd > lUpd){ state = normalize(remote); persistLocal(); FIRST = true; renderApp(); }
      else if (lUpd > rUpd){ return DRIVE.push(state); }
    } else {
      return DRIVE.push(state);
    }
  }).then(function(){ sync.last = Date.now(); });
}

function connectDrive(){
  if (!driveClientId()){ toast("Add your Google client ID first"); openSetupHelp(); return Promise.resolve(); }
  setSync("connecting");
  return DRIVE.requestToken(true)
    .then(function(){ localStorage.setItem(LS_DRIVE_ON, "1"); return syncPull(true); })
    .then(function(){ setSync("connected"); toast("Google Drive connected"); })
    .catch(function(e){ setSync(driveClientId()?"configured":"unconfigured"); toast("Couldn't connect to Drive"); });
}

let pushT = null;
function pushSoon(){
  if (localStorage.getItem(LS_DRIVE_ON) !== "1") return;
  if (!DRIVE.token) return;
  setSync("syncing");
  clearTimeout(pushT);
  pushT = setTimeout(function(){
    DRIVE.push(state).then(function(){ sync.last = Date.now(); setSync("connected"); }).catch(function(){ setSync("error"); });
  }, 1200);
}

function syncNow(){
  if (!driveClientId()) { openSetupHelp(); return Promise.resolve(); }
  setSync("syncing");
  return DRIVE.requestToken(false).catch(function(){ return DRIVE.requestToken(true); })
    .then(function(){ return syncPull(true); })
    .then(function(){ return DRIVE.push(state); })
    .then(function(){ sync.last = Date.now(); setSync("connected"); toast("Synced"); })
    .catch(function(){ setSync("error"); toast("Sync failed"); });
}

/* ---------------------------------- boot ----------------------------------- */
function boot(){
  state = loadLocal();
  archiveIfRolled();
  renderApp();
  const connected = localStorage.getItem(LS_DRIVE_ON) === "1";
  if (connected && driveClientId()){
    whenGoogleReady(function(){
      setSync("connecting");
      DRIVE.requestToken(false)
        .then(function(){ return syncPull(true); })
        .then(function(){ setSync("connected"); })
        .catch(function(){ setSync("configured"); });
    });
  } else if (driveClientId()){
    setSync("configured");
  } else {
    setSync("unconfigured");
  }
  if ("serviceWorker" in navigator){
    window.addEventListener("load", function(){ navigator.serviceWorker.register("sw.js").catch(function(){}); });
  }
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
