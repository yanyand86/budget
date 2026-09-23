"use strict";

/* ===== OPTIONAL: paste your Google OAuth client ID here, or enter it in Settings -> Sync ===== */
const GOOGLE_CLIENT_ID = "";

/* ---------------------------------- config --------------------------------- */
const LS_KEY = "nhs-budget-standalone:v1";
const LS_CLIENT = "nhs-budget:gclient";
const LS_DRIVE_ON = "nhs-budget:driveon";
const DRIVE_FILE = "budget.json";
const SCOPE = "https://www.googleapis.com/auth/drive.appdata";
/* the theme is saved per device, so switching it never touches your synced budget */
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
  rent:      { label: "Rent / Mortgage", glyph: "home",     color: "#7C3AED" },
  council:   { label: "Council tax",     glyph: "landmark", color: "#6366F1" },
  electric:  { label: "Electricity",     glyph: "zap",      color: "#F59E0B" },
  gas:       { label: "Gas / heating",   glyph: "flame",    color: "#F97316" },
  water:     { label: "Water",           glyph: "droplet",  color: "#06B6D4" },
  internet:  { label: "Broadband",       glyph: "wifi",     color: "#3B82F6" },
  phone:     { label: "Mobile phone",    glyph: "phone",    color: "#A855F7" },
  groceries: { label: "Groceries",       glyph: "cart",     color: "#22C55E" },
  transport: { label: "Transport",       glyph: "bus",      color: "#0EA5E9" },
  fuel:      { label: "Fuel",            glyph: "fuel",     color: "#EF4444" },
  subs:      { label: "Subscriptions",   glyph: "tv",       color: "#EC4899" },
  insurance: { label: "Insurance",       glyph: "shield",   color: "#14B8A6" },
  health:    { label: "Health / gym",    glyph: "dumbbell", color: "#10B981" },
  dining:    { label: "Eating out",      glyph: "utensils", color: "#FB7185" },
  childcare: { label: "Childcare",       glyph: "stroller", color: "#F472B6" },
  savings:   { label: "Savings",         glyph: "coins",    color: "#00C48C" },
  loan:      { label: "Loan / credit",   glyph: "card",     color: "#E11D48" },
  other:     { label: "Other",           glyph: "receipt",  color: "#64748B" }
};
const CAT_ORDER = ["rent","council","electric","gas","water","internet","phone","groceries","transport","fuel","subs","insurance","health","dining","childcare","savings","loan","other"];
const catOf = (k) => CAT[k] || CAT.other;

const GOAL_GLYPHS = ["lifebuoy","plane","home","car","gift","diamond","cap","laptop","heart","coins","phone","sofa"];
const GOAL_COLORS = ["#00C48C","#6D28D9","#F59E0B","#EF4444","#0EA5E9","#EC4899","#14B8A6","#F97316"];
const EMOJI_MAP = { "\uD83D\uDEDF":"lifebuoy", "\u2708\uFE0F":"plane", "\uD83C\uDFE0":"home", "\uD83D\uDE97":"car", "\uD83C\uDF81":"gift", "\uD83D\uDC8D":"diamond", "\uD83C\uDF93":"cap", "\uD83D\uDCBB":"laptop", "\u2764\uFE0F":"heart", "\uD83D\uDC37":"coins", "\uD83D\uDCF1":"phone", "\uD83D\uDECB\uFE0F":"sofa" };

/* hand-drawn two-tone icon set: s = the 24x24 strokes, f = the soft filled body behind them */
const GLYPH = {
  home:{ s:'<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V20h13V9.5"/><path d="M9.5 20v-6h5v6"/>',
    f:'<path d="M5.5 8.4 12 3.2l6.5 5.2V20h-13z"/>' },
  landmark:{ s:'<path d="M3 9.5 12 4l9 5.5"/><path d="M5.5 10.5v7.5M9.8 10.5v7.5M14.2 10.5v7.5M18.5 10.5v7.5"/><path d="M3.5 20.5h17"/>',
    f:'<path d="M3 9.5 12 4l9 5.5z"/><rect x="4.4" y="10.5" width="15.2" height="7.5" rx=".6" opacity=".5"/>' },
  zap:{ s:'<path d="M13.2 2.5 4.8 13.6h6.1l-.9 7.9 8.3-11.2h-6.2z"/>',
    f:'<path d="M13.2 2.5 4.8 13.6h6.1l-.9 7.9 8.3-11.2h-6.2z"/>' },
  flame:{ s:'<path d="M12 21.5c3.6 0 6.2-2.4 6.2-5.7 0-4.3-4.3-6.3-4.3-9.6 0 0-1.9 1.4-1.9 3.8 0 1.4-1 1.9-1.5 1.1-.4-.6-.8-1.5-.8-2.4-1.9 1.7-3.9 3.8-3.9 7.6 0 3.3 2.6 5.2 6.2 5.2Z"/>',
    f:'<path d="M12 21.5c3.6 0 6.2-2.4 6.2-5.7 0-4.3-4.3-6.3-4.3-9.6 0 0-1.9 1.4-1.9 3.8 0 1.4-1 1.9-1.5 1.1-.4-.6-.8-1.5-.8-2.4-1.9 1.7-3.9 3.8-3.9 7.6 0 3.3 2.6 5.2 6.2 5.2Z"/>' },
  droplet:{ s:'<path d="M12 3s5.8 6 5.8 10.2A5.8 5.8 0 0 1 6.2 13.2C6.2 9 12 3 12 3Z"/>',
    f:'<path d="M12 3s5.8 6 5.8 10.2A5.8 5.8 0 0 1 6.2 13.2C6.2 9 12 3 12 3Z"/>' },
  wifi:{ s:'<path d="M2.8 9.2a14.5 14.5 0 0 1 18.4 0"/><path d="M6 12.6a9.6 9.6 0 0 1 12 0"/><path d="M9.2 16a5 5 0 0 1 5.6 0"/><circle cx="12" cy="19.4" r="1.15" fill="currentColor" stroke="none"/>',
    f:'<path d="M12 19.4 2.8 9.2a14.5 14.5 0 0 1 18.4 0z"/>' },
  phone:{ s:'<rect x="6.5" y="2.5" width="11" height="19" rx="2.6"/><path d="M10.4 18.6h3.2"/>',
    f:'<rect x="6.5" y="2.5" width="11" height="19" rx="2.6"/>' },
  cart:{ s:'<path d="M2.6 3.6h2.2l2.3 11.1a2 2 0 0 0 2 1.6h7.5a2 2 0 0 0 2-1.55l1.35-6.1H6"/><circle cx="9.6" cy="19.9" r="1.45"/><circle cx="17" cy="19.9" r="1.45"/>',
    f:'<path d="M5.85 8.65h14.1l-1.35 6.1a2 2 0 0 1-2 1.55H9.1a2 2 0 0 1-2-1.6z"/>' },
  bus:{ s:'<rect x="3.6" y="3.5" width="16.8" height="13" rx="2.6"/><path d="M3.6 10.4h16.8"/><path d="M6.8 16.5v2.6M17.2 16.5v2.6"/><circle cx="8.1" cy="13.5" r=".95" fill="currentColor" stroke="none"/><circle cx="15.9" cy="13.5" r=".95" fill="currentColor" stroke="none"/>',
    f:'<rect x="3.6" y="3.5" width="16.8" height="13" rx="2.6"/>' },
  fuel:{ s:'<path d="M4.5 20.8V5.2a2 2 0 0 1 2-2h4.6a2 2 0 0 1 2 2v15.6"/><path d="M3.2 20.8h11.2"/><path d="M6.9 8.4h3.8"/><path d="M13.1 9.2h3.2a1.5 1.5 0 0 1 1.5 1.5v5.9a1.6 1.6 0 0 0 3.2 0v-5.4l-2.4-2.9"/>',
    f:'<path d="M4.5 20.8V5.2a2 2 0 0 1 2-2h4.6a2 2 0 0 1 2 2v15.6z"/>' },
  tv:{ s:'<rect x="2.6" y="6.6" width="18.8" height="12" rx="2.6"/><path d="M8.2 3.4 12 6.4l3.8-3"/><path d="M10.6 10.5 14.8 12.6l-4.2 2.1z" fill="currentColor" stroke="none"/>',
    f:'<rect x="2.6" y="6.6" width="18.8" height="12" rx="2.6"/>' },
  shield:{ s:'<path d="M12 2.6 4.8 5.4v5.9c0 4.5 3 8.2 7.2 9.8 4.2-1.6 7.2-5.3 7.2-9.8V5.4z"/><path d="M9.2 11.9l2.1 2.1 3.9-4"/>',
    f:'<path d="M12 2.6 4.8 5.4v5.9c0 4.5 3 8.2 7.2 9.8 4.2-1.6 7.2-5.3 7.2-9.8V5.4z"/>' },
  dumbbell:{ s:'<path d="M3 9.2v5.6M6.2 6.8v10.4M17.8 6.8v10.4M21 9.2v5.6M6.2 12h11.6"/>',
    f:'<rect x="4.9" y="6.8" width="2.6" height="10.4" rx="1.1"/><rect x="16.5" y="6.8" width="2.6" height="10.4" rx="1.1"/>' },
  utensils:{ s:'<path d="M5.4 2.6v6.6a2.4 2.4 0 0 0 4.8 0V2.6"/><path d="M7.8 9.4V21.4"/><path d="M18.2 2.6c-1.9 1.5-2.9 3.4-2.9 5.8s.9 3.4 2.9 3.9v9.1"/>',
    f:'<path d="M5.4 2.6v6.6a2.4 2.4 0 0 0 4.8 0V2.6z"/><path d="M18.2 2.6c-1.9 1.5-2.9 3.4-2.9 5.8s.9 3.4 2.9 3.9z"/>' },
  stroller:{ s:'<path d="M3.6 12.4h13V9.1A6.5 6.5 0 0 0 10.1 2.6"/><path d="M3.6 12.4a6.5 6.5 0 0 0 13 0"/><path d="M6.8 17.2 8.1 14M13.9 17.2 12.6 14"/><circle cx="6.2" cy="19.1" r="1.6"/><circle cx="14.4" cy="19.1" r="1.6"/>',
    f:'<path d="M3.6 12.4a6.5 6.5 0 0 0 13 0z"/><path d="M16.6 12.4V9.1A6.5 6.5 0 0 0 10.1 2.6v9.8z" opacity=".6"/>' },
  coins:{ s:'<ellipse cx="12" cy="6.4" rx="6.8" ry="2.9"/><path d="M5.2 6.4v5c0 1.6 3 2.9 6.8 2.9s6.8-1.3 6.8-2.9v-5"/><path d="M5.2 11.4v5c0 1.6 3 2.9 6.8 2.9s6.8-1.3 6.8-2.9v-5"/>',
    f:'<path d="M5.2 6.4v10c0 1.6 3 2.9 6.8 2.9s6.8-1.3 6.8-2.9v-10c0-1.6-3-2.9-6.8-2.9s-6.8 1.3-6.8 2.9z"/>' },
  card:{ s:'<rect x="2.6" y="5.2" width="18.8" height="13.6" rx="2.6"/><path d="M2.6 10.1h18.8"/><path d="M6.2 14.8h4.2"/>',
    f:'<rect x="2.6" y="5.2" width="18.8" height="13.6" rx="2.6"/>' },
  receipt:{ s:'<path d="M5.6 2.6h12.8v18.8l-2.15-1.45-2.15 1.45-2.1-1.45-2.15 1.45-2.1-1.45L5.6 21.4z"/><path d="M9 8.2h6M9 12.1h6"/>',
    f:'<path d="M5.6 2.6h12.8v18.8l-2.15-1.45-2.15 1.45-2.1-1.45-2.15 1.45-2.1-1.45L5.6 21.4z"/>' },
  lifebuoy:{ s:'<circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="3.5"/><path d="M6 6l3.5 3.5M18 6l-3.5 3.5M6 18l3.5-3.5M18 18l-3.5-3.5"/>',
    f:'<path fill-rule="evenodd" d="M12 3.4a8.6 8.6 0 1 1 0 17.2 8.6 8.6 0 0 1 0-17.2Zm0 5.1a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"/>' },
  plane:{ s:'<path d="M21 15.4 13.4 11.9V5.1a1.45 1.45 0 0 0-2.9 0v6.8L3 15.4v2.1l7.5-2.2v3.4L8 20.5v1.5l4-1.15 4 1.15v-1.5l-2.5-1.75v-3.4L21 17.5z"/>',
    f:'<path d="M21 15.4 13.4 11.9V5.1a1.45 1.45 0 0 0-2.9 0v6.8L3 15.4v2.1l7.5-2.2v3.4L8 20.5v1.5l4-1.15 4 1.15v-1.5l-2.5-1.75v-3.4L21 17.5z"/>' },
  car:{ s:'<path d="M4.2 15.4l1.7-5.8a2 2 0 0 1 1.95-1.5h8.3a2 2 0 0 1 1.95 1.5l1.7 5.8"/><path d="M3.8 15.4h16.4"/><path d="M5.8 15.4v3.3h3v-3.3M15.2 15.4v3.3h3v-3.3"/><circle cx="7.6" cy="12.7" r=".95" fill="currentColor" stroke="none"/><circle cx="16.4" cy="12.7" r=".95" fill="currentColor" stroke="none"/>',
    f:'<path d="M4.2 15.4l1.7-5.8a2 2 0 0 1 1.95-1.5h8.3a2 2 0 0 1 1.95 1.5l1.7 5.8z"/>' },
  gift:{ s:'<rect x="3.2" y="8.4" width="17.6" height="4.1" rx="1.2"/><path d="M4.9 12.5v8.9h14.2v-8.9"/><path d="M12 8.4v13"/><path d="M12 8.4S9.6 8.5 8.4 7.3a2.25 2.25 0 0 1 3.15-3.15C12.7 5.3 12 8.4 12 8.4Z"/><path d="M12 8.4s2.4.1 3.6-1.1a2.25 2.25 0 0 0-3.15-3.15C11.3 5.3 12 8.4 12 8.4Z"/>',
    f:'<rect x="3.2" y="8.4" width="17.6" height="4.1" rx="1.2"/><path d="M4.9 12.5h14.2v8.9H4.9z" opacity=".6"/>' },
  diamond:{ s:'<path d="M6.2 3.2h11.6l3.4 5.4L12 20.8 2.8 8.6z"/><path d="M2.8 8.6h18.4"/><path d="M9.2 3.2 7.6 8.6 12 20.8l4.4-12.2-1.6-5.4"/>',
    f:'<path d="M6.2 3.2h11.6l3.4 5.4L12 20.8 2.8 8.6z"/>' },
  cap:{ s:'<path d="M2.6 8.6 12 4.6l9.4 4-9.4 4z"/><path d="M6.6 11v5c0 1.35 2.4 2.45 5.4 2.45s5.4-1.1 5.4-2.45v-5"/><path d="M21.4 8.6v5.2"/>',
    f:'<path d="M2.6 8.6 12 4.6l9.4 4-9.4 4z"/>' },
  laptop:{ s:'<rect x="4.2" y="5.2" width="15.6" height="10" rx="1.8"/><path d="M2.2 18.4h19.6"/>',
    f:'<rect x="4.2" y="5.2" width="15.6" height="10" rx="1.8"/>' },
  heart:{ s:'<path d="M20.3 6.7a4.55 4.55 0 0 0-6.9-.6L12 7.4l-1.4-1.3a4.55 4.55 0 0 0-6.9 5.9l7 7.2a2 2 0 0 0 2.8 0l6.9-7.2a4.55 4.55 0 0 0-.1-5.3Z"/>',
    f:'<path d="M20.3 6.7a4.55 4.55 0 0 0-6.9-.6L12 7.4l-1.4-1.3a4.55 4.55 0 0 0-6.9 5.9l7 7.2a2 2 0 0 0 2.8 0l6.9-7.2a4.55 4.55 0 0 0-.1-5.3Z"/>' },
  sofa:{ s:'<path d="M4.6 11.2V8.1a2 2 0 0 1 2-2h10.8a2 2 0 0 1 2 2v3.1"/><path d="M2.6 13.2a2 2 0 0 1 4 0v2.2h10.8v-2.2a2 2 0 0 1 4 0v5.6H2.6z"/>',
    f:'<path d="M2.6 13.2a2 2 0 0 1 4 0v2.2h10.8v-2.2a2 2 0 0 1 4 0v5.6H2.6z"/><path d="M4.6 11.2V8.1a2 2 0 0 1 2-2h10.8a2 2 0 0 1 2 2v3.1z" opacity=".55"/>' },
  target:{ s:'<circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="4.4"/><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none"/>',
    f:'<path fill-rule="evenodd" d="M12 3.4a8.6 8.6 0 1 1 0 17.2 8.6 8.6 0 0 1 0-17.2Zm0 4.2a4.4 4.4 0 1 0 0 8.8 4.4 4.4 0 0 0 0-8.8Z"/>' },
  note:{ s:'<rect x="2.6" y="6.2" width="18.8" height="11.6" rx="2.4"/><circle cx="12" cy="12" r="2.5"/><path d="M6.2 9.6v4.8M17.8 9.6v4.8"/>',
    f:'<rect x="2.6" y="6.2" width="18.8" height="11.6" rx="2.4"/>' },
  clock:{ s:'<circle cx="12" cy="12" r="8.6"/><path d="M12 7.3V12l3.2 2.1"/>',
    f:'<circle cx="12" cy="12" r="8.6"/>' },
  carry:{ s:'<path d="M4.4 12.4a7.6 7.6 0 0 1 12.9-5.2"/><path d="M18.2 3.2l-.6 4.3-4.3-.5"/><ellipse cx="12" cy="16.9" rx="6.2" ry="2.4"/><path d="M5.8 16.9v1.6c0 1.3 2.8 2.4 6.2 2.4s6.2-1.1 6.2-2.4v-1.6"/>',
    f:'<path d="M5.8 16.9v1.6c0 1.3 2.8 2.4 6.2 2.4s6.2-1.1 6.2-2.4v-1.6c0-1.3-2.8-2.4-6.2-2.4s-6.2 1.1-6.2 2.4z"/>' }
};
function glyphSvg(name, size, color){
  const s = document.createElement("span");
  s.className = "pf-gl"; s.style.width = size+"px"; s.style.height = size+"px";
  if (color) s.style.color = color;
  const g = GLYPH[name] || GLYPH.target;
  s.innerHTML = '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">'
    + (g.f ? '<g class="pf-glf" fill="currentColor" stroke="none">' + g.f + '</g>' : '') + g.s + '</svg>';
  return s;
}

const SVG = {
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14"/></svg>',
  x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 6"/></svg>',
  gear:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.1 5.1l2.1 2.1M16.8 16.8l2.1 2.1M18.9 5.1 16.8 7.2M7.2 16.8 5.1 18.9" stroke-linecap="round"/></svg>',
  cloud:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19a4.5 4.5 0 0 0 .5-9 6 6 0 0 0-11.6-1.5A4 4 0 0 0 6.5 19Z"/></svg>',
  rotate:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
  download:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"/></svg>',
  up:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5m0 0-6 6m6-6 6 6"/></svg>',
  down:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14m0 0 6-6m-6 6-6-6"/></svg>',
  upload:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21V9m0 0 4 4m-4-4-4 4M5 3h14"/></svg>',
  palette:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3C7 3 3 6.8 3 11.6 3 16.4 6.9 20 11.4 20c1.2 0 2-.8 2-1.8 0-.5-.2-.9-.5-1.2-.3-.4-.5-.8-.5-1.2 0-1 .8-1.8 1.8-1.8h2.3c3 0 5.5-2.3 5.5-5.3C22 5.2 17.6 3 12 3Z"/><circle cx="7.4" cy="11.6" r="1.65" fill="#FF4D7E" stroke="none"/><circle cx="9.9" cy="7.4" r="1.65" fill="#FF9F1C" stroke="none"/><circle cx="14.6" cy="6.9" r="1.65" fill="#2EE59D" stroke="none"/><circle cx="18" cy="10" r="1.65" fill="#7C5CFF" stroke="none"/></svg>'
};

/* ---------------------------------- helpers -------------------------------- */
const uid = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const round2 = (n) => Math.round(n * 100) / 100;
function tint(hex, a){ const s = hex.replace("#",""); const r=parseInt(s.slice(0,2),16), g=parseInt(s.slice(2,4),16), b=parseInt(s.slice(4,6),16); return "rgba("+r+","+g+","+b+","+a+")"; }
/* two-tone wash behind an icon tile */
function tileBg(hex){ return "linear-gradient(145deg, "+tint(hex,0.25)+", "+tint(hex,0.1)+")"; }
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
      { id: uid(), glyph: "lifebuoy", name: "Emergency fund", target: 3000, saved: 750, color: "#00C48C", targetDate: null },
      { id: uid(), glyph: "plane", name: "Holiday", target: 1500, saved: 420, color: "#6D28D9", targetDate: SEED_BY }
    ],
    history: [], lastCycleId: null, carryOver: true, carryEdits: {},
    deductions: { on: true, tax: 20, niMode: "main", niFreq: "weekly", pensionOn: false, pension: 9.8 },
    updatedAt: 0
  };
}
function blank(){ return { salary:0, currency:"\u00A3", payDay:25, expenses:[], shifts:[], paid:{}, goals:[], history:[], lastCycleId:null, carryOver:true, carryEdits:{},
  deductions:{ on:true, tax:20, niMode:"main", niFreq:"weekly", pensionOn:false, pension:9.8 }, updatedAt:0 }; }
function normalize(o){
  const s = Object.assign(blank(), o || {});
  ["expenses","shifts","goals","history"].forEach(function(k){ if (!Array.isArray(s[k])) s[k] = []; });
  if (!s.paid || typeof s.paid !== "object") s.paid = {};
  if (!s.currency) s.currency = "\u00A3";
  if (!s.payDay) s.payDay = 25;
  if (typeof s.carryOver !== "boolean") s.carryOver = true;
  /* hand-edited carry-over amounts, keyed by the cycle they carry INTO ("YYYY-MM") */
  const ce = {};
  if (s.carryEdits && typeof s.carryEdits === "object" && !Array.isArray(s.carryEdits)){
    Object.keys(s.carryEdits).forEach(function(k){ const v = Number(s.carryEdits[k]);
      if (/^\d{4}-\d{2}$/.test(k) && s.carryEdits[k] !== null && s.carryEdits[k] !== "" && Number.isFinite(v)) ce[k] = round2(v); });
  }
  s.carryEdits = ce;
  const dd = s.deductions || {};
  let niMode = dd.niMode;
  if (!niMode) niMode = (dd.ni === 2) ? "upper" : (dd.ni === 0) ? "off" : "main";
  s.deductions = {
    on: typeof dd.on === "boolean" ? dd.on : true,
    tax: dd.tax != null ? dd.tax : 20,
    niMode: niMode,
    niFreq: dd.niFreq || "weekly",
    pensionOn: typeof dd.pensionOn === "boolean" ? dd.pensionOn : !!(dd.pension > 0),
    pension: (dd.pension != null && dd.pension > 0) ? dd.pension : 9.8
  };
  /* older shifts stored only a single figure - treat it as gross */
  s.shifts = s.shifts.map(function(x){ if (x.gross == null) x.gross = x.amount || 0; return x; });
  s.goals = s.goals.map(function(g){
    if (!g.glyph) g.glyph = (g.emoji && EMOJI_MAP[g.emoji]) ? EMOJI_MAP[g.emoji] : "target";
    if (GOAL_COLORS.indexOf(g.color) < 0) g.color = GOAL_COLORS[0];
    return g;
  });
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
function shiftCycleId(id, delta){
  const p = id.split("-").map(Number); let y = p[0], m = p[1] - 1 + delta;
  y += Math.floor(m / 12); m = ((m % 12) + 12) % 12;
  return y + "-" + String(m + 1).padStart(2, "0");
}
function histFor(id){ return state.history.filter(function(x){ return x.cycleId === id; })[0] || null; }
/* what the previous cycle finished with, before any hand edit */
function carryWorkedOut(id){ const prev = histFor(shiftCycleId(id, -1)); return prev ? (prev.saved || 0) : 0; }
/* an amount you typed in for a cycle's carry-over, or null */
function carryEdited(id){
  const ce = state.carryEdits;
  const v = (ce && Object.prototype.hasOwnProperty.call(ce, id)) ? ce[id] : null;
  return (typeof v === "number" && Number.isFinite(v)) ? v : null;
}
/* what actually carries into a cycle: your edit if you made one, otherwise last cycle's leftover */
function carryFor(id){ if (!state.carryOver) return 0; const e = carryEdited(id); return e != null ? e : carryWorkedOut(id); }
function carriedOver(){ return carryFor(cyc().id); }
function income(){ return (state.salary||0) + bankTotal() + carriedOver(); }
/* net for this cycle alone, ignoring anything carried in */
function ownSaved(){ return remaining() - carriedOver(); }
const TAX_OPTS = [ {v:0,l:"None"}, {v:20,l:"20% \u2014 basic / BR code"}, {v:40,l:"40% \u2014 higher"}, {v:45,l:"45% \u2014 additional"} ];
const PEN_OPTS = [ {v:5.2,l:"5.2%"}, {v:6.5,l:"6.5%"}, {v:8.3,l:"8.3%"}, {v:9.8,l:"9.8%"}, {v:10.7,l:"10.7%"}, {v:12.5,l:"12.5%"} ];
const NIMODE_OPTS = [ {v:"main",l:"Standard \u2014 8% above the threshold"}, {v:"upper",l:"2% flat \u2014 already above upper limit"}, {v:"off",l:"None"} ];
const FREQ_OPTS = [ {v:"weekly",l:"Weekly"}, {v:"fortnightly",l:"Fortnightly"}, {v:"fourweekly",l:"Every 4 weeks"}, {v:"monthly",l:"Monthly"} ];
/* 2026/27 employee NI thresholds per pay period */
const NI_THRESH = {
  weekly:      { pt:242,  uel:967,  label:"week" },
  fortnightly: { pt:484,  uel:1934, label:"fortnight" },
  fourweekly:  { pt:968,  uel:3868, label:"4 weeks" },
  monthly:     { pt:1048, uel:4189, label:"month" }
};
const EPOCH_MON = Date.UTC(1970,0,5); /* Monday */
/* which pay period a shift date falls in - NI allowance is per period, not per shift */
function niPeriodKey(dateStr, freq){
  const d = new Date((dateStr||"")+"T00:00:00");
  if (isNaN(d.getTime())) return "na";
  if (freq === "monthly") return "m-" + d.getFullYear() + "-" + (d.getMonth()+1);
  const back = (d.getDay()+6)%7; /* Monday = 0 */
  const mon = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()-back);
  const span = freq === "fortnightly" ? 14 : freq === "fourweekly" ? 28 : 7;
  return freq + "-" + Math.floor((mon - EPOCH_MON) / (86400000 * span));
}
/* NI due on a whole pay period's earnings */
function niOnPeriod(gross, d){
  gross = Math.max(0, gross||0);
  if (!d || d.niMode === "off") return 0;
  if (d.niMode === "upper") return round2(gross * 0.02);
  const t = NI_THRESH[d.niFreq] || NI_THRESH.weekly;
  const main = Math.max(0, Math.min(gross, t.uel) - t.pt) * 0.08;
  const upper = Math.max(0, gross - t.uel) * 0.02;
  return round2(main + upper);
}
function activeDed(){
  const d = state.deductions || {};
  if (!d.on) return { on:false, tax:0, niMode:"off", niFreq:d.niFreq||"weekly", pension:0 };
  return { on:true, tax:d.tax||0, niMode:d.niMode||"main", niFreq:d.niFreq||"weekly",
    pension: d.pensionOn ? (d.pension||0) : 0 };
}
/* gross of every other shift sharing this shift's pay period */
function periodGrossExcluding(dateStr, exceptId, d){
  const key = niPeriodKey(dateStr, d.niFreq);
  return state.shifts.reduce(function(a,s){
    if (s.id === exceptId) return a;
    return niPeriodKey(s.date, d.niFreq) === key ? a + (s.gross != null ? s.gross : s.amount||0) : a;
  }, 0);
}
/* breakdown for one shift, aware of the rest of its pay period */
function breakdownFor(gross, otherInPeriod, d){
  gross = Math.max(0, gross||0);
  otherInPeriod = Math.max(0, otherInPeriod||0);
  const pension = round2(gross * (d.pension||0) / 100);
  const tax = round2(Math.max(0, gross - pension) * (d.tax||0) / 100);
  /* this shift's share of the period's NI */
  const ni = round2(niOnPeriod(otherInPeriod + gross, d) - niOnPeriod(otherInPeriod, d));
  return { gross:gross, pension:pension, tax:tax, ni:ni,
    total: round2(pension+tax+ni), net: round2(gross - pension - tax - ni) };
}
/* re-derive every shift, sharing each pay period's NI allowance correctly */
function recalcShifts(){
  const d = activeDed();
  const groups = {};
  state.shifts.forEach(function(s){
    if (s.gross == null) s.gross = s.amount || 0;
    const k = niPeriodKey(s.date, d.niFreq);
    (groups[k] = groups[k] || []).push(s);
  });
  Object.keys(groups).forEach(function(k){
    const rows = groups[k];
    const total = rows.reduce(function(a,s){ return a + (s.gross||0); }, 0);
    const niTotal = niOnPeriod(total, d);
    let allocated = 0;
    rows.forEach(function(s, i){
      const pension = round2((s.gross||0) * (d.pension||0) / 100);
      const tax = round2(Math.max(0,(s.gross||0) - pension) * (d.tax||0) / 100);
      /* apportion the period's NI by share of gross; last row absorbs rounding */
      let ni;
      if (i === rows.length - 1) ni = round2(niTotal - allocated);
      else { ni = round2(total > 0 ? niTotal * ((s.gross||0)/total) : 0); allocated = round2(allocated + ni); }
      s.pensionAmt = pension; s.taxAmt = tax; s.niAmt = ni;
      s.amount = round2((s.gross||0) - pension - tax - ni);
      s.ded = { tax:d.tax, niMode:d.niMode, niFreq:d.niFreq, pension:d.pension };
    });
  });
}
function grossTotal(){ return cycleShifts().reduce(function(a,s){ return a+(s.gross != null ? s.gross : s.amount||0); },0); }
function monthsBetween(a, b){ const x=a.split("-").map(Number), y=b.split("-").map(Number); return (y[0]*12+(y[1]-1)) - (x[0]*12+(x[1]-1)); }
/* endsOn = month of the FINAL payment (inclusive). Judged per-cycle so past months archive correctly. */
function expActiveIn(e, cycleId){ return !e.endsOn || e.endsOn >= (cycleId || cyc().id); }
function activeExpenses(cycleId){ return state.expenses.filter(function(e){ return expActiveIn(e, cycleId); }); }
function finishedExpenses(){ return state.expenses.filter(function(e){ return !expActiveIn(e, cyc().id); }); }
/* payments still to come, including this cycle */
function paymentsLeft(e){ if (!e.endsOn) return null; return Math.max(0, monthsBetween(cyc().id, e.endsOn) + 1); }
function remainingCost(e){ const n = paymentsLeft(e); return n == null ? null : n * (e.amount||0); }
function expTotal(){ return activeExpenses().reduce(function(a,e){ return a+(e.amount||0); }, 0); }
function remaining(){ return income() - expTotal(); }
function pctRemain(){ const i = income(); return i > 0 ? remaining()/i : 0; }
function ringColor(){ const r = remaining(), i = income(); return r < 0 ? "var(--ring-neg)" : (i > 0 && r/i < 0.15) ? "var(--ring-low)" : "var(--ring-ok)"; }
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
/* null clears the edit; typing the worked-out figure also clears it, so later history changes still flow through */
function setCarryEdit(id, v){
  if (!state.carryEdits || typeof state.carryEdits !== "object") state.carryEdits = {};
  if (v == null || round2(v) === round2(carryWorkedOut(id))) delete state.carryEdits[id];
  else state.carryEdits[id] = round2(v);
  commit();
}
function doReset(){ state = makeDefaults(); state.lastCycleId = getCycle(state.payDay||25, NOW).id; state.updatedAt = Date.now(); persistLocal(); renderApp(); pushSoon(); closeSheet(); toast("Reset to starter setup"); }

function archiveCycle(id){
  if (state.history.some(function(x){ return x.cycleId === id; })) return;
  const p = id.split("-").map(Number), Y = p[0], M = p[1], pd = state.payDay || 25;
  const start = new Date(Y, M - 1, pd), end = new Date(Y, M, pd);
  const shiftsTotal = state.shifts.reduce(function(a, s){
    const t = new Date(s.date + "T00:00:00").getTime();
    return (t >= start.getTime() && t < end.getTime()) ? a + (s.amount || 0) : a;
  }, 0);
  const expenses = activeExpenses(id).reduce(function(a, e){ return a + (e.amount || 0); }, 0);
  const carriedIn = carryFor(id);
  const inc = (state.salary || 0) + shiftsTotal + carriedIn;
  state.history.push({
    cycleId: id, label: start.toLocaleDateString("en-GB", { month: "short", year: "numeric" }),
    income: inc, expenses: expenses, saved: inc - expenses,
    salary: state.salary || 0, shiftsTotal: shiftsTotal, carriedIn: carriedIn, auto: true
  });
}
function archiveIfRolled(){
  const curId = getCycle(state.payDay || 25, NOW).id;
  if (!state.lastCycleId){ state.lastCycleId = curId; persistLocal(); return; }
  if (state.lastCycleId === curId) return;
  /* payday moved later (or the clock went back): nothing has finished, so just move the marker */
  if (state.lastCycleId > curId){ state.lastCycleId = curId; state.updatedAt = Date.now(); persistLocal(); return; }
  /* close off every cycle between the last one we saw and today */
  let id = state.lastCycleId, guard = 0;
  while (id !== curId && guard++ < 240){ archiveCycle(id); id = shiftCycleId(id, 1); }
  state.history.sort(function(a, b){ return a.cycleId < b.cycleId ? -1 : 1; });
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
  const fg = svgEl("circle",{"class":"pf-ringfill",cx:size/2,cy:size/2,r:r,fill:"none",style:"stroke:"+color,"stroke-width":stroke,"stroke-linecap":"round","stroke-dasharray":c});
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
    h("div",{class:"pf-headbtns"},
      h("button",{class:"pf-themebtn","aria-label":"Change theme", onClick:openThemes}, icon("palette",22)),
      h("button",{class:"pf-gear","aria-label":"Settings", onClick:openSettings}, icon("gear",19)))
  ));
  app.appendChild(h("div",{class:"pf-syncbar"}, syncChip()));

  /* hero */
  const ringWrap = h("div",{class:"pf-ringwrap", style:{width:"178px",height:"178px"}});
  ringWrap.appendChild(buildRing(pctRemain(), ringColor()));
  ringWrap.appendChild(h("div",{class:"pf-ringcenter"},
    h("span",{class:"pf-ringlab"},"Left this cycle"),
    h("span",{class:"pf-ringnum", style:{color: remaining()<0?"var(--hero-neg-ink)":"#FFFFFF"}}, money0(remaining())),
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
    h("span",{class:"pf-ic pf-ic--pos"}, glyphSvg("note",21,"var(--pos)")),
    h("div",{class:"pf-expmid"}, h("span",{class:"pf-expname"},"Monthly salary"), h("span",{class:"pf-expcat"},"Paid on the "+ordinal(state.payDay)+" \u00B7 take-home")),
    h("span",{class:"pf-expamt"}, money2(state.salary))
  ));
  if (state.carryOver){
    const carried = carriedOver();
    const prevId = shiftCycleId(C.id,-1), prevRec = histFor(prevId);
    const prevLbl = prevRec ? prevRec.label : monthLabel(prevId);
    const edited = carryEdited(C.id) != null;
    const sub = edited ? "You changed this \u00B7 worked out "+signed(carryWorkedOut(C.id))
      : prevRec ? "Left at the end of "+prevLbl : "Tap to add what you had left from "+prevLbl;
    incomeCard.appendChild(h("div",{class:"pf-exp", role:"button", tabindex:"0", "aria-label":"Edit carried over", onClick:openCarry, onKeydown:onKey(openCarry)},
      h("span",{class:"pf-ic pf-ic--acc"}, glyphSvg("carry",21,"var(--accent)")),
      h("div",{class:"pf-expmid"},
        h("span",{class:"pf-expname"},"Carried over"),
        h("span",{class:"pf-expcat"}, sub)),
      h("span",{class:"pf-expamt "+(carried>0?"pf-pos":carried<0?"pf-neg":"pf-muted2")}, carried ? signed(carried) : money2(0))
    ));
  }
  incomeCard.appendChild(h("div",{class:"pf-subhead"},
    h("span",{class:"pf-subtitle"}, "Bank shifts ", h("span",{class:"pf-count"}, String(shifts.length))),
    h("span",{class:"pf-pos pf-subtot"}, "+"+money2(bankTotal()),
      (state.deductions.on && grossTotal() > bankTotal()) ? h("span",{class:"pf-grosshint"}, " net of "+money0(grossTotal())) : null)
  ));
  const shiftList = h("div",{class:"pf-list"});
  if (shifts.length){
    shifts.forEach(function(s){
      shiftList.appendChild(h("div",{class:"pf-exp", role:"button", tabindex:"0", onClick:function(){ openShift(s); }, onKeydown:onKey(function(){ openShift(s); })},
        h("span",{class:"pf-ic pf-ic--pos"}, glyphSvg("clock",21,"var(--pos)")),
        h("div",{class:"pf-expmid"},
          h("span",{class:"pf-expname"}, s.label || "Bank shift"),
          h("span",{class:"pf-expcat"}, new Date(s.date+"T00:00:00").toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"}) + ((s.hours&&s.rate) ? " \u00B7 "+s.hours+"h \u00D7 "+CUR()+s.rate : ""),
            (s.gross != null && s.gross > (s.amount||0)) ? h("span",{class:"pf-endchip"}, money0(s.gross)+" gross") : null)
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
        h("span",{class:"pf-goalemoji", style:{background:tileBg(g.color)}}, glyphSvg(g.glyph,22,g.color)),
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
  const liveExp = activeExpenses();
  liveExp.forEach(function(e){ byCat[e.category] = (byCat[e.category]||0) + (e.amount||0); });
  const total = expTotal();
  const comp = h("div",{class:"pf-compbar"});
  if (total>0){
    CAT_ORDER.forEach(function(k){ if (byCat[k]){ const seg = h("div",{class:"pf-seg", style:{background:catOf(k).color}}); growW(seg, byCat[k]/total); comp.appendChild(seg); } });
  } else comp.appendChild(h("div",{class:"pf-seg pf-seg--empty", style:{width:"100%"}}));
  expCard.appendChild(comp);
  const paidTotal = liveExp.reduce(function(a,e){ return a + (state.paid[pk(e.id)] ? (e.amount||0) : 0); }, 0);
  const paidCount = liveExp.filter(function(e){ return state.paid[pk(e.id)]; }).length;
  expCard.appendChild(h("div",{class:"pf-expmeta"},
    h("span",{}, "Still to pay ", h("strong",{}, money2(Math.max(0,total-paidTotal)))),
    h("span",{}, paidCount + "/" + liveExp.length + " paid")
  ));
  const expList = h("div",{class:"pf-list"});
  if (liveExp.length){
    liveExp.slice().sort(function(a,b){ return (b.amount||0)-(a.amount||0); }).forEach(function(e){
      const c = catOf(e.category); const isPaid = !!state.paid[pk(e.id)];
      const chk = h("button",{class:"pf-check"+(isPaid?" pf-check--on":""), "aria-label":isPaid?"Mark as not paid":"Mark as paid", onClick:function(ev){ ev.stopPropagation(); togglePaid(e.id); }});
      if (isPaid) chk.appendChild(icon("check",14));
      expList.appendChild(h("div",{class:"pf-exp"+(isPaid?" pf-exp--paid":""), role:"button", tabindex:"0", onClick:function(){ openExpense(e); }, onKeydown:onKey(function(){ openExpense(e); })},
        h("span",{class:"pf-ic", style:{background:tileBg(c.color)}}, glyphSvg(c.glyph,21,c.color)),
        h("div",{class:"pf-expmid"},
          h("span",{class:"pf-expname"}, e.name),
          h("span",{class:"pf-expcat"}, c.label, (function(){
            const n = paymentsLeft(e);
            if (n == null) return null;
            const endLbl = (function(){ const p=e.endsOn.split("-").map(Number); return new Date(p[0],p[1]-1,1).toLocaleDateString("en-GB",{month:"short",year:"numeric"}); })();
            return h("span",{class:"pf-endchip"+(n<=1?" pf-endchip--last":"")},
              n<=1 ? "last payment" : n+" left \u00B7 "+money0(remainingCost(e))+" to go",
              h("span",{class:"pf-endwhen"}, " \u00B7 ends "+endLbl));
          })())),
        h("span",{class:"pf-expamt"}, money2(e.amount)),
        chk
      ));
    });
  } else expList.appendChild(emptyNode("No expenses yet. Add your monthly bills to get started."));
  expCard.appendChild(expList);
  const fin = finishedExpenses();
  if (fin.length){
    expCard.appendChild(h("div",{class:"pf-subhead"},
      h("span",{class:"pf-subtitle"}, "Finished ", h("span",{class:"pf-count"}, String(fin.length))),
      h("span",{class:"pf-subtot pf-muted2"}, "not counted")
    ));
    const finList = h("div",{class:"pf-list"});
    fin.forEach(function(e){
      const c = catOf(e.category);
      const p = e.endsOn.split("-").map(Number);
      const endLbl = new Date(p[0],p[1]-1,1).toLocaleDateString("en-GB",{month:"short",year:"numeric"});
      finList.appendChild(h("div",{class:"pf-exp pf-exp--fin"},
        h("span",{class:"pf-ic pf-ic--mute"}, glyphSvg(c.glyph,21,"var(--ink-4)")),
        h("div",{class:"pf-expmid", role:"button", tabindex:"0", onClick:function(){ openExpense(e); }, onKeydown:onKey(function(){ openExpense(e); })},
          h("span",{class:"pf-expname"}, e.name),
          h("span",{class:"pf-expcat"}, "Paid off \u00B7 last payment "+endLbl)),
        h("button",{class:"pf-removebtn", onClick:function(ev){ ev.stopPropagation(); delExpense(e.id); toast(e.name+" removed"); }}, "Remove")
      ));
    });
    expCard.appendChild(finList);
  }
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
  const lastRec = histFor(shiftCycleId(C.id,-1));
  const thisOwn = ownSaved();
  if (lastRec){
    const lastOwn = (lastRec.saved||0) - (lastRec.carriedIn||0);
    const delta = thisOwn - lastOwn;
    const better = delta >= 0;
    histCard.appendChild(h("div",{class:"pf-vs"},
      h("div",{class:"pf-vscol"},
        h("span",{class:"pf-vslab"}, lastRec.label),
        h("span",{class:"pf-vsval "+(lastOwn>=0?"pf-pos":"pf-neg")}, money0(lastOwn)),
        h("span",{class:"pf-vssub"},"saved")
      ),
      h("div",{class:"pf-vsmid"}, h("span",{class:"pf-vschip "+(better?"pf-vschip--up":"pf-vschip--down")}, icon(better?"up":"down",13), (better?"+":"\u2212")+money0(Math.abs(delta)).replace("-",""))),
      h("div",{class:"pf-vscol"},
        h("span",{class:"pf-vslab"},"This cycle"),
        h("span",{class:"pf-vsval "+(thisOwn>=0?"pf-pos":"pf-neg")}, money0(thisOwn)),
        h("span",{class:"pf-vssub"}, isPayday?"so far":daysToPay+" days to go")
      )
    ));
  }
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
  const ends = h("input",{class:"pf-input", type:"month", value:(existing&&existing.endsOn)?existing.endsOn:""});
  const endsInfo = h("span",{class:"pf-hint"});
  function updEnds(){
    if (!ends.value){ endsInfo.textContent = "Leave blank for ongoing bills like rent. Set it for loans, credit cards or anything that ends."; return; }
    const n = Math.max(0, monthsBetween(cyc().id, ends.value) + 1);
    const a = parseFloat(amt._input.value)||0;
    endsInfo.textContent = n===0 ? "Already finished \u2014 it won't be counted, and you can remove it."
      : n+" payment"+(n===1?"":"s")+" left"+(a?" \u00B7 "+money0(n*a)+" still to pay":"")+". It stops counting after that.";
  }
  ends.addEventListener("change", updEnds); amt._input.addEventListener("input", updEnds); updEnds();
  const grid = h("div",{class:"pf-catgrid"});
  function paint(){
    grid.innerHTML = "";
    CAT_ORDER.forEach(function(k){
      const c = CAT[k]; const sel = k===cat;
      const chip = h("button",{type:"button", class:"pf-catchip"+(sel?" pf-catchip--on":""), onClick:function(){ cat=k; if (!name.value.trim()) name.value=c.label; paint(); }},
        h("span",{class:"pf-catic", style:{background:tileBg(c.color)}}, glyphSvg(c.glyph,19,c.color)),
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
    upsertExpense({ id: existing?existing.id:uid(), name:nm, category:cat, amount:Math.max(0,a||0), endsOn: ends.value || null }); closeSheet();
  }));
  const fEnds = h("div",{class:"pf-field"}, h("label",{class:"pf-lab"},"Final payment month (optional)"), ends, endsInfo);
  openSheet(existing?"Edit expense":"Add expense", h("div",{}, field("Name", name), field("Amount per month", amt), fEnds, field("Category", grid), act));
}

function openShift(existing){
  const today = new Date().toISOString().slice(0,10);
  const date = h("input",{class:"pf-input", type:"date", value: existing?existing.date:today});
  const label = h("input",{class:"pf-input", placeholder:"e.g. Long day \u00B7 Renal", value: existing?existing.label:""});
  const hours = h("input",{class:"pf-input", inputmode:"decimal", placeholder:"0", value: (existing&&existing.hours!=null)?existing.hours:""});
  const rate = amtInput((existing&&existing.rate!=null)?existing.rate:"");
  const amt = amtInput(existing ? (existing.gross != null ? existing.gross : existing.amount) : "");
  const bd = h("div",{class:"pf-bd"});
  function paintBd(){
    const d = activeDed();
    const others = periodGrossExcluding(date.value, existing ? existing.id : null, d);
    const r = breakdownFor(parseFloat(amt._input.value)||0, others, d);
    const t = NI_THRESH[d.niFreq] || NI_THRESH.weekly;
    bd.innerHTML = "";
    if (!state.deductions.on){
      bd.appendChild(h("div",{class:"pf-bdrow pf-bdrow--tot"}, h("span",{},"Counted as take-home"), h("strong",{}, money2(r.gross))));
      bd.appendChild(h("div",{class:"pf-bdnote"}, "Take-home estimating is off \u2014 turn it on in Settings to deduct tax and NI."));
      return;
    }
    bd.appendChild(h("div",{class:"pf-bdrow"}, h("span",{},"Gross pay"), h("span",{}, money2(r.gross))));
    if (d.pension) bd.appendChild(h("div",{class:"pf-bdrow"}, h("span",{},"NHS pension "+d.pension+"%"), h("span",{class:"pf-bdminus"}, "\u2212"+money2(r.pension))));
    if (d.tax) bd.appendChild(h("div",{class:"pf-bdrow"}, h("span",{},"Income tax "+d.tax+"%"), h("span",{class:"pf-bdminus"}, "\u2212"+money2(r.tax))));
    if (d.niMode !== "off") bd.appendChild(h("div",{class:"pf-bdrow"},
      h("span",{},"National Insurance"), h("span",{class:"pf-bdminus"}, "\u2212"+money2(r.ni))));
    bd.appendChild(h("div",{class:"pf-bdrow pf-bdrow--tot"}, h("span",{},"Take-home"), h("strong",{class:"pf-pos"}, money2(r.net))));
    let note = "This take-home figure is what counts towards your budget.";
    if (d.niMode === "main"){
      note = others > 0
        ? "NI shared across the "+money0(others+r.gross)+" you worked that "+t.label+" \u2014 the first "+money0(t.pt)+" is NI-free."
        : "The first "+money0(t.pt)+" you earn each "+t.label+" is NI-free, so NI here is under 8% of gross.";
    }
    bd.appendChild(h("div",{class:"pf-bdnote"}, note));
  }
  function recalc(){ const a = (parseFloat(hours.value)||0)*(parseFloat(rate._input.value)||0); if (a) amt._input.value = String(round2(a)); paintBd(); }
  amt._input.addEventListener("input", paintBd);
  hours.addEventListener("input", recalc); rate._input.addEventListener("input", recalc); date.addEventListener("change", paintBd); paintBd();
  const act = h("div",{class:"pf-actions"});
  if (existing) act.appendChild(dangerBtn(function(){ delShift(existing.id); closeSheet(); }));
  act.appendChild(primaryBtn("Save", function(){
    const g = round2(parseFloat(amt._input.value)||0); if (!(g>0)) return;
    upsertShift({ id: existing?existing.id:uid(), date:date.value, label:label.value.trim(),
      hours:parseFloat(hours.value)||null, rate:parseFloat(rate._input.value)||null,
      gross:g, amount:g });
    recalcShifts(); commit(); closeSheet();
  }));
  openSheet(existing?"Edit bank shift":"Add bank shift", h("div",{},
    h("p",{class:"pf-help"},"Log extra shifts you pick up through the bank. They count towards this pay cycle only."),
    field("Date worked", date),
    field("Label (optional)", label),
    h("div",{class:"pf-grid2"}, field("Hours", hours), field("Rate / hr", rate)),
    field("Gross pay for this shift", amt, "Fills in from hours \u00D7 rate \u2014 or type a flat amount. Enter it before deductions."),
    bd,
    act
  ));
}

function openGoal(existing){
  let glyph = existing?existing.glyph:"target";
  let color = existing?existing.color:GOAL_COLORS[0];
  const name = h("input",{class:"pf-input", placeholder:"e.g. Emergency fund", value: existing?existing.name:""});
  const target = amtInput(existing?existing.target:"");
  const saved = amtInput((existing&&existing.saved!=null)?existing.saved:"");
  const by = h("input",{class:"pf-input", type:"month", value: (existing&&existing.targetDate)?existing.targetDate:""});
  const egrid = h("div",{class:"pf-emojigrid"});
  const crow = h("div",{class:"pf-colorrow"});
  function paintE(){ egrid.innerHTML=""; GOAL_GLYPHS.forEach(function(e){ const sel=e===glyph; const b=h("button",{type:"button", class:"pf-emoji"+(sel?" pf-emoji--on":""), onClick:function(){ glyph=e; paintE(); }}, glyphSvg(e,21,sel?color:"var(--ink-3)")); if (sel){ b.style.borderColor=color; b.style.background=tint(color,0.12); } egrid.appendChild(b); }); }
  function paintC(){ crow.innerHTML=""; GOAL_COLORS.forEach(function(c){ const sel=c===color; const b=h("button",{type:"button", class:"pf-swatch"+(sel?" pf-swatch--on":""), style:{background:c}, "aria-label":"Pick colour", onClick:function(){ color=c; paintE(); paintC(); }}); crow.appendChild(b); }); }
  paintE(); paintC();
  const act = h("div",{class:"pf-actions"});
  if (existing) act.appendChild(dangerBtn(function(){ delGoal(existing.id); closeSheet(); }));
  act.appendChild(primaryBtn("Save", function(){
    const nm = name.value.trim(); const t = parseFloat(target._input.value); if (!nm || !(t>0)) return;
    upsertGoal({ id: existing?existing.id:uid(), glyph:glyph, name:nm, color:color, target:Math.max(0,t||0), saved:Math.max(0,parseFloat(saved._input.value)||0), targetDate:by.value||null }); closeSheet();
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
  const help = h("p",{class:"pf-help"}); help.appendChild(document.createTextNode("Adding to ")); help.appendChild(h("strong",{}, goal.name)); help.appendChild(document.createTextNode(" \u2014 currently "+CUR()+Math.round(goal.saved||0).toLocaleString("en-GB")+" of "+CUR()+Math.round(goal.target||0).toLocaleString("en-GB")+"."));
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
    prev2.appendChild(document.createTextNode("Saved that month: ")); prev2.appendChild(h("strong",{style:{color:net>=0?"var(--pos)":"var(--neg)"}}, (net<0?"-":"")+CUR()+Math.abs(Math.round(net)).toLocaleString("en-GB"))); }
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
      (m.carriedIn ? h("div",{class:"pf-hdrow"}, h("span",{},"\u2014 of which carried in"), h("strong",{class:"pf-muted2"}, money2(m.carriedIn))) : null),
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

/* ---------------------------------- themes --------------------------------- */
function themeId(){ let t = null; try { t = localStorage.getItem(LS_THEME); } catch(e){} return THEMES.some(function(x){ return x.id === t; }) ? t : THEMES[0].id; }
function themeById(id){ return THEMES.filter(function(x){ return x.id === id; })[0] || THEMES[0]; }
function applyTheme(id){
  const th = themeById(id), de = document.documentElement;
  if (de) de.setAttribute("data-theme", th.id);
  const m = document.querySelector ? document.querySelector('meta[name="theme-color"]') : null;
  if (m) m.setAttribute("content", th.meta);
}
/* crossfades the whole screen where the browser supports it; instant when Reduce Motion is on */
function setTheme(id, after){
  const th = themeById(id);
  try { localStorage.setItem(LS_THEME, th.id); } catch(e){}
  const run = function(){ applyTheme(th.id); if (after) after(); };
  const calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (document.startViewTransition && !calm) document.startViewTransition(run); else run();
}
function openThemes(){
  const grid = h("div",{class:"pf-themegrid", role:"radiogroup", "aria-label":"Theme"});
  function paint(){
    grid.innerHTML = "";
    const now = themeId();
    THEMES.forEach(function(t){
      const on = t.id === now;
      grid.appendChild(h("button",{type:"button", class:"pf-themecard"+(on?" pf-themecard--on":""), "data-theme":t.id,
          role:"radio", "aria-checked":on?"true":"false", "aria-label":t.name,
          onClick:function(){ if (t.id !== themeId()) setTheme(t.id, paint); }},
        h("span",{class:"pf-tc-hero"}, h("span",{class:"pf-tc-ring"}), h("span",{class:"pf-tc-lines"}, h("i",{}), h("i",{}))),
        h("span",{class:"pf-tc-body"}, h("i",{class:"pf-tc-dot pf-tc-dot--a"}), h("i",{class:"pf-tc-dot pf-tc-dot--p"}), h("i",{class:"pf-tc-dot pf-tc-dot--n"}), h("i",{class:"pf-tc-bar"})),
        h("span",{class:"pf-tc-foot"}, h("span",{class:"pf-tc-name"}, t.name), on ? h("span",{class:"pf-tc-check"}, icon("check",12)) : null)
      ));
    });
  }
  paint();
  openSheet("Theme", h("div",{},
    h("p",{class:"pf-help"},"Tap one to try it \u2014 the app changes straight away. It's saved on this device only, so your iPhone and iPad can each have their own."),
    grid,
    actions(primaryBtn("Done", closeSheet))
  ));
}

/* ------------------------------- carry-over editor ------------------------- */
function monthLabel(id){ const p = String(id).split("-").map(Number); return new Date(p[0], p[1]-1, 1).toLocaleDateString("en-GB",{month:"short",year:"numeric"}); }
function signed(n){ n = round2(n||0); return (n>0?"+":n<0?"\u2212":"") + money2(Math.abs(n)); }
function openCarry(){
  const C = cyc(), prevId = shiftCycleId(C.id, -1), prev = histFor(prevId);
  const prevLbl = prev ? prev.label : monthLabel(prevId);
  const auto = carryWorkedOut(C.id), edited = carryEdited(C.id);
  const start = edited != null ? edited : auto;
  let sign = start < 0 ? -1 : 1;
  const mag = round2(Math.abs(start));
  const amt = amtInput(mag ? (mag % 1 === 0 ? String(mag) : mag.toFixed(2)) : "");
  const seg = h("div",{class:"pf-segctl", role:"radiogroup", "aria-label":"Left over or overspent"});
  const box = h("div",{class:"pf-bd"});
  function val(){ const v = round2(sign * Math.max(0, parseFloat(amt._input.value) || 0)); return v === 0 ? 0 : v; }
  function paintSeg(){
    seg.innerHTML = "";
    [[1,"Left over","pf-segctl--pos"],[-1,"Overspent","pf-segctl--neg"]].forEach(function(o){
      seg.appendChild(h("button",{type:"button", class:o[2], role:"radio", "aria-checked":sign===o[0]?"true":"false",
        onClick:function(){ sign = o[0]; paintSeg(); paintBox(); }}, o[1]));
    });
  }
  function paintBox(){
    const base = (state.salary||0) + bankTotal();
    box.innerHTML = "";
    box.appendChild(h("div",{class:"pf-bdrow"}, h("span",{}, prev ? "Worked out from "+prevLbl : "Nothing recorded for "+prevLbl),
      h("span",{}, prev ? signed(auto) : "\u2014")));
    box.appendChild(h("div",{class:"pf-bdrow"}, h("span",{},"Salary and bank shifts"), h("span",{}, money2(base))));
    box.appendChild(h("div",{class:"pf-bdrow pf-bdrow--tot"}, h("span",{},"This cycle's income"), h("strong",{class:"pf-pos"}, money2(base + val()))));
  }
  amt._input.addEventListener("input", paintBox);
  paintSeg(); paintBox();
  const act = h("div",{class:"pf-actions"});
  if (edited != null) act.appendChild(h("button",{class:"pf-btn pf-btn--ghost", onClick:function(){ setCarryEdit(C.id, null); closeSheet(); toast("Back to "+signed(auto)); }}, "Use "+signed(auto)));
  act.appendChild(primaryBtn("Save", function(){ const v = val(); setCarryEdit(C.id, v); closeSheet(); toast("Carried over set to "+signed(v)); }));
  openSheet("Carried over", h("div",{},
    h("p",{class:"pf-help"}, "What came across from "+prevLbl+" into this cycle. Change it if the real figure was different \u2014 for example, if you moved some into a savings account."),
    seg,
    field("Amount", amt),
    box,
    act
  ));
}

/* -------------------------------- settings --------------------------------- */
function openSettings(){
  const payday = h("input",{class:"pf-input", type:"number", min:"1", max:"28", inputmode:"numeric", value:String(state.payDay)});
  const curIn = h("input",{class:"pf-input", maxlength:"3", value:state.currency});
  const saveBtn = primaryBtn("Save", function(){ state.payDay = clamp(parseInt(payday.value,10)||25,1,28); state.currency = (curIn.value.trim()||"\u00A3"); commit(); closeSheet(); });
  const toggle = h("button",{class:"pf-toggle"+(state.carryOver?" pf-toggle--on":""), role:"switch", "aria-checked":state.carryOver?"true":"false"}, h("span",{class:"pf-knob"}));
  toggle.addEventListener("click", function(){ state.carryOver = !state.carryOver; toggle.className = "pf-toggle"+(state.carryOver?" pf-toggle--on":""); toggle.setAttribute("aria-checked", state.carryOver?"true":"false"); commit(); });
  /* bank shift take-home */
  function mkSel(opts, cur){
    const s = h("select",{class:"pf-input"});
    opts.forEach(function(o){ const op = h("option",{value:String(o.v)}, o.l); if (Number(o.v) === Number(cur)) op.selected = true; s.appendChild(op); });
    return s;
  }
  const taxSel  = mkSel(TAX_OPTS, state.deductions.tax);
  const niSel   = mkSel(NIMODE_OPTS, state.deductions.niMode);
  const freqSel = mkSel(FREQ_OPTS, state.deductions.niFreq);
  const penSel  = mkSel(PEN_OPTS, state.deductions.pension);
  const dedToggle = h("button",{class:"pf-toggle"+(state.deductions.on?" pf-toggle--on":""), role:"switch", "aria-checked":state.deductions.on?"true":"false"}, h("span",{class:"pf-knob"}));
  const penToggle = h("button",{class:"pf-toggle"+(state.deductions.pensionOn?" pf-toggle--on":""), role:"switch", "aria-checked":state.deductions.pensionOn?"true":"false"}, h("span",{class:"pf-knob"}));
  const dedFields = h("div",{});
  function applyDed(){
    state.deductions.tax = parseFloat(taxSel.value)||0;
    state.deductions.niMode = niSel.value;
    state.deductions.niFreq = freqSel.value;
    state.deductions.pension = parseFloat(penSel.value)||0;
    recalcShifts(); commit(); paintDed();
  }
  function paintDed(){
    dedFields.innerHTML = "";
    if (!state.deductions.on){
      dedFields.appendChild(h("p",{class:"pf-mini"},"Bank shift amounts are counted exactly as you enter them."));
      return;
    }
    dedFields.appendChild(field("Income tax on bank pay", taxSel, "A BR tax code means all of it is taxed at 20%."));
    dedFields.appendChild(field("National Insurance", niSel));
    if (state.deductions.niMode === "main"){
      const t = NI_THRESH[state.deductions.niFreq] || NI_THRESH.weekly;
      dedFields.appendChild(field("How often you're paid", freqSel,
        "NI is 8% only on what you earn above "+money0(t.pt)+" per "+t.label+", so the effective rate is lower than 8%. NHS Professionals pays weekly."));
    }
    dedFields.appendChild(h("div",{class:"pf-toggrow"},
      h("div",{}, h("span",{class:"pf-toglab"},"NHS pension on bank pay"),
        h("span",{class:"pf-hint"},"Your payslip shows this as PENSION CONTS \u2014 leave off if it's 0.00.")),
      penToggle));
    if (state.deductions.pensionOn) dedFields.appendChild(field("Contribution tier", penSel, "Taken before income tax, so it gets tax relief automatically."));
    /* live worked example using the real thresholds */
    const d = activeDed();
    const ex = breakdownFor(684.84, 0, d);
    dedFields.appendChild(h("div",{class:"pf-newtotal"},
      "A ", h("strong",{}, money2(684.84)), " gross ", (NI_THRESH[d.niFreq]||NI_THRESH.weekly).label,
      " leaves about ", h("strong",{class:"pf-pos"}, money2(ex.net)),
      h("span",{class:"pf-bdnote"}, "tax "+money2(ex.tax)+" \u00B7 NI "+money2(ex.ni)+(ex.pension?" \u00B7 pension "+money2(ex.pension):""))));
  }
  dedToggle.addEventListener("click", function(){
    state.deductions.on = !state.deductions.on;
    dedToggle.className = "pf-toggle"+(state.deductions.on?" pf-toggle--on":"");
    dedToggle.setAttribute("aria-checked", state.deductions.on?"true":"false");
    applyDed();
  });
  penToggle.addEventListener("click", function(){
    state.deductions.pensionOn = !state.deductions.pensionOn;
    penToggle.className = "pf-toggle"+(state.deductions.pensionOn?" pf-toggle--on":"");
    penToggle.setAttribute("aria-checked", state.deductions.pensionOn?"true":"false");
    applyDed();
  });
  [taxSel, niSel, freqSel, penSel].forEach(function(s){ s.addEventListener("change", applyDed); });
  paintDed();
  const dedBox = h("div",{},
    h("div",{class:"pf-divlabel"},"Bank shift take-home"),
    h("div",{class:"pf-toggrow"},
      h("div",{}, h("span",{class:"pf-toglab"},"Estimate take-home"), h("span",{class:"pf-hint"},"Turn gross shift pay into what actually reaches your bank.")),
      dedToggle),
    dedFields);

  const carryRow = h("div",{class:"pf-toggrow"},
    h("div",{}, h("span",{class:"pf-toglab"},"Carry over what's left"), h("span",{class:"pf-hint"},"Adds last cycle's leftover to this cycle's income. Tap Carried over on the Income card to change the amount.")),
    toggle);

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

  const sheetLink = h("a",{class:"pf-btn pf-btn--ghost", href:"sheet.html", style:{textDecoration:"none"}}, "Open sheet view \u2192");
  openSheet("Settings", h("div",{},
    field("Payday \u2014 the day everything resets", payday, "Your cycle runs from this day to the day before it, next month."),
    field("Currency symbol", curIn),
    carryRow,
    actions(saveBtn),
    dedBox,
    h("div",{class:"pf-divlabel"},"Spreadsheet"),
    sheetLink,
    h("p",{class:"pf-mini"},"A wide, spreadsheet-style screen for editing lots of rows at once \u2014 same data, same sync."),
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
  applyTheme(themeId());
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
