import { useEffect, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from './firebase'
import { Login } from './components/Login'
import { TodoList } from './components/TodoList'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

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
          <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-emerald-200">
            Sync Ready
          </span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl px-5 py-10">
        <div className="w-full rounded-2xl border border-white/10 bg-slate-900/70 p-4 shadow-2xl shadow-slate-950/40 md:p-6">
          {user ? <TodoList /> : <Login user={user} />}
        </div>
      </main>
    </div>
  )
}

export default App
