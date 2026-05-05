/**
 * Supabase Edge Function: ingest-course-hazards
 *
 * Fetches OSM bunker polygons for each hole of the given course and
 * upserts them into hole_hazards. Idempotent — repeated runs do not
 * create duplicates (uses unique index on
 * course_id, hole_number, hazard_type, external_id).
 *
 * Auth: requires service-role key. Not callable by regular clients.
 *
 * Request body: { courseId: string }
 * Response: { success: boolean, holesProcessed: number, polygonsUpserted: number, errors: string[] }
 *
 * See spec: docs/superpowers/specs/2026-05-05-auto-bunker-detection-design.md §7
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { fetchBunkers, holeBBox } from './overpass.ts';

/**
 * Convert a closed GeoJSON-style ring ([[lng, lat], …]) to an EWKT
 * polygon string accepted by PostGIS's text→geography implicit cast.
 *
 * PostgREST won't auto-cast a JSON GeoJSON object into a GEOGRAPHY
 * column, but it WILL pass an EWKT text value through to the column,
 * where the implicit cast handles it.
 */
function ringToEwkt(ring: Array<[number, number]>): string {
  const points = ring.map(([lng, lat]) => `${lng} ${lat}`).join(', ');
  return `SRID=4326;POLYGON((${points}))`;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const INTER_HOLE_DELAY_MS = 200;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isServiceRole(authHeader: string | null): boolean {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  const token = authHeader.substring(7);
  const candidates = [
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    Deno.env.get('ADMIN_API_KEY'),
  ].filter((k): k is string => typeof k === 'string' && k.length > 0);
  return candidates.some((k) => k === token);
}

interface HoleCoord {
  hole_number: number;
  poi_type: string;
  latitude: number;
  longitude: number;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };
  const errors: string[] = [];

  try {
    if (!isServiceRole(req.headers.get('Authorization'))) {
      return new Response(
        JSON.stringify({ success: false, errors: ['Unauthorized'] }),
        { status: 401, headers: jsonHeaders }
      );
    }

    const { courseId } = await req.json();
    if (!courseId || typeof courseId !== 'string') {
      return new Response(
        JSON.stringify({ success: false, errors: ['courseId required'] }),
        { status: 400, headers: jsonHeaders }
      );
    }

    console.log(`[ingest-course-hazards] Starting ingest for courseId=${courseId}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase    = createClient(supabaseUrl, serviceKey);

    // Fetch tee_back + green_center coords for this course
    const { data: coords, error: coordsErr } = await supabase
      .from('hole_coordinates')
      .select('hole_number, poi_type, latitude, longitude')
      .eq('course_id', courseId)
      .in('poi_type', ['tee_back', 'green_center']);

    if (coordsErr) {
      return new Response(
        JSON.stringify({ success: false, errors: [`Coords query failed: ${coordsErr.message}`] }),
        { status: 500, headers: jsonHeaders }
      );
    }

    // Group by hole_number
    const byHole = new Map<number, { tee?: HoleCoord; green?: HoleCoord }>();
    for (const row of (coords as HoleCoord[]) ?? []) {
      const slot = byHole.get(row.hole_number) ?? {};
      if (row.poi_type === 'tee_back')     slot.tee   = row;
      if (row.poi_type === 'green_center') slot.green = row;
      byHole.set(row.hole_number, slot);
    }

    let holesProcessed = 0;
    let polygonsUpserted = 0;

    const sortedHoles = [...byHole.entries()].sort((a, b) => a[0] - b[0]);
    for (const [holeNumber, { tee, green }] of sortedHoles) {
      if (!tee || !green) {
        errors.push(`hole ${holeNumber}: missing tee or green coords, skipped`);
        continue;
      }

      const bbox = holeBBox(
        { lat: tee.latitude,   lng: tee.longitude },
        { lat: green.latitude, lng: green.longitude }
      );

      console.log(`[ingest-course-hazards] hole ${holeNumber}: bbox built, fetching bunkers`);

      try {
        const polygons = await fetchBunkers(bbox);

        for (const p of polygons) {
          const { error: upsertErr } = await supabase.from('hole_hazards').upsert(
            {
              course_id:   courseId,
              hole_number: holeNumber,
              hazard_type: 'bunker',
              polygon: ringToEwkt(p.coordinates),
              source: 'osm',
              external_id: p.externalId,
            },
            { onConflict: 'course_id,hole_number,hazard_type,external_id' }
          );

          if (upsertErr) {
            errors.push(`hole ${holeNumber} upsert failed: ${upsertErr.message}`);
          } else {
            polygonsUpserted++;
          }
        }
        console.log(`[ingest-course-hazards] hole ${holeNumber}: ${polygons.length} bunkers, upserts succeeded so far=${polygonsUpserted}`);
        holesProcessed++;
      } catch (err) {
        errors.push(`hole ${holeNumber} Overpass failed: ${err instanceof Error ? err.message : String(err)}`);
      }

      await sleep(INTER_HOLE_DELAY_MS);
    }

    console.log(`[ingest-course-hazards] Done. holesProcessed=${holesProcessed}, polygonsUpserted=${polygonsUpserted}, errors=${errors.length}`);

    return new Response(
      JSON.stringify({ success: true, holesProcessed, polygonsUpserted, errors }),
      { status: 200, headers: jsonHeaders }
    );
  } catch (err) {
    console.error('[ingest-course-hazards] Unexpected error:', err);
    return new Response(
      JSON.stringify({
        success: false,
        errors: [err instanceof Error ? err.message : 'Unknown error'],
      }),
      { status: 500, headers: jsonHeaders }
    );
  }
});
