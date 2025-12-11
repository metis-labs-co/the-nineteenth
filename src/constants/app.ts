/**
 * App Constants
 *
 * Centralized app-wide constants for version, support, and configuration.
 * Keep these in sync with app.json for version information.
 */

// App Information
export const APP_NAME = 'The Nineteenth';
export const APP_VERSION = '0.1.0';
export const APP_TAGLINE = 'Made with \u26f3 in Australia';

// Support
export const SUPPORT_EMAIL = 'support@thenineteenth.app';
export const SUPPORT_URL = 'https://thenineteenth.app/support';

// External Links
export const PRIVACY_POLICY_URL = 'https://thenineteenth.app/privacy';
export const TERMS_OF_SERVICE_URL = 'https://thenineteenth.app/terms';

// Contact Form
export const CONTACT_SUBJECT_MAX_LENGTH = 100;
export const CONTACT_MESSAGE_MAX_LENGTH = 1000;
export const CONTACT_MESSAGE_MIN_LENGTH = 10;

// FAQ Data
export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category?: 'getting-started' | 'scoring' | 'account' | 'subscription';
}

export const FAQ_DATA: FAQItem[] = [
  {
    id: '1',
    question: 'How do I create a competition?',
    answer:
      'Go to the Competitions tab and tap the "+" button in the top right corner. Follow the steps to set up your competition name, dates, handicap system, and invite players. You can also add rounds and configure game types during setup.',
    category: 'getting-started',
  },
  {
    id: '2',
    question: 'How do I join a competition?',
    answer:
      'You\'ll need an invite code from the competition organiser. Go to the Competitions tab, tap "Join Competition", and enter the 6-character code. You\'ll then be added as a player to that competition.',
    category: 'getting-started',
  },
  {
    id: '3',
    question: 'How does the scoring system work?',
    answer:
      'The Nineteenth supports multiple scoring formats including Stableford, Stroke Play, and Match Play. Your net score is calculated based on your handicap and the course stroke index. Stableford points are awarded based on your net score relative to par for each hole.',
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
      'Go to your Profile and tap "Edit Profile". You can update your handicap there. Your handicap is used to calculate your strokes received on each hole based on the course stroke index.',
    category: 'account',
  },
  {
    id: '6',
    question: 'What are scoring pairs?',
    answer:
      'Scoring pairs is an optional feature for competitive rounds where each player has a designated marker (another player) who officially records their score. This follows traditional golf competition rules where your marker attests to your score.',
    category: 'scoring',
  },
  {
    id: '7',
    question: 'How do I invite friends to the app?',
    answer:
      'You can add friends through the Friends tab. Search for them by name or share your friend code. Once connected, you can see their stats, compare scores, and easily add them to your competitions.',
    category: 'getting-started',
  },
  {
    id: '8',
    question: 'What subscription plans are available?',
    answer:
      'We offer Free, Social, and Premium tiers. Free users can create up to 3 competitions with basic features. Social and Premium tiers offer more competitions, players per competition, additional game types, and advanced statistics. Check the Subscription screen for full details.',
    category: 'subscription',
  },
];

// Inquiry Types for Contact Form
export type InquiryType = 'bug' | 'feature' | 'general' | 'account';

export interface InquiryOption {
  type: InquiryType;
  label: string;
  icon: string;
  description: string;
}

export const INQUIRY_OPTIONS: InquiryOption[] = [
  {
    type: 'bug',
    label: 'Report a Bug',
    icon: 'bug',
    description: 'Something not working correctly',
  },
  {
    type: 'feature',
    label: 'Feature Request',
    icon: 'lightbulb-on',
    description: 'Suggest a new feature',
  },
  {
    type: 'general',
    label: 'General Inquiry',
    icon: 'help-circle',
    description: 'Questions or feedback',
  },
  {
    type: 'account',
    label: 'Account Issue',
    icon: 'account-alert',
    description: 'Login, profile, or subscription',
  },
];
