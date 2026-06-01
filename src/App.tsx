import { useEffect, useState } from 'react'
import { onAuthStateChanged, signOut, type User } from 'firebase/auth'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { useSearchParams } from 'react-router-dom'
import { auth } from './firebase'
import { db } from './firebase'
import { Login } from './components/Login'
import { TodoList } from './components/TodoList'
import { IconButton } from './components/ui/IconButton'

type AppSectionMode = 'dashboards' | 'archive'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [logoutLoading, setLogoutLoading] = useState(false)
  const [authActionError, setAuthActionError] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const sectionMode: AppSectionMode = searchParams.get('section') === 'archive' ? 'archive' : 'dashboards'

  const setSectionMode = (nextMode: AppSectionMode) => {
    setSearchParams((prevParams) => {
      const nextParams = new URLSearchParams(prevParams)

      if (nextMode === 'archive') {
        nextParams.set('section', 'archive')
        nextParams.delete('card')
        return nextParams
      }

      nextParams.delete('section')
      return nextParams
    })
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)

      if (currentUser?.email) {
        void setDoc(
          doc(db, 'users', currentUser.uid),
          {
            email: currentUser.email.trim().toLowerCase(),
            updatedAt: serverTimestamp(),
          }
        ).catch((profileError) => {
          if (profileError instanceof Error && profileError.message.includes('ERR_BLOCKED_BY_CLIENT')) {
            console.warn('Firestore request was blocked by a browser extension or privacy filter.')
            return
          }

          console.warn('Failed to sync user profile to Firestore', profileError)
        })
      }
    })

    return () => unsubscribe()
  }, [])

  const handleLogout = async () => {
    setAuthActionError('')
    setLogoutLoading(true)

    try {
      await signOut(auth)
    } catch (error) {
      if (error instanceof Error) {
        setAuthActionError(error.message)
      } else {
        setAuthActionError('Failed to log out')
      }
    } finally {
      setLogoutLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-950 text-slate-100">
        <p className="text-lg">Initializing...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#1e293b_0%,#020617_55%)]">
      <header className="border-b border-white/10 bg-slate-900/40 backdrop-blur-sm">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-5 py-6">
          <div className="justify-self-start">
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 77 47"
                fill="none"
                aria-hidden="true"
                className="size-7 md:size-12"
              >
                <path
                  fill="#9135ff"
                  d="M40.151 45.71c-.663.844-2.02.374-2.02-.699V34.708a2.26 2.26 0 0 0-2.262-2.262H24.493c-.92 0-1.457-1.04-.92-1.788l7.479-10.471c1.07-1.498 0-3.578-1.842-3.578H15.443c-.92 0-1.456-1.04-.92-1.788l9.696-13.576c.213-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.472c-1.07 1.497 0 3.578 1.842 3.578h11.376c.944 0 1.474 1.087.89 1.83L40.153 45.712z"
                />
                <mask id="a" width="48" height="47" x="14" y="0" maskUnits="userSpaceOnUse" style={{ maskType: 'alpha' }}>
                  <path
                    fill="#000"
                    d="M40.047 45.71c-.663.843-2.02.374-2.02-.699V34.708a2.26 2.26 0 0 0-2.262-2.262H24.389c-.92 0-1.457-1.04-.92-1.788l7.479-10.472c1.07-1.497 0-3.578-1.842-3.578H15.34c-.92 0-1.456-1.04-.92-1.788l9.696-13.575c.213-.297.556-.474.92-.474H53.93c.92 0 1.456 1.04.92 1.788L47.37 13.03c-1.07 1.498 0 3.578 1.842 3.578h11.376c.944 0 1.474 1.088.89 1.831L40.049 45.712z"
                  />
                </mask>
                <g mask="url(#a)">
                  <g filter="url(#b)">
                    <ellipse
                      cx="5.508"
                      cy="14.704"
                      fill="#eee6ff"
                      rx="5.508"
                      ry="14.704"
                      transform="rotate(269.814 20.96 11.29)scale(-1 1)"
                    />
                  </g>
                  <g filter="url(#c)">
                    <ellipse
                      cx="10.399"
                      cy="29.851"
                      fill="#eee6ff"
                      rx="10.399"
                      ry="29.851"
                      transform="rotate(89.814 -16.902 -8.275)scale(1 -1)"
                    />
                  </g>
                  <g filter="url(#d)">
                    <ellipse
                      cx="5.508"
                      cy="30.487"
                      fill="#8900ff"
                      rx="5.508"
                      ry="30.487"
                      transform="rotate(89.814 -19.197 -7.127)scale(1 -1)"
                    />
                  </g>
                  <g filter="url(#e)">
                    <ellipse
                      cx="5.508"
                      cy="30.599"
                      fill="#8900ff"
                      rx="5.508"
                      ry="30.599"
                      transform="rotate(89.814 -25.928 4.177)scale(1 -1)"
                    />
                  </g>
                  <g filter="url(#f)">
                    <ellipse
                      cx="5.508"
                      cy="30.599"
                      fill="#8900ff"
                      rx="5.508"
                      ry="30.599"
                      transform="rotate(89.814 -25.738 5.52)scale(1 -1)"
                    />
                  </g>
                  <g filter="url(#g)">
                    <ellipse
                      cx="14.072"
                      cy="22.078"
                      fill="#eee6ff"
                      rx="14.072"
                      ry="22.078"
                      transform="rotate(93.35 31.245 55.578)scale(-1 1)"
                    />
                  </g>
                  <g filter="url(#h)">
                    <ellipse
                      cx="3.47"
                      cy="21.501"
                      fill="#8900ff"
                      rx="3.47"
                      ry="21.501"
                      transform="rotate(89.009 35.419 55.202)scale(-1 1)"
                    />
                  </g>
                  <g filter="url(#i)">
                    <ellipse
                      cx="3.47"
                      cy="21.501"
                      fill="#8900ff"
                      rx="3.47"
                      ry="21.501"
                      transform="rotate(89.009 35.419 55.202)scale(-1 1)"
                    />
                  </g>
                  <g filter="url(#j)">
                    <ellipse cx="14.592" cy="9.743" fill="#8900ff" rx="4.407" ry="29.108" transform="rotate(39.51 14.592 9.743)" />
                  </g>
                  <g filter="url(#k)">
                    <ellipse cx="61.728" cy="-5.321" fill="#8900ff" rx="4.407" ry="29.108" transform="rotate(37.892 61.728 -5.32)" />
                  </g>
                  <g filter="url(#l)">
                    <ellipse cx="55.618" cy="7.104" fill="#00c2ff" rx="5.971" ry="9.665" transform="rotate(37.892 55.618 7.104)" />
                  </g>
                  <g filter="url(#m)">
                    <ellipse cx="12.326" cy="39.103" fill="#8900ff" rx="4.407" ry="29.108" transform="rotate(37.892 12.326 39.103)" />
                  </g>
                  <g filter="url(#n)">
                    <ellipse cx="12.326" cy="39.103" fill="#8900ff" rx="4.407" ry="29.108" transform="rotate(37.892 12.326 39.103)" />
                  </g>
                  <g filter="url(#o)">
                    <ellipse cx="49.857" cy="30.678" fill="#8900ff" rx="4.407" ry="29.108" transform="rotate(37.892 49.857 30.678)" />
                  </g>
                  <g filter="url(#p)">
                    <ellipse cx="52.623" cy="33.171" fill="#00c2ff" rx="5.971" ry="15.297" transform="rotate(37.892 52.623 33.17)" />
                  </g>
                </g>
                <path
                  d="M6.919 0c-9.198 13.166-9.252 33.575 0 46.789h6.215c-9.25-13.214-9.196-33.623 0-46.789zm62.424 0h-6.215c9.198 13.166 9.252 33.575 0 46.789h6.215c9.25-13.214 9.196-33.623 0-46.789"
                  className="parenthesis"
                />
                <defs>
                  <filter id="b" width="60.045" height="41.654" x="-5.564" y="16.92" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                    <feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="7.659" />
                  </filter>
                  <filter id="c" width="90.34" height="51.437" x="-40.407" y="-6.762" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                    <feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="7.659" />
                  </filter>
                  <filter id="d" width="79.355" height="29.4" x="-35.435" y="2.801" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                    <feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="4.596" />
                  </filter>
                  <filter id="e" width="79.579" height="29.4" x="-30.84" y="20.8" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                    <feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="4.596" />
                  </filter>
                  <filter id="f" width="79.579" height="29.4" x="-29.307" y="21.949" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                    <feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="4.596" />
                  </filter>
                  <filter id="g" width="74.749" height="58.852" x="29.961" y="-17.13" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                    <feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="7.659" />
                  </filter>
                  <filter id="h" width="61.377" height="25.362" x="37.754" y="3.055" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                    <feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="4.596" />
                  </filter>
                  <filter id="i" width="61.377" height="25.362" x="37.754" y="3.055" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                    <feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="4.596" />
                  </filter>
                  <filter id="j" width="56.045" height="63.649" x="-13.43" y="-22.082" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                    <feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="4.596" />
                  </filter>
                  <filter id="k" width="54.814" height="64.646" x="34.321" y="-37.644" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                    <feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="4.596" />
                  </filter>
                  <filter id="l" width="33.541" height="35.313" x="38.847" y="-10.552" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                    <feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="4.596" />
                  </filter>
                  <filter id="m" width="54.814" height="64.646" x="-15.081" y="6.78" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                    <feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="4.596" />
                  </filter>
                  <filter id="n" width="54.814" height="64.646" x="-15.081" y="6.78" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                    <feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="4.596" />
                  </filter>
                  <filter id="o" width="54.814" height="64.646" x="22.45" y="-1.645" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                    <feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="4.596" />
                  </filter>
                  <filter id="p" width="39.409" height="43.623" x="32.919" y="11.36" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                    <feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="4.596" />
                  </filter>
                </defs>
              </svg>
              <span>Todoozy</span>
            </h1>
          </div>

          {user ? (
            <div
              className="inline-flex items-center rounded-full border border-white/15 bg-slate-950/60 p-1"
              role="group"
              aria-label="Main sections"
            >
              <button
                type="button"
                aria-pressed={sectionMode === 'dashboards'}
                onClick={() => setSectionMode('dashboards')}
                className={[
                  'rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition md:px-4',
                  sectionMode === 'dashboards'
                    ? 'bg-cyan-300 text-slate-900'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white',
                ].join(' ')}
                data-testid="section-tab-dashboards"
              >
                Dashboards
              </button>
              <button
                type="button"
                aria-pressed={sectionMode === 'archive'}
                onClick={() => setSectionMode('archive')}
                className={[
                  'rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition md:px-4',
                  sectionMode === 'archive'
                    ? 'bg-cyan-300 text-slate-900'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white',
                ].join(' ')}
                data-testid="section-tab-archive"
              >
                Archive
              </button>
            </div>
          ) : (
            <div aria-hidden="true" />
          )}

          {user ? (
            <div className="flex items-center justify-self-end gap-3">
              <p className="max-w-44 truncate text-sm text-slate-200 md:max-w-64" title={user.email ?? 'Signed user'}>
                {user.email ?? 'Signed user'}
              </p>
              <IconButton
                variant="danger"
                size="lg"
                onClick={handleLogout}
                disabled={logoutLoading}
                label="Log out"
                title="Log out"
                className="size-9 rounded-full"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6A2.25 2.25 0 0 0 5.25 5.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 15l3-3m0 0-3-3m3 3H9" />
                </svg>
              </IconButton>
            </div>
          ) : (
            <span className="justify-self-end rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-emerald-200">
              Sync Ready
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl px-5 py-10">
        <div className="w-full">
          {authActionError && (
            <p className="mb-4 rounded-lg border border-rose-300/30 bg-rose-400/10 p-2 text-sm text-rose-200">
              {authActionError}
            </p>
          )}
          {user ? (
            <TodoList
              userId={user.uid}
              userEmail={user.email ?? undefined}
              viewMode={sectionMode}
            />
          ) : (
            <Login user={user} />
          )}
        </div>
      </main>
    </div>
  )
}

export default App
