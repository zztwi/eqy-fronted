import { useEffect, useMemo, useState } from 'react'
import './App.css'

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

  const requireLoginAction = (callback?: () => void | Promise<void>) => {
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
  )
}

export default App
