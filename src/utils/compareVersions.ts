/**
 * Semver-aware comparison of dot-separated version strings.
 *
 * Compares major.minor.patch numerically (so 1.9.0 < 1.10.0). Missing
 * trailing parts are treated as 0, so '1.9' === '1.9.0'. Non-numeric or
 * malformed parts coerce to 0 rather than throwing — callers treat an
 * unparseable version as "equal" and the gate fails open elsewhere.
 */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const pa = a.split('.');
  const pb = b.split('.');
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const na = parseInt(pa[i] ?? '0', 10) || 0;
    const nb = parseInt(pb[i] ?? '0', 10) || 0;
    if (na < nb) return -1;
    if (na > nb) return 1;
  }
  return 0;
}

/** True when `running` is strictly older than `target`. */
export function isBelow(running: string, target: string): boolean {
  return compareVersions(running, target) < 0;
}
