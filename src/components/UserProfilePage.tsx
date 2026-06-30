import { useEffect, useMemo, useState } from 'react'
import type { User } from 'firebase/auth'
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import {
  DEFAULT_USER_PROFILE_AVATAR_ID,
  USER_PROFILE_AVATARS,
} from '../utils/userProfileAvatars'

interface UserProfilePageProps {
  user: User
  onBack: () => void
}

const normalizeEmail = (value: string | null | undefined) => (typeof value === 'string' ? value.trim().toLowerCase() : '')
const normalizeName = (value: string) => value.trim().replace(/\s+/g, ' ')

const parseName = (value: unknown) => (typeof value === 'string' ? value : '')
const parseAvatarId = (value: unknown) => {
  if (typeof value !== 'string') {
    return DEFAULT_USER_PROFILE_AVATAR_ID
  }

  const exists = USER_PROFILE_AVATARS.some((avatar) => avatar.id === value)
  return exists ? value : DEFAULT_USER_PROFILE_AVATAR_ID
}

export const UserProfilePage = ({ user, onBack }: UserProfilePageProps) => {
  const [name, setName] = useState('')
  const [avatarId, setAvatarId] = useState(DEFAULT_USER_PROFILE_AVATAR_ID)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [profileError, setProfileError] = useState('')
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')
  const userDocRef = useMemo(() => doc(db, 'users', user.uid), [user.uid])

  useEffect(() => {
    const unsubscribe = onSnapshot(
      userDocRef,
      (snapshot) => {
        const data = snapshot.data() ?? {}
        setName(parseName(data.name))
        setAvatarId(parseAvatarId(data.avatarId))
        setProfileError('')
        setLoadingProfile(false)
      },
      (error) => {
        setProfileError(error.message || 'Failed to load user profile')
        setLoadingProfile(false)
      },
    )

    return () => unsubscribe()
  }, [userDocRef])

  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaveLoading(true)
    setSaveError('')
    setSaveSuccess('')

    try {
      const normalizedEmail = normalizeEmail(user.email)
      const normalizedName = normalizeName(name)

      await setDoc(
        userDocRef,
        {
          email: normalizedEmail,
          name: normalizedName,
          avatarId,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )
      setName(normalizedName)
      setSaveSuccess('Profile saved')
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save profile')
    } finally {
      setSaveLoading(false)
    }
  }

  return (
    <section className="mx-auto w-full max-w-5xl" data-testid="user-profile-page">
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-xl sm:p-6">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-white sm:text-2xl">Profile</h2>
            <p className="mt-1 text-sm text-slate-300">{normalizeEmail(user.email) || 'Signed user'}</p>
          </div>
          <Button variant="ghost" onClick={onBack}>
            Back to dashboards
          </Button>
        </div>

        {profileError && (
          <p className="mb-4 rounded-lg border border-rose-300/30 bg-rose-400/10 p-2 text-sm text-rose-200">{profileError}</p>
        )}

        {loadingProfile ? (
          <p className="text-sm text-slate-300">Loading profile...</p>
        ) : (
          <form onSubmit={handleSaveProfile}>
            <div className="mb-5">
              <label htmlFor="profile-name" className="mb-2 block text-xs uppercase tracking-wide text-slate-300">
                Name
              </label>
              <Input
                id="profile-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="How should others call you?"
                maxLength={80}
              />
            </div>

            <div className="mb-5">
              <p className="mb-2 block text-xs uppercase tracking-wide text-slate-300">Avatar</p>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-7" role="radiogroup" aria-label="Avatar options">
                {USER_PROFILE_AVATARS.map((option) => {
                  const selected = option.id === avatarId
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-label={option.label}
                      onClick={() => setAvatarId(option.id)}
                      data-testid={`profile-avatar-option-${option.id}`}
                      className={[
                        'group relative overflow-hidden rounded-xl border transition',
                        selected
                          ? 'border-cyan-300 bg-cyan-300/10 ring-2 ring-cyan-300/60'
                          : 'border-white/15 bg-slate-950/50 hover:border-white/35',
                      ].join(' ')}
                    >
                      <img src={option.imageUrl} alt={option.label} className="size-full aspect-square object-cover" loading="lazy" />
                    </button>
                  )
                })}
              </div>
            </div>

            {saveError && (
              <p className="mb-4 rounded-lg border border-rose-300/30 bg-rose-400/10 p-2 text-sm text-rose-200">{saveError}</p>
            )}
            {saveSuccess && (
              <p className="mb-4 rounded-lg border border-emerald-300/30 bg-emerald-400/10 p-2 text-sm text-emerald-200">{saveSuccess}</p>
            )}

            <Button type="submit" disabled={saveLoading}>
              {saveLoading ? 'Saving...' : 'Save profile'}
            </Button>
          </form>
        )}
      </div>
    </section>
  )
}
