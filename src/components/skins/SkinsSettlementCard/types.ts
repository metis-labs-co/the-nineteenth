/**
 * Shared types for SkinsSettlementCard sub-components
 */

/**
 * Individual player debt transaction (from simplifyDebts)
 */
export interface DebtTransaction {
  from_player_id: string;
  to_player_id: string;
  amount: number;
}

/**
 * Team debt transaction (from simplifyTeamDebts)
 */
export interface TeamDebtTransaction {
  from_team_id: string;
  to_team_id: string;
  amount: number;
  per_member_amount: number;
}
