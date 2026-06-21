/**
 * Game Type Descriptions
 *
 * Detailed descriptions for each game type and team format,
 * used to help users understand the rules before selecting.
 */

import type { GameType, TeamFormat } from '@/types/database.types';

/**
 * Structure for game type information
 */
export interface GameTypeDescription {
  /** Display title */
  title: string;
  /** Icon name (Material Community Icons) */
  icon: string;
  /** Brief one-line summary */
  summary: string;
  /** Detailed explanation of how it works */
  howItWorks: string[];
  /** Scoring breakdown (if applicable) */
  scoring?: { label: string; value: string }[];
  /** Who this format is best suited for */
  bestFor: string;
  /** Pro tip for players */
  tip?: string;
}

/**
 * Individual game type descriptions
 */
export const GAME_TYPE_DESCRIPTIONS: Record<GameType, GameTypeDescription> = {
  stableford: {
    title: 'Stableford',
    icon: 'star-outline',
    summary: 'Points-based scoring that rewards good holes without punishing bad ones.',
    howItWorks: [
      'Points are awarded on each hole based on your net score (after handicap strokes)',
      'Higher total points wins the competition',
      'You can pick up your ball once you can\'t score points on a hole',
      'Keeps the round moving and reduces pressure on bad holes',
    ],
    scoring: [
      { label: 'Net Eagle or better', value: '4 points' },
      { label: 'Net Birdie', value: '3 points' },
      { label: 'Net Par', value: '2 points' },
      { label: 'Net Bogey', value: '1 point' },
      { label: 'Net Double Bogey+', value: '0 points' },
    ],
    bestFor: 'Social rounds, mixed handicap groups, and players who want a forgiving format.',
    tip: 'If you\'re already at double bogey with no chance of making bogey, pick up your ball to keep play moving.',
  },
  stroke: {
    title: 'Stroke Play',
    icon: 'counter',
    summary: 'Traditional golf scoring where lowest total strokes wins.',
    howItWorks: [
      'Count every stroke on every hole',
      'Your handicap is subtracted from your gross score to get your net score',
      'Lowest net score wins the competition',
      'Must hole out on every hole (no picking up)',
    ],
    bestFor: 'Players wanting traditional scoring, tournaments, and handicap tracking rounds.',
    tip: 'Stay patient - one bad hole doesn\'t ruin your round. Focus on minimizing total strokes.',
  },
  par: {
    title: 'Par',
    icon: 'plus-minus',
    summary: 'Win, lose, or halve each hole based on your net score versus par.',
    howItWorks: [
      'On each hole, compare your net score (after handicap) to par',
      'Beat par = Win (+1), Match par = Square (0), Lose to par = Loss (-1)',
      'Your total score is the sum of all holes (can be positive, negative, or zero)',
      'Highest total score wins the competition',
    ],
    scoring: [
      { label: 'Net Birdie or better', value: '+1 (Win)' },
      { label: 'Net Par', value: '0 (Square)' },
      { label: 'Net Bogey or worse', value: '-1 (Loss)' },
    ],
    bestFor: 'Players who enjoy hole-by-hole competition with a simple win/lose/halve format.',
    tip: 'Focus on making net pars - avoiding losses is just as important as getting wins.',
  },
  'match-play': {
    title: 'Match Play',
    icon: 'sword-cross',
    summary: 'Head-to-head competition where you win or lose each hole individually.',
    howItWorks: [
      'Compete against one opponent hole by hole',
      'Win a hole by having the lower net score',
      'Track score as "holes up" or "holes down"',
      'Match ends when one player is up by more holes than remain',
      'Can concede holes or putts to speed up play',
    ],
    scoring: [
      { label: 'Lower net score', value: 'Win the hole' },
      { label: 'Same net score', value: 'Hole is halved' },
      { label: 'Higher net score', value: 'Lose the hole' },
    ],
    bestFor: 'One-on-one competition with a more aggressive, risk-reward playing style.',
    tip: 'Match play rewards aggressive play - going for a birdie when you\'re down is often worth the risk.',
  },
  'best-ball': {
    title: 'Best Ball',
    icon: 'star-circle-outline',
    summary: 'Team format where the best individual score on each hole counts.',
    howItWorks: [
      'Each team member plays their own ball throughout',
      'On each hole, the best net score from the team is used',
      'Teams compete based on their combined best scores',
      'Individual play with team strategy',
    ],
    bestFor: 'Team competitions where players want to play their own ball while contributing to team success.',
    tip: 'If your partner has a safe par, you can play more aggressively for birdie.',
  },
  scramble: {
    title: 'Scramble',
    icon: 'target',
    summary: 'Team format where everyone plays from the best shot each time.',
    howItWorks: [
      'All team members hit from the same spot',
      'Team chooses the best shot and everyone plays from there',
      'Continue until the ball is holed',
      'Team handicap is calculated from individual handicaps',
    ],
    bestFor: 'Corporate events, charity tournaments, and groups with mixed skill levels.',
    tip: 'High handicappers should play first to take pressure off, letting low handicappers play more aggressively.',
  },
  shamble: {
    title: 'Shamble',
    icon: 'golf-tee',
    summary: 'Hybrid format: team drives, then individual play to the hole.',
    howItWorks: [
      'All team members hit their tee shot',
      'Team selects the best drive and all play from that spot',
      'From there, each player plays their own ball to the hole',
      'Best individual net score (or combined scores) counts',
    ],
    bestFor: 'Groups wanting team camaraderie off the tee with individual scoring thereafter.',
    tip: 'Pick the drive that gives everyone the best angle to the green, not just the longest.',
  },
  'alt-shot': {
    title: 'Alt Shot',
    icon: 'swap-horizontal',
    summary: 'Foursomes — partners alternate hitting one ball. Lowest net wins.',
    howItWorks: [
      'Each pair plays a single ball, alternating shots until it is holed',
      'Team handicap is 50% of the two partners\' combined handicaps',
      'Combined rounds rank teams by net total (gross minus team handicap)',
      'Ryder Cup sub-matches give the higher-handicap pair the difference in strokes, then compare net totals',
    ],
    bestFor: 'Pairs events and Ryder-Cup style team days.',
    tip: 'Agree who tees off on odd vs even holes before you start.',
  },
};

/**
 * Team format descriptions (for team round selection)
 * Some overlap with game types but with team-specific context
 */
export const TEAM_FORMAT_DESCRIPTIONS: Record<TeamFormat, GameTypeDescription> = {
  'best-ball': {
    title: 'Best Ball',
    icon: 'star-circle-outline',
    summary: 'Best individual score from each team counts on every hole.',
    howItWorks: [
      'Each team member plays their own ball for the entire hole',
      'After everyone finishes, the lowest net score is taken as the team score',
      'Works great for 2-person or 4-person teams',
      'Lower combined best scores win',
    ],
    scoring: [
      { label: 'Team score per hole', value: 'Best net from team' },
      { label: 'Winner', value: 'Lowest total team score' },
    ],
    bestFor: 'Teams wanting to play their own ball while still competing as a team.',
    tip: 'When your partner is safe, take risks. When they\'re in trouble, play it safe.',
  },
  scramble: {
    title: 'Scramble',
    icon: 'target',
    summary: 'Team plays from the best shot each time until holed.',
    howItWorks: [
      'All team members hit from the same position',
      'Team picks the best shot and everyone plays the next shot from there',
      'Repeat until the ball is holed',
      'Team handicap applied to final score',
    ],
    scoring: [
      { label: 'Team handicap', value: '35% low + 15% high (2 players)' },
      { label: 'Winner', value: 'Lowest net team score' },
    ],
    bestFor: 'Fun, fast-paced rounds ideal for corporate events and beginners.',
    tip: 'The player who hits first takes the pressure shot. If it works, others can be aggressive.',
  },
  aggregate: {
    title: 'Aggregate',
    icon: 'calculator-variant-outline',
    summary: 'Combined total of all team members\' scores.',
    howItWorks: [
      'Each team member plays their own ball and records their score',
      'All individual net scores are added together',
      'Lowest combined team total wins',
      'Every player\'s score matters equally',
    ],
    bestFor: 'Teams wanting true combined scoring where every stroke counts.',
    tip: 'Consistent play from everyone beats one great round and one poor round.',
  },
  'match-play-team': {
    title: 'Team Match Play',
    icon: 'sword-cross',
    summary: 'Teams compete hole by hole using best ball format.',
    howItWorks: [
      'Each team uses their best net score on each hole',
      'Team with the lower best-ball score wins the hole',
      'Track match as "holes up" or "holes down"',
      'Match ends when one team is up by more holes than remain',
    ],
    scoring: [
      { label: 'Lower team net', value: 'Win the hole' },
      { label: 'Same team net', value: 'Hole is halved' },
      { label: 'Match result', value: 'e.g., "3&2" or "2 UP"' },
    ],
    bestFor: 'Competitive team events with head-to-head excitement.',
    tip: 'Communicate with your partner - if one has a safe score, the other can attack.',
  },
  shamble: {
    title: 'Shamble',
    icon: 'golf-tee',
    summary: 'Team selects best drive, then each player plays their own ball.',
    howItWorks: [
      'All team members hit their tee shot',
      'Team picks the best drive position',
      'From there, everyone plays their own ball to the hole',
      'Best net score (or aggregate) counts as team score',
    ],
    bestFor: 'Groups wanting the fun of team drives with individual shot-making.',
    tip: 'Consider position over distance when choosing the team drive.',
  },
  'alt-shot': {
    title: 'Alt Shot',
    icon: 'swap-horizontal',
    summary: 'Foursomes — partners alternate hitting one ball. Lowest net wins.',
    howItWorks: [
      'Each pair plays a single ball, alternating shots until it is holed',
      'Team handicap is 50% of the two partners\' combined handicaps',
      'Lowest net score wins',
    ],
    bestFor: 'Pairs events and Ryder-Cup style team days.',
  },
};

/**
 * Get description for any game type or team format
 */
export function getGameTypeDescription(
  type: GameType | TeamFormat,
  isTeamFormat: boolean = false
): GameTypeDescription | undefined {
  if (isTeamFormat) {
    return TEAM_FORMAT_DESCRIPTIONS[type as TeamFormat];
  }
  return GAME_TYPE_DESCRIPTIONS[type as GameType];
}
