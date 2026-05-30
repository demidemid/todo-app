import { useEffect, useState } from 'react'
import { onAuthStateChanged, signOut, type User } from 'firebase/auth'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth } from './firebase'
import { db } from './firebase'
import { Login } from './components/Login'
import { TodoList } from './components/TodoList'
import { IconButton } from './components/ui/IconButton'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [logoutLoading, setLogoutLoading] = useState(false)
  const [authActionError, setAuthActionError] = useState('')

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
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">
              <img src="/favicon.svg" alt="" aria-hidden="true" className="size-7 md:size-8" />
              <span>Todoozy</span>
            </h1>
          </div>
          {user ? (
            <div className="flex items-center gap-3">
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
            <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-emerald-200">
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
          {user ? <TodoList userId={user.uid} userEmail={user.email ?? undefined} /> : <Login user={user} />}
        </div>
      </main>
    </div>
  )
}

export default App
