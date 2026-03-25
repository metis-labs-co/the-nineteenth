/**
 * useWizardTeams - Team generation and management for the create round wizard
 *
 * Handles:
 * - Team generation (pairs of 2, with odd player as own team for 2v1)
 * - Fisher-Yates shuffle for team randomization
 * - Auto-enable/disable teams based on game type
 * - Regenerate teams when partners change for Best Ball
 */

import { useCallback, useEffect } from 'react';
import type { GameType } from '@/types/database.types';
import type { PlayingPartner, ScrambleTeam, WizardData } from '../types';

/** Generate a UUID v4 for team IDs */
const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/** Team game types that require splitIntoTeams for skins */
const TEAM_GAME_TYPES: GameType[] = ['best-ball', 'scramble', 'shamble'];

/** Game types that support optional team splitting (user can choose) */
const OPTIONAL_TEAM_FORMATS: GameType[] = ['scramble', 'shamble', 'match-play'];

interface UseWizardTeamsParams {
  currentUserAsPartner: PlayingPartner | null;
  data: WizardData;
  setData: React.Dispatch<React.SetStateAction<WizardData>>;
}

export function useWizardTeams({
  currentUserAsPartner,
  data,
  setData,
}: UseWizardTeamsParams) {
  // Team generation: creates teams of 2, odd player gets own team (2v1)
  const generateTeams = useCallback(
    (players: PlayingPartner[]): ScrambleTeam[] => {
      if (!currentUserAsPartner) return [];

      const allPlayers = [currentUserAsPartner, ...players];
      const teams: ScrambleTeam[] = [];

      for (let i = 0; i < allPlayers.length; i += 2) {
        const members = [allPlayers[i]];
        if (i + 1 < allPlayers.length) {
          members.push(allPlayers[i + 1]);
        }
        teams.push({
          id: generateUUID(),
          name: `Team ${teams.length + 1}`,
          members,
        });
      }
      return teams;
    },
    [currentUserAsPartner]
  );

  // Fisher-Yates shuffle for team randomization
  const shuffleTeams = useCallback(() => {
    if (data.teamsLocked || !currentUserAsPartner) return;

    const allPlayers = [currentUserAsPartner, ...data.selectedPartners];

    const shuffled = [...allPlayers];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const teams: ScrambleTeam[] = [];
    for (let i = 0; i < shuffled.length; i += 2) {
      const members = [shuffled[i]];
      if (i + 1 < shuffled.length) {
        members.push(shuffled[i + 1]);
      }
      teams.push({
        id: generateUUID(),
        name: `Team ${teams.length + 1}`,
        members,
      });
    }

    setData((prev) => ({ ...prev, teams }));
  }, [data.teamsLocked, data.selectedPartners, currentUserAsPartner, setData]);

  // Handler for split into teams toggle
  const setSplitIntoTeams = useCallback(
    (enabled: boolean) => {
      if (enabled && currentUserAsPartner) {
        const teams = generateTeams(data.selectedPartners);
        const shouldDisableSkins = teams.length < 2;
        setData((prev) => ({
          ...prev,
          splitIntoTeams: true,
          teams,
          skinsEnabled: shouldDisableSkins ? false : prev.skinsEnabled,
          skinsConfig: shouldDisableSkins ? null : prev.skinsConfig,
        }));
      } else {
        const isTeamFormat = data.selectedMatchType && TEAM_GAME_TYPES.includes(data.selectedMatchType);
        setData((prev) => ({
          ...prev,
          splitIntoTeams: false,
          teams: [],
          skinsEnabled: isTeamFormat ? false : prev.skinsEnabled,
          skinsConfig: isTeamFormat ? null : prev.skinsConfig,
        }));
      }
    },
    [currentUserAsPartner, data.selectedPartners, data.selectedMatchType, generateTeams, setData]
  );

  // Auto-enable teams for Best Ball format; clear for non-team formats
  useEffect(() => {
    const isTeamFormat = data.selectedMatchType && TEAM_GAME_TYPES.includes(data.selectedMatchType);
    const isBestBall = data.selectedMatchType === 'best-ball';

    if (isBestBall && currentUserAsPartner && data.selectedPartners.length >= 1) {
      if (!data.splitIntoTeams) {
        const teams = generateTeams(data.selectedPartners);
        setData((prev) => ({
          ...prev,
          splitIntoTeams: true,
          teams,
        }));
      }
    } else if (!isTeamFormat && data.splitIntoTeams && !OPTIONAL_TEAM_FORMATS.includes(data.selectedMatchType!)) {
      setData((prev) => ({
        ...prev,
        splitIntoTeams: false,
        teams: [],
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- uses .length intentionally to avoid re-running on partner order changes
  }, [data.selectedMatchType, data.splitIntoTeams, data.selectedPartners.length, currentUserAsPartner, generateTeams, setData]);

  // Regenerate teams when partners change for Best Ball
  useEffect(() => {
    const isBestBall = data.selectedMatchType === 'best-ball';
    if (isBestBall && data.splitIntoTeams && currentUserAsPartner) {
      const teams = generateTeams(data.selectedPartners);
      setData((prev) => {
        const currentMemberIds = prev.teams.flatMap((t) => t.members.map((m) => m.id)).sort().join(',');
        const newMemberIds = teams.flatMap((t) => t.members.map((m) => m.id)).sort().join(',');
        if (currentMemberIds !== newMemberIds) {
          return { ...prev, teams };
        }
        return prev;
      });
    }
  }, [data.selectedMatchType, data.splitIntoTeams, data.selectedPartners, currentUserAsPartner, generateTeams, setData]);

  return {
    shuffleTeams,
    setSplitIntoTeams,
  };
}
