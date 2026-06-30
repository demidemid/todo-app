import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { onAuthStateChanged, signOut, type User } from 'firebase/auth'
import { doc, serverTimestamp, setDoc, type FirestoreError } from 'firebase/firestore'
import { useSearchParams } from 'react-router-dom'
import { auth } from './firebase'
import { db } from './firebase'
import { AppHeader, type AppSectionMode } from './components/AppHeader'
import { Login } from './components/Login'

const TodoList = lazy(async () => {
  const module = await import('./components/TodoList')
  return { default: module.TodoList }
})

const isFirestorePermissionDenied = (error: unknown): error is FirestoreError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as FirestoreError).code === 'permission-denied'
  )
}

const areSameStringArray = (left: string[], right: string[]) => {
  if (left.length !== right.length) {
    return false
  }

  return left.every((item, index) => item === right[index])
}

const normalizeTags = (rawTags: string[]) => {
  const normalized = rawTags
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)

  return Array.from(new Set(normalized)).sort((left, right) => left.localeCompare(right))
}

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
  cancelIdleCallback?: (handle: number) => void
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [logoutLoading, setLogoutLoading] = useState(false)
  const [authActionError, setAuthActionError] = useState('')
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const syncedProfileKeyRef = useRef<string | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const sectionMode: AppSectionMode = searchParams.get('section') === 'archive' ? 'archive' : 'dashboards'
  const selectedTagFilters = normalizeTags(searchParams.getAll('tags'))

  const updateSearch = useCallback((updater: (nextParams: URLSearchParams) => void) => {
    const nextParams = new URLSearchParams(searchParams)
    updater(nextParams)

    if (nextParams.toString() === searchParams.toString()) {
      return
    }

    setSearchParams(nextParams)
  }, [searchParams, setSearchParams])

  const setSectionMode = (nextMode: AppSectionMode) => {
    updateSearch((nextParams) => {
      if (nextMode === 'archive') {
        nextParams.set('section', 'archive')
        nextParams.delete('card')
      } else {
        nextParams.delete('section')
      }
    })
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)

      if (currentUser?.email) {
        const normalizedEmail = currentUser.email.trim().toLowerCase()
        const profileKey = `${currentUser.uid}:${normalizedEmail}`

        if (syncedProfileKeyRef.current === profileKey) {
          return
        }

        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          return
        }

        syncedProfileKeyRef.current = profileKey

        void setDoc(
          doc(db, 'users', currentUser.uid),
          {
            email: normalizedEmail,
            updatedAt: serverTimestamp(),
          }
        ).catch((profileError) => {
          if (profileError instanceof Error) {
            const normalizedMessage = profileError.message.toLowerCase()

            if (
              normalizedMessage.includes('network-request-failed')
              || normalizedMessage.includes('err_connection_closed')
              || normalizedMessage.includes('securetoken.googleapis.com')
            ) {
              return
            }
          }

          if (profileError instanceof Error && profileError.message.includes('ERR_BLOCKED_BY_CLIENT')) {
            return
          }

          if (isFirestorePermissionDenied(profileError)) {
            return
          }

          syncedProfileKeyRef.current = null
          console.warn('Failed to sync user profile to Firestore', profileError)
        })
      } else {
        syncedProfileKeyRef.current = null
      }
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) {
      return
    }

    let cancelled = false
    const idleWindow = window as IdleWindow

    const prefetchSecondaryChunks = () => {
      if (cancelled) {
        return
      }

      void import('./components/TodoModal').catch(() => {})
      void import('./components/todo-modal/RichTextEditor').catch(() => {})
    }

    if (typeof idleWindow.requestIdleCallback === 'function') {
      const idleHandle = idleWindow.requestIdleCallback(() => {
        prefetchSecondaryChunks()
      }, { timeout: 1500 })

      return () => {
        cancelled = true
        if (typeof idleWindow.cancelIdleCallback === 'function') {
          idleWindow.cancelIdleCallback(idleHandle)
        }
      }
    }

    const timeoutHandle = window.setTimeout(() => {
      prefetchSecondaryChunks()
    }, 900)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutHandle)
    }
  }, [user])

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

  const toggleTagFilter = (tag: string) => {
    const normalizedTag = tag.trim()

    if (!normalizedTag) {
      return
    }

    const nextTags = selectedTagFilters.includes(normalizedTag)
      ? selectedTagFilters.filter((item) => item !== normalizedTag)
      : [...selectedTagFilters, normalizedTag]

    updateSearch((nextParams) => {
      nextParams.delete('tags')
      normalizeTags(nextTags).forEach((nextTag) => nextParams.append('tags', nextTag))
    })
  }

  const addTagFilter = (tag: string) => {
    const normalizedTag = tag.trim()

    if (!normalizedTag || selectedTagFilters.includes(normalizedTag)) {
      return
    }

    updateSearch((nextParams) => {
      nextParams.delete('tags')
      normalizeTags([...selectedTagFilters, normalizedTag]).forEach((nextTag) => nextParams.append('tags', nextTag))
    })
  }

  const removeTagFilter = (tag: string) => {
    const normalizedTag = tag.trim()

    if (!normalizedTag || !selectedTagFilters.includes(normalizedTag)) {
      return
    }

    updateSearch((nextParams) => {
      nextParams.delete('tags')
      selectedTagFilters
        .filter((item) => item !== normalizedTag)
        .forEach((nextTag) => nextParams.append('tags', nextTag))
    })
  }

  const handleAvailableTagsChange = useCallback((nextTags: string[]) => {
    setAvailableTags((prev) => (areSameStringArray(prev, nextTags) ? prev : nextTags))
    const filtered = selectedTagFilters.filter((tag) => nextTags.includes(tag))

    if (areSameStringArray(selectedTagFilters, filtered)) {
      return
    }

    updateSearch((nextParams) => {
      nextParams.delete('tags')
      filtered.forEach((tag) => nextParams.append('tags', tag))
    })
  }, [selectedTagFilters, updateSearch])

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-950 text-slate-100">
        <p className="text-lg">Initializing...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen overflow-x-clip bg-[radial-gradient(circle_at_top,#1e293b_0%,#020617_55%)]">
      <AppHeader
        user={user}
        sectionMode={sectionMode}
        onSectionModeChange={setSectionMode}
        availableTags={availableTags}
        selectedTags={selectedTagFilters}
        onToggleTagFilter={toggleTagFilter}
        onRemoveTagFilter={removeTagFilter}
        onLogout={handleLogout}
        logoutLoading={logoutLoading}
      />

      <main className="mx-auto flex w-full max-w-full px-3 py-6 sm:px-5 sm:py-10">
        <div className="min-w-0 w-full">
          {authActionError && (
            <p className="mb-4 rounded-lg border border-rose-300/30 bg-rose-400/10 p-2 text-sm text-rose-200">
              {authActionError}
            </p>
          )}
          {user ? (
            <Suspense fallback={<div className="py-8 text-center text-slate-300">Loading workspace...</div>}>
              <TodoList
                userId={user.uid}
                userEmail={user.email ?? undefined}
                viewMode={sectionMode}
                tagFilters={selectedTagFilters}
                onAddTagFilter={addTagFilter}
                onAvailableTagsChange={handleAvailableTagsChange}
              />
            </Suspense>
          ) : (
            <Login user={user} />
          )}
        </div>
      </main>
    </div>
  )
}

export default App
