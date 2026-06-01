import { useEffect, useState } from 'react'
import { onAuthStateChanged, signOut, type User } from 'firebase/auth'
import { doc, serverTimestamp, setDoc, type FirestoreError } from 'firebase/firestore'
import { useSearchParams } from 'react-router-dom'
import { auth } from './firebase'
import { db } from './firebase'
import { AppHeader, type AppSectionMode } from './components/AppHeader'
import { Login } from './components/Login'
import { TodoList } from './components/TodoList'

const isFirestorePermissionDenied = (error: unknown): error is FirestoreError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as FirestoreError).code === 'permission-denied'
  )
}

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
            return
          }

          if (isFirestorePermissionDenied(profileError)) {
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
      <AppHeader
        user={user}
        sectionMode={sectionMode}
        onSectionModeChange={setSectionMode}
        onLogout={handleLogout}
        logoutLoading={logoutLoading}
      />

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
