/**
 * Club Cache Service
 *
 * Manages PostgreSQL caching of club data from GolfAPI.io.
 *
 * Features:
 * - 30-day TTL for cached data
 * - Club upsert support
 * - Search cached clubs by name/state/city
 * - Stale data detection
 */

import { supabase } from '@/services/supabase/client';
import type { Club, ClubWithCourses } from '@/types/database.types';
import {
  CACHE_TTL_MS,
  type CacheSearchParams,
  type CacheSearchResult,
  type ClubInsert,
  type ClubInsertDb,
  type ClubUpdateDb,
} from './types';

/**
 * Club Cache Service
 * Manages PostgreSQL caching of club data
 */
class ClubCacheService {
  /**
   * Cache a club (insert or update)
   * Matches by golfapi_club_id if provided, otherwise inserts new
   *
   * @param clubData - Partial club data to cache
   * @returns The cached club with generated ID
   */
  async cacheClub(clubData: ClubInsert): Promise<Club> {
    try {
      // Check if club already exists by golfapi_club_id
      const existingClub = clubData.golfapi_club_id
        ? await this.getCachedClubByGolfApiId(clubData.golfapi_club_id)
        : null;

      const now = new Date().toISOString();

      if (existingClub) {
        // Update existing club
        // Note: latitude/longitude are not stored directly - they're parsed from location field
        const updateData: ClubUpdateDb = {
          name: clubData.name,
          golfapi_club_id: clubData.golfapi_club_id,
          address: clubData.address,
          city: clubData.city,
          postal_code: clubData.postal_code,
          state: clubData.state,
          country: clubData.country || 'Australia',
          continent: clubData.continent,
          phone: clubData.phone,
          email: clubData.email,
          website: clubData.website,
          total_holes: clubData.total_holes,
          source: clubData.source || 'api',
          last_synced: now,
          updated_at: now,
        };

        const { data, error } = await supabase
          .from('clubs')
          .update(updateData as unknown as never)
          .eq('id', existingClub.id)
          .select()
          .single();

        if (error) {
          throw new Error(`Failed to update cached club: ${error.message}`);
        }

        return data as Club;
      } else {
        // Insert new club
        // Note: latitude/longitude are not stored directly - they're parsed from location field
        const insertData: ClubInsertDb = {
          name: clubData.name,
          golfapi_club_id: clubData.golfapi_club_id,
          address: clubData.address,
          city: clubData.city,
          postal_code: clubData.postal_code,
          state: clubData.state,
          country: clubData.country || 'Australia',
          continent: clubData.continent,
          phone: clubData.phone,
          email: clubData.email,
          website: clubData.website,
          total_holes: clubData.total_holes,
          source: clubData.source || 'api',
          last_synced: now,
        };

        const { data, error } = await supabase
          .from('clubs')
          .insert(insertData as unknown as never)
          .select()
          .single();

        if (error) {
          throw new Error(`Failed to cache club: ${error.message}`);
        }

        return data as Club;
      }
    } catch (error) {
      console.error('[ClubCacheService] Error caching club:', error);
      throw error;
    }
  }

  /**
   * Get cached club by GolfAPI.io club ID
   *
   * @param golfapiClubId - The GolfAPI.io ClubID
   * @returns Cached club or null if not found
   */
  async getCachedClubByGolfApiId(golfapiClubId: string): Promise<Club | null> {
    try {
      const { data, error } = await supabase
        .from('clubs')
        .select('*')
        .eq('golfapi_club_id', golfapiClubId)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') {
          // Not just "not found"
          console.error('[ClubCacheService] Error fetching club by GolfAPI ID:', error.message);
        }
        return null;
      }

      return data as Club;
    } catch (error) {
      console.error('[ClubCacheService] Exception fetching club by GolfAPI ID:', error);
      return null;
    }
  }

  /**
   * Get cached club by internal ID
   *
   * @param id - The internal club ID
   * @returns Cached club or null if not found
   */
  async getCachedClubById(id: string): Promise<Club | null> {
    try {
      const { data, error } = await supabase.from('clubs').select('*').eq('id', id).single();

      if (error) {
        if (error.code !== 'PGRST116') {
          console.error('[ClubCacheService] Error fetching club by ID:', error.message);
        }
        return null;
      }

      return data as Club;
    } catch (error) {
      console.error('[ClubCacheService] Exception fetching club by ID:', error);
      return null;
    }
  }

  /**
   * Get cached club with its courses
   *
   * @param id - The internal club ID
   * @returns Club with courses or null if not found
   */
  async getCachedClubWithCourses(id: string): Promise<ClubWithCourses | null> {
    try {
      const { data, error } = await supabase
        .from('clubs')
        .select(
          `
          *,
          courses (*)
        `
        )
        .eq('id', id)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') {
          console.error('[ClubCacheService] Error fetching club with courses:', error.message);
        }
        return null;
      }

      return data as ClubWithCourses;
    } catch (error) {
      console.error('[ClubCacheService] Exception fetching club with courses:', error);
      return null;
    }
  }

  /**
   * Search cached clubs by name, state, and/or city
   *
   * @param params - Search parameters
   * @returns Search results with pagination info
   */
  async searchCachedClubs(params: CacheSearchParams): Promise<CacheSearchResult> {
    const { query, state, city, limit = 20, offset = 0 } = params;

    try {
      let queryBuilder = supabase.from('clubs').select('*', { count: 'exact' });

      // Apply search filter (case-insensitive)
      if (query && query.length >= 2) {
        queryBuilder = queryBuilder.ilike('name', `%${query}%`);
      }

      // Apply state filter
      if (state) {
        queryBuilder = queryBuilder.eq('state', state);
      }

      // Apply city filter
      if (city) {
        queryBuilder = queryBuilder.ilike('city', `%${city}%`);
      }

      // Apply pagination
      queryBuilder = queryBuilder.order('name', { ascending: true }).range(offset, offset + limit - 1);

      const { data, error, count } = await queryBuilder;

      if (error) {
        throw new Error(`Failed to search cached clubs: ${error.message}`);
      }

      const clubs = (data as Club[]) || [];
      const total = count || 0;

      return {
        clubs,
        total,
        hasMore: offset + clubs.length < total,
      };
    } catch (error) {
      console.error('[ClubCacheService] Search clubs error:', error);
      return {
        clubs: [],
        total: 0,
        hasMore: false,
      };
    }
  }

  /**
   * Check if a cached club is still fresh (within TTL)
   *
   * @param golfapiClubId - The GolfAPI.io ClubID
   * @returns True if cache is fresh, false if stale or not found
   */
  async isClubCacheFresh(golfapiClubId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('clubs')
        .select('last_synced')
        .eq('golfapi_club_id', golfapiClubId)
        .single();

      if (error || !data) {
        return false;
      }

      const clubData = data as { last_synced: string | null };
      if (!clubData.last_synced) {
        return false;
      }

      const lastSynced = new Date(clubData.last_synced).getTime();
      const now = Date.now();

      return now - lastSynced < CACHE_TTL_MS;
    } catch {
      return false;
    }
  }

  /**
   * Get all API-sourced clubs
   *
   * @returns All clubs from API source
   */
  async getApiClubs(): Promise<Club[]> {
    try {
      const { data, error } = await supabase
        .from('clubs')
        .select('*')
        .eq('source', 'api')
        .order('name', { ascending: true });

      if (error) {
        throw new Error(`Failed to get API clubs: ${error.message}`);
      }

      return (data as Club[]) || [];
    } catch (error) {
      console.error('[ClubCacheService] Get API clubs error:', error);
      return [];
    }
  }

  /**
   * Get stale clubs (past TTL)
   *
   * @param limit - Maximum number of stale clubs to return
   * @returns Array of stale clubs
   */
  async getStaleClubs(limit: number = 50): Promise<Club[]> {
    try {
      const cutoffDate = new Date(Date.now() - CACHE_TTL_MS).toISOString();

      const { data, error } = await supabase
        .from('clubs')
        .select('*')
        .eq('source', 'api')
        .lt('last_synced', cutoffDate)
        .limit(limit)
        .order('last_synced', { ascending: true });

      if (error) {
        throw new Error(`Failed to get stale clubs: ${error.message}`);
      }

      return (data as Club[]) || [];
    } catch (error) {
      console.error('[ClubCacheService] Get stale clubs error:', error);
      return [];
    }
  }

  /**
   * Delete a cached club (and its courses via cascade)
   *
   * @param id - Club ID to delete
   */
  async deleteCachedClub(id: string): Promise<void> {
    const { error } = await supabase.from('clubs').delete().eq('id', id);

    if (error) {
      throw new Error(`Failed to delete cached club: ${error.message}`);
    }
  }

  /**
   * Update last_synced timestamp on a club
   *
   * @param clubId - The club ID
   */
  async updateClubLastSynced(clubId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('clubs')
        .update({ last_synced: new Date().toISOString() } as unknown as never)
        .eq('id', clubId);

      if (error) {
        console.warn('[ClubCacheService] Failed to update club last_synced:', error.message);
      }
    } catch (error) {
      console.warn('[ClubCacheService] Exception updating club last_synced:', error);
    }
  }
}

// =====================================================
// SINGLETON EXPORT
// =====================================================

/**
 * Singleton club cache service instance
 */
export const clubCacheService = new ClubCacheService();

/**
 * Export class for testing
 */
export { ClubCacheService };
