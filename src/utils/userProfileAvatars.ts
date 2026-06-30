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
  imageUrl: `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(seed)}&backgroundType=gradientLinear`,
}))

export const DEFAULT_USER_PROFILE_AVATAR_ID = USER_PROFILE_AVATARS[0].id
