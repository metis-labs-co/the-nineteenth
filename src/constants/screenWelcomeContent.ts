import type { WelcomeScreenId } from '@/store/screenInfoStore';

export interface WelcomeContentItem {
  icon: string;
  text: string;
}

export interface ScreenWelcomeContent {
  icon: string;
  title: string;
  description: string;
  items: WelcomeContentItem[];
  buttonLabel: string;
}

export const SCREEN_WELCOME_CONTENT: Record<WelcomeScreenId, ScreenWelcomeContent> = {
  leagues: {
    icon: 'trophy-outline',
    title: 'Welcome to Leagues',
    description:
      'Compete with friends across any course over an ongoing season.',
    items: [
      { icon: 'plus-circle-outline', text: 'Create or join leagues with invite codes' },
      { icon: 'golf', text: 'Play rounds at any course worldwide' },
      { icon: 'sort-ascending', text: 'Standings based on WHS handicap differentials' },
      { icon: 'account-group-outline', text: 'Invite friends and track everyone\'s progress' },
    ],
    buttonLabel: 'Got it',
  },
  rounds: {
    icon: 'golf-tee',
    title: 'Welcome to Rounds',
    description:
      'Score your rounds on-course with full offline support.',
    items: [
      { icon: 'account-multiple-outline', text: 'Score solo or with friends in your group' },
      { icon: 'cards-playing-outline', text: 'Add skins & wolf mini-games for extra fun' },
      { icon: 'wifi-off', text: 'Full offline scoring — syncs when back online' },
      { icon: 'history', text: 'View your complete round history and stats' },
    ],
    buttonLabel: 'Got it',
  },
  competitions: {
    icon: 'podium',
    title: 'Welcome to Competitions',
    description:
      'Organise multi-round events with automatic scoring and leaderboards.',
    items: [
      { icon: 'format-list-bulleted', text: 'Stableford, Stroke Play, Match Play & Team formats' },
      { icon: 'cash-multiple', text: 'Optional prize pools and skins side games' },
      { icon: 'link-variant', text: 'Share invite codes so players can join easily' },
      { icon: 'chart-line', text: 'Live leaderboards update as scores come in' },
    ],
    buttonLabel: 'Got it',
  },
  courses: {
    icon: 'golf',
    title: 'Welcome to Courses',
    description:
      'Browse and save courses from our global database.',
    items: [
      { icon: 'earth', text: '42,000+ courses worldwide with full hole data' },
      { icon: 'download-outline', text: 'Import courses with tee ratings and stroke indexes' },
      { icon: 'heart-outline', text: 'Save favourite courses for quick access' },
      { icon: 'home-outline', text: 'Set your home club for personalised defaults' },
    ],
    buttonLabel: 'Got it',
  },
  leagueDetail: {
    icon: 'podium',
    title: 'How Rankings Work',
    description: 'Leagues use the World Handicap System to rank players fairly across any course.',
    items: [
      { icon: 'sort-ascending', text: 'Ranked by your average of your best 8 handicap differentials from your last 20 tagged rounds' },
      { icon: 'chart-line', text: 'A differential measures how you played relative to course difficulty — lower is better' },
      { icon: 'check-circle-outline', text: 'Only completed 18-hole rounds with a calculated differential can be tagged' },
      { icon: 'arrow-up-bold-outline', text: 'Tag more rounds — only your best performances count towards your ranking' },
    ],
    buttonLabel: 'Got it',
  },
};
