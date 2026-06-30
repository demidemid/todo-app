export interface UserProfileAvatarOption {
  id: string
  label: string
  imageUrl: string
}

const avatarSeeds = [
  'fox',
  'panda',
  'otter',
  'robot',
  'wizard',
  'pirate',
  'ninja',
  'astronaut',
  'viking',
  'samurai',
  'knight',
  'ranger',
  'captain',
  'detective',
  'chef',
  'pilot',
  'artist',
  'gamer',
  'coder',
  'explorer',
  'guardian',
  'dreamer',
  'spark',
  'comet',
  'nova',
  'aurora',
  'blaze',
  'orbit',
]

export const USER_PROFILE_AVATARS: UserProfileAvatarOption[] = avatarSeeds.map((seed, index) => ({
  id: seed,
  label: `Avatar ${index + 1}`,
  imageUrl: `/avatars/${seed}.svg`,
}))

export const DEFAULT_USER_PROFILE_AVATAR_ID = USER_PROFILE_AVATARS[0].id

export const BLANK_USER_AVATAR_URL = '/avatars/blank-user.svg'

export const getAvatarImageUrl = (avatarId: string | null | undefined): string => {
  if (!avatarId) {
    return BLANK_USER_AVATAR_URL
  }

  const matched = USER_PROFILE_AVATARS.find((avatar) => avatar.id === avatarId)
  return matched?.imageUrl ?? BLANK_USER_AVATAR_URL
}
