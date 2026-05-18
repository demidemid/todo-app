import { useEffect, useState } from 'react'
import { onAuthStateChanged, signOut, type User } from 'firebase/auth'
import { auth } from './firebase'
import { Login } from './components/Login'
import { TodoList } from './components/TodoList'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [logoutLoading, setLogoutLoading] = useState(false)
  const [authActionError, setAuthActionError] = useState('')

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
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
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
              Offline Todo
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              React + Firebase + Tailwind CSS
            </p>
          </div>
          {user ? (
            <div className="flex items-center gap-3">
              <p className="max-w-45 truncate text-sm text-slate-200 md:max-w-65" title={user.email ?? 'Signed user'}>
                {user.email ?? 'Signed user'}
              </p>
              <button
                type="button"
                onClick={handleLogout}
                disabled={logoutLoading}
                aria-label="Log out"
                title="Log out"
                className="inline-flex size-9 items-center justify-center rounded-full border border-rose-300/40 bg-rose-400/10 text-rose-200 transition hover:bg-rose-400/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6A2.25 2.25 0 0 0 5.25 5.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 15l3-3m0 0-3-3m3 3H9" />
                </svg>
              </button>
            </div>
          ) : (
            <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-emerald-200">
              Sync Ready
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl px-5 py-10">
        <div className="w-full rounded-2xl border border-white/10 bg-slate-900/70 p-4 shadow-2xl shadow-slate-950/40 md:p-6">
          {authActionError && (
            <p className="mb-4 rounded-lg border border-rose-300/30 bg-rose-400/10 p-2 text-sm text-rose-200">
              {authActionError}
            </p>
          )}
          {user ? <TodoList /> : <Login user={user} />}
        </div>
      </main>
    </div>
  )
}

export default App
