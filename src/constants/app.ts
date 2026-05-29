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

export const FAQ_DATA: FAQItem[] = [
  {
    id: '1',
    question: 'How do I create a competition?',
    answer:
      'Open the Competitions tab and tap "Create" for the step-by-step wizard, or "AI Create" to describe your competition in plain English (Social tier and above). The wizard walks you through naming your competition, choosing dates, picking a handicap system, configuring rounds and game types, and inviting players.',
    category: 'getting-started',
  },
  {
    id: '2',
    question: 'How do I join a competition?',
    answer:
      'You\'ll need a 6-character invite code from the organiser (e.g. "AB12CD"). Open the Competitions tab, tap "Join" in the top right, enter the code, and tap "Look Up". You\'ll see a preview of the competition before confirming.',
    category: 'getting-started',
  },
  {
    id: '3',
    question: 'What game types are supported?',
    answer:
      'The Nineteenth supports Stableford, Stroke Play, Match Play, and Par for individual play, plus team formats like Best Ball, Scramble, and Shamble (Premium tier). Your net score is calculated from your handicap and the hole stroke index. Premium organisers can also add Skins and Wolf side-games with optional prize pools.',
    category: 'scoring',
  },
  {
    id: '4',
    question: 'Can I enter scores offline?',
    answer:
      'Yes! The app is designed to work offline on the course. Enter your scores as normal, and they\'ll automatically sync when you have an internet connection. Look for the sync indicator to see when your scores have been uploaded.',
    category: 'scoring',
  },
  {
    id: '5',
    question: 'How do I update my handicap?',
    answer:
      'Go to Profile and tap "Edit Profile". You can update your handicap (between 0 and 54) there. It\'s used to calculate your strokes received on each hole based on the course stroke index. You can also view your handicap history from the Profile menu.',
    category: 'account',
  },
  {
    id: '6',
    question: 'What are scoring pairs?',
    answer:
      'Scoring pairs is an optional feature for competitive rounds (Premium tier) where each player has a designated marker (another player) who officially records their score. This follows traditional golf competition rules where your marker attests to your score.',
    category: 'scoring',
  },
  {
    id: '7',
    question: 'How do I add friends?',
    answer:
      'Open Profile and tap "Friends", then tap "Add Friends". Search by name (at least 2 characters) and send a friend request. Once they accept, you can compare stats, see each other\'s scores, and easily add them to competitions. Free users can have up to 5 friends; Social raises this to 15, and Premium is unlimited.',
    category: 'getting-started',
  },
  {
    id: '8',
    question: 'What are leagues?',
    answer:
      'Leagues let you run cross-course competitions using the World Handicap System (WHS) handicap differential. Tag any round you play to a league and the leaderboard updates automatically. Open the Leagues tab to create one, join via invite code, or browse public leagues. Premium tier unlocks Ladder and Eclectic league formats.',
    category: 'getting-started',
  },
  {
    id: '9',
    question: 'Can I track rounds outside of a competition?',
    answer:
      'Yes — you can create standalone rounds for any social or practice round. From the Home screen, start a new round, pick your course and tees, add playing partners, and score it normally. These rounds count toward your statistics and can be tagged to a league afterwards.',
    category: 'scoring',
  },
  {
    id: '10',
    question: 'What subscription plans are available?',
    answer:
      'There are four tiers: Free (3 competitions, 1 league, Stableford + Stroke Play, up to 5 friends), Social (8 competitions, 3 leagues, +Par and Match Play, AI Create, 15 friends), Premium (50 competitions and leagues, all team formats, Skins, Wolf, prize pools, scoring pairs, unlimited friends), and Enterprise (200 competitions and leagues for large organisations). Open the Subscription screen for the full feature list.',
    category: 'subscription',
  },
  {
    id: '11',
    question: 'Can I control push notifications?',
    answer:
      'Yes. Open Profile > Notifications to toggle push notifications on or off, and choose which categories you want to receive (e.g. competition updates, friend requests, round reminders). You can also manage notifications at the device level in your phone\'s settings.',
    category: 'account',
  },
  {
    id: '12',
    question: 'How do I delete my account?',
    answer:
      'Go to Profile > Privacy & Data > Delete Account. You\'ll be asked to confirm twice, including typing "DELETE" to proceed. This permanently removes your account and personal data. Historical scores are anonymised to preserve competition records.',
    category: 'privacy',
  },
  {
    id: '13',
    question: 'How do I download my data?',
    answer:
      'Go to Profile > Privacy & Data > Download My Data. This exports all your personal data as a JSON file, which you can save or share. This is your right under data protection laws (GDPR Article 20).',
    category: 'privacy',
  },
  {
    id: '14',
    question: 'What happens to my data if I delete my account?',
    answer:
      'When you delete your account, all personal data (profile, friends, notifications, subscriptions) is permanently deleted. Historical scores in competitions are anonymised — they remain for competition integrity but are no longer linked to your identity. This process is completed within 30 days.',
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
