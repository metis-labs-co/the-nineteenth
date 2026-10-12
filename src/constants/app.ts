/**
 * App Constants
 *
 * Centralized app-wide constants for version, support, and configuration.
 */

import Constants from 'expo-constants';

// App Information
export const APP_NAME = 'The Nineteenth';
export const APP_VERSION = Constants.expoConfig?.version ?? '1.1.1';
export const APP_TAGLINE = 'Made with \u26f3 in Australia';

// Support Emails
export const SUPPORT_EMAIL = 'support@thenineteenth.golf';
export const CONTACT_EMAIL = 'contact@thenineteenth.golf';
export const PRIVACY_EMAIL = 'support@thenineteenth.golf';
export const SUPPORT_URL = 'https://thenineteenth.golf/support';

// External Links
export const PRIVACY_POLICY_URL = 'https://thenineteenth.golf/privacy';
export const TERMS_OF_SERVICE_URL = 'https://thenineteenth.golf/terms';

// Contact Form
export const CONTACT_SUBJECT_MAX_LENGTH = 100;
export const CONTACT_MESSAGE_MAX_LENGTH = 1000;
export const CONTACT_MESSAGE_MIN_LENGTH = 10;

// FAQ Data
export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category?: 'getting-started' | 'scoring' | 'account' | 'subscription' | 'privacy';
}

// Ordered by category: getting started, scoring, account, subscription, privacy.
export const FAQ_DATA: FAQItem[] = [
  {
    id: '1',
    question: 'How do I score a social round?',
    answer:
      'Tap "Score Social Round" on the Home screen or the Rounds tab. Pick a game format and course, choose full 18, front 9 or back 9, then choose "Play now" or "Schedule for later". Add playing partners (friends or guests), pick each player\'s tees, set up scoring options and tap "Start Scoring".',
    category: 'getting-started',
  },
  {
    id: '2',
    question: 'Can I schedule a round and invite friends?',
    answer:
      'Yes. When setting up a social round, choose "Schedule for later" and set a date and tee time, then invite friends. They can accept or decline, and you can see who\'s in from the round\'s screen. You can change the time, invite more players, cancel the round (invited players are notified) or start it when everyone arrives. Turn on Tee Time Reminders in Push Notifications to get a nudge 30 minutes before.',
    category: 'getting-started',
  },
  {
    id: '3',
    question: 'How do I create a competition?',
    answer:
      'Open the Comps tab and tap "Create". The step-by-step wizard walks you through naming your competition, choosing dates and a handicap system, configuring rounds and game types, and inviting players. You can also make a Knockout competition, which runs as a bracket-style elimination.',
    category: 'getting-started',
  },
  {
    id: '4',
    question: 'How do I join a competition?',
    answer:
      'Ask the organiser for the invite code (usually 6 characters, e.g. "AB12CD", though organisers can set their own). Open the Comps tab, tap "Join", enter the code and tap "Look Up". You\'ll see a preview of the competition before tapping "Join Competition".',
    category: 'getting-started',
  },
  {
    id: '5',
    question: 'What are leagues?',
    answer:
      'Leagues are ongoing competitions you play across any courses, ranked by score differentials so different courses compare fairly. Open the Comps tab and switch to "Leagues" to create one, join with an invite code, or browse public leagues. Tag a completed round to a league by swiping it in the Rounds tab, from the round\'s screen, or with "Tag a Round" in the league. Ongoing, Season and Round Limit leagues are available on all plans; Premium adds Ladder, Eclectic and Partnership leagues.',
    category: 'getting-started',
  },
  {
    id: '6',
    question: 'How do I add friends?',
    answer:
      'Open Profile and tap "Friends", then tap "Add Friends". Search by name (at least 2 characters) and send a friend request. Once they accept, you can see each other\'s rounds and activity and add each other to rounds and competitions. Social and Premium members can also compare stats. Free accounts can have up to 5 friends, Social up to 15, and Premium is unlimited.',
    category: 'getting-started',
  },
  {
    id: '7',
    question: 'What game types are supported?',
    answer:
      'Individual formats are Stableford, Stroke Play, Par and Match Play. Team formats include Best Ball, Scramble, Shamble and Team Match Play, and competitions add Team Stableford, Alt Shot (Foursomes) and Ryder Cup-style team matches. Free covers Stableford and Stroke Play, Social adds Match Play and Par, and Premium unlocks team formats. Premium members can also add Skins and Wolf side-games, with optional prize pools, to social rounds and competitions.',
    category: 'scoring',
  },
  {
    id: '8',
    question: 'Can I enter scores offline?',
    answer:
      'Yes! Score entry works without signal. Enter scores as normal and they sync automatically when you\'re back online. A banner under the round header shows "Offline" with how many changes are waiting, "Syncing changes..." while uploading, or "Sync failed" with a retry button. Changing tees mid-round needs a connection.',
    category: 'scoring',
  },
  {
    id: '9',
    question: 'What if I pick up on a hole?',
    answer:
      'Tap "Pick Up" when entering that hole\'s score. The hole counts as scored and is treated as a net double bogey in your totals, so you can keep the round moving.',
    category: 'scoring',
  },
  {
    id: '10',
    question: 'Can I end a round before the last hole?',
    answer:
      'Yes, for social rounds. Tap the ⋮ menu in the scoring header and choose "End round early". The round finishes on the last hole every player has scored, and any scores after that hole are removed — the sheet shows you exactly what will change first. Rounds ended early don\'t count towards your Social Handicap or league tagging. It isn\'t available when scoring pairs are in use.',
    category: 'scoring',
  },
  {
    id: '11',
    question: 'Can I change tees during a round?',
    answer:
      'Yes. Tap "Change tees" in the scoring header. Only the round owner (or the organiser, for competition rounds) can change tees, and you need an internet connection to do it.',
    category: 'scoring',
  },
  {
    id: '12',
    question: 'What happens if two scorers enter different scores?',
    answer:
      'If more than one person scores the same player and their numbers don\'t match, you\'ll be asked to resolve the differences when reviewing the scorecard before it can be submitted.',
    category: 'scoring',
  },
  {
    id: '13',
    question: 'What are scoring pairs?',
    answer:
      'Scoring pairs (Premium) give each player a designated marker — another player who officially records their score, as in traditional golf competitions. Turn on "Require Scoring Pairs" when setting up a social round or a competition round.',
    category: 'scoring',
  },
  {
    id: '14',
    question: 'How do I delete a round?',
    answer:
      'Swipe left on a social round in the Rounds tab, or on its card under "Continue scoring" on the Home screen, and tap delete (or use Round options while scoring). If it\'s a scheduled round with invited players, deleting it cancels the round and notifies them. Competition rounds are managed by the organiser from the competition.',
    category: 'scoring',
  },
  {
    id: '15',
    question: 'Can I change a round while I\'m playing it?',
    answer:
      'Yes, if you started the round. In score entry tap the ⋮ menu and choose Round options to switch between full 18, front 9 and back 9, add or remove players, change tees, end the round early or delete it. Adding and removing players works for Stableford, Stroke Play and Par rounds without Skins, Wolf or scoring pairs. Removing a player deletes their scores for that round. Apart from ending the round early, these changes need an internet connection; anyone else scoring the round sees them automatically.',
    category: 'scoring',
  },
  {
    id: '16',
    question: 'Does the app show distances on the course?',
    answer:
      'Yes. While scoring, the distance to the green appears in the round header — tap it to open the hole map. If you have an Apple Watch, the companion app lets you score, check distances and see the leaderboard from your wrist.',
    category: 'scoring',
  },
  {
    id: '17',
    question: 'How do I update my handicap?',
    answer:
      'Go to Profile and tap "Edit Profile". You can update your handicap (between -5 and 54) there. It\'s used to calculate the strokes you receive on each hole based on the course stroke index.',
    category: 'account',
  },
  {
    id: '18',
    question: 'What is my Social Handicap?',
    answer:
      'Your Social Handicap is calculated by The Nineteenth from your best recent rounds in the app (up to your last 20). It is unique to The Nineteenth and is not an official golf handicap. Only completed 18-hole rounds count; shared-ball formats like Scramble and Alt Shot, and rounds ended early, are left out. You can combine two 9-hole rounds into an 18 on the Social Handicap screen (Profile > Social Handicap). Social and Premium members also get the full history and trend chart.',
    category: 'account',
  },
  {
    id: '19',
    question: 'What are guest players?',
    answer:
      'Guests are players without an app account that you add to a round, using "Create Guest" when choosing partners. If that person joins later, link their guest history to their account from Profile > Manage Guest Players (Social and Premium) so their past rounds carry over.',
    category: 'account',
  },
  {
    id: '20',
    question: 'Can I control push notifications?',
    answer:
      'Yes. Open Profile > Push Notifications and switch on "Enable Push Notifications", then choose the types you want: Competition Updates, Friend Requests, Scorecard Updates, League Updates, Side Games & Payouts, Tee Time Reminders and Social Activity. If notifications are blocked for the app, you\'ll be prompted to turn them on in your phone\'s settings first.',
    category: 'account',
  },
  {
    id: '21',
    question: 'Why do I need to confirm my age?',
    answer:
      'Social features like the activity feed, comments, photos and public leagues are only available to players aged 13 and over. Confirm your date of birth from the "Confirm your age" card on your Profile. We only store whether you\'re over 13, not your date of birth. Until you confirm, social features stay switched off.',
    category: 'account',
  },
  {
    id: '22',
    question: 'How do I block or report someone?',
    answer:
      'Open the player\'s profile and tap "Block" or "Report". Blocking removes any friendship between you and hides each other\'s comments, photos and activity. Comments and photos can also be reported individually. To unblock someone, go to Profile > Blocked players.',
    category: 'account',
  },
  {
    id: '23',
    question: 'How do I customise the app\'s look?',
    answer:
      'Open Profile > Appearance to choose Light, Dark or System theme, a solid or translucent surface style, and whether to show a background image. To personalise your profile, use Profile > Customize Profile to equip badges, frames and titles earned through achievements.',
    category: 'account',
  },
  {
    id: '24',
    question: 'What subscription plans are available?',
    answer:
      'There are three plans. Free: 3 competitions, 1 league, 20 social rounds, 5 friends, Stableford and Stroke Play. Social: 8 competitions, 3 leagues, unlimited social rounds, 15 friends, Match Play and Par, detailed stats, Social Handicap history and guest management. Premium: 50 competitions and leagues, all team formats, Skins, Wolf, prize pools, scoring pairs, Game Results and unlimited friends. Open Profile > My Subscription for the full feature list.',
    category: 'subscription',
  },
  {
    id: '25',
    question: 'Who can see my details?',
    answer:
      'Other players never see your email address or phone number. On the global achievement leaderboard, players who aren\'t your friends appear under an anonymous nickname. Blocking someone hides your activity from them.',
    category: 'privacy',
  },
  {
    id: '26',
    question: 'How do I download my data?',
    answer:
      'Go to Profile > Privacy & Data > Download My Data. This exports your account data (profile, rounds, scores, competitions, friends and more) as a JSON file that you can save or share. This is your right under data protection laws (GDPR Article 20).',
    category: 'privacy',
  },
  {
    id: '27',
    question: 'How do I delete my account?',
    answer:
      'Go to Profile > Privacy & Data > Delete Account. You\'ll be asked to confirm twice, including typing "DELETE" and tapping "Delete Forever". This permanently removes your account and personal data straight away. Your historical scores are anonymised to preserve competition and round records.',
    category: 'privacy',
  },
  {
    id: '28',
    question: 'What happens to my data if I delete my account?',
    answer:
      'Your profile, friends, notifications, subscription and preferences are deleted immediately, and you\'re removed from all competitions and leagues. Scores from rounds you played with others stay, but are anonymised so they\'re no longer linked to you. Social rounds where you were the only player are deleted. Copies in backups are cleared within 30 days.',
    category: 'privacy',
  },
];

// Inquiry Types for Contact Form
export type InquiryType = 'bug' | 'feature' | 'general' | 'account';

export interface InquiryOption {
  type: InquiryType;
  label: string;
  icon: string;
  description: string;
  email: typeof SUPPORT_EMAIL | typeof CONTACT_EMAIL;
}

export const INQUIRY_OPTIONS: InquiryOption[] = [
  {
    type: 'bug',
    label: 'Report a Bug',
    icon: 'bug',
    description: 'Something not working correctly',
    email: SUPPORT_EMAIL,
  },
  {
    type: 'feature',
    label: 'Feature Request',
    icon: 'lightbulb-on',
    description: 'Suggest a new feature',
    email: CONTACT_EMAIL,
  },
  {
    type: 'general',
    label: 'General Inquiry',
    icon: 'help-circle',
    description: 'Questions or feedback',
    email: CONTACT_EMAIL,
  },
  {
    type: 'account',
    label: 'Account Issue',
    icon: 'account-alert',
    description: 'Login, profile, or subscription',
    email: SUPPORT_EMAIL,
  },
];

/**
 * Get the appropriate email address for an inquiry type
 */
export function getEmailForInquiryType(type: InquiryType): string {
  const option = INQUIRY_OPTIONS.find((opt) => opt.type === type);
  return option?.email ?? SUPPORT_EMAIL;
}
