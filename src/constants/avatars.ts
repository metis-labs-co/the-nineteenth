/**
 * Avatar Configuration Module
 *
 * Defines 12 colour variations of The Nineteenth golfer icon.
 * Each avatar uses the same icon with different colour palettes.
 *
 * Storage format: photo_url = "avatar:avatar-blue"
 */

export interface ColorPalette {
  darkest: string;
  dark: string;
  mid: string;
  light: string;
  lightest: string;
}

export interface AvatarOption {
  id: string;
  name: string;
  colorPalette: ColorPalette;
}

export const AVATAR_PREFIX = 'avatar:';
export const DEFAULT_AVATAR_ID = 'avatar-green';

export const AVATARS: AvatarOption[] = [
  {
    id: 'avatar-green',
    name: 'Green',
    colorPalette: {
      darkest: '#0a5d24',
      dark: '#2e8e36',
      mid: '#34953d',
      light: '#67a749',
      lightest: '#6eac4d',
    },
  },
  {
    id: 'avatar-blue',
    name: 'Blue',
    colorPalette: {
      darkest: '#0a3d5d',
      dark: '#2e6e8e',
      mid: '#3478a3',
      light: '#4998c7',
      lightest: '#4da0cf',
    },
  },
  {
    id: 'avatar-navy',
    name: 'Navy',
    colorPalette: {
      darkest: '#0a2445',
      dark: '#2e4a6e',
      mid: '#34567d',
      light: '#4978a1',
      lightest: '#4d82ab',
    },
  },
  {
    id: 'avatar-teal',
    name: 'Teal',
    colorPalette: {
      darkest: '#0a5d5d',
      dark: '#2e8e8e',
      mid: '#349d9d',
      light: '#49c7c7',
      lightest: '#4dcfcf',
    },
  },
  {
    id: 'avatar-purple',
    name: 'Purple',
    colorPalette: {
      darkest: '#3d0a5d',
      dark: '#6e2e8e',
      mid: '#7d349d',
      light: '#a149c7',
      lightest: '#ab4dcf',
    },
  },
  {
    id: 'avatar-violet',
    name: 'Violet',
    colorPalette: {
      darkest: '#4a0a5d',
      dark: '#7a2e8e',
      mid: '#8a349d',
      light: '#b249c7',
      lightest: '#bc4dcf',
    },
  },
  {
    id: 'avatar-red',
    name: 'Red',
    colorPalette: {
      darkest: '#5d0a0a',
      dark: '#8e2e2e',
      mid: '#9d3434',
      light: '#c74949',
      lightest: '#cf4d4d',
    },
  },
  {
    id: 'avatar-orange',
    name: 'Orange',
    colorPalette: {
      darkest: '#5d3d0a',
      dark: '#8e6e2e',
      mid: '#9d7d34',
      light: '#c7a149',
      lightest: '#cfab4d',
    },
  },
  {
    id: 'avatar-gold',
    name: 'Gold',
    colorPalette: {
      darkest: '#5d4a0a',
      dark: '#8e7a2e',
      mid: '#9d8a34',
      light: '#c7b249',
      lightest: '#cfbc4d',
    },
  },
  {
    id: 'avatar-pink',
    name: 'Pink',
    colorPalette: {
      darkest: '#5d0a3d',
      dark: '#8e2e6e',
      mid: '#9d347d',
      light: '#c749a1',
      lightest: '#cf4dab',
    },
  },
  {
    id: 'avatar-slate',
    name: 'Slate',
    colorPalette: {
      darkest: '#2a3d4a',
      dark: '#4a6070',
      mid: '#587080',
      light: '#7090a0',
      lightest: '#80a0b0',
    },
  },
  {
    id: 'avatar-charcoal',
    name: 'Charcoal',
    colorPalette: {
      darkest: '#1a1a1a',
      dark: '#3a3a3a',
      mid: '#4a4a4a',
      light: '#6a6a6a',
      lightest: '#7a7a7a',
    },
  },
];

/**
 * Check if a photo URL is a bundled avatar ID
 */
export function isAvatarId(photoUrl: string | null | undefined): boolean {
  return !!photoUrl && photoUrl.startsWith(AVATAR_PREFIX);
}

/**
 * Extract the avatar ID from a photo URL
 * @example getAvatarId("avatar:avatar-blue") => "avatar-blue"
 */
export function getAvatarId(photoUrl: string): string {
  return photoUrl.replace(AVATAR_PREFIX, '');
}

/**
 * Find an avatar configuration by its ID
 */
export function getAvatarById(avatarId: string): AvatarOption | undefined {
  return AVATARS.find((a) => a.id === avatarId);
}

/**
 * Format an avatar ID for database storage
 * @example formatAvatarUrl("avatar-blue") => "avatar:avatar-blue"
 */
export function formatAvatarUrl(avatarId: string): string {
  return `${AVATAR_PREFIX}${avatarId}`;
}

/**
 * Get the default avatar option (green)
 */
export function getDefaultAvatar(): AvatarOption {
  return AVATARS[0];
}
