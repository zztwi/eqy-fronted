import { useEffect, useMemo, useState } from 'react'

type PageId = 'home' | 'pricing' | 'download' | 'login' | 'dashboard' | 'changelog'
type User = { id: number; email: string; created_at?: string }
type License = {
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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

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

function maskKey(key: string) {
  if (!key) return 'None'
  return `${key.slice(0, 12)}••••${key.slice(-7)}`
}

function App() {
  const [page, setPage] = useState<PageId>('home')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [licenseKey, setLicenseKey] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [token, setToken] = useState(localStorage.getItem('eqy_token') || '')
  const [user, setUser] = useState<User | null>(null)
  const [licenses, setLicenses] = useState<License[]>([])
  const [message, setMessage] = useState('')
  const [loginRequiredPopup, setLoginRequiredPopup] = useState(false)
  const [licenseRequiredPopup, setLicenseRequiredPopup] = useState(false)
  const [hwidPopup, setHwidPopup] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const isLoggedIn = Boolean(token && user)
  const activeLicenses = licenses.filter((license) => license.is_active ?? (license.status === 'active' && (!license.expires_at || new Date(license.expires_at) > new Date())))
  const primaryLicense = activeLicenses[0] || licenses[0]
  const premiumUnlocked = activeLicenses.some((license) => license.premium)
  const memberTier = premiumUnlocked ? 'Premium Member' : activeLicenses.length ? 'Standard Member' : 'Free Account'
  const passwordStrength = newPassword.length >= 12 ? 'Strong' : newPassword.length >= 8 ? 'Good' : newPassword.length >= 1 ? 'Weak' : 'None'

  const authHeaders = useMemo(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }), [token])

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
    } catch {
      localStorage.removeItem('eqy_token')
      setToken('')
      setUser(null)
      setLicenses([])
    }
  }

  useEffect(() => { void loadMe() }, [token])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const paypalToken = params.get('token')
    if (params.get('paypal') === 'success' && paypalToken && token) void capturePayPal(paypalToken)
  }, [token])

  const requireLoginAction = (callback?: () => void) => {
    if (!token) { setLoginRequiredPopup(true); return }
    callback?.()
  }

  const register = async () => {
    try {
      const data = await api('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
      localStorage.setItem('eqy_token', data.token)
      setToken(data.token); setUser(data.user); setPage('dashboard'); setMessage('Account created successfully.')
    } catch (e) { setMessage((e as Error).message) }
  }

  const login = async () => {
    try {
      const data = await api('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
      localStorage.setItem('eqy_token', data.token)
      setToken(data.token); setUser(data.user); setPage('dashboard'); setMessage('Logged in successfully.')
    } catch (e) { setMessage((e as Error).message) }
  }

  const logout = () => {
    localStorage.removeItem('eqy_token')
    setToken(''); setUser(null); setLicenses([]); setPage('home')
  }

  const startCheckout = async (planId: string) => {
    requireLoginAction(async () => {
      try {
        const data = await api('/api/paypal/create-order', { method: 'POST', headers: authHeaders, body: JSON.stringify({ planId }) })
        window.location.href = data.approvalUrl
      } catch (e) { setMessage((e as Error).message) }
    })
  }

  const capturePayPal = async (orderId: string) => {
    try {
      const data = await api('/api/paypal/capture-order', { method: 'POST', headers: authHeaders, body: JSON.stringify({ orderId }) })
      setMessage(`Payment complete. License generated: ${data.license.key}`)
      window.history.replaceState({}, document.title, window.location.pathname)
      await loadMe(); setPage('dashboard')
    } catch (e) { setMessage((e as Error).message) }
  }

  const activateLicense = async () => {
    requireLoginAction(async () => {
      if (!licenseKey.trim()) { setMessage('Enter a license key first.'); return }
      setBusy(true)
      try {
        const data = await api('/api/license/activate', { method: 'POST', headers: authHeaders, body: JSON.stringify({ key: licenseKey }) })
        setMessage(data.message || 'License activated successfully.')
        setLicenseKey('')
        await loadMe()
      } catch (e) { setMessage((e as Error).message) } finally { setBusy(false) }
    })
  }

  const changePassword = async () => {
    if (!currentPassword || !newPassword) { setMessage('Fill current and new password.'); return }
    if (newPassword.length < 6) { setMessage('New password must be at least 6 characters.'); return }
    if (newPassword !== confirmPassword) { setMessage('Password confirmation does not match.'); return }
    setBusy(true)
    try {
      await api('/api/auth/change-password', { method: 'POST', headers: authHeaders, body: JSON.stringify({ currentPassword, newPassword }) })
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setPasswordOpen(false)
      setMessage('Password updated successfully.')
    } catch (e) { setMessage((e as Error).message) } finally { setBusy(false) }
  }

  const protectedDownload = async (kind: 'exe' | 'msi') => {
    requireLoginAction(async () => {
      try {
        const res = await fetch(`${API_URL}/api/download/${kind}?token=${encodeURIComponent(token)}`)
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          if (res.status === 403 || String(data.error || '').toLowerCase().includes('license')) { setLicenseRequiredPopup(true); return }
          setMessage(data.error || 'Download failed.'); return
        }
        const blob = await res.blob()
        const href = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = href
        a.download = kind === 'msi' ? 'eqy-tweak-installer.msi' : 'eqy-tweak-setup.exe'
        document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(href)
      } catch (e) { setMessage((e as Error).message) }
    })
  }

  const requestHwidReset = async () => {
    if (!primaryLicense?.key) { setMessage('No license selected.'); return }
    try {
      await api('/api/license/hwid-reset-request', { method: 'POST', headers: authHeaders, body: JSON.stringify({ key: primaryLicense.key, reason: 'Requested from account dashboard.' }) })
      setMessage('HWID reset request sent. Open Discord if you need faster support.')
      setHwidPopup(false)
    } catch (e) { setMessage((e as Error).message) }
  }

  const openDiscord = () => window.open('https://discord.gg/h488P4Qezd', '_blank', 'noopener,noreferrer')

  const nav = [
    ['home', 'Home'], ['pricing', 'Pricing'], ['download', 'Download'], ['login', isLoggedIn ? 'Account' : 'Login'], ['changelog', 'Updates'],
  ] as const

  return (
    <div className="min-h-screen overflow-hidden bg-[#02040a] text-white">
      <div className="eqy-v4-scene" /><div className="eqy-v4-aurora" /><div className="eqy-v4-noise" />

      <header className="eqy-v4-nav">
        <button onClick={() => setPage('home')} className="eqy-v4-brand"><img src="/eqy-logo.svg" alt="EQY" /><div><strong>EQY</strong><span>OPTIMIZATION OS</span></div></button>
        <nav>{nav.map(([id, label]) => <button key={id} onClick={() => setPage(id)} className={page === id ? 'active' : ''}>{label}</button>)}</nav>
        <button onClick={() => setPage(isLoggedIn ? 'dashboard' : 'login')} className="eqy-v4-cta">{isLoggedIn ? 'Dashboard' : 'Login'}</button>
      </header>

      <main className="relative z-10 mx-auto max-w-[1280px] px-6 pb-24 pt-14">
        {message && <div className="eqy-alert"><span>{message}</span><button onClick={() => setMessage('')}>×</button></div>}

        {page === 'home' && (
          <section className="eqy-v4-page eqy-v4-hero">
            <div className="eqy-v4-hero-copy">
              <div className="eqy-v4-pill">LIVE CHECKOUT • REAL LOGIN • PROTECTED DOWNLOADS</div>
              <h1>Your PC,<span> tuned like elite hardware.</span></h1>
              <p>EQY Tweak supports real accounts, PayPal checkout, automatic license generation, premium access, signed updates and protected downloads.</p>
              <div className="eqy-v4-actions"><button onClick={() => setPage('pricing')} className="eqy-v4-primary">Explore plans</button><button onClick={() => void protectedDownload('exe')} className="eqy-v4-secondary">Download app</button></div>
              <div className="eqy-v4-trust">{['PayPal checkout', 'License generation', 'Protected downloads', 'Premium presets'].map((item) => <div key={item}><span />{item}</div>)}</div>
            </div>
            <div className="eqy-v4-showcase"><img className="eqy-v4-chip" src="/eqy-logo.svg" alt="" /><div className="eqy-product-screen"><div className="eqy-product-bar"><span /><span /><span /></div><div className="eqy-product-content"><div className="eqy-system-line"><strong>License</strong><em>{activeLicenses.length ? 'Verified' : 'Required'}</em></div><div className="eqy-system-line"><strong>Premium</strong><em>{premiumUnlocked ? 'Unlocked' : 'Locked'}</em></div><div className="eqy-system-line"><strong>Updater</strong><em>Signed</em></div><div className="eqy-terminal"><p>› account api ready</p><p>› paypal order flow live</p><p>› license auto generation</p><p className="text-emerald-300">› protected download enabled</p></div></div></div><div className="eqy-v4-glass-card top"><span>ACCESS</span><strong>{isLoggedIn ? user?.email : 'Guest'}</strong></div><div className="eqy-v4-glass-card bottom"><span>STATUS</span><strong>{activeLicenses.length ? 'Licensed' : 'Login needed'}</strong></div></div>
          </section>
        )}

        {page === 'pricing' && (
          <section className="eqy-v4-page"><div className="eqy-v4-section-head"><div className="eqy-v4-pill">LICENSE STORE</div><h2>Standard licenses</h2><p>Choose the license duration. Login is required before PayPal checkout.</p></div><div className="eqy-v4-plan-grid">{standardPlans.map((plan, index) => <article key={plan.id} className={`eqy-v4-plan ${index === 3 ? 'highlight' : ''}`}><div className="eqy-v4-plan-top"><span>{plan.name}</span>{index === 3 && <em>VALUE</em>}</div><strong>{plan.price}</strong><p>{plan.desc}</p><ul>{plan.features.map((feature) => <li key={feature}>{feature}</li>)}</ul><button onClick={() => void startCheckout(plan.id)} className="eqy-v4-primary">Buy standard</button></article>)}</div><div className="eqy-v4-premium-block"><div className="eqy-v4-premium-copy"><div className="eqy-v4-pill">PREMIUM SUBSCRIPTION</div><h2>Unlock the premium tweak layer.</h2><p>Premium plans unlock restricted optimizations inside the app: advanced FPS presets, aggressive latency changes, premium categories and future exclusive modules.</p></div><div className="eqy-v4-premium-plans">{premiumPlans.map((plan) => <article key={plan.id} className="eqy-v4-premium-plan"><div><span>{plan.name}</span><em>{plan.badge}</em></div><strong>{plan.price}</strong><p>{plan.desc}</p><button onClick={() => void startCheckout(plan.id)} className="eqy-v4-primary">Buy premium</button></article>)}</div></div></section>
        )}

        {page === 'download' && (
          <section className="eqy-v4-page eqy-v4-download"><div><div className="eqy-v4-pill">DOWNLOAD CENTER</div><h2>Install the desktop app.</h2><p>Downloads are protected. You need an active license to access the installer.</p><div className="eqy-v4-actions"><button onClick={() => void protectedDownload('exe')} className="eqy-v4-primary">Download EXE</button><button onClick={() => void protectedDownload('msi')} className="eqy-v4-secondary">Download MSI</button></div></div><div className="eqy-v4-download-card">{[['Version', '0.1.1'], ['Platform', 'Windows x64'], ['Installer', 'EXE + MSI'], ['Updates', 'Signed latest.json']].map(([a, b]) => <div key={a}><span>{a}</span><strong>{b}</strong></div>)}</div></section>
        )}

        {page === 'login' && (
          <section className="eqy-v4-page eqy-v4-auth-wrap"><div className="eqy-v4-auth"><div className="eqy-v4-pill">ACCESS PORTAL</div><h2>{isLoggedIn ? 'Account' : 'Login or register'}</h2>{isLoggedIn ? <><p>Logged in as {user?.email}</p><button onClick={() => setPage('dashboard')} className="eqy-v4-primary">Open Dashboard</button><button onClick={logout} className="eqy-v4-secondary">Logout</button></> : <><input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} /><input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} /><button onClick={() => void login()} className="eqy-v4-primary">Login</button><button onClick={() => void register()} className="eqy-v4-secondary">Register</button></>}</div></section>
        )}

        {page === 'dashboard' && (
          <section className="eqy-v4-page eqy-account-page">
            <div className="eqy-account-hero">
              <div><div className="eqy-v4-pill">ACCOUNT COMMAND CENTER</div><h2>Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}</h2><p>Manage your license, protected downloads, HWID status, password security and EQY membership benefits.</p><div className="eqy-account-badges"><span>{memberTier}</span><span>{activeLicenses.length ? 'Verified license' : 'License needed'}</span><span>{premiumUnlocked ? 'Premium unlocked' : 'Standard access'}</span></div></div>
              <div className="eqy-account-orb"><span>{activeLicenses.length ? 'ACTIVE' : 'FREE'}</span><strong>{activeLicenses.length ? '100%' : '0%'}</strong><em>License readiness</em></div>
            </div>

            <div className="eqy-account-grid">
              <article className="eqy-account-card eqy-license-overview"><div className="eqy-card-head"><span>License Overview</span><em>{primaryLicense?.status || 'none'}</em></div><h3>{primaryLicense ? maskKey(primaryLicense.key) : 'No active license'}</h3><div className="eqy-license-meter"><i style={{ width: activeLicenses.length ? '100%' : '12%' }} /></div><div className="eqy-license-stats"><div><span>Plan</span><strong>{primaryLicense?.plan_id || 'None'}</strong></div><div><span>Expires</span><strong>{formatDate(primaryLicense?.expires_at)}</strong></div><div><span>HWID</span><strong>{primaryLicense?.hwid ? 'Bound' : 'Not bound'}</strong></div><div><span>Premium</span><strong>{primaryLicense?.premium ? 'Yes' : 'No'}</strong></div></div></article>

              <article className="eqy-account-card"><div className="eqy-card-head"><span>Activate License</span><em>key</em></div><p>Paste an EQY key to attach it to this account.</p><div className="eqy-input-row"><input placeholder="EQY-XXXX-XXXX-XXXX" value={licenseKey} onChange={(e) => setLicenseKey(e.target.value)} /><button onClick={() => void activateLicense()} disabled={busy} className="eqy-v4-primary">Activate</button></div></article>

              <article className="eqy-account-card"><div className="eqy-card-head"><span>Downloads</span><em>protected</em></div><h3>EQY Tweak 0.1.1</h3><p>Stable Windows release. Requires an active license.</p><div className="eqy-dashboard-buttons"><button onClick={() => void protectedDownload('exe')} className="eqy-v4-primary">Download EXE</button><button onClick={() => void protectedDownload('msi')} className="eqy-v4-secondary">Download MSI</button></div></article>

              <article className="eqy-account-card"><div className="eqy-card-head"><span>Account Security</span><em>{passwordStrength}</em></div><p>Change your password anytime. Use a strong password for account protection.</p><button onClick={() => setPasswordOpen(!passwordOpen)} className="eqy-v4-secondary">{passwordOpen ? 'Close password panel' : 'Change password'}</button>{passwordOpen && <div className="eqy-password-panel"><input type="password" placeholder="Current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} /><input type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /><input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /><div className={`eqy-strength ${passwordStrength.toLowerCase()}`}><i /></div><button onClick={() => void changePassword()} disabled={busy} className="eqy-v4-primary">Update Password</button></div>}</article>
            </div>

            <div className="eqy-account-wide">
              <article className="eqy-account-card"><div className="eqy-card-head"><span>Membership Benefits</span><em>{premiumUnlocked ? 'elite' : 'standard'}</em></div><div className="eqy-benefit-grid">{['Protected downloads', 'Automatic license generation', 'HWID protection', 'Signed updater', 'Premium tweaks', 'Priority support', 'Restore-safe workflow', 'Future updates'].map((item, i) => <div key={item} className={i > 3 && !premiumUnlocked ? 'locked' : ''}><span>{i > 3 && !premiumUnlocked ? 'LOCK' : 'OK'}</span><strong>{item}</strong></div>)}</div></article>
              <article className="eqy-account-card"><div className="eqy-card-head"><span>Device Management</span><em>{primaryLicense?.hwid ? 'linked' : 'waiting'}</em></div><h3>{primaryLicense?.hwid ? 'Authorized device linked' : 'No device bound yet'}</h3><p>{primaryLicense?.last_verified_at ? `Last verified: ${formatDate(primaryLicense.last_verified_at)}` : 'Your HWID will be bound the first time you activate the license inside EQY Tweak.'}</p><div className="eqy-dashboard-buttons"><button onClick={() => setHwidPopup(true)} className="eqy-v4-primary">Request HWID Reset</button><button onClick={openDiscord} className="eqy-v4-secondary">Discord Support</button></div></article>
            </div>

            <div className="eqy-license-list pro">
              <div className="eqy-card-head"><span>Your Licenses</span><em>{licenses.length}</em></div>
              {licenses.length ? licenses.map((license) => <div key={license.key}><strong>{license.key}</strong><span>{license.plan_id} • {license.status} • {formatDate(license.expires_at)} • {license.hwid ? 'HWID bound' : 'HWID free'}</span></div>) : <p>No licenses yet. Buy a plan or activate an existing key.</p>}
            </div>
          </section>
        )}

        {page === 'changelog' && <section className="eqy-v4-page"><div className="eqy-v4-section-head left"><div className="eqy-v4-pill">UPDATES</div><h2>Changelog</h2></div>{['0.2.0 — account dashboard, security tools, license activation, protected downloads', '0.1.1 — updater signing, admin startup, restore fixes', '0.1.0 — first public desktop release'].map((item) => <div key={item} className="eqy-v4-log">{item}</div>)}</section>}
      </main>

      {loginRequiredPopup && <div className="eqy-v4-modal"><div><div className="eqy-v4-pill">LOGIN REQUIRED</div><h2>You must login first</h2><p>Before downloading, buying or opening protected actions, login or create an account.</p><section><button onClick={() => { setLoginRequiredPopup(false); setPage('login') }} className="eqy-v4-primary">Login</button><button onClick={() => setLoginRequiredPopup(false)} className="eqy-v4-secondary">Close</button></section></div></div>}
      {licenseRequiredPopup && <div className="eqy-v4-modal"><div><div className="eqy-v4-pill">LICENSE REQUIRED</div><h2>Active license needed</h2><p>You need an active EQY license to download the protected installer.</p><section><button onClick={() => { setLicenseRequiredPopup(false); setPage('pricing') }} className="eqy-v4-primary">View Plans</button><button onClick={() => setLicenseRequiredPopup(false)} className="eqy-v4-secondary">Close</button></section></div></div>}
      {hwidPopup && <div className="eqy-v4-modal"><div><div className="eqy-v4-pill">HWID RESET</div><h2>Request device reset</h2><p>Send a reset request for your active license. EQY staff can review it and help you move to a new PC.</p><section><button onClick={() => void requestHwidReset()} className="eqy-v4-primary">Send Request</button><button onClick={() => setHwidPopup(false)} className="eqy-v4-secondary">Close</button></section></div></div>}

      <footer className="relative z-10 mx-auto flex max-w-[1280px] justify-between border-t border-white/10 px-6 py-8 text-xs text-slate-500"><span>© 2026 EQY Tweak</span><button onClick={() => setPage('changelog')}>Updates</button></footer>
    </div>
  )
}

export default App
