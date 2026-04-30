export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      achievement_definitions: {
        Row: {
          base_achievement: string | null
          category: Database["public"]["Enums"]["achievement_category"]
          code: string
          created_at: string
          description: string
          icon: string
          id: string
          is_hidden: boolean
          name: string
          points: number
          rarity: Database["public"]["Enums"]["achievement_rarity"]
          threshold: number
          tier: number
        }
        Insert: {
          base_achievement?: string | null
          category: Database["public"]["Enums"]["achievement_category"]
          code: string
          created_at?: string
          description: string
          icon: string
          id?: string
          is_hidden?: boolean
          name: string
          points?: number
          rarity?: Database["public"]["Enums"]["achievement_rarity"]
          threshold: number
          tier?: number
        }
        Update: {
          base_achievement?: string | null
          category?: Database["public"]["Enums"]["achievement_category"]
          code?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          is_hidden?: boolean
          name?: string
          points?: number
          rarity?: Database["public"]["Enums"]["achievement_rarity"]
          threshold?: number
          tier?: number
        }
        Relationships: []
      }
      achievement_progress: {
        Row: {
          achievement_code: string
          current_value: number
          id: string
          last_updated: string
          player_id: string
        }
        Insert: {
          achievement_code: string
          current_value?: number
          id?: string
          last_updated?: string
          player_id: string
        }
        Update: {
          achievement_code?: string
          current_value?: number
          id?: string
          last_updated?: string
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievement_progress_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "achievement_progress_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      archived_courses_pre_clubs: {
        Row: {
          archived_at: string | null
          course_rating: number | null
          created_at: string | null
          description: string | null
          holes: Json | null
          id: string
          name: string
          slope_rating: number | null
          tees: Json | null
          updated_at: string | null
          venue_id: string
        }
        Insert: {
          archived_at?: string | null
          course_rating?: number | null
          created_at?: string | null
          description?: string | null
          holes?: Json | null
          id: string
          name: string
          slope_rating?: number | null
          tees?: Json | null
          updated_at?: string | null
          venue_id: string
        }
        Update: {
          archived_at?: string | null
          course_rating?: number | null
          created_at?: string | null
          description?: string | null
          holes?: Json | null
          id?: string
          name?: string
          slope_rating?: number | null
          tees?: Json | null
          updated_at?: string | null
          venue_id?: string
        }
        Relationships: []
      }
      archived_venues_pre_clubs: {
        Row: {
          address: string | null
          api_id: string | null
          archived_at: string | null
          city: string | null
          country: string | null
          created_at: string | null
          email: string | null
          id: string
          last_synced: string | null
          latitude: number | null
          location: unknown
          longitude: number | null
          name: string
          phone: string | null
          source: string | null
          state: string | null
          total_holes: number | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          api_id?: string | null
          archived_at?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          id: string
          last_synced?: string | null
          latitude?: number | null
          location?: unknown
          longitude?: number | null
          name: string
          phone?: string | null
          source?: string | null
          state?: string | null
          total_holes?: number | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          api_id?: string | null
          archived_at?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          last_synced?: string | null
          latitude?: number | null
          location?: unknown
          longitude?: number | null
          name?: string
          phone?: string | null
          source?: string | null
          state?: string | null
          total_holes?: number | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      clubs: {
        Row: {
          address: string | null
          city: string | null
          continent: string | null
          country: string | null
          created_at: string | null
          email: string | null
          golfapi_club_id: string | null
          id: string
          is_featured: boolean
          last_synced: string | null
          location: unknown
          name: string
          phone: string | null
          postal_code: string | null
          source: string
          state: string | null
          total_holes: number | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          continent?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          golfapi_club_id?: string | null
          id?: string
          is_featured?: boolean
          last_synced?: string | null
          location?: unknown
          name: string
          phone?: string | null
          postal_code?: string | null
          source: string
          state?: string | null
          total_holes?: number | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          continent?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          golfapi_club_id?: string | null
          id?: string
          is_featured?: boolean
          last_synced?: string | null
          location?: unknown
          name?: string
          phone?: string | null
          postal_code?: string | null
          source?: string
          state?: string | null
          total_holes?: number | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      competition_players: {
        Row: {
          competition_id: string
          created_at: string | null
          deleted_at: string | null
          invited_at: string | null
          player_id: string
          responded_at: string | null
          status: string | null
        }
        Insert: {
          competition_id: string
          created_at?: string | null
          deleted_at?: string | null
          invited_at?: string | null
          player_id: string
          responded_at?: string | null
          status?: string | null
        }
        Update: {
          competition_id?: string
          created_at?: string | null
          deleted_at?: string | null
          invited_at?: string | null
          player_id?: string
          responded_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competition_players_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "competition_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_prize_pools: {
        Row: {
          competition_id: string
          created_at: string
          created_by: string
          currency: string
          funding_amount: number
          funding_type: string
          id: string
          is_locked: boolean
          locked_at: string | null
          status: string
          target_type: string
          total_pool_amount: number
          updated_at: string
        }
        Insert: {
          competition_id: string
          created_at?: string
          created_by: string
          currency?: string
          funding_amount: number
          funding_type?: string
          id?: string
          is_locked?: boolean
          locked_at?: string | null
          status?: string
          target_type?: string
          total_pool_amount: number
          updated_at?: string
        }
        Update: {
          competition_id?: string
          created_at?: string
          created_by?: string
          currency?: string
          funding_amount?: number
          funding_type?: string
          id?: string
          is_locked?: boolean
          locked_at?: string | null
          status?: string
          target_type?: string
          total_pool_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_prize_pools_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_prize_pools_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "competition_prize_pools_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_skins_config: {
        Row: {
          competition_id: string
          created_at: string
          created_by: string
          currency: string
          disclaimer_accepted_at: string | null
          disclaimer_accepted_by: string | null
          id: string
          pot_type: string
          pot_value: number
          scoring_type: string
          selected_round_ids: string[]
          settlement_mode: string
          skins_mode: string
          updated_at: string
        }
        Insert: {
          competition_id: string
          created_at?: string
          created_by: string
          currency?: string
          disclaimer_accepted_at?: string | null
          disclaimer_accepted_by?: string | null
          id?: string
          pot_type?: string
          pot_value?: number
          scoring_type?: string
          selected_round_ids?: string[]
          settlement_mode?: string
          skins_mode?: string
          updated_at?: string
        }
        Update: {
          competition_id?: string
          created_at?: string
          created_by?: string
          currency?: string
          disclaimer_accepted_at?: string | null
          disclaimer_accepted_by?: string | null
          id?: string
          pot_type?: string
          pot_value?: number
          scoring_type?: string
          selected_round_ids?: string[]
          settlement_mode?: string
          skins_mode?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_skins_config_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: true
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_skins_config_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "competition_skins_config_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_skins_config_disclaimer_accepted_by_fkey"
            columns: ["disclaimer_accepted_by"]
            isOneToOne: false
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "competition_skins_config_disclaimer_accepted_by_fkey"
            columns: ["disclaimer_accepted_by"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_skins_games: {
        Row: {
          competition_id: string
          completed_at: string | null
          config_id: string
          created_at: string
          current_carryover: number
          current_round_number: number
          id: string
          participant_ids: string[]
          rounds_completed: number
          status: string
          total_pot: number
          updated_at: string
        }
        Insert: {
          competition_id: string
          completed_at?: string | null
          config_id: string
          created_at?: string
          current_carryover?: number
          current_round_number?: number
          id?: string
          participant_ids: string[]
          rounds_completed?: number
          status?: string
          total_pot?: number
          updated_at?: string
        }
        Update: {
          competition_id?: string
          completed_at?: string | null
          config_id?: string
          created_at?: string
          current_carryover?: number
          current_round_number?: number
          id?: string
          participant_ids?: string[]
          rounds_completed?: number
          status?: string
          total_pot?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_skins_games_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: true
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_skins_games_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "competition_skins_config"
            referencedColumns: ["id"]
          },
        ]
      }
      competitions: {
        Row: {
          competition_type: string
          created_at: string | null
          deleted_at: string | null
          description: string | null
          end_date: string | null
          handicap_source: Database["public"]["Enums"]["handicap_source"]
          handicap_system: string
          id: string
          invite_code: string
          knockout_config: Json | null
          name: string
          organizer_id: string
          point_system: Json
          start_date: string
          status: string | null
          team_mode: Database["public"]["Enums"]["team_mode"]
          team_size: number | null
          updated_at: string | null
          visibility: string
        }
        Insert: {
          competition_type?: string
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          handicap_source?: Database["public"]["Enums"]["handicap_source"]
          handicap_system: string
          id?: string
          invite_code: string
          knockout_config?: Json | null
          name: string
          organizer_id: string
          point_system?: Json
          start_date: string
          status?: string | null
          team_mode?: Database["public"]["Enums"]["team_mode"]
          team_size?: number | null
          updated_at?: string | null
          visibility?: string
        }
        Update: {
          competition_type?: string
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          handicap_source?: Database["public"]["Enums"]["handicap_source"]
          handicap_system?: string
          id?: string
          invite_code?: string
          knockout_config?: Json | null
          name?: string
          organizer_id?: string
          point_system?: Json
          start_date?: string
          status?: string | null
          team_mode?: Database["public"]["Enums"]["team_mode"]
          team_size?: number | null
          updated_at?: string | null
          visibility?: string
        }
        Relationships: []
      }
      cosmetic_definitions: {
        Row: {
          code: string
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          points_required: number
          sort_order: number
          type: Database["public"]["Enums"]["cosmetic_type"]
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          points_required: number
          sort_order?: number
          type: Database["public"]["Enums"]["cosmetic_type"]
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          points_required?: number
          sort_order?: number
          type?: Database["public"]["Enums"]["cosmetic_type"]
        }
        Relationships: []
      }
      courses: {
        Row: {
          api_locked: boolean
          club_id: string
          course_rating: number | null
          created_at: string | null
          description: string | null
          golfapi_course_id: string | null
          golfapi_long_course_id: string | null
          golfapi_updated_at: string | null
          holes: Json
          holes_women: Json | null
          id: string
          match_play_indexes: Json | null
          measure_unit: string | null
          name: string
          num_holes: number | null
          slope_rating: number | null
          tees: Json | null
          tees_migrated: boolean | null
          updated_at: string | null
        }
        Insert: {
          api_locked?: boolean
          club_id: string
          course_rating?: number | null
          created_at?: string | null
          description?: string | null
          golfapi_course_id?: string | null
          golfapi_long_course_id?: string | null
          golfapi_updated_at?: string | null
          holes?: Json
          holes_women?: Json | null
          id?: string
          match_play_indexes?: Json | null
          measure_unit?: string | null
          name: string
          num_holes?: number | null
          slope_rating?: number | null
          tees?: Json | null
          tees_migrated?: boolean | null
          updated_at?: string | null
        }
        Update: {
          api_locked?: boolean
          club_id?: string
          course_rating?: number | null
          created_at?: string | null
          description?: string | null
          golfapi_course_id?: string | null
          golfapi_long_course_id?: string | null
          golfapi_updated_at?: string | null
          holes?: Json
          holes_women?: Json | null
          id?: string
          match_play_indexes?: Json | null
          measure_unit?: string | null
          name?: string
          num_holes?: number | null
          slope_rating?: number | null
          tees?: Json | null
          tees_migrated?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      eclectic_best_scores: {
        Row: {
          achieved_at: string | null
          best_gross: number
          best_net: number | null
          hole_number: number
          id: string
          league_id: string
          player_id: string
          source_scorecard_id: string
        }
        Insert: {
          achieved_at?: string | null
          best_gross: number
          best_net?: number | null
          hole_number: number
          id?: string
          league_id: string
          player_id: string
          source_scorecard_id: string
        }
        Update: {
          achieved_at?: string | null
          best_gross?: number
          best_net?: number | null
          hole_number?: number
          id?: string
          league_id?: string
          player_id?: string
          source_scorecard_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "eclectic_best_scores_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eclectic_best_scores_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "eclectic_best_scores_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eclectic_best_scores_source_scorecard_id_fkey"
            columns: ["source_scorecard_id"]
            isOneToOne: false
            referencedRelation: "scorecards"
            referencedColumns: ["id"]
          },
        ]
      }
      favorite_courses: {
        Row: {
          course_id: string
          created_at: string
          id: string
          player_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          player_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorite_courses_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "favorite_courses_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string | null
          id: string
          requester_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          addressee_id: string
          created_at?: string | null
          id?: string
          requester_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          addressee_id?: string
          created_at?: string | null
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "friendships_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "friendships_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      hole_coordinates: {
        Row: {
          course_id: string
          created_at: string | null
          hole_number: number
          id: string
          latitude: number
          location: unknown
          longitude: number
          poi_type: string
          side_of_fairway: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          hole_number: number
          id?: string
          latitude: number
          location?: unknown
          longitude: number
          poi_type: string
          side_of_fairway?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          hole_number?: number
          id?: string
          latitude?: number
          location?: unknown
          longitude?: number
          poi_type?: string
          side_of_fairway?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hole_coordinates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      knockout_matches: {
        Row: {
          bracket_position: number
          bracket_type: string
          competition_id: string
          consolation_match_id: string | null
          consolation_match_slot: number | null
          created_at: string | null
          id: string
          loser_id: string | null
          next_match_id: string | null
          next_match_slot: number | null
          pairing_id: string | null
          player1_id: string | null
          player1_score: number | null
          player2_id: string | null
          player2_score: number | null
          round_id: string
          seed1: number | null
          seed2: number | null
          stage: number
          status: string
          updated_at: string | null
          winner_id: string | null
        }
        Insert: {
          bracket_position: number
          bracket_type: string
          competition_id: string
          consolation_match_id?: string | null
          consolation_match_slot?: number | null
          created_at?: string | null
          id?: string
          loser_id?: string | null
          next_match_id?: string | null
          next_match_slot?: number | null
          pairing_id?: string | null
          player1_id?: string | null
          player1_score?: number | null
          player2_id?: string | null
          player2_score?: number | null
          round_id: string
          seed1?: number | null
          seed2?: number | null
          stage: number
          status?: string
          updated_at?: string | null
          winner_id?: string | null
        }
        Update: {
          bracket_position?: number
          bracket_type?: string
          competition_id?: string
          consolation_match_id?: string | null
          consolation_match_slot?: number | null
          created_at?: string | null
          id?: string
          loser_id?: string | null
          next_match_id?: string | null
          next_match_slot?: number | null
          pairing_id?: string | null
          player1_id?: string | null
          player1_score?: number | null
          player2_id?: string | null
          player2_score?: number | null
          round_id?: string
          seed1?: number | null
          seed2?: number | null
          stage?: number
          status?: string
          updated_at?: string | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knockout_matches_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knockout_matches_consolation_match_id_fkey"
            columns: ["consolation_match_id"]
            isOneToOne: false
            referencedRelation: "knockout_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knockout_matches_loser_id_fkey"
            columns: ["loser_id"]
            isOneToOne: false
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "knockout_matches_loser_id_fkey"
            columns: ["loser_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knockout_matches_next_match_id_fkey"
            columns: ["next_match_id"]
            isOneToOne: false
            referencedRelation: "knockout_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knockout_matches_pairing_id_fkey"
            columns: ["pairing_id"]
            isOneToOne: false
            referencedRelation: "pairings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knockout_matches_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "knockout_matches_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knockout_matches_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "knockout_matches_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knockout_matches_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knockout_matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "knockout_matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      ladder_challenges: {
        Row: {
          accepted_at: string | null
          challenged_differential: number | null
          challenged_id: string
          challenged_position: number
          challenged_scorecard_id: string | null
          challenger_differential: number | null
          challenger_id: string
          challenger_position: number
          challenger_scorecard_id: string | null
          completed_at: string | null
          created_at: string | null
          deadline: string | null
          id: string
          league_id: string
          status: string
          winner_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          challenged_differential?: number | null
          challenged_id: string
          challenged_position: number
          challenged_scorecard_id?: string | null
          challenger_differential?: number | null
          challenger_id: string
          challenger_position: number
          challenger_scorecard_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          deadline?: string | null
          id?: string
          league_id: string
          status?: string
          winner_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          challenged_differential?: number | null
          challenged_id?: string
          challenged_position?: number
          challenged_scorecard_id?: string | null
          challenger_differential?: number | null
          challenger_id?: string
          challenger_position?: number
          challenger_scorecard_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          deadline?: string | null
          id?: string
          league_id?: string
          status?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ladder_challenges_challenged_id_fkey"
            columns: ["challenged_id"]
            isOneToOne: false
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "ladder_challenges_challenged_id_fkey"
            columns: ["challenged_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ladder_challenges_challenged_scorecard_id_fkey"
            columns: ["challenged_scorecard_id"]
            isOneToOne: false
            referencedRelation: "scorecards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ladder_challenges_challenger_id_fkey"
            columns: ["challenger_id"]
            isOneToOne: false
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "ladder_challenges_challenger_id_fkey"
            columns: ["challenger_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ladder_challenges_challenger_scorecard_id_fkey"
            columns: ["challenger_scorecard_id"]
            isOneToOne: false
            referencedRelation: "scorecards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ladder_challenges_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ladder_challenges_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "ladder_challenges_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      league_partnerships: {
        Row: {
          created_at: string | null
          id: string
          league_id: string
          name: string | null
          player_1_id: string
          player_2_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          league_id: string
          name?: string | null
          player_1_id: string
          player_2_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          league_id?: string
          name?: string | null
          player_1_id?: string
          player_2_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "league_partnerships_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_partnerships_player_1_id_fkey"
            columns: ["player_1_id"]
            isOneToOne: false
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "league_partnerships_player_1_id_fkey"
            columns: ["player_1_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_partnerships_player_2_id_fkey"
            columns: ["player_2_id"]
            isOneToOne: false
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "league_partnerships_player_2_id_fkey"
            columns: ["player_2_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      league_players: {
        Row: {
          created_at: string | null
          joined_at: string | null
          ladder_position: number | null
          league_id: string
          player_id: string
          removed_by: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          joined_at?: string | null
          ladder_position?: number | null
          league_id: string
          player_id: string
          removed_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string | null
          joined_at?: string | null
          ladder_position?: number | null
          league_id?: string
          player_id?: string
          removed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_players_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "league_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_players_removed_by_fkey"
            columns: ["removed_by"]
            isOneToOne: false
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "league_players_removed_by_fkey"
            columns: ["removed_by"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      league_rounds: {
        Row: {
          created_at: string | null
          handicap_differential: number
          id: string
          league_id: string
          player_id: string
          scorecard_id: string
          tagged_at: string | null
        }
        Insert: {
          created_at?: string | null
          handicap_differential: number
          id?: string
          league_id: string
          player_id: string
          scorecard_id: string
          tagged_at?: string | null
        }
        Update: {
          created_at?: string | null
          handicap_differential?: number
          id?: string
          league_id?: string
          player_id?: string
          scorecard_id?: string
          tagged_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "league_rounds_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_rounds_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "league_rounds_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_rounds_scorecard_id_fkey"
            columns: ["scorecard_id"]
            isOneToOne: false
            referencedRelation: "scorecards"
            referencedColumns: ["id"]
          },
        ]
      }
      leagues: {
        Row: {
          challenge_range: number | null
          counting_rounds: number | null
          course_id: string | null
          created_at: string | null
          created_by: string
          description: string | null
          eclectic_scoring: string | null
          end_date: string | null
          id: string
          invite_code: string
          is_public: boolean
          ladder_seeding: string | null
          league_type: string
          max_rounds: number | null
          name: string
          partnership_format: string | null
          start_date: string | null
          status: string
          tee_id: string | null
          updated_at: string | null
        }
        Insert: {
          challenge_range?: number | null
          counting_rounds?: number | null
          course_id?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          eclectic_scoring?: string | null
          end_date?: string | null
          id?: string
          invite_code: string
          is_public?: boolean
          ladder_seeding?: string | null
          league_type?: string
          max_rounds?: number | null
          name: string
          partnership_format?: string | null
          start_date?: string | null
          status?: string
          tee_id?: string | null
          updated_at?: string | null
        }
        Update: {
          challenge_range?: number | null
          counting_rounds?: number | null
          course_id?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          eclectic_scoring?: string | null
          end_date?: string | null
          id?: string
          invite_code?: string
          is_public?: boolean
          ladder_seeding?: string | null
          league_type?: string
          max_rounds?: number | null
          name?: string
          partnership_format?: string | null
          start_date?: string | null
          status?: string
          tee_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leagues_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leagues_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "leagues_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leagues_tee_id_fkey"
            columns: ["tee_id"]
            isOneToOne: false
            referencedRelation: "tees"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          competition_id: string | null
          created_at: string
          data: Json
          friendship_id: string | null
          id: string
          is_read: boolean
          league_id: string | null
          player_id: string | null
          read_at: string | null
          round_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          competition_id?: string | null
          created_at?: string
          data?: Json
          friendship_id?: string | null
          id?: string
          is_read?: boolean
          league_id?: string | null
          player_id?: string | null
          read_at?: string | null
          round_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          competition_id?: string | null
          created_at?: string
          data?: Json
          friendship_id?: string | null
          id?: string
          is_read?: boolean
          league_id?: string | null
          player_id?: string | null
          read_at?: string | null
          round_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_friendship_id_fkey"
            columns: ["friendship_id"]
            isOneToOne: false
            referencedRelation: "friendships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "notifications_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      pairings: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          id: string
          player_ids: string[]
          round_id: string
          tee_time: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          player_ids: string[]
          round_id: string
          tee_time?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          player_ids?: string[]
          round_id?: string
          tee_time?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pairings_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      partnership_rounds: {
        Row: {
          combined_gross: number
          course_id: string | null
          course_name: string
          course_rating: number | null
          difficulty_level: string
          id: string
          league_id: string
          par: number | null
          partnership_id: string
          played_at: string | null
          player_1_handicap: number | null
          player_1_id: string
          player_2_handicap: number | null
          player_2_id: string
          scorecard_1_id: string
          scorecard_2_id: string | null
          slope_rating: number | null
          tagged_at: string | null
          target_differential: number
          target_score: number
        }
        Insert: {
          combined_gross: number
          course_id?: string | null
          course_name: string
          course_rating?: number | null
          difficulty_level: string
          id?: string
          league_id: string
          par?: number | null
          partnership_id: string
          played_at?: string | null
          player_1_handicap?: number | null
          player_1_id: string
          player_2_handicap?: number | null
          player_2_id: string
          scorecard_1_id: string
          scorecard_2_id?: string | null
          slope_rating?: number | null
          tagged_at?: string | null
          target_differential: number
          target_score: number
        }
        Update: {
          combined_gross?: number
          course_id?: string | null
          course_name?: string
          course_rating?: number | null
          difficulty_level?: string
          id?: string
          league_id?: string
          par?: number | null
          partnership_id?: string
          played_at?: string | null
          player_1_handicap?: number | null
          player_1_id?: string
          player_2_handicap?: number | null
          player_2_id?: string
          scorecard_1_id?: string
          scorecard_2_id?: string | null
          slope_rating?: number | null
          tagged_at?: string | null
          target_differential?: number
          target_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "partnership_rounds_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_rounds_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_rounds_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "league_partnerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_rounds_player_1_id_fkey"
            columns: ["player_1_id"]
            isOneToOne: false
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "partnership_rounds_player_1_id_fkey"
            columns: ["player_1_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_rounds_player_2_id_fkey"
            columns: ["player_2_id"]
            isOneToOne: false
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "partnership_rounds_player_2_id_fkey"
            columns: ["player_2_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_rounds_scorecard_1_id_fkey"
            columns: ["scorecard_1_id"]
            isOneToOne: false
            referencedRelation: "scorecards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_rounds_scorecard_2_id_fkey"
            columns: ["scorecard_2_id"]
            isOneToOne: false
            referencedRelation: "scorecards"
            referencedColumns: ["id"]
          },
        ]
      }
      player_achievements: {
        Row: {
          achievement_id: string
          earned_at: string
          id: string
          notified: boolean
          player_id: string
          progress: number
        }
        Insert: {
          achievement_id: string
          earned_at?: string
          id?: string
          notified?: boolean
          player_id: string
          progress?: number
        }
        Update: {
          achievement_id?: string
          earned_at?: string
          id?: string
          notified?: boolean
          player_id?: string
          progress?: number
        }
        Relationships: [
          {
            foreignKeyName: "player_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievement_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_achievements_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "player_achievements_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_cosmetics: {
        Row: {
          cosmetic_id: string
          id: string
          player_id: string
          unlocked_at: string
        }
        Insert: {
          cosmetic_id: string
          id?: string
          player_id: string
          unlocked_at?: string
        }
        Update: {
          cosmetic_id?: string
          id?: string
          player_id?: string
          unlocked_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_cosmetics_cosmetic_id_fkey"
            columns: ["cosmetic_id"]
            isOneToOne: false
            referencedRelation: "cosmetic_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_cosmetics_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "player_cosmetics_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          created_at: string | null
          created_by: string | null
          email: string
          equipped_badge_id: string | null
          equipped_frame_id: string | null
          equipped_title_id: string | null
          gender: string | null
          golf_id: string | null
          handicap: number | null
          handicap_index: number | null
          handicap_index_updated_at: string | null
          handicap_updated_at: string | null
          home_club_id: string | null
          id: string
          is_placeholder: boolean
          linked_player_id: string | null
          name: string
          phone: string | null
          photo_url: string | null
          push_competition_updates: boolean
          push_enabled: boolean
          push_friend_requests: boolean
          push_scorecard_updates: boolean
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          email: string
          equipped_badge_id?: string | null
          equipped_frame_id?: string | null
          equipped_title_id?: string | null
          gender?: string | null
          golf_id?: string | null
          handicap?: number | null
          handicap_index?: number | null
          handicap_index_updated_at?: string | null
          handicap_updated_at?: string | null
          home_club_id?: string | null
          id: string
          is_placeholder?: boolean
          linked_player_id?: string | null
          name: string
          phone?: string | null
          photo_url?: string | null
          push_competition_updates?: boolean
          push_enabled?: boolean
          push_friend_requests?: boolean
          push_scorecard_updates?: boolean
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          email?: string
          equipped_badge_id?: string | null
          equipped_frame_id?: string | null
          equipped_title_id?: string | null
          gender?: string | null
          golf_id?: string | null
          handicap?: number | null
          handicap_index?: number | null
          handicap_index_updated_at?: string | null
          handicap_updated_at?: string | null
          home_club_id?: string | null
          id?: string
          is_placeholder?: boolean
          linked_player_id?: string | null
          name?: string
          phone?: string | null
          photo_url?: string | null
          push_competition_updates?: boolean
          push_enabled?: boolean
          push_friend_requests?: boolean
          push_scorecard_updates?: boolean
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "players_equipped_badge_id_fkey"
            columns: ["equipped_badge_id"]
            isOneToOne: false
            referencedRelation: "cosmetic_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_equipped_frame_id_fkey"
            columns: ["equipped_frame_id"]
            isOneToOne: false
            referencedRelation: "cosmetic_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_equipped_title_id_fkey"
            columns: ["equipped_title_id"]
            isOneToOne: false
            referencedRelation: "cosmetic_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_home_club_id_fkey"
            columns: ["home_club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      pool_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          player_id: string | null
          pool_id: string
          team_id: string | null
          transaction_type: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          player_id?: string | null
          pool_id: string
          team_id?: string | null
          transaction_type: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          player_id?: string | null
          pool_id?: string
          team_id?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "pool_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "pool_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pool_transactions_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "competition_prize_pools"
            referencedColumns: ["id"]
          },
        ]
      }
      prize_pool_placements: {
        Row: {
          created_at: string | null
          id: string
          paid_at: string | null
          payout_amount: number
          percent: number
          player_id: string | null
          pool_id: string
          position: number
          team_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          paid_at?: string | null
          payout_amount?: number
          percent: number
          player_id?: string | null
          pool_id: string
          position: number
          team_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          paid_at?: string | null
          payout_amount?: number
          percent?: number
          player_id?: string | null
          pool_id?: string
          position?: number
          team_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prize_pool_placements_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "prize_pool_placements_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prize_pool_placements_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "competition_prize_pools"
            referencedColumns: ["id"]
          },
        ]
      }
      push_tokens: {
        Row: {
          app_version: string | null
          created_at: string
          device_id: string | null
          device_name: string | null
          enabled: boolean
          expo_token: string
          id: string
          last_used_at: string | null
          platform: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          app_version?: string | null
          created_at?: string
          device_id?: string | null
          device_name?: string | null
          enabled?: boolean
          expo_token: string
          id?: string
          last_used_at?: string | null
          platform?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          app_version?: string | null
          created_at?: string
          device_id?: string | null
          device_name?: string | null
          enabled?: boolean
          expo_token?: string
          id?: string
          last_used_at?: string | null
          platform?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      round_players: {
        Row: {
          added_by: string | null
          created_at: string
          id: string
          player_id: string
          round_id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          id?: string
          player_id: string
          round_id: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          id?: string
          player_id?: string
          round_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "round_players_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "round_players_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "round_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_players_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      round_results: {
        Row: {
          competition_points: number | null
          created_at: string | null
          id: string
          is_team_result: boolean
          player_id: string | null
          position: number | null
          raw_result_data: Json
          raw_score: number | null
          round_id: string
          team_id: string | null
          updated_at: string | null
        }
        Insert: {
          competition_points?: number | null
          created_at?: string | null
          id?: string
          is_team_result?: boolean
          player_id?: string | null
          position?: number | null
          raw_result_data?: Json
          raw_score?: number | null
          round_id: string
          team_id?: string | null
          updated_at?: string | null
        }
        Update: {
          competition_points?: number | null
          created_at?: string | null
          id?: string
          is_team_result?: boolean
          player_id?: string | null
          position?: number | null
          raw_result_data?: Json
          raw_score?: number | null
          round_id?: string
          team_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "round_results_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "round_results_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_results_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_results_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      rounds: {
        Row: {
          ball_count: number | null
          competition_id: string | null
          completion_notified: boolean
          course_id: string | null
          created_at: string | null
          date: string | null
          deleted_at: string | null
          elapsed_time_seconds: number | null
          game_type: string
          handicap_source: Database["public"]["Enums"]["handicap_source"] | null
          id: string
          is_team_round: boolean
          pairing_metric: string | null
          pairing_source: string
          pairing_style: string | null
          round_number: number
          scoring_pairs_required: boolean
          selected_tee: Json | null
          skins_config: Json | null
          skins_enabled: boolean
          skins_pool_source: string | null
          status: string | null
          team_config: Json | null
          team_format: Database["public"]["Enums"]["team_format"] | null
          tee_time: string | null
          timer_enabled: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          ball_count?: number | null
          competition_id?: string | null
          completion_notified?: boolean
          course_id?: string | null
          created_at?: string | null
          date?: string | null
          deleted_at?: string | null
          elapsed_time_seconds?: number | null
          game_type?: string
          handicap_source?:
            | Database["public"]["Enums"]["handicap_source"]
            | null
          id?: string
          is_team_round?: boolean
          pairing_metric?: string | null
          pairing_source?: string
          pairing_style?: string | null
          round_number?: number
          scoring_pairs_required?: boolean
          selected_tee?: Json | null
          skins_config?: Json | null
          skins_enabled?: boolean
          skins_pool_source?: string | null
          status?: string | null
          team_config?: Json | null
          team_format?: Database["public"]["Enums"]["team_format"] | null
          tee_time?: string | null
          timer_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          ball_count?: number | null
          competition_id?: string | null
          completion_notified?: boolean
          course_id?: string | null
          created_at?: string | null
          date?: string | null
          deleted_at?: string | null
          elapsed_time_seconds?: number | null
          game_type?: string
          handicap_source?:
            | Database["public"]["Enums"]["handicap_source"]
            | null
          id?: string
          is_team_round?: boolean
          pairing_metric?: string | null
          pairing_source?: string
          pairing_style?: string | null
          round_number?: number
          scoring_pairs_required?: boolean
          selected_tee?: Json | null
          skins_config?: Json | null
          skins_enabled?: boolean
          skins_pool_source?: string | null
          status?: string | null
          team_config?: Json | null
          team_format?: Database["public"]["Enums"]["team_format"] | null
          tee_time?: string | null
          timer_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rounds_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rounds_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      score_entries: {
        Row: {
          created_at: string
          hole_number: number
          id: string
          penalties: number | null
          player_id: string
          putts: number | null
          round_id: string
          scorer_id: string
          strokes: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          hole_number: number
          id?: string
          penalties?: number | null
          player_id: string
          putts?: number | null
          round_id: string
          scorer_id: string
          strokes: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          hole_number?: number
          id?: string
          penalties?: number | null
          player_id?: string
          putts?: number | null
          round_id?: string
          scorer_id?: string
          strokes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "score_entries_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "score_entries_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_entries_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_entries_scorer_id_fkey"
            columns: ["scorer_id"]
            isOneToOne: false
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "score_entries_scorer_id_fkey"
            columns: ["scorer_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      score_mismatches: {
        Row: {
          created_at: string
          hole_number: number
          id: string
          partner_score: number
          partner_scorer_id: string
          player_id: string
          resolved_at: string | null
          resolved_by: string | null
          resolved_score: number | null
          round_id: string
          self_score: number
          self_scorer_id: string
          status: string
        }
        Insert: {
          created_at?: string
          hole_number: number
          id?: string
          partner_score: number
          partner_scorer_id: string
          player_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_score?: number | null
          round_id: string
          self_score: number
          self_scorer_id: string
          status?: string
        }
        Update: {
          created_at?: string
          hole_number?: number
          id?: string
          partner_score?: number
          partner_scorer_id?: string
          player_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_score?: number | null
          round_id?: string
          self_score?: number
          self_scorer_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "score_mismatches_partner_scorer_id_fkey"
            columns: ["partner_scorer_id"]
            isOneToOne: false
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "score_mismatches_partner_scorer_id_fkey"
            columns: ["partner_scorer_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_mismatches_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "score_mismatches_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_mismatches_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "score_mismatches_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_mismatches_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_mismatches_self_scorer_id_fkey"
            columns: ["self_scorer_id"]
            isOneToOne: false
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "score_mismatches_self_scorer_id_fkey"
            columns: ["self_scorer_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      score_submission_status: {
        Row: {
          bypass_available_at: string | null
          bypassed: boolean
          bypassed_at: string | null
          created_at: string
          id: string
          partner_id: string
          player_id: string
          round_id: string
          updated_at: string
        }
        Insert: {
          bypass_available_at?: string | null
          bypassed?: boolean
          bypassed_at?: string | null
          created_at?: string
          id?: string
          partner_id: string
          player_id: string
          round_id: string
          updated_at?: string
        }
        Update: {
          bypass_available_at?: string | null
          bypassed?: boolean
          bypassed_at?: string | null
          created_at?: string
          id?: string
          partner_id?: string
          player_id?: string
          round_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "score_submission_status_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "score_submission_status_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_submission_status_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "score_submission_status_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_submission_status_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      scorecards: {
        Row: {
          ball_totals: Json | null
          bypassed: boolean
          course_rating_used: number | null
          created_at: string | null
          daily_handicap_used: number | null
          deleted_at: string | null
          device_id: string | null
          ga_handicap_used: number | null
          handicap_differential: number | null
          id: string
          player_id: string
          round_id: string
          scores: Json
          slope_rating_used: number | null
          status: string | null
          submitted_at: string | null
          submitted_by: string | null
          synced_at: string | null
          total_gross: number | null
          total_net: number | null
          total_points: number | null
          updated_at: string | null
        }
        Insert: {
          ball_totals?: Json | null
          bypassed?: boolean
          course_rating_used?: number | null
          created_at?: string | null
          daily_handicap_used?: number | null
          deleted_at?: string | null
          device_id?: string | null
          ga_handicap_used?: number | null
          handicap_differential?: number | null
          id?: string
          player_id: string
          round_id: string
          scores?: Json
          slope_rating_used?: number | null
          status?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          synced_at?: string | null
          total_gross?: number | null
          total_net?: number | null
          total_points?: number | null
          updated_at?: string | null
        }
        Update: {
          ball_totals?: Json | null
          bypassed?: boolean
          course_rating_used?: number | null
          created_at?: string | null
          daily_handicap_used?: number | null
          deleted_at?: string | null
          device_id?: string | null
          ga_handicap_used?: number | null
          handicap_differential?: number | null
          id?: string
          player_id?: string
          round_id?: string
          scores?: Json
          slope_rating_used?: number | null
          status?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          synced_at?: string | null
          total_gross?: number | null
          total_net?: number | null
          total_points?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scorecards_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "scorecards_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scorecards_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scorecards_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "scorecards_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      scoring_pairs: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          player_id: string
          round_id: string
          scorer_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          player_id: string
          round_id: string
          scorer_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          player_id?: string
          round_id?: string
          scorer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scoring_pairs_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "scoring_pairs_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scoring_pairs_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scoring_pairs_scorer_id_fkey"
            columns: ["scorer_id"]
            isOneToOne: false
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "scoring_pairs_scorer_id_fkey"
            columns: ["scorer_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      skins_games: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string
          currency: string
          disclaimer_accepted_at: string
          disclaimer_accepted_by: string
          id: string
          is_team_skins: boolean
          pairing_id: string | null
          participant_ids: string[]
          participant_team_ids: string[] | null
          pot_type: string
          pot_value: number
          round_id: string
          scoring_type: string
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by: string
          currency?: string
          disclaimer_accepted_at: string
          disclaimer_accepted_by: string
          id?: string
          is_team_skins?: boolean
          pairing_id?: string | null
          participant_ids: string[]
          participant_team_ids?: string[] | null
          pot_type: string
          pot_value: number
          round_id: string
          scoring_type?: string
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          disclaimer_accepted_at?: string
          disclaimer_accepted_by?: string
          id?: string
          is_team_skins?: boolean
          pairing_id?: string | null
          participant_ids?: string[]
          participant_team_ids?: string[] | null
          pot_type?: string
          pot_value?: number
          round_id?: string
          scoring_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "skins_games_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "skins_games_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skins_games_disclaimer_accepted_by_fkey"
            columns: ["disclaimer_accepted_by"]
            isOneToOne: false
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "skins_games_disclaimer_accepted_by_fkey"
            columns: ["disclaimer_accepted_by"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skins_games_pairing_id_fkey"
            columns: ["pairing_id"]
            isOneToOne: false
            referencedRelation: "pairings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skins_games_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      skins_payouts: {
        Row: {
          buy_in: number
          calculated_at: string
          holes_lost: number
          holes_tied: number
          holes_won: number
          id: string
          is_team_payout: boolean
          net_result: number
          player_id: string | null
          skins_game_id: string
          team_id: string | null
          total_winnings: number
        }
        Insert: {
          buy_in: number
          calculated_at?: string
          holes_lost?: number
          holes_tied?: number
          holes_won?: number
          id?: string
          is_team_payout?: boolean
          net_result?: number
          player_id?: string | null
          skins_game_id: string
          team_id?: string | null
          total_winnings?: number
        }
        Update: {
          buy_in?: number
          calculated_at?: string
          holes_lost?: number
          holes_tied?: number
          holes_won?: number
          id?: string
          is_team_payout?: boolean
          net_result?: number
          player_id?: string | null
          skins_game_id?: string
          team_id?: string | null
          total_winnings?: number
        }
        Relationships: [
          {
            foreignKeyName: "skins_payouts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "skins_payouts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skins_payouts_skins_game_id_fkey"
            columns: ["skins_game_id"]
            isOneToOne: false
            referencedRelation: "skins_games"
            referencedColumns: ["id"]
          },
        ]
      }
      skins_player_statistics: {
        Row: {
          avg_net_per_game: number | null
          created_at: string
          current_hole_win_streak: number
          games_played: number
          games_won: number
          id: string
          last_game_at: string | null
          longest_hole_win_streak: number
          longest_streak_date: string | null
          longest_streak_game_id: string | null
          player_id: string
          total_buy_ins: number
          total_holes_lost: number
          total_holes_played: number
          total_holes_tied: number
          total_holes_won: number
          total_net_result: number
          total_winnings: number
          updated_at: string
          win_rate: number | null
        }
        Insert: {
          avg_net_per_game?: number | null
          created_at?: string
          current_hole_win_streak?: number
          games_played?: number
          games_won?: number
          id?: string
          last_game_at?: string | null
          longest_hole_win_streak?: number
          longest_streak_date?: string | null
          longest_streak_game_id?: string | null
          player_id: string
          total_buy_ins?: number
          total_holes_lost?: number
          total_holes_played?: number
          total_holes_tied?: number
          total_holes_won?: number
          total_net_result?: number
          total_winnings?: number
          updated_at?: string
          win_rate?: number | null
        }
        Update: {
          avg_net_per_game?: number | null
          created_at?: string
          current_hole_win_streak?: number
          games_played?: number
          games_won?: number
          id?: string
          last_game_at?: string | null
          longest_hole_win_streak?: number
          longest_streak_date?: string | null
          longest_streak_game_id?: string | null
          player_id?: string
          total_buy_ins?: number
          total_holes_lost?: number
          total_holes_played?: number
          total_holes_tied?: number
          total_holes_won?: number
          total_net_result?: number
          total_winnings?: number
          updated_at?: string
          win_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "skins_player_statistics_longest_streak_game_id_fkey"
            columns: ["longest_streak_game_id"]
            isOneToOne: false
            referencedRelation: "skins_games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skins_player_statistics_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "skins_player_statistics_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      skins_results: {
        Row: {
          calculated_at: string
          carryover_to_next: number
          hole_number: number
          hole_pot_value: number
          hole_scores: Json
          id: string
          is_carryover: boolean
          payout_amount: number
          skins_game_id: string
          team_winner_id: string | null
          winner_id: string | null
        }
        Insert: {
          calculated_at?: string
          carryover_to_next?: number
          hole_number: number
          hole_pot_value: number
          hole_scores: Json
          id?: string
          is_carryover?: boolean
          payout_amount?: number
          skins_game_id: string
          team_winner_id?: string | null
          winner_id?: string | null
        }
        Update: {
          calculated_at?: string
          carryover_to_next?: number
          hole_number?: number
          hole_pot_value?: number
          hole_scores?: Json
          id?: string
          is_carryover?: boolean
          payout_amount?: number
          skins_game_id?: string
          team_winner_id?: string | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "skins_results_skins_game_id_fkey"
            columns: ["skins_game_id"]
            isOneToOne: false
            referencedRelation: "skins_games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skins_results_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "skins_results_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      team_members: {
        Row: {
          joined_at: string | null
          player_id: string
          team_id: string
        }
        Insert: {
          joined_at?: string | null
          player_id: string
          team_id: string
        }
        Update: {
          joined_at?: string | null
          player_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "team_members_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          competition_id: string
          created_at: string | null
          deleted_at: string | null
          final_position: number | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          competition_id: string
          created_at?: string | null
          deleted_at?: string | null
          final_position?: number | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          competition_id?: string
          created_at?: string | null
          deleted_at?: string | null
          final_position?: number | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      tees: {
        Row: {
          back9_length: number | null
          color: string | null
          course_id: string
          course_rating: number | null
          course_rating_back9: number | null
          course_rating_front9: number | null
          course_rating_women: number | null
          course_rating_women_back9: number | null
          course_rating_women_front9: number | null
          created_at: string | null
          front9_length: number | null
          golfapi_tee_id: string | null
          id: string
          length_hole_1: number | null
          length_hole_10: number | null
          length_hole_11: number | null
          length_hole_12: number | null
          length_hole_13: number | null
          length_hole_14: number | null
          length_hole_15: number | null
          length_hole_16: number | null
          length_hole_17: number | null
          length_hole_18: number | null
          length_hole_2: number | null
          length_hole_3: number | null
          length_hole_4: number | null
          length_hole_5: number | null
          length_hole_6: number | null
          length_hole_7: number | null
          length_hole_8: number | null
          length_hole_9: number | null
          measure_unit: string | null
          name: string
          slope: number | null
          slope_back9: number | null
          slope_front9: number | null
          slope_women: number | null
          slope_women_back9: number | null
          slope_women_front9: number | null
          total_length: number | null
          updated_at: string | null
        }
        Insert: {
          back9_length?: number | null
          color?: string | null
          course_id: string
          course_rating?: number | null
          course_rating_back9?: number | null
          course_rating_front9?: number | null
          course_rating_women?: number | null
          course_rating_women_back9?: number | null
          course_rating_women_front9?: number | null
          created_at?: string | null
          front9_length?: number | null
          golfapi_tee_id?: string | null
          id?: string
          length_hole_1?: number | null
          length_hole_10?: number | null
          length_hole_11?: number | null
          length_hole_12?: number | null
          length_hole_13?: number | null
          length_hole_14?: number | null
          length_hole_15?: number | null
          length_hole_16?: number | null
          length_hole_17?: number | null
          length_hole_18?: number | null
          length_hole_2?: number | null
          length_hole_3?: number | null
          length_hole_4?: number | null
          length_hole_5?: number | null
          length_hole_6?: number | null
          length_hole_7?: number | null
          length_hole_8?: number | null
          length_hole_9?: number | null
          measure_unit?: string | null
          name: string
          slope?: number | null
          slope_back9?: number | null
          slope_front9?: number | null
          slope_women?: number | null
          slope_women_back9?: number | null
          slope_women_front9?: number | null
          total_length?: number | null
          updated_at?: string | null
        }
        Update: {
          back9_length?: number | null
          color?: string | null
          course_id?: string
          course_rating?: number | null
          course_rating_back9?: number | null
          course_rating_front9?: number | null
          course_rating_women?: number | null
          course_rating_women_back9?: number | null
          course_rating_women_front9?: number | null
          created_at?: string | null
          front9_length?: number | null
          golfapi_tee_id?: string | null
          id?: string
          length_hole_1?: number | null
          length_hole_10?: number | null
          length_hole_11?: number | null
          length_hole_12?: number | null
          length_hole_13?: number | null
          length_hole_14?: number | null
          length_hole_15?: number | null
          length_hole_16?: number | null
          length_hole_17?: number | null
          length_hole_18?: number | null
          length_hole_2?: number | null
          length_hole_3?: number | null
          length_hole_4?: number | null
          length_hole_5?: number | null
          length_hole_6?: number | null
          length_hole_7?: number | null
          length_hole_8?: number | null
          length_hole_9?: number | null
          measure_unit?: string | null
          name?: string
          slope?: number | null
          slope_back9?: number | null
          slope_front9?: number | null
          slope_women?: number | null
          slope_women_back9?: number | null
          slope_women_front9?: number | null
          total_length?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tees_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      tier_limits: {
        Row: {
          allowed_game_types: string[]
          allowed_league_types: string[] | null
          badge_color: string | null
          can_access_admin_tools: boolean
          can_access_beta_features: boolean
          can_compare_stats: boolean
          can_create_league: boolean
          can_expire: boolean
          can_export_data: boolean
          can_join_league: boolean
          can_manage_guests: boolean
          can_use_ai_competition: boolean
          can_use_api_course_search: boolean
          can_use_gps_distance: boolean
          can_use_prize_pool: boolean
          can_use_scoring_pairs: boolean
          can_use_skins: boolean
          can_use_skins_game: boolean
          can_use_team_formats: boolean
          can_use_wolf: boolean
          can_use_wolf_game: boolean
          can_view_achievement_leaderboard: boolean
          can_view_advanced_stats: boolean
          can_view_basic_stats: boolean
          can_view_detailed_stats: boolean
          can_view_handicap_history: boolean
          can_view_score_distribution: boolean
          created_at: string
          description: string | null
          display_name: string
          id: string
          max_competitions_owned: number
          max_friends: number
          max_leagues_owned: number
          max_players_per_competition: number
          max_rounds_per_competition: number
          max_rounds_played: number
          requires_payment: boolean
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
        }
        Insert: {
          allowed_game_types: string[]
          allowed_league_types?: string[] | null
          badge_color?: string | null
          can_access_admin_tools?: boolean
          can_access_beta_features?: boolean
          can_compare_stats?: boolean
          can_create_league?: boolean
          can_expire?: boolean
          can_export_data?: boolean
          can_join_league?: boolean
          can_manage_guests?: boolean
          can_use_ai_competition?: boolean
          can_use_api_course_search?: boolean
          can_use_gps_distance?: boolean
          can_use_prize_pool?: boolean
          can_use_scoring_pairs?: boolean
          can_use_skins?: boolean
          can_use_skins_game?: boolean
          can_use_team_formats?: boolean
          can_use_wolf?: boolean
          can_use_wolf_game?: boolean
          can_view_achievement_leaderboard?: boolean
          can_view_advanced_stats?: boolean
          can_view_basic_stats?: boolean
          can_view_detailed_stats?: boolean
          can_view_handicap_history?: boolean
          can_view_score_distribution?: boolean
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          max_competitions_owned: number
          max_friends: number
          max_leagues_owned?: number
          max_players_per_competition: number
          max_rounds_per_competition: number
          max_rounds_played?: number
          requires_payment?: boolean
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
        }
        Update: {
          allowed_game_types?: string[]
          allowed_league_types?: string[] | null
          badge_color?: string | null
          can_access_admin_tools?: boolean
          can_access_beta_features?: boolean
          can_compare_stats?: boolean
          can_create_league?: boolean
          can_expire?: boolean
          can_export_data?: boolean
          can_join_league?: boolean
          can_manage_guests?: boolean
          can_use_ai_competition?: boolean
          can_use_api_course_search?: boolean
          can_use_gps_distance?: boolean
          can_use_prize_pool?: boolean
          can_use_scoring_pairs?: boolean
          can_use_skins?: boolean
          can_use_skins_game?: boolean
          can_use_team_formats?: boolean
          can_use_wolf?: boolean
          can_use_wolf_game?: boolean
          can_view_achievement_leaderboard?: boolean
          can_view_advanced_stats?: boolean
          can_view_basic_stats?: boolean
          can_view_detailed_stats?: boolean
          can_view_handicap_history?: boolean
          can_view_score_distribution?: boolean
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          max_competitions_owned?: number
          max_friends?: number
          max_leagues_owned?: number
          max_players_per_competition?: number
          max_rounds_per_competition?: number
          max_rounds_played?: number
          requires_payment?: boolean
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string
          custom_settings: Json
          debug_mode_enabled: boolean
          distance_unit: string
          id: string
          push_competition_updates: boolean
          push_enabled: boolean
          push_friend_requests: boolean
          push_league_updates: boolean
          push_scorecard_updates: boolean
          round_timer_enabled: boolean
          show_fairway_hit: boolean
          show_gir: boolean
          show_putts: boolean
          theme_mode: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_settings?: Json
          debug_mode_enabled?: boolean
          distance_unit?: string
          id?: string
          push_competition_updates?: boolean
          push_enabled?: boolean
          push_friend_requests?: boolean
          push_league_updates?: boolean
          push_scorecard_updates?: boolean
          round_timer_enabled?: boolean
          show_fairway_hit?: boolean
          show_gir?: boolean
          show_putts?: boolean
          theme_mode?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_settings?: Json
          debug_mode_enabled?: boolean
          distance_unit?: string
          id?: string
          push_competition_updates?: boolean
          push_enabled?: boolean
          push_friend_requests?: boolean
          push_league_updates?: boolean
          push_scorecard_updates?: boolean
          round_timer_enabled?: boolean
          show_fairway_hit?: boolean
          show_gir?: boolean
          show_putts?: boolean
          theme_mode?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subscriptions: {
        Row: {
          cancelled_at: string | null
          created_at: string
          expires_at: string | null
          external_id: string | null
          id: string
          product_id: string | null
          source: Database["public"]["Enums"]["subscription_source"]
          started_at: string
          status: Database["public"]["Enums"]["subscription_status"]
          tier: Database["public"]["Enums"]["subscription_tier"]
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          expires_at?: string | null
          external_id?: string | null
          id?: string
          product_id?: string | null
          source?: Database["public"]["Enums"]["subscription_source"]
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          tier?: Database["public"]["Enums"]["subscription_tier"]
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          expires_at?: string | null
          external_id?: string | null
          id?: string
          product_id?: string | null
          source?: Database["public"]["Enums"]["subscription_source"]
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          tier?: Database["public"]["Enums"]["subscription_tier"]
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wolf_games: {
        Row: {
          blind_wolf_enabled: boolean
          completed_at: string | null
          created_at: string
          created_by: string
          currency: string
          disclaimer_accepted_at: string | null
          disclaimer_accepted_by: string | null
          id: string
          participant_ids: string[]
          pot_enabled: boolean
          pot_value: number | null
          round_id: string
          scoring_type: string
          status: string
          updated_at: string
          wolf_order: string[]
        }
        Insert: {
          blind_wolf_enabled?: boolean
          completed_at?: string | null
          created_at?: string
          created_by: string
          currency?: string
          disclaimer_accepted_at?: string | null
          disclaimer_accepted_by?: string | null
          id?: string
          participant_ids: string[]
          pot_enabled?: boolean
          pot_value?: number | null
          round_id: string
          scoring_type?: string
          status?: string
          updated_at?: string
          wolf_order: string[]
        }
        Update: {
          blind_wolf_enabled?: boolean
          completed_at?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          disclaimer_accepted_at?: string | null
          disclaimer_accepted_by?: string | null
          id?: string
          participant_ids?: string[]
          pot_enabled?: boolean
          pot_value?: number | null
          round_id?: string
          scoring_type?: string
          status?: string
          updated_at?: string
          wolf_order?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "wolf_games_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "wolf_games_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wolf_games_disclaimer_accepted_by_fkey"
            columns: ["disclaimer_accepted_by"]
            isOneToOne: false
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "wolf_games_disclaimer_accepted_by_fkey"
            columns: ["disclaimer_accepted_by"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wolf_games_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      wolf_hole_decisions: {
        Row: {
          calculated_at: string | null
          decided_at: string | null
          hole_number: number
          hole_scores: Json | null
          id: string
          is_blind_wolf: boolean
          is_tie: boolean
          partner_id: string | null
          points_awarded: Json | null
          wolf_game_id: string
          wolf_id: string
          wolf_team_won: boolean | null
        }
        Insert: {
          calculated_at?: string | null
          decided_at?: string | null
          hole_number: number
          hole_scores?: Json | null
          id?: string
          is_blind_wolf?: boolean
          is_tie?: boolean
          partner_id?: string | null
          points_awarded?: Json | null
          wolf_game_id: string
          wolf_id: string
          wolf_team_won?: boolean | null
        }
        Update: {
          calculated_at?: string | null
          decided_at?: string | null
          hole_number?: number
          hole_scores?: Json | null
          id?: string
          is_blind_wolf?: boolean
          is_tie?: boolean
          partner_id?: string | null
          points_awarded?: Json | null
          wolf_game_id?: string
          wolf_id?: string
          wolf_team_won?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "wolf_hole_decisions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "wolf_hole_decisions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wolf_hole_decisions_wolf_game_id_fkey"
            columns: ["wolf_game_id"]
            isOneToOne: false
            referencedRelation: "wolf_games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wolf_hole_decisions_wolf_id_fkey"
            columns: ["wolf_id"]
            isOneToOne: false
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "wolf_hole_decisions_wolf_id_fkey"
            columns: ["wolf_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      wolf_payouts: {
        Row: {
          calculated_at: string
          id: string
          net_result: number
          player_id: string
          total_points: number
          total_winnings: number
          wolf_game_id: string
        }
        Insert: {
          calculated_at?: string
          id?: string
          net_result?: number
          player_id: string
          total_points?: number
          total_winnings?: number
          wolf_game_id: string
        }
        Update: {
          calculated_at?: string
          id?: string
          net_result?: number
          player_id?: string
          total_points?: number
          total_winnings?: number
          wolf_game_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wolf_payouts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "wolf_payouts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wolf_payouts_wolf_game_id_fkey"
            columns: ["wolf_game_id"]
            isOneToOne: false
            referencedRelation: "wolf_games"
            referencedColumns: ["id"]
          },
        ]
      }
      wolf_player_statistics: {
        Row: {
          created_at: string
          current_win_streak: number
          games_played: number
          games_won: number
          id: string
          last_game_at: string | null
          longest_win_streak: number
          player_id: string
          total_holes_as_wolf: number
          total_holes_played: number
          total_net_result: number
          total_points_earned: number
          total_winnings: number
          updated_at: string
          win_rate: number | null
        }
        Insert: {
          created_at?: string
          current_win_streak?: number
          games_played?: number
          games_won?: number
          id?: string
          last_game_at?: string | null
          longest_win_streak?: number
          player_id: string
          total_holes_as_wolf?: number
          total_holes_played?: number
          total_net_result?: number
          total_points_earned?: number
          total_winnings?: number
          updated_at?: string
          win_rate?: number | null
        }
        Update: {
          created_at?: string
          current_win_streak?: number
          games_played?: number
          games_won?: number
          id?: string
          last_game_at?: string | null
          longest_win_streak?: number
          player_id?: string
          total_holes_as_wolf?: number
          total_holes_played?: number
          total_net_result?: number
          total_points_earned?: number
          total_winnings?: number
          updated_at?: string
          win_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "wolf_player_statistics_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "achievement_leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "wolf_player_statistics_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      achievement_leaderboard: {
        Row: {
          achievements_earned: number | null
          equipped_badge_id: string | null
          equipped_frame_id: string | null
          equipped_title_id: string | null
          last_achievement_at: string | null
          name: string | null
          photo_url: string | null
          player_id: string | null
          total_points: number | null
        }
        Relationships: [
          {
            foreignKeyName: "players_equipped_badge_id_fkey"
            columns: ["equipped_badge_id"]
            isOneToOne: false
            referencedRelation: "cosmetic_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_equipped_frame_id_fkey"
            columns: ["equipped_frame_id"]
            isOneToOne: false
            referencedRelation: "cosmetic_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_equipped_title_id_fkey"
            columns: ["equipped_title_id"]
            isOneToOne: false
            referencedRelation: "cosmetic_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      award_achievement: {
        Args: {
          p_achievement_id: string
          p_player_id: string
          p_progress?: number
        }
        Returns: {
          achievement_id: string
          earned_at: string
          id: string
          notified: boolean
          player_id: string
          progress: number
        }
        SetofOptions: {
          from: "*"
          to: "player_achievements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      backfill_competition_statuses: {
        Args: never
        Returns: {
          competition_id: string
          new_status: string
          old_status: string
        }[]
      }
      backfill_wolf_player_statistics: { Args: never; Returns: number }
      calculate_current_win_streak: {
        Args: { p_player_id: string }
        Returns: number
      }
      calculate_hole_distance: {
        Args: {
          p_course_id: string
          p_from_poi?: string
          p_hole_number: number
          p_to_poi?: string
        }
        Returns: number
      }
      calculate_pool_total: {
        Args: {
          p_funding_amount: number
          p_funding_type: string
          p_player_count: number
        }
        Returns: number
      }
      calculate_skins_buy_in: {
        Args: {
          p_participant_count: number
          p_pot_type: string
          p_pot_value: number
        }
        Returns: number
      }
      calculate_skins_hole_value: {
        Args: { p_pot_type: string; p_pot_value: number }
        Returns: number
      }
      calculate_stableford_points: {
        Args: {
          gross_score: number
          par: number
          player_handicap: number
          stroke_index: number
        }
        Returns: number
      }
      check_cosmetic_unlocks: {
        Args: { p_player_id: string }
        Returns: {
          code: string
          cosmetic_id: string
          name: string
          points_required: number
          type: Database["public"]["Enums"]["cosmetic_type"]
        }[]
      }
      competition_can_add_player: {
        Args: { p_competition_id: string }
        Returns: boolean
      }
      competition_can_add_round: {
        Args: { p_competition_id: string }
        Returns: boolean
      }
      create_notification: {
        Args: {
          p_competition_id?: string
          p_data?: Json
          p_friendship_id?: string
          p_league_id?: string
          p_player_id?: string
          p_round_id?: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      create_placeholder_player: {
        Args: { p_handicap?: number; p_name: string }
        Returns: string
      }
      deactivate_expired_competitions: { Args: never; Returns: number }
      delete_user_account: { Args: { p_user_id: string }; Returns: boolean }
      disable_push_token: { Args: { p_token: string }; Returns: boolean }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      ensure_player_skins_statistics: {
        Args: { p_player_id: string }
        Returns: {
          avg_net_per_game: number | null
          created_at: string
          current_hole_win_streak: number
          games_played: number
          games_won: number
          id: string
          last_game_at: string | null
          longest_hole_win_streak: number
          longest_streak_date: string | null
          longest_streak_game_id: string | null
          player_id: string
          total_buy_ins: number
          total_holes_lost: number
          total_holes_played: number
          total_holes_tied: number
          total_holes_won: number
          total_net_result: number
          total_winnings: number
          updated_at: string
          win_rate: number | null
        }
        SetofOptions: {
          from: "*"
          to: "skins_player_statistics"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      equip_cosmetic: {
        Args: { p_cosmetic_id: string; p_player_id: string }
        Returns: boolean
      }
      finalize_competition_skins: {
        Args: { p_competition_id: string }
        Returns: Json
      }
      finalize_skins_game: {
        Args: { p_skins_game_id: string }
        Returns: undefined
      }
      generate_reciprocal_scoring_pairs: {
        Args: { p_round_id: string }
        Returns: number
      }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_achievement_leaderboard: {
        Args: {
          p_competition_id?: string
          p_limit?: number
          p_scope: string
          p_user_id: string
        }
        Returns: {
          achievements_earned: number
          equipped_badge_id: string
          equipped_frame_id: string
          equipped_title_id: string
          last_achievement_at: string
          name: string
          photo_url: string
          player_id: string
          rank: number
          total_points: number
        }[]
      }
      get_achievements_with_progress: {
        Args: { p_player_id: string }
        Returns: {
          base_achievement: string
          category: Database["public"]["Enums"]["achievement_category"]
          code: string
          current_progress: number
          description: string
          earned: boolean
          earned_at: string
          icon: string
          id: string
          is_hidden: boolean
          name: string
          points: number
          rarity: Database["public"]["Enums"]["achievement_rarity"]
          threshold: number
          tier: number
        }[]
      }
      get_clubs_with_courses: {
        Args: { search_query?: string; state_filter?: string }
        Returns: {
          city: string
          club_id: string
          club_name: string
          course_count: number
          courses: Json
          state: string
          total_holes: number
        }[]
      }
      get_competition_by_invite_code: {
        Args: { code: string }
        Returns: {
          competition_type: string
          description: string
          end_date: string
          handicap_system: string
          id: string
          name: string
          organizer_id: string
          start_date: string
          status: string
        }[]
      }
      get_competition_individual_standings: {
        Args: { comp_id: string }
        Returns: {
          handicap: number
          player_id: string
          player_name: string
          rank: number
          rounds_played: number
          total_points: number
        }[]
      }
      get_competition_leaderboard: {
        Args: { comp_id: string }
        Returns: {
          handicap: number
          player_id: string
          player_name: string
          rank: number
          rounds_played: number
          total_gross: number
          total_net: number
          total_points: number
        }[]
      }
      get_competition_skins_carryover: {
        Args: { p_competition_id: string }
        Returns: number
      }
      get_competition_skins_game: {
        Args: { p_competition_id: string }
        Returns: {
          competition_id: string
          completed_at: string | null
          config_id: string
          created_at: string
          current_carryover: number
          current_round_number: number
          id: string
          participant_ids: string[]
          rounds_completed: number
          status: string
          total_pot: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "competition_skins_games"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_competition_team_standings: {
        Args: { comp_id: string }
        Returns: {
          avg_handicap: number
          rank: number
          rounds_played: number
          team_id: string
          team_name: string
          total_points: number
        }[]
      }
      get_cosmetics_with_status: {
        Args: { p_player_id: string }
        Returns: {
          code: string
          description: string
          icon: string
          id: string
          is_equipped: boolean
          is_unlocked: boolean
          name: string
          points_required: number
          sort_order: number
          type: Database["public"]["Enums"]["cosmetic_type"]
          unlocked_at: string
        }[]
      }
      get_course_coordinates: {
        Args: { p_course_id: string }
        Returns: {
          hole_number: number
          latitude: number
          longitude: number
          poi_type: string
          side_of_fairway: string
        }[]
      }
      get_course_hole_distances: {
        Args: { p_course_id: string; p_from_poi?: string; p_to_poi?: string }
        Returns: {
          distance_meters: number
          hole_number: number
        }[]
      }
      get_eclectic_leaderboard: {
        Args: { p_league_id: string }
        Returns: {
          holes_completed: number
          name: string
          photo_url: string
          player_id: string
          rank: number
          rounds_played: number
          total_best_gross: number
          total_best_net: number
        }[]
      }
      get_friends: {
        Args: { user_id: string }
        Returns: {
          created_at: string
          friend_email: string
          friend_handicap: number
          friend_id: string
          friend_name: string
          friend_photo_url: string
          friendship_id: string
          is_requester: boolean
        }[]
      }
      get_ladder_standings: {
        Args: { p_league_id: string }
        Returns: {
          active_challenge_id: string
          active_challenge_status: string
          ladder_position: number
          losses: number
          name: string
          photo_url: string
          player_id: string
          wins: number
        }[]
      }
      get_league_leaderboard: {
        Args: { p_league_id: string }
        Returns: {
          avg_differential: number
          best_differential: number
          name: string
          photo_url: string
          player_id: string
          rank: number
          rounds_counting: number
          rounds_played: number
        }[]
      }
      get_league_stats: {
        Args: { p_league_id: string; p_user_id: string }
        Returns: Json
      }
      get_my_leagues: {
        Args: never
        Returns: {
          challenge_range: number | null
          counting_rounds: number | null
          course_id: string | null
          created_at: string | null
          created_by: string
          description: string | null
          eclectic_scoring: string | null
          end_date: string | null
          id: string
          invite_code: string
          is_public: boolean
          ladder_seeding: string | null
          league_type: string
          max_rounds: number | null
          name: string
          partnership_format: string | null
          start_date: string | null
          status: string
          tee_id: string | null
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "leagues"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_my_placeholder_players: {
        Args: never
        Returns: {
          competitions_count: number
          created_at: string
          email: string
          handicap: number
          id: string
          name: string
          scorecards_count: number
        }[]
      }
      get_partnership_course_bests: {
        Args: { p_league_id: string }
        Returns: {
          best_combined_gross: number
          best_differential: number
          course_id: string
          course_name: string
          partnership_id: string
          partnership_name: string
          times_played: number
        }[]
      }
      get_partnership_leaderboard: {
        Args: { p_league_id: string }
        Returns: {
          avg_target_differential: number
          best_differential: number
          partnership_id: string
          partnership_name: string
          player_1_id: string
          player_1_name: string
          player_1_photo_url: string
          player_2_id: string
          player_2_name: string
          player_2_photo_url: string
          rank: number
          rounds_played: number
          times_under_target: number
        }[]
      }
      get_pending_friend_requests: {
        Args: { user_id: string }
        Returns: {
          created_at: string
          request_id: string
          requester_email: string
          requester_handicap: number
          requester_id: string
          requester_name: string
          requester_photo_url: string
        }[]
      }
      get_player_achievement_summary: {
        Args: { p_player_id: string }
        Returns: {
          by_category: Json
          completion_percentage: number
          recent_achievements: Json
          total_available: number
          total_earned: number
          total_points: number
        }[]
      }
      get_player_equipped_cosmetics: {
        Args: { p_player_id: string }
        Returns: {
          badge_code: string
          badge_icon: string
          badge_id: string
          badge_name: string
          frame_code: string
          frame_icon: string
          frame_id: string
          frame_name: string
          title_code: string
          title_icon: string
          title_id: string
          title_name: string
        }[]
      }
      get_player_recent_hole_results: {
        Args: { p_limit?: number; p_player_id: string }
        Returns: {
          game_completed_at: string
          hole_number: number
          payout_amount: number
          result: string
          skins_game_id: string
          winner_id: string
        }[]
      }
      get_player_scorer: {
        Args: { p_player_id: string; p_round_id: string }
        Returns: string
      }
      get_player_scoring_assignment: {
        Args: { p_round_id: string; p_scorer_id: string }
        Returns: string
      }
      get_player_unlocked_cosmetics: {
        Args: { p_player_id: string }
        Returns: {
          code: string
          description: string
          icon: string
          id: string
          is_equipped: boolean
          name: string
          points_required: number
          sort_order: number
          type: Database["public"]["Enums"]["cosmetic_type"]
          unlocked_at: string
        }[]
      }
      get_player_wolf_stats: {
        Args: { p_player_id: string }
        Returns: {
          created_at: string
          current_win_streak: number
          games_played: number
          games_won: number
          id: string
          last_game_at: string | null
          longest_win_streak: number
          player_id: string
          total_holes_as_wolf: number
          total_holes_played: number
          total_net_result: number
          total_points_earned: number
          total_winnings: number
          updated_at: string
          win_rate: number | null
        }
        SetofOptions: {
          from: "*"
          to: "wolf_player_statistics"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_pool_balance: { Args: { p_pool_id: string }; Returns: number }
      get_public_leagues: {
        Args: { p_limit?: number; p_search?: string }
        Returns: {
          created_at: string
          created_by: string
          description: string
          id: string
          is_public: boolean
          league_type: string
          name: string
          player_count: number
          status: string
          updated_at: string
        }[]
      }
      get_round_skins_config: {
        Args: { p_round_id: string }
        Returns: {
          competition_id: string
          created_at: string
          created_by: string
          currency: string
          disclaimer_accepted_at: string | null
          disclaimer_accepted_by: string | null
          id: string
          pot_type: string
          pot_value: number
          scoring_type: string
          selected_round_ids: string[]
          settlement_mode: string
          skins_mode: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "competition_skins_config"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_round_starting_carryover: {
        Args: { p_round_id: string }
        Returns: number
      }
      get_skins_current_carryover: {
        Args: { p_skins_game_id: string }
        Returns: number
      }
      get_skins_leaderboard: {
        Args: { p_friends_only?: boolean; p_limit?: number; p_user_id?: string }
        Returns: {
          games_played: number
          holes_won: number
          player_avatar: string
          player_id: string
          player_name: string
          rank: number
          total_net_result: number
          win_rate: number
        }[]
      }
      get_team_with_members: {
        Args: { team_uuid: string }
        Returns: {
          competition_id: string
          joined_at: string
          player_handicap: number
          player_id: string
          player_name: string
          team_id: string
          team_name: string
        }[]
      }
      get_tier_limits: {
        Args: { p_tier: Database["public"]["Enums"]["subscription_tier"] }
        Returns: {
          allowed_game_types: string[]
          allowed_league_types: string[] | null
          badge_color: string | null
          can_access_admin_tools: boolean
          can_access_beta_features: boolean
          can_compare_stats: boolean
          can_create_league: boolean
          can_expire: boolean
          can_export_data: boolean
          can_join_league: boolean
          can_manage_guests: boolean
          can_use_ai_competition: boolean
          can_use_api_course_search: boolean
          can_use_gps_distance: boolean
          can_use_prize_pool: boolean
          can_use_scoring_pairs: boolean
          can_use_skins: boolean
          can_use_skins_game: boolean
          can_use_team_formats: boolean
          can_use_wolf: boolean
          can_use_wolf_game: boolean
          can_view_achievement_leaderboard: boolean
          can_view_advanced_stats: boolean
          can_view_basic_stats: boolean
          can_view_detailed_stats: boolean
          can_view_handicap_history: boolean
          can_view_score_distribution: boolean
          created_at: string
          description: string | null
          display_name: string
          id: string
          max_competitions_owned: number
          max_friends: number
          max_leagues_owned: number
          max_players_per_competition: number
          max_rounds_per_competition: number
          max_rounds_played: number
          requires_payment: boolean
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "tier_limits"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_unread_notification_count: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_user_competition_ids: { Args: { user_id: string }; Returns: string[] }
      get_user_preferences: {
        Args: { p_user_id: string }
        Returns: {
          custom_settings: Json
          debug_mode_enabled: boolean
          distance_unit: string
          push_competition_updates: boolean
          push_enabled: boolean
          push_friend_requests: boolean
          push_scorecard_updates: boolean
          round_timer_enabled: boolean
          show_fairway_hit: boolean
          show_gir: boolean
          show_putts: boolean
          theme_mode: string
        }[]
      }
      get_user_push_preferences: {
        Args: { p_user_id: string }
        Returns: {
          push_competition_updates: boolean
          push_enabled: boolean
          push_friend_requests: boolean
          push_league_updates: boolean
          push_scorecard_updates: boolean
        }[]
      }
      get_user_push_tokens: {
        Args: { p_user_id: string }
        Returns: {
          expo_token: string
          platform: string
        }[]
      }
      get_user_remaining_rounds: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_user_rounds_played_count: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_user_subscription_tier: {
        Args: { p_user_id: string }
        Returns: Database["public"]["Enums"]["subscription_tier"]
      }
      get_user_tier_limits: {
        Args: { p_user_id: string }
        Returns: {
          allowed_game_types: string[]
          allowed_league_types: string[] | null
          badge_color: string | null
          can_access_admin_tools: boolean
          can_access_beta_features: boolean
          can_compare_stats: boolean
          can_create_league: boolean
          can_expire: boolean
          can_export_data: boolean
          can_join_league: boolean
          can_manage_guests: boolean
          can_use_ai_competition: boolean
          can_use_api_course_search: boolean
          can_use_gps_distance: boolean
          can_use_prize_pool: boolean
          can_use_scoring_pairs: boolean
          can_use_skins: boolean
          can_use_skins_game: boolean
          can_use_team_formats: boolean
          can_use_wolf: boolean
          can_use_wolf_game: boolean
          can_view_achievement_leaderboard: boolean
          can_view_advanced_stats: boolean
          can_view_basic_stats: boolean
          can_view_detailed_stats: boolean
          can_view_handicap_history: boolean
          can_view_score_distribution: boolean
          created_at: string
          description: string | null
          display_name: string
          id: string
          max_competitions_owned: number
          max_friends: number
          max_leagues_owned: number
          max_players_per_competition: number
          max_rounds_per_competition: number
          max_rounds_played: number
          requires_payment: boolean
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "tier_limits"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_users_with_push_enabled: {
        Args: { p_user_ids: string[] }
        Returns: {
          user_id: string
        }[]
      }
      gettransactionid: { Args: never; Returns: unknown }
      handle_hole_18_carryover: {
        Args: { p_skins_game_id: string }
        Returns: undefined
      }
      increment_achievement_progress: {
        Args: {
          p_achievement_code: string
          p_increment?: number
          p_player_id: string
        }
        Returns: {
          achievement_code: string
          current_value: number
          id: string
          last_updated: string
          player_id: string
        }
        SetofOptions: {
          from: "*"
          to: "achievement_progress"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      initialize_competition_skins_game: {
        Args: { p_competition_id: string; p_participant_ids?: string[] }
        Returns: {
          competition_id: string
          completed_at: string | null
          config_id: string
          created_at: string
          current_carryover: number
          current_round_number: number
          id: string
          participant_ids: string[]
          rounds_completed: number
          status: string
          total_pot: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "competition_skins_games"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      is_competition_member: {
        Args: { comp_id: string; user_id: string }
        Returns: boolean
      }
      is_competition_organizer: {
        Args: { comp_id: string; user_id: string }
        Returns: boolean
      }
      is_knockout_competition_member: {
        Args: { p_competition_id: string; p_user_id: string }
        Returns: boolean
      }
      is_league_member: {
        Args: { p_league_id: string; p_user_id: string }
        Returns: boolean
      }
      is_round_configured: { Args: { round_id: string }; Returns: boolean }
      is_round_participant: {
        Args: { p_player_id: string; p_round_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { p_user_id: string }; Returns: boolean }
      link_placeholder_player: {
        Args: { p_placeholder_id: string; p_real_player_id: string }
        Returns: boolean
      }
      lock_prize_pool: { Args: { p_pool_id: string }; Returns: undefined }
      longtransactionsenabled: { Args: never; Returns: boolean }
      lookup_league_by_invite_code: {
        Args: { p_invite_code: string }
        Returns: {
          challenge_range: number | null
          counting_rounds: number | null
          course_id: string | null
          created_at: string | null
          created_by: string
          description: string | null
          eclectic_scoring: string | null
          end_date: string | null
          id: string
          invite_code: string
          is_public: boolean
          ladder_seeding: string | null
          league_type: string
          max_rounds: number | null
          name: string
          partnership_format: string | null
          start_date: string | null
          status: string
          tee_id: string | null
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "leagues"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      mark_all_notifications_read: {
        Args: { p_user_id: string }
        Returns: number
      }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      process_skins_hole: {
        Args: {
          p_hole_number: number
          p_hole_scores: Json
          p_skins_game_id: string
        }
        Returns: {
          calculated_at: string
          carryover_to_next: number
          hole_number: number
          hole_pot_value: number
          hole_scores: Json
          id: string
          is_carryover: boolean
          payout_amount: number
          skins_game_id: string
          team_winner_id: string | null
          winner_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "skins_results"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      recalculate_placement_amounts: {
        Args: { p_pool_id: string }
        Returns: undefined
      }
      round_has_skins: { Args: { p_round_id: string }; Returns: boolean }
      search_linkable_players: {
        Args: { p_limit?: number; p_search_term: string }
        Returns: {
          email: string
          handicap: number
          id: string
          name: string
          photo_url: string
        }[]
      }
      send_push_notification: {
        Args: {
          p_body: string
          p_data?: Json
          p_notification_type: string
          p_title: string
          p_user_id: string
        }
        Returns: undefined
      }
      set_own_subscription_tier: {
        Args: { p_tier: Database["public"]["Enums"]["subscription_tier"] }
        Returns: undefined
      }
      settle_prize_pool: { Args: { p_pool_id: string }; Returns: undefined }
      settle_team_prize_pool: { Args: { p_pool_id: string }; Returns: undefined }
      should_send_push: {
        Args: { p_notification_type: string; p_user_id: string }
        Returns: boolean
      }
      soft_delete_competition: {
        Args: { p_competition_id: string }
        Returns: boolean
      }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      unequip_cosmetic: {
        Args: {
          p_cosmetic_type: Database["public"]["Enums"]["cosmetic_type"]
          p_player_id: string
        }
        Returns: boolean
      }
      unlock_cosmetic: {
        Args: { p_cosmetic_id: string; p_player_id: string }
        Returns: {
          cosmetic_id: string
          id: string
          player_id: string
          unlocked_at: string
        }
        SetofOptions: {
          from: "*"
          to: "player_cosmetics"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      unlock_prize_pool: {
        Args: { p_pool_id: string; p_reason?: string }
        Returns: undefined
      }
      unlockrows: { Args: { "": string }; Returns: number }
      update_competition_carryover: {
        Args: { p_carryover: number; p_competition_id: string }
        Returns: {
          competition_id: string
          completed_at: string | null
          config_id: string
          created_at: string
          current_carryover: number
          current_round_number: number
          id: string
          participant_ids: string[]
          rounds_completed: number
          status: string
          total_pot: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "competition_skins_games"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_push_preferences: {
        Args: {
          p_push_competition_updates?: boolean
          p_push_enabled?: boolean
          p_push_friend_requests?: boolean
          p_push_league_updates?: boolean
          p_push_scorecard_updates?: boolean
          p_user_id: string
        }
        Returns: {
          push_competition_updates: boolean
          push_enabled: boolean
          push_friend_requests: boolean
          push_league_updates: boolean
          push_scorecard_updates: boolean
        }[]
      }
      update_user_preferences: {
        Args: {
          p_custom_settings?: Json
          p_debug_mode_enabled?: boolean
          p_distance_unit?: string
          p_push_competition_updates?: boolean
          p_push_enabled?: boolean
          p_push_friend_requests?: boolean
          p_push_scorecard_updates?: boolean
          p_round_timer_enabled?: boolean
          p_show_fairway_hit?: boolean
          p_show_gir?: boolean
          p_show_putts?: boolean
          p_theme_mode?: string
          p_user_id: string
        }
        Returns: {
          custom_settings: Json
          debug_mode_enabled: boolean
          distance_unit: string
          push_competition_updates: boolean
          push_enabled: boolean
          push_friend_requests: boolean
          push_scorecard_updates: boolean
          round_timer_enabled: boolean
          show_fairway_hit: boolean
          show_gir: boolean
          show_putts: boolean
          theme_mode: string
        }[]
      }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
      upsert_achievement_progress: {
        Args: {
          p_achievement_code: string
          p_new_value: number
          p_player_id: string
        }
        Returns: {
          achievement_code: string
          current_value: number
          id: string
          last_updated: string
          player_id: string
        }
        SetofOptions: {
          from: "*"
          to: "achievement_progress"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      upsert_push_token: {
        Args: {
          p_app_version?: string
          p_device_id?: string
          p_device_name?: string
          p_platform?: string
          p_token: string
          p_user_id: string
        }
        Returns: string
      }
      upsert_user_subscription: {
        Args: {
          p_expires_at?: string
          p_external_id?: string
          p_product_id?: string
          p_source: Database["public"]["Enums"]["subscription_source"]
          p_status: Database["public"]["Enums"]["subscription_status"]
          p_tier: Database["public"]["Enums"]["subscription_tier"]
          p_trial_ends_at?: string
          p_user_id: string
        }
        Returns: string
      }
      user_can_add_friend: { Args: { p_user_id: string }; Returns: boolean }
      user_can_create_competition: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      user_can_create_league: { Args: { p_user_id: string }; Returns: boolean }
      user_can_play_round: { Args: { p_user_id: string }; Returns: boolean }
      user_can_use_game_type: {
        Args: { p_game_type: string; p_user_id: string }
        Returns: boolean
      }
      user_has_feature: {
        Args: { p_feature: string; p_user_id: string }
        Returns: boolean
      }
      user_has_tier_or_higher: {
        Args: {
          p_required_tier: Database["public"]["Enums"]["subscription_tier"]
          p_user_id: string
        }
        Returns: boolean
      }
      validate_scoring_pairs: {
        Args: { p_round_id: string }
        Returns: {
          is_valid: boolean
          message: string
          missing_players: string[]
        }[]
      }
      validate_tally_all_participants: {
        Args: { p_competition_id: string }
        Returns: Json
      }
    }
    Enums: {
      achievement_category:
        | "rounds"
        | "game_types"
        | "scoring"
        | "competitions"
        | "social"
        | "courses"
        | "match_play"
        | "streaks"
        | "milestones"
      achievement_rarity: "common" | "uncommon" | "rare" | "epic" | "legendary"
      cosmetic_type: "badge" | "frame" | "title"
      handicap_source: "profile" | "calculated" | "none"
      subscription_source: "manual" | "revenuecat" | "stripe"
      subscription_status: "active" | "cancelled" | "expired" | "trial"
      subscription_tier:
        | "free"
        | "social"
        | "premium"
        | "enterprise"
        | "super_admin"
        | "developer"
      team_format:
        | "best-ball"
        | "scramble"
        | "aggregate"
        | "match-play-team"
        | "ambrose"
        | "shamble"
      team_mode: "none" | "fixed" | "per-round"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      achievement_category: [
        "rounds",
        "game_types",
        "scoring",
        "competitions",
        "social",
        "courses",
        "match_play",
        "streaks",
        "milestones",
      ],
      achievement_rarity: ["common", "uncommon", "rare", "epic", "legendary"],
      cosmetic_type: ["badge", "frame", "title"],
      handicap_source: ["profile", "calculated", "none"],
      subscription_source: ["manual", "revenuecat", "stripe"],
      subscription_status: ["active", "cancelled", "expired", "trial"],
      subscription_tier: ["free", "social", "premium", "enterprise", "super_admin", "developer"],
      team_format: [
        "best-ball",
        "scramble",
        "aggregate",
        "match-play-team",
        "ambrose",
        "shamble",
      ],
      team_mode: ["none", "fixed", "per-round"],
    },
  },
} as const
