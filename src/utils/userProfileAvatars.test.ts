import { describe, expect, it } from 'vitest';
import {
  BLANK_USER_AVATAR_URL,
  DEFAULT_USER_PROFILE_AVATAR_ID,
  USER_PROFILE_AVATARS,
  getAvatarImageUrl,
} from './userProfileAvatars';

describe('userProfileAvatars', () => {
  it('returns seeded avatar url for a valid avatar id', () => {
    const avatarId = USER_PROFILE_AVATARS[0].id;
    expect(getAvatarImageUrl(avatarId)).toBe(`/avatars/${avatarId}.svg`);
  });

  it('returns blank avatar url for null or unknown avatar ids', () => {
    expect(getAvatarImageUrl(null)).toBe(BLANK_USER_AVATAR_URL);
    expect(getAvatarImageUrl(undefined)).toBe(BLANK_USER_AVATAR_URL);
    expect(getAvatarImageUrl('missing-avatar')).toBe(BLANK_USER_AVATAR_URL);
  });

  it('exposes default avatar id that exists in the avatar options list', () => {
    expect(DEFAULT_USER_PROFILE_AVATAR_ID).toBeTruthy();
    expect(USER_PROFILE_AVATARS.some((avatar) => avatar.id === DEFAULT_USER_PROFILE_AVATAR_ID)).toBe(true);
  });

  it('uses local /avatars assets for all avatar options', () => {
    expect(USER_PROFILE_AVATARS.length).toBeGreaterThan(0);
    for (const avatar of USER_PROFILE_AVATARS) {
      expect(avatar.imageUrl.startsWith('/avatars/')).toBe(true);
      expect(avatar.imageUrl.endsWith('.svg')).toBe(true);
    }
  });
});
