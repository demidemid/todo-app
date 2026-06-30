import { useEffect, useMemo, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'

export interface CurrentUserProfile {
  email: string
  name: string
  avatarId: string | null
}

const parseEmail = (value: unknown): string => (typeof value === 'string' ? value.trim().toLowerCase() : '')
const parseName = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')
const parseAvatarId = (value: unknown): string | null => (typeof value === 'string' && value.trim().length > 0 ? value.trim() : null)

export const useCurrentUserProfile = (userId: string | null, authEmail: string | null | undefined) => {
  const normalizedAuthEmail = useMemo(() => parseEmail(authEmail), [authEmail])
  const fallbackProfile = useMemo<CurrentUserProfile>(() => ({
    email: normalizedAuthEmail,
    name: '',
    avatarId: null,
  }), [normalizedAuthEmail])
  const [profile, setProfile] = useState<CurrentUserProfile>(fallbackProfile)
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(userId)

  useEffect(() => {
    if (!userId) {
      return
    }

    const profileRef = doc(db, 'users', userId)
    const unsubscribe = onSnapshot(
      profileRef,
      (snapshot) => {
        const data = snapshot.data() ?? {}
        setProfile({
          email: parseEmail(data.email) || normalizedAuthEmail,
          name: parseName(data.name),
          avatarId: parseAvatarId(data.avatarId),
        })
        setResolvedUserId(userId)
      },
      () => {
        setProfile(fallbackProfile)
        setResolvedUserId(userId)
      },
    )

    return () => unsubscribe()
  }, [fallbackProfile, normalizedAuthEmail, userId])

  if (!userId) {
    return {
      profile: fallbackProfile,
      loading: false,
    }
  }

  return {
    profile: resolvedUserId === userId ? profile : fallbackProfile,
    loading: resolvedUserId !== userId,
  }
}
