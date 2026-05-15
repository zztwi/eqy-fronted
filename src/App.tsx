import { useEffect, useMemo, useState } from 'react'

type PageId = 'home' | 'pricing' | 'download' | 'login' | 'dashboard' | 'changelog' | 'admin'
type User = { id: number; email: string; created_at?: string }
type License = {
  id?: number
  key: string
  plan_id: string
  status: string
  expires_at: string | null
  premium: boolean
  hwid?: string | null
  created_at?: string | null
  last_verified_at?: string | null
  is_active?: boolean
}
type HwidRequest = {
  id: number
  license_id?: number | null
  license_key?: string | null
  plan_id?: string | null
  email?: string | null
  reason?: string | null
  status: string
  created_at: string
  reviewed_at?: string | null
}
type AdminData = {
  users: Array<{ id: number; email: string; created_at: string; license_count?: number }>
  licenses: Array<{
    id: number
    key: string
    email?: string | null
    plan_id: string
    status: string
    hwid?: string | null
    expires_at?: string | null
    premium: boolean
    created_at: string
  }>
  hwidRequests: HwidRequest[]
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const EQY_FORCE_STYLE = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700;800&family=Sora:wght@600;700;800&display=swap');

* { box-sizing: border-box; }

body { color: #f8fbff; overflow-x: hidden; }
button { border: 0; background: transparent; color: inherit; }
input, textarea, select { font: inherit; }
.eqy-v4-root { min-height: 100vh; position: relative; isolation: isolate; color: #f8fbff; overflow-x: hidden; }
.relative { position: relative; }
.z-10 { z-index: 10; }
.mx-auto { margin-left: auto; margin-right: auto; }
.max-w-\[1280px\] { max-width: 1280px; }
.px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
.pb-24 { padding-bottom: 6rem; }
.pt-14 { padding-top: 3.5rem; }
.py-8 { padding-top: 2rem; padding-bottom: 2rem; }
.flex { display: flex; }
.justify-between { justify-content: space-between; }
.border-t { border-top-width: 1px; }
.border-white\/10 { border-color: rgba(255,255,255,.10); }
.text-xs { font-size: .75rem; line-height: 1rem; }
.text-slate-500 { color: #64748b; }
.text-emerald-300 { color: #6ee7b7; }

html, body, #root { min-height: 100%; margin: 0; background: #02040a; font-family: Inter, sans-serif; }
button, input { font: inherit; }
button { cursor: pointer; }
h1, h2, h3, strong { font-family: Sora, Inter, sans-serif; }

@keyframes eqyReveal { from { opacity: 0; transform: translateY(30px) scale(.97); filter: blur(14px); } to { opacity: 1; transform: none; filter: blur(0); } }
@keyframes eqyDrift { from { transform: translate3d(0,0,0) scale(1); } to { transform: translate3d(-55px,38px,0) scale(1.04); } }
@keyframes eqyShimmer { from { transform: translateX(-150%) skewX(-18deg); } to { transform: translateX(180%) skewX(-18deg); } }

.eqy-v4-scene { position: fixed; inset: 0; background: linear-gradient(135deg, rgba(2,4,10,.88), rgba(7,19,38,.9)), url('/assets/eqy-aurora.svg') center/cover no-repeat; animation: eqyDrift 18s ease-in-out infinite alternate; }
.eqy-v4-aurora { position: fixed; inset: -20%; background: radial-gradient(circle at 20% 20%, rgba(47,128,255,.18), transparent 26%), radial-gradient(circle at 80% 15%, rgba(56,189,248,.10), transparent 26%), radial-gradient(circle at 50% 90%, rgba(29,78,216,.22), transparent 32%); filter: blur(18px); }
.eqy-v4-noise { pointer-events: none; position: fixed; inset: 0; opacity: .06; background-image: repeating-radial-gradient(circle at 0 0, white 0 1px, transparent 1px 4px); }

.eqy-v4-nav { position: sticky; top: 18px; z-index: 50; width: min(1280px, calc(100% - 34px)); margin: 18px auto 0; display: flex; align-items: center; justify-content: space-between; border: 1px solid rgba(255,255,255,.14); border-radius: 28px; background: rgba(4,10,24,.58); backdrop-filter: blur(28px); padding: 12px; box-shadow: 0 24px 100px rgba(0,0,0,.42), inset 0 1px 0 rgba(255,255,255,.08); animation: eqyReveal .7s cubic-bezier(.16,1,.3,1) both; }
.eqy-v4-brand { display:flex; align-items:center; gap:12px; padding-left:8px; }
.eqy-v4-brand img { width: 42px; height: 42px; }
.eqy-v4-brand strong { display:block; font-size:15px; font-weight:800; letter-spacing:.16em; }
.eqy-v4-brand span { display:block; margin-top:2px; font-family:"JetBrains Mono", monospace; color:#8dc2ff; font-size:10px; letter-spacing:.24em; }
.eqy-v4-nav nav { display:none; align-items:center; gap:5px; border:1px solid rgba(255,255,255,.08); background:rgba(255,255,255,.04); border-radius:20px; padding:5px; }
.eqy-v4-nav nav button { border-radius:15px; padding:11px 17px; color:#9aa8c4; font-size:12px; font-weight:800; transition:.25s ease; }
.eqy-v4-nav nav button.active, .eqy-v4-nav nav button:hover { color:white; background:rgba(47,128,255,.2); box-shadow:0 0 30px rgba(47,128,255,.22); }
@media (min-width: 950px){ .eqy-v4-nav nav{display:flex;} }

.eqy-v4-cta, .eqy-v4-primary, .eqy-v4-secondary { position:relative; overflow:hidden; min-height:50px; border-radius:17px; padding:0 24px; font-size:12px; font-weight:900; letter-spacing:.14em; text-transform:uppercase; transition: transform .25s cubic-bezier(.16,1,.3,1), filter .25s ease, box-shadow .25s ease; }
.eqy-v4-cta, .eqy-v4-primary { color:white; border:1px solid rgba(147,197,253,.34); background:linear-gradient(90deg,#1d4ed8,#2f80ff,#38bdf8); box-shadow:0 0 38px rgba(47,128,255,.34); }
.eqy-v4-secondary { color:#dcecff; border:1px solid rgba(255,255,255,.13); background:rgba(255,255,255,.055); backdrop-filter:blur(18px); }
.eqy-v4-cta:hover, .eqy-v4-primary:hover, .eqy-v4-secondary:hover { transform:translateY(-3px) scale(1.025); filter:brightness(1.1); }
.eqy-v4-cta::after, .eqy-v4-primary::after { content:""; position:absolute; inset:-30% auto -30% -45%; width:42%; background:linear-gradient(90deg,transparent,rgba(255,255,255,.42),transparent); animation:eqyShimmer 3.2s ease-in-out infinite; }

.eqy-alert { position: sticky; top: 104px; z-index: 40; display:flex; justify-content:space-between; gap:14px; align-items:center; border:1px solid rgba(47,128,255,.3); background:rgba(7,19,38,.82); backdrop-filter:blur(22px); padding:14px 18px; border-radius:18px; margin-bottom:22px; color:#dbeafe; }
.eqy-alert button { font-size: 24px; color:#9bd0ff; }

.eqy-v4-page { animation:eqyReveal .75s cubic-bezier(.16,1,.3,1) both; }
.eqy-v4-hero { min-height:calc(100vh - 128px); display:grid; grid-template-columns:1fr; gap:70px; align-items:center; padding:70px 0; }
@media (min-width: 1060px){ .eqy-v4-hero{grid-template-columns:.95fr 1.05fr;} }

.eqy-v4-pill { display:inline-flex; align-items:center; border:1px solid rgba(47,128,255,.28); background:rgba(47,128,255,.10); color:#b6dcff; border-radius:999px; padding:10px 15px; font-family:"JetBrains Mono", monospace; font-size:10px; font-weight:800; letter-spacing:.22em; backdrop-filter:blur(18px); }
.eqy-v4-hero-copy h1 { margin-top:24px; font-size:clamp(58px,8vw,112px); line-height:.84; letter-spacing:-.08em; font-weight:800; max-width:820px; }
.eqy-v4-hero-copy h1 span { display:block; background:linear-gradient(90deg,#fff,#bfe3ff,#2f80ff); -webkit-background-clip:text; color:transparent; }
.eqy-v4-hero-copy p, .eqy-v4-section-head p, .eqy-v4-premium-copy p, .eqy-v4-download p { margin-top:26px; max-width:680px; color:#9aa8c4; font-size:16px; line-height:1.9; }
.eqy-v4-actions { margin-top:34px; display:flex; flex-wrap:wrap; gap:14px; }
.eqy-v4-trust { margin-top:42px; display:grid; grid-template-columns:repeat(2,1fr); gap:12px; max-width:760px; }
@media (min-width: 760px){ .eqy-v4-trust{grid-template-columns:repeat(4,1fr);} }
.eqy-v4-trust div { border:1px solid rgba(255,255,255,.1); background:rgba(255,255,255,.045); border-radius:18px; padding:16px; color:#dbeafe; font-size:13px; backdrop-filter:blur(18px); }
.eqy-v4-trust span { display:inline-block; width:8px; height:8px; border-radius:999px; background:#5dadef; box-shadow:0 0 14px #5dadef; margin-right:8px; }

.eqy-v4-showcase { position:relative; min-height:650px; perspective:1300px; }
.eqy-v4-chip { position:absolute; width:34%; right:4%; top:-2%; opacity:.92; filter:drop-shadow(0 40px 80px rgba(47,128,255,.22)); }
.eqy-product-screen { position:absolute; width:92%; left:0; top:120px; border-radius:32px; border:1px solid rgba(255,255,255,.12); background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.025)); backdrop-filter:blur(24px); transform:rotateY(-12deg) rotateX(6deg); box-shadow:0 48px 140px rgba(0,0,0,.55),0 0 100px rgba(47,128,255,.16); transition:.45s cubic-bezier(.16,1,.3,1); overflow:hidden; }
.eqy-product-screen:hover { transform:rotateY(-7deg) rotateX(3deg) translateY(-10px); }
.eqy-product-bar { display:flex; gap:8px; padding:18px; border-bottom:1px solid rgba(255,255,255,.1); }
.eqy-product-bar span { width:10px; height:10px; border-radius:50%; background:rgba(255,255,255,.28); }
.eqy-product-content { padding: 26px; }
.eqy-system-line { display:flex; justify-content:space-between; align-items:center; border:1px solid rgba(255,255,255,.1); background:rgba(255,255,255,.04); border-radius:18px; padding:18px; margin-bottom:14px; }
.eqy-system-line em { color:#8dc2ff; font-style:normal; font-weight:800; }
.eqy-terminal { margin-top:18px; border-radius:18px; background:rgba(0,0,0,.32); border:1px solid rgba(255,255,255,.08); padding:18px; font-family:"JetBrains Mono", monospace; color:#bfdbfe; font-size:12px; line-height:1.9; }
.eqy-v4-glass-card { position:absolute; z-index:3; border:1px solid rgba(255,255,255,.14); background:rgba(4,10,24,.62); backdrop-filter:blur(24px); border-radius:22px; padding:18px 20px; box-shadow:0 25px 80px rgba(0,0,0,.38); max-width:260px; }
.eqy-v4-glass-card span { display:block; color:#8dc2ff; font-family:"JetBrains Mono", monospace; font-size:10px; letter-spacing:.22em; }
.eqy-v4-glass-card strong { display:block; margin-top:8px; font-size:20px; letter-spacing:-.04em; overflow:hidden; text-overflow:ellipsis; }
.eqy-v4-glass-card.top { left:6%; top:62px; }
.eqy-v4-glass-card.bottom { right:4%; bottom:72px; }

.eqy-v4-section-head { text-align:center; padding:64px 0 30px; }
.eqy-v4-section-head.left { text-align:left; }
.eqy-v4-section-head h2, .eqy-v4-premium-copy h2, .eqy-v4-download h2, .eqy-v4-auth h2, .eqy-v4-modal h2 { margin-top:16px; font-size:clamp(48px,6vw,82px); line-height:.88; letter-spacing:-.075em; font-weight:800; }
.eqy-v4-plan-grid { display:grid; gap:18px; grid-template-columns:repeat(auto-fit,minmax(215px,1fr)); }
.eqy-v4-plan, .eqy-v4-premium-plan, .eqy-v4-auth, .eqy-v4-download-card, .eqy-v4-dashboard div, .eqy-v4-dashboard-actions, .eqy-v4-log, .eqy-v4-modal > div, .eqy-license-list { border:1px solid rgba(255,255,255,.11); background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.026)); backdrop-filter:blur(24px); box-shadow:0 32px 120px rgba(0,0,0,.42), inset 0 1px 0 rgba(255,255,255,.06); }
.eqy-v4-plan, .eqy-v4-premium-plan { position:relative; overflow:hidden; border-radius:28px; padding:24px; transition:.35s cubic-bezier(.16,1,.3,1); }
.eqy-v4-plan:hover, .eqy-v4-premium-plan:hover { transform:translateY(-10px); border-color:rgba(47,128,255,.35); box-shadow:0 40px 130px rgba(0,0,0,.5),0 0 90px rgba(47,128,255,.16); }
.eqy-v4-plan.highlight { border-color:rgba(47,128,255,.38); }
.eqy-v4-plan-top { display:flex; align-items:center; justify-content:space-between; color:#93c5fd; font-family:"JetBrains Mono", monospace; font-size:12px; letter-spacing:.22em; }
.eqy-v4-plan-top em, .eqy-v4-premium-plan em { border-radius:999px; background:rgba(47,128,255,.16); padding:5px 9px; color:#b6dcff; font-size:9px; font-style:normal; font-weight:900; letter-spacing:.16em; }
.eqy-v4-plan > strong, .eqy-v4-premium-plan > strong { display:block; margin-top:20px; font-size:54px; line-height:1; letter-spacing:-.08em; }
.eqy-v4-plan p, .eqy-v4-premium-plan p { margin-top:14px; min-height:42px; color:#9aa8c4; font-size:14px; line-height:1.7; }
.eqy-v4-plan ul { list-style:none; margin:22px 0 0; padding:0; display:grid; gap:12px; }
.eqy-v4-plan li { color:#dcecff; font-size:13px; }
.eqy-v4-plan li::before { content:""; display:inline-block; width:7px; height:7px; border-radius:999px; background:#5dadef; box-shadow:0 0 12px #5dadef; margin-right:10px; }

.eqy-v4-premium-block { position:relative; overflow:hidden; margin-top:70px; border:1px solid rgba(47,128,255,.22); background:linear-gradient(135deg,rgba(5,13,29,.9),rgba(2,6,16,.96)); border-radius:42px; padding:38px; box-shadow:0 0 150px rgba(47,128,255,.16); }
.eqy-v4-premium-copy { position:relative; z-index:1; max-width:850px; }
.eqy-v4-premium-plans { position:relative; z-index:2; margin-top:34px; display:grid; gap:18px; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); }
.eqy-v4-premium-plan div:first-child { display:flex; justify-content:space-between; align-items:center; color:#93c5fd; font-family:"JetBrains Mono", monospace; font-size:11px; letter-spacing:.18em; }

.eqy-v4-download { padding-top:90px; display:grid; grid-template-columns:1fr; gap:40px; }
@media(min-width:980px){ .eqy-v4-download{grid-template-columns:.95fr 1.05fr;} }
.eqy-v4-download-card { border-radius:30px; padding:28px; }
.eqy-v4-download-card div { display:flex; justify-content:space-between; padding:18px 0; border-bottom:1px solid rgba(255,255,255,.1); }
.eqy-v4-download-card span { color:#94a3b8; }
.eqy-v4-download-card strong { font-weight:800; }

.eqy-v4-auth-wrap { display:flex; justify-content:center; padding-top:80px; }
.eqy-v4-auth { width:min(540px,100%); border-radius:34px; padding:34px; display:grid; gap:14px; }
.eqy-v4-auth input { width:100%; min-height:58px; border-radius:18px; border:1px solid rgba(255,255,255,.13); background:rgba(255,255,255,.06); padding:0 18px; outline:none; color:white; }
.eqy-v4-auth input:focus { border-color:rgba(47,128,255,.55); box-shadow:0 0 0 4px rgba(47,128,255,.12); }

.eqy-v4-dashboard { display:grid; gap:18px; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); }
.eqy-v4-dashboard div { border-radius:26px; padding:24px; }
.eqy-v4-dashboard span { color:#94a3b8; font-size:13px; }
.eqy-v4-dashboard strong { display:block; margin-top:12px; font-size:30px; letter-spacing:-.055em; }
.eqy-license-list { border-radius:28px; padding:22px; margin-top:22px; color:#cbd5e1; }
.eqy-license-list div { border-bottom:1px solid rgba(255,255,255,.1); padding:14px 0; }
.eqy-license-list div:last-child { border-bottom:0; }
.eqy-license-list strong { display:block; }
.eqy-license-list span { display:block; margin-top:6px; color:#94a3b8; font-size:13px; }
.eqy-v4-dashboard-actions { margin-top:22px; display:flex; flex-wrap:wrap; gap:14px; border-radius:28px; padding:22px; }
.eqy-v4-log { border-radius:24px; padding:22px; margin-top:16px; color:#cbd5e1; }

.eqy-v4-modal { position:fixed; inset:0; z-index:100; display:flex; align-items:center; justify-content:center; padding:24px; background:rgba(0,0,0,.72); backdrop-filter:blur(18px); }
.eqy-v4-modal > div { width:min(540px,100%); border-radius:34px; padding:34px; animation:eqyReveal .42s cubic-bezier(.16,1,.3,1) both; }
.eqy-v4-modal p { margin-top:18px; color:#a8b5ce; line-height:1.8; }
.eqy-v4-modal section { margin-top:28px; display:flex; gap:12px; }


.eqy-v4-dashboard-actions input,
.eqy-v4-dashboard-actions textarea,
.eqy-v4-dashboard-actions select,
.eqy-v4-modal textarea {
  min-height: 54px;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,.13);
  background: rgba(255,255,255,.06);
  padding: 0 16px;
  color: #fff;
  outline: none;
}
.eqy-v4-dashboard-actions input,
.eqy-v4-dashboard-actions select { min-width: min(290px, 100%); }
.eqy-v4-dashboard-actions textarea,
.eqy-v4-modal textarea { width: 100%; min-height: 120px; padding: 16px; resize: vertical; }
.eqy-v4-dashboard-actions input:focus,
.eqy-v4-dashboard-actions textarea:focus,
.eqy-v4-dashboard-actions select:focus,
.eqy-v4-modal textarea:focus { border-color: rgba(47,128,255,.55); box-shadow: 0 0 0 4px rgba(47,128,255,.12); }
.eqy-admin-page .eqy-license-list section { margin-top: 12px; display: flex; gap: 10px; flex-wrap: wrap; }
.eqy-admin-check { min-height: 54px; display: inline-flex; align-items: center; gap: 10px; border-radius: 16px; border: 1px solid rgba(255,255,255,.13); background: rgba(255,255,255,.06); padding: 0 16px; color: #dcecff; font-weight: 800; }
.eqy-admin-check input { width: 16px; height: 16px; accent-color: #2f80ff; }
.eqy-v4-primary:disabled, .eqy-v4-secondary:disabled { opacity: .55; cursor: not-allowed; transform: none; filter: none; }
.eqy-v4-nav button, .eqy-v4-brand { text-decoration: none; }
.eqy-v4-brand { border-radius: 20px; color: #fff; }
.eqy-license-list p { color: #94a3b8; }
footer button { color:#8dc2ff; }

/* FORCE HUD RESTORE - critical utilities */
html,body,#root{min-height:100%;margin:0;background:#02040a!important;color:#f8fbff!important;font-family:Inter,sans-serif;}
.min-h-screen{min-height:100vh!important}.overflow-hidden{overflow:hidden!important}.relative{position:relative!important}.z-10{position:relative;z-index:10!important}.mx-auto{margin-left:auto!important;margin-right:auto!important}.max-w-\[1280px\]{max-width:1280px!important}.px-6{padding-left:1.5rem!important;padding-right:1.5rem!important}.pb-24{padding-bottom:6rem!important}.pt-14{padding-top:3.5rem!important}.py-8{padding-top:2rem!important;padding-bottom:2rem!important}.flex{display:flex!important}.justify-between{justify-content:space-between!important}.border-t{border-top:1px solid!important}.border-white\/10{border-color:rgba(255,255,255,.1)!important}.text-xs{font-size:.75rem!important}.text-slate-500{color:#64748b!important}.text-emerald-300{color:#6ee7b7!important}
.eqy-v4-root,.eqy-v4-page,.eqy-v4-nav,.eqy-v4-hero,.eqy-v4-dashboard,.eqy-license-list,.eqy-product-screen{font-family:Inter,sans-serif!important;}
.eqy-v4-brand img,.eqy-v4-chip{object-fit:contain!important;}
.eqy-v4-brand img{width:42px!important;height:42px!important;max-width:42px!important;max-height:42px!important;}
.eqy-v4-chip{width:34%!important;max-width:220px!important;}
button{cursor:pointer!important}button:disabled{opacity:.55!important;cursor:not-allowed!important}
input,select,textarea{font:inherit!important;color:#fff!important;}
`

const standardPlans = [
  { id: 'standard_7d', name: '7D', price: '5€', desc: 'Short standard access.', features: ['Core tweaks', 'Game presets', 'Signed updates'] },
  { id: 'standard_30d', name: '30D', price: '12€', desc: 'Monthly standard license.', features: ['All standard tweaks', 'Download access', 'Support ticket'] },
  { id: 'standard_60d', name: '60D', price: '19€', desc: 'Extended standard access.', features: ['HWID lock', 'Restore prompts', 'Update checks'] },
  { id: 'standard_90d', name: '90D', price: '24€', desc: 'Best standard value.', features: ['Long access', 'Priority queue', 'Device lock'] },
  { id: 'standard_lifetime', name: 'LIFETIME', price: '45€', desc: 'Permanent standard license.', features: ['Lifetime standard', 'Future standard updates', 'Discord support'] },
]

const premiumPlans = [
  { id: 'premium_14d', name: '14D PREMIUM', price: '8€', desc: 'Unlock premium tweaks for 14 days.', badge: 'START' },
  { id: 'premium_30d', name: '30D PREMIUM', price: '14€', desc: 'Monthly premium optimization access.', badge: 'POPULAR' },
  { id: 'premium_lifetime', name: 'LIFETIME PREMIUM', price: '50€', desc: 'Permanent premium tweak access.', badge: 'ELITE' },
]

function formatDate(value?: string | null) {
  if (!value) return 'Lifetime'
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function isLicenseActive(license: License) {
  return license.is_active ?? (license.status === 'active' && (!license.expires_at || new Date(license.expires_at) > new Date()))
}

function App() {
  const [page, setPage] = useState<PageId>('home')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [licenseKey, setLicenseKey] = useState('')
  const [token, setToken] = useState(localStorage.getItem('eqy_token') || '')
  const [user, setUser] = useState<User | null>(null)
  const [licenses, setLicenses] = useState<License[]>([])
  const [hwidRequests, setHwidRequests] = useState<HwidRequest[]>([])
  const [message, setMessage] = useState('')
  const [loginRequiredPopup, setLoginRequiredPopup] = useState(false)
  const [licenseRequiredPopup, setLicenseRequiredPopup] = useState(false)
  const [hwidPopup, setHwidPopup] = useState(false)
  const [hwidReason, setHwidReason] = useState('')
  const [busy, setBusy] = useState(false)

  const [adminSecret, setAdminSecret] = useState('')
  const [adminToken, setAdminToken] = useState(localStorage.getItem('eqy_admin_token') || '')
  const [adminData, setAdminData] = useState<AdminData | null>(null)
  const [adminBusy, setAdminBusy] = useState(false)
  const [adminCreateEmail, setAdminCreateEmail] = useState('')
  const [adminCreateDays, setAdminCreateDays] = useState('')
  const [adminCreatePremium, setAdminCreatePremium] = useState(false)

  const isLoggedIn = Boolean(token && user)
  const activeLicenses = licenses.filter(isLicenseActive)
  const premiumUnlocked = activeLicenses.some((l) => l.premium)

  const authHeaders = useMemo(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }), [token])

  const adminHeaders = useMemo(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`,
  }), [adminToken])

  const api = async (path: string, options: RequestInit = {}) => {
    const res = await fetch(`${API_URL}${path}`, options)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'Request failed')
    return data
  }

  const loadMe = async () => {
    if (!token) return
    try {
      const data = await api('/api/auth/me', { headers: authHeaders })
      setUser(data.user)
      setLicenses(data.licenses || [])
      setHwidRequests(data.hwidRequests || [])
    } catch {
      localStorage.removeItem('eqy_token')
      setToken('')
      setUser(null)
      setLicenses([])
      setHwidRequests([])
    }
  }

  const loadAdmin = async () => {
    if (!adminToken) return
    try {
      const data = await api('/api/admin/overview', { headers: adminHeaders })
      setAdminData(data)
    } catch (e) {
      setMessage((e as Error).message)
    }
  }

  useEffect(() => {
    if (window.location.pathname === '/admin') setPage('admin')
  }, [])

  useEffect(() => {
    if (!token) return
    void loadMe()
    const interval = window.setInterval(() => {
      void loadMe()
    }, 5000)
    return () => window.clearInterval(interval)
  }, [token, authHeaders])

  useEffect(() => {
    if (page !== 'admin' || !adminToken) return
    void loadAdmin()
    const interval = window.setInterval(() => {
      void loadAdmin()
    }, 5000)
    return () => window.clearInterval(interval)
  }, [page, adminToken, adminHeaders])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const paypalToken = params.get('token')
    if (params.get('paypal') === 'success' && paypalToken && token) {
      void capturePayPal(paypalToken)
    }
  }, [token])

  const requireLoginAction = (callback?: () => void) => {
    if (!token) {
      setLoginRequiredPopup(true)
      return
    }
    callback?.()
  }

  const register = async () => {
    try {
      const data = await api('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      localStorage.setItem('eqy_token', data.token)
      setToken(data.token)
      setUser(data.user)
      setPage('dashboard')
      setMessage('Account created successfully.')
      window.setTimeout(() => void loadMe(), 800)
    } catch (e) {
      setMessage((e as Error).message)
    }
  }

  const login = async () => {
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      localStorage.setItem('eqy_token', data.token)
      setToken(data.token)
      setUser(data.user)
      setPage('dashboard')
      setMessage('Logged in successfully.')
      window.setTimeout(() => void loadMe(), 800)
    } catch (e) {
      setMessage((e as Error).message)
    }
  }

  const logout = () => {
    localStorage.removeItem('eqy_token')
    setToken('')
    setUser(null)
    setLicenses([])
    setHwidRequests([])
    setPage('home')
  }

  const startCheckout = async (planId: string) => {
    requireLoginAction(async () => {
      try {
        const data = await api('/api/paypal/create-order', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ planId }),
        })
        window.location.href = data.approvalUrl
      } catch (e) {
        setMessage((e as Error).message)
      }
    })
  }

  const capturePayPal = async (orderId: string) => {
    try {
      const data = await api('/api/paypal/capture-order', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ orderId }),
      })
      setMessage(`Payment complete. License generated: ${data.license.key}`)
      window.history.replaceState({}, document.title, window.location.pathname)
      await loadMe()
      setPage('dashboard')
    } catch (e) {
      setMessage((e as Error).message)
    }
  }

  const protectedDownload = async (kind: 'exe' | 'msi') => {
    requireLoginAction(async () => {
      try {
        const res = await fetch(`${API_URL}/api/download/${kind}?token=${encodeURIComponent(token)}`)
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          if (String(data.error || '').toLowerCase().includes('license')) {
            setLicenseRequiredPopup(true)
            return
          }
          throw new Error(data.error || 'Download failed.')
        }
        window.location.href = `${API_URL}/api/download/${kind}?token=${encodeURIComponent(token)}`
      } catch (e) {
        setMessage((e as Error).message)
      }
    })
  }

  const activateLicense = async () => {
    requireLoginAction(async () => {
      const key = licenseKey.trim().toUpperCase()
      if (!key) {
        setMessage('Enter a license key first.')
        return
      }
      setBusy(true)
      setMessage('Activating license...')
      try {
        const request = api('/api/license/activate', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ key }),
        })
        const data = await Promise.race([
          request,
          new Promise<{ softTimeout: true }>((resolve) => window.setTimeout(() => resolve({ softTimeout: true }), 2500)),
        ])

        setLicenseKey('')
        await loadMe()

        if ('softTimeout' in data) {
          setMessage('License activated. Syncing dashboard...')
          window.setTimeout(() => void loadMe(), 2500)
        } else {
          setMessage(data.message || 'License activated successfully.')
        }
      } catch (e) {
        setMessage((e as Error).message)
      } finally {
        setBusy(false)
      }
    })
  }

  const requestHwidReset = async () => {
    if (!licenses.length) {
      setMessage('You need a license before requesting HWID reset.')
      return
    }
    const license = activeLicenses[0] || licenses[0]
    setBusy(true)
    try {
      const data = await api('/api/license/hwid-reset-request', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ key: license.key, reason: hwidReason }),
      })
      setMessage(data.message || 'HWID reset request submitted.')
      setHwidReason('')
      setHwidPopup(false)
      await loadMe()
    } catch (e) {
      setMessage((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const adminLogin = async () => {
    setAdminBusy(true)
    try {
      const data = await api('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: adminSecret }),
      })
      localStorage.setItem('eqy_admin_token', data.token)
      setAdminToken(data.token)
      setMessage('Admin login successful.')
      window.setTimeout(() => void loadAdmin(), 500)
    } catch (e) {
      setMessage((e as Error).message)
    } finally {
      setAdminBusy(false)
    }
  }

  const adminLogout = () => {
    localStorage.removeItem('eqy_admin_token')
    setAdminToken('')
    setAdminData(null)
  }

  const adminAction = async (path: string, body: Record<string, unknown> = {}) => {
    setAdminBusy(true)
    try {
      const data = await api(path, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify(body),
      })
      setMessage(data.message || 'Admin action completed.')
      await Promise.all([loadAdmin(), loadMe()])
    } catch (e) {
      setMessage((e as Error).message)
    } finally {
      setAdminBusy(false)
    }
  }

  const createAdminLicense = async () => {
    setAdminBusy(true)
    setMessage('Creating license...')
    try {
      const request = api('/api/admin/licenses/create', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          email: adminCreateEmail.trim() || null,
          days: adminCreateDays.trim() ? Number(adminCreateDays) : null,
          premium: adminCreatePremium,
        }),
      })

      const data = await Promise.race([
        request,
        new Promise<{ softTimeout: true }>((resolve) => window.setTimeout(() => resolve({ softTimeout: true }), 2500)),
      ])

      if ('softTimeout' in data) {
        setMessage('License created. Email may still be sending in background.')
      } else {
        setMessage(data.message || 'License created.')
      }

      setAdminCreateEmail('')
      setAdminCreateDays('')
      await Promise.all([loadAdmin(), loadMe()])
      window.setTimeout(() => void loadAdmin(), 3000)
    } catch (e) {
      setMessage((e as Error).message)
    } finally {
      setAdminBusy(false)
    }
  }

  const openDiscord = () => window.open('https://discord.gg/h488P4Qezd', '_blank', 'noopener,noreferrer')

  const nav = [
    ['home', 'Home'],
    ['pricing', 'Pricing'],
    ['download', 'Download'],
    ['login', isLoggedIn ? 'Account' : 'Login'],
    ['changelog', 'Updates'],
  ] as const

  return (
    <>
      <style>{EQY_FORCE_STYLE}</style>
      <div className="min-h-screen overflow-hidden bg-[#02040a] text-white">
      <div className="eqy-v4-scene" />
      <div className="eqy-v4-aurora" />
      <div className="eqy-v4-noise" />

      <header className="eqy-v4-nav">
        <button onClick={() => setPage('home')} className="eqy-v4-brand">
          <img src="/eqy-logo.svg" alt="EQY" />
          <div><strong>EQY</strong><span>OPTIMIZATION OS</span></div>
        </button>

        <nav>
          {nav.map(([id, label]) => (
            <button key={id} onClick={() => setPage(id)} className={page === id ? 'active' : ''}>{label}</button>
          ))}
        </nav>

        <button onClick={() => setPage(isLoggedIn ? 'dashboard' : 'login')} className="eqy-v4-cta">
          {isLoggedIn ? 'Dashboard' : 'Login'}
        </button>
      </header>

      <main className="relative z-10 mx-auto max-w-[1280px] px-6 pb-24 pt-14">
        {message && (
          <div className="eqy-alert">
            <span>{message}</span>
            <button onClick={() => setMessage('')}>×</button>
          </div>
        )}

        {page === 'home' && (
          <section className="eqy-v4-page eqy-v4-hero">
            <div className="eqy-v4-hero-copy">
              <div className="eqy-v4-pill">LIVE CHECKOUT • REAL LOGIN • PROTECTED DOWNLOADS</div>
              <h1>Your PC,<span> tuned like elite hardware.</span></h1>
              <p>EQY Tweak supports real accounts, PayPal checkout, automatic license generation, premium access, signed updates and protected downloads.</p>
              <div className="eqy-v4-actions">
                <button onClick={() => setPage('pricing')} className="eqy-v4-primary">Explore plans</button>
                <button onClick={() => void protectedDownload('exe')} className="eqy-v4-secondary">Download app</button>
              </div>
              <div className="eqy-v4-trust">
                {['PayPal checkout', 'License generation', 'Protected downloads', 'Premium presets'].map((item) => (
                  <div key={item}><span />{item}</div>
                ))}
              </div>
            </div>

            <div className="eqy-v4-showcase">
              <img className="eqy-v4-chip" src="/eqy-logo.svg" alt="" />
              <div className="eqy-product-screen">
                <div className="eqy-product-bar"><span /><span /><span /></div>
                <div className="eqy-product-content">
                  <div className="eqy-system-line"><strong>License</strong><em>{activeLicenses.length ? 'Verified' : 'Login required'}</em></div>
                  <div className="eqy-system-line"><strong>Premium</strong><em>{premiumUnlocked ? 'Unlocked' : 'Locked'}</em></div>
                  <div className="eqy-system-line"><strong>Updater</strong><em>Signed</em></div>
                  <div className="eqy-terminal">
                    <p>› account api ready</p>
                    <p>› paypal order flow live</p>
                    <p>› license auto generation</p>
                    <p className="text-emerald-300">› live dashboard sync enabled</p>
                  </div>
                </div>
              </div>
              <div className="eqy-v4-glass-card top"><span>ACCESS</span><strong>{isLoggedIn ? user?.email : 'Guest'}</strong></div>
              <div className="eqy-v4-glass-card bottom"><span>STATUS</span><strong>{activeLicenses.length ? 'Ready' : 'Login needed'}</strong></div>
            </div>
          </section>
        )}

        {page === 'pricing' && (
          <section className="eqy-v4-page">
            <div className="eqy-v4-section-head">
              <div className="eqy-v4-pill">LICENSE STORE</div>
              <h2>Standard licenses</h2>
              <p>Choose the license duration. Login is required before PayPal checkout.</p>
            </div>
            <div className="eqy-v4-plan-grid">
              {standardPlans.map((plan, index) => (
                <article key={plan.id} className={`eqy-v4-plan ${index === 3 ? 'highlight' : ''}`}>
                  <div className="eqy-v4-plan-top"><span>{plan.name}</span>{index === 3 && <em>VALUE</em>}</div>
                  <strong>{plan.price}</strong>
                  <p>{plan.desc}</p>
                  <ul>{plan.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
                  <button onClick={() => void startCheckout(plan.id)} className="eqy-v4-primary">Buy standard</button>
                </article>
              ))}
            </div>
            <div className="eqy-v4-premium-block">
              <div className="eqy-v4-premium-copy">
                <div className="eqy-v4-pill">PREMIUM SUBSCRIPTION</div>
                <h2>Unlock the premium tweak layer.</h2>
                <p>Premium plans unlock restricted optimizations inside the app: advanced FPS presets, aggressive latency changes, premium categories and future exclusive modules.</p>
              </div>
              <div className="eqy-v4-premium-plans">
                {premiumPlans.map((plan) => (
                  <article key={plan.id} className="eqy-v4-premium-plan">
                    <div><span>{plan.name}</span><em>{plan.badge}</em></div>
                    <strong>{plan.price}</strong>
                    <p>{plan.desc}</p>
                    <button onClick={() => void startCheckout(plan.id)} className="eqy-v4-primary">Buy premium</button>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {page === 'download' && (
          <section className="eqy-v4-page eqy-v4-download">
            <div>
              <div className="eqy-v4-pill">DOWNLOAD CENTER</div>
              <h2>Install the desktop app.</h2>
              <p>Downloads are protected. You must login and have an active license before downloading the installer.</p>
              <div className="eqy-v4-actions">
                <button onClick={() => void protectedDownload('exe')} className="eqy-v4-primary">Download EXE</button>
                <button onClick={() => void protectedDownload('msi')} className="eqy-v4-secondary">Download MSI</button>
              </div>
            </div>
            <div className="eqy-v4-download-card">
              {[['Version', '0.1.1'], ['Platform', 'Windows x64'], ['Installer', 'EXE + MSI'], ['Sync', 'Every 5 seconds']].map(([a, b]) => (
                <div key={a}><span>{a}</span><strong>{b}</strong></div>
              ))}
            </div>
          </section>
        )}

        {page === 'login' && (
          <section className="eqy-v4-page eqy-v4-auth-wrap">
            <div className="eqy-v4-auth">
              <div className="eqy-v4-pill">ACCESS PORTAL</div>
              <h2>{isLoggedIn ? 'Account' : 'Login or register'}</h2>
              {isLoggedIn ? (
                <>
                  <p>Logged in as {user?.email}</p>
                  <button onClick={() => setPage('dashboard')} className="eqy-v4-primary">Open Dashboard</button>
                  <button onClick={logout} className="eqy-v4-secondary">Logout</button>
                </>
              ) : (
                <>
                  <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                  <button onClick={() => void login()} className="eqy-v4-primary">Login</button>
                  <button onClick={() => void register()} className="eqy-v4-secondary">Register</button>
                </>
              )}
            </div>
          </section>
        )}

        {page === 'dashboard' && (
          <section className="eqy-v4-page">
            <div className="eqy-v4-section-head left">
              <div className="eqy-v4-pill">ACCOUNT • LIVE SYNC</div>
              <h2>License dashboard</h2>
              <p>Updates automatically every few seconds. Revoked, activated and approved licenses appear without refreshing.</p>
            </div>

            <div className="eqy-v4-dashboard">
              {[['Status', isLoggedIn ? 'Logged in' : 'Guest'], ['Email', user?.email || 'None'], ['Licenses', String(licenses.length)], ['Premium', premiumUnlocked ? 'Unlocked' : 'Locked']].map(([a, b]) => (
                <div key={a}><span>{a}</span><strong>{b}</strong></div>
              ))}
            </div>

            <div className="eqy-license-list">
              {licenses.length ? licenses.map((license) => (
                <div key={license.key}>
                  <strong>{license.key}</strong>
                  <span>{license.plan_id} • {license.status.toUpperCase()} • {formatDate(license.expires_at)} • {license.hwid ? 'HWID bound' : 'No HWID yet'}</span>
                </div>
              )) : <p>No licenses yet. Buy a plan or activate a key.</p>}
            </div>

            <div className="eqy-v4-dashboard-actions">
              <input value={licenseKey} onChange={(e) => setLicenseKey(e.target.value)} placeholder="EQY-XXXX-XXXX-XXXX" />
              <button disabled={busy} onClick={() => void activateLicense()} className="eqy-v4-primary">{busy ? 'Syncing...' : 'Activate License'}</button>
              <button onClick={() => void protectedDownload('exe')} className="eqy-v4-secondary">Download app</button>
              <button onClick={() => setHwidPopup(true)} className="eqy-v4-secondary">Request HWID Reset</button>
            </div>

            <div className="eqy-license-list">
              <strong>HWID Requests</strong>
              {hwidRequests.length ? hwidRequests.map((request) => (
                <div key={request.id}>
                  <strong>{request.license_key || 'Unknown license'}</strong>
                  <span>{request.status.toUpperCase()} • {request.reason || 'No reason'} • {formatDate(request.created_at)}</span>
                </div>
              )) : <p>No HWID reset requests.</p>}
            </div>
          </section>
        )}

        {page === 'admin' && (
          <section className="eqy-v4-page eqy-admin-page">
            <div className="eqy-v4-section-head left">
              <div className="eqy-v4-pill">ADMIN PANEL • LIVE SYNC</div>
              <h2>EQY control center</h2>
              <p>Create licenses, revoke access and approve HWID reset requests. Data refreshes automatically.</p>
            </div>

            {!adminToken ? (
              <div className="eqy-v4-auth">
                <input type="password" value={adminSecret} onChange={(e) => setAdminSecret(e.target.value)} placeholder="Admin secret" />
                <button disabled={adminBusy} onClick={() => void adminLogin()} className="eqy-v4-primary">Admin Login</button>
              </div>
            ) : (
              <>
                <div className="eqy-v4-dashboard eqy-admin-stats">
                  <div><span>Users</span><strong>{adminData?.users.length || 0}</strong></div>
                  <div><span>Licenses</span><strong>{adminData?.licenses.length || 0}</strong></div>
                  <div><span>HWID Requests</span><strong>{adminData?.hwidRequests.length || 0}</strong></div>
                  <div><span>Session</span><strong>Active</strong></div>
                </div>

                <div className="eqy-v4-dashboard-actions">
                  <input value={adminCreateEmail} onChange={(e) => setAdminCreateEmail(e.target.value)} placeholder="Customer email" />
                  <input value={adminCreateDays} onChange={(e) => setAdminCreateDays(e.target.value)} placeholder="Days empty = lifetime" />
                  <label className="eqy-admin-check"><input type="checkbox" checked={adminCreatePremium} onChange={(e) => setAdminCreatePremium(e.target.checked)} /> Premium</label>
                  <button disabled={adminBusy} onClick={() => void createAdminLicense()} className="eqy-v4-primary">{adminBusy ? 'Working...' : 'Create License'}</button>
                  <button onClick={adminLogout} className="eqy-v4-secondary">Logout Admin</button>
                </div>

                <div className="eqy-license-list">
                  <strong>HWID Reset Requests</strong>
                  {adminData?.hwidRequests?.length ? adminData.hwidRequests.map((request) => (
                    <div key={request.id}>
                      <strong>{request.email || 'Unknown'} • {request.status.toUpperCase()}</strong>
                      <span>{request.license_key || 'No key'} • {request.reason || 'No reason'} • {formatDate(request.created_at)}</span>
                      {request.status === 'pending' && (
                        <section>
                          <button disabled={adminBusy} onClick={() => void adminAction(`/api/admin/hwid-requests/${request.id}/approve`)} className="eqy-v4-primary">Approve</button>
                          <button disabled={adminBusy} onClick={() => void adminAction(`/api/admin/hwid-requests/${request.id}/decline`)} className="eqy-v4-secondary">Decline</button>
                        </section>
                      )}
                    </div>
                  )) : <p>No HWID requests.</p>}
                </div>

                <div className="eqy-license-list">
                  <strong>Licenses</strong>
                  {adminData?.licenses?.length ? adminData.licenses.map((license) => (
                    <div key={license.id}>
                      <strong>{license.key}</strong>
                      <span>{license.email || 'Unlinked'} • {license.plan_id} • {license.status.toUpperCase()} • {license.premium ? 'Premium' : 'Standard'} • {formatDate(license.expires_at)}</span>
                      <section>
                        <button disabled={adminBusy} onClick={() => void adminAction(`/api/admin/licenses/${license.id}/reset-hwid`)} className="eqy-v4-secondary">Reset HWID</button>
                        <button disabled={adminBusy} onClick={() => void adminAction(`/api/admin/licenses/${license.id}/revoke`)} className="eqy-v4-secondary">Revoke</button>
                      </section>
                    </div>
                  )) : <p>No licenses.</p>}
                </div>

                <div className="eqy-license-list">
                  <strong>Users</strong>
                  {adminData?.users?.length ? adminData.users.map((item) => (
                    <div key={item.id}>
                      <strong>{item.email}</strong>
                      <span>{item.license_count || 0} licenses • Joined {formatDate(item.created_at)}</span>
                    </div>
                  )) : <p>No users.</p>}
                </div>
              </>
            )}
          </section>
        )}

        {page === 'changelog' && (
          <section className="eqy-v4-page">
            <div className="eqy-v4-section-head left"><div className="eqy-v4-pill">UPDATES</div><h2>Changelog</h2></div>
            {['0.2.1 — live dashboard sync, non-blocking license activation UI, admin auto-refresh', '0.2.0 — real login, PayPal checkout, license generation, protected downloads', '0.1.1 — updater signing, admin startup, restore fixes'].map((item) => (
              <div key={item} className="eqy-v4-log">{item}</div>
            ))}
          </section>
        )}
      </main>

      {loginRequiredPopup && (
        <div className="eqy-v4-modal">
          <div><div className="eqy-v4-pill">LOGIN REQUIRED</div><h2>You must login first</h2><p>Before downloading, buying or opening protected actions, login or create an account.</p><section><button onClick={() => { setLoginRequiredPopup(false); setPage('login') }} className="eqy-v4-primary">Login</button><button onClick={() => setLoginRequiredPopup(false)} className="eqy-v4-secondary">Close</button></section></div>
        </div>
      )}

      {licenseRequiredPopup && (
        <div className="eqy-v4-modal">
          <div><div className="eqy-v4-pill">LICENSE REQUIRED</div><h2>Active license needed</h2><p>You need an active EQY license to access protected downloads.</p><section><button onClick={() => { setLicenseRequiredPopup(false); setPage('pricing') }} className="eqy-v4-primary">View Plans</button><button onClick={() => setLicenseRequiredPopup(false)} className="eqy-v4-secondary">Close</button></section></div>
        </div>
      )}

      {hwidPopup && (
        <div className="eqy-v4-modal">
          <div>
            <div className="eqy-v4-pill">HWID RESET</div>
            <h2>Request HWID reset</h2>
            <p>Write a short reason. Your request will appear in the admin panel and update automatically after review.</p>
            <textarea value={hwidReason} onChange={(e) => setHwidReason(e.target.value)} placeholder="Example: I changed PC / formatted Windows" />
            <section><button disabled={busy} onClick={() => void requestHwidReset()} className="eqy-v4-primary">Submit Request</button><button onClick={() => setHwidPopup(false)} className="eqy-v4-secondary">Close</button></section>
          </div>
        </div>
      )}

      <footer className="relative z-10 mx-auto flex max-w-[1280px] justify-between border-t border-white/10 px-6 py-8 text-xs text-slate-500">
        <span>© 2026 EQY Tweak</span>
        <button onClick={() => setPage('changelog')}>Updates</button>
      </footer>
      </div>
    </>
  )
}

export default App
