/**
 * Read-only check of GolfAPI data for The Eastern Golf Club courses.
 * No DB writes, no DB reads — pure API inspection.
 */
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env') });

const GOLFAPI_URL = process.env.EXPO_PUBLIC_GOLFAPI_IO_URL || 'https://www.golfapi.io/api/v2.3';
const GOLFAPI_KEY = process.env.EXPO_PUBLIC_GOLFAPI_IO_KEY!;
const ID_SUFFIX = '1769153723593685';

const COURSES = [
  { id: `012${ID_SUFFIX}`, label: 'South/North (012)' },
  { id: `013${ID_SUFFIX}`, label: 'South/East  (013)' },
  { id: `021${ID_SUFFIX}`, label: 'North/South (021)' },
  { id: `023${ID_SUFFIX}`, label: 'North/East  (023) <- USER PLAYS THIS' },
  { id: `031${ID_SUFFIX}`, label: 'East/South  (031)' },
  { id: `032${ID_SUFFIX}`, label: 'East/North  (032)' },
];

async function main() {
  console.log('=== GolfAPI live data for The Eastern courses ===\n');
  for (const c of COURSES) {
    const res = await fetch(`${GOLFAPI_URL}/courses/${c.id}`, {
      headers: { Authorization: `Bearer ${GOLFAPI_KEY}`, Accept: 'application/json' },
    });
    if (!res.ok) { console.log(`${c.label}: HTTP ${res.status}\n`); continue; }
    const data: any = await res.json();
    const parsMen: number[] = data.parsMen ?? [];
    const f9 = parsMen.slice(0, 9).reduce((s, p) => s + (p || 0), 0);
    const b9 = parsMen.slice(9, 18).reduce((s, p) => s + (p || 0), 0);
    console.log(`${c.label}  "${data.courseName}"`);
    console.log(`  parsMen [${parsMen.join(',')}]  F9=${f9}  B9=${b9}  Total=${f9 + b9}`);
    console.log(`  indexesMen [${(data.indexesMen ?? []).join(',')}]`);
    const tees = data.tees ?? [];
    for (const t of tees) {
      const slope = t.slopeMen || '-';
      const cr = t.courseRatingMen || '-';
      const f9Slope = t.slopeMenFront9 || '-';
      const b9Slope = t.slopeMenBack9 || '-';
      const f9Cr = t.courseRatingMenFront9 || '-';
      const b9Cr = t.courseRatingMenBack9 || '-';
      console.log(`    ${String(t.teeName).padEnd(10)} ${String(t.teeColor || '-').padEnd(7)}  slope=${slope}/F9=${f9Slope}/B9=${b9Slope}  CR=${cr}/F9=${f9Cr}/B9=${b9Cr}`);
    }
    console.log();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
