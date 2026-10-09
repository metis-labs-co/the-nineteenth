/** Process-local provenance for short local persistence chains. Never span network waits. */
import type { Scorecard } from '@/types';
import type { RoundScoringShape } from '@/services/rounds/roundScoringWrite';
import { shapeHoleNumbers } from '@/services/rounds/roundScoringWrite';

export type RoundPersistenceSource = Readonly<{ roundId: string; epoch: number }>;
declare const leaseBrand: unique symbol;
export type RoundPersistenceLease = Readonly<{ [leaseBrand]: true }>;
export interface RoundPersistenceOptions {
  source?: RoundPersistenceSource;
  lease?: RoundPersistenceLease;
  /** Optional expected round for hole-only calls; parent identity is still verified. */
  roundId?: string;
}
export class RoundPersistenceSourceChangedError extends Error {
  constructor(roundId: string) {
    super(`Round persistence source changed for ${roundId}`);
    this.name = 'RoundPersistenceSourceChangedError';
  }
}
interface RoundGate {
  epoch: number;
  closed: boolean;
  active: number;
  reopened?: Promise<void>;
  reopen?: () => void;
  drained?: () => void;
  transitions: number;
  tail: Promise<void>;
  shape?: RoundScoringShape;
}
const rounds = new Map<string, RoundGate>();
const leases = new WeakMap<
  RoundPersistenceLease,
  { roundId: string; source: RoundPersistenceSource; active: boolean }
>();
function gateFor(roundId: string): RoundGate {
  let gate = rounds.get(roundId);
  if (!gate) {
    gate = { epoch: 0, closed: false, active: 0, transitions: 0, tail: Promise.resolve() };
    rounds.set(roundId, gate);
  }
  return gate;
}
export function captureRoundPersistenceSource(roundId: string): RoundPersistenceSource {
  return Object.freeze({ roundId, epoch: gateFor(roundId).epoch });
}
/** Capture provenance before an asynchronous device-wide read reveals its round IDs. */
export function captureRoundPersistenceRead(): (roundId: string) => RoundPersistenceSource {
  const epochs = new Map([...rounds].map(([id, gate]) => [id, gate.epoch]));
  return roundId => Object.freeze({ roundId, epoch: epochs.get(roundId) ?? 0 });
}
export function isRoundPersistenceSourceCurrent(source: RoundPersistenceSource): boolean {
  const gate = gateFor(source.roundId);
  return !gate.closed && gate.epoch === source.epoch;
}
export function roundPersistenceLeaseRoundId(lease: RoundPersistenceLease): string {
  const entry = leases.get(lease);
  if (!entry?.active) throw new Error('Invalid or inactive round persistence lease');
  return entry.roundId;
}

/** Admission registers synchronously, before invoking work. Closing never invalidates admitted leases. */
export function withRoundPersistence<T>(
  source: RoundPersistenceSource,
  work: (lease: RoundPersistenceLease) => Promise<T>
): Promise<T> {
  const gate = gateFor(source.roundId);
  if (gate.closed) return gate.reopened!.then(() => withRoundPersistence(source, work));
  if (source.epoch !== gate.epoch)
    return Promise.reject(new RoundPersistenceSourceChangedError(source.roundId));
  const lease = Object.freeze({}) as RoundPersistenceLease;
  const entry = { roundId: source.roundId, source, active: true };
  leases.set(lease, entry);
  gate.active += 1;
  const release = () => {
    entry.active = false;
    gate.active -= 1;
    if (gate.active === 0) gate.drained?.();
  };
  try {
    return Promise.resolve(work(lease)).finally(release);
  } catch (error) {
    release();
    return Promise.reject(error);
  }
}

/** Reuse an explicit parent lease. Unknown legacy sources are allowed only before any committed transition. */
export function runRoundPersistence<T>(
  roundId: string,
  options: RoundPersistenceOptions,
  work: (lease: RoundPersistenceLease) => Promise<T>,
  card?: Pick<Scorecard, 'holesPlayed' | 'syncNineType'>
): Promise<T> {
  const gate = gateFor(roundId);
  const validateShape = () => {
    if (
      card &&
      gate.shape &&
      ((card.holesPlayed ?? null) !== gate.shape.holes_played ||
        (card.syncNineType != null && card.syncNineType !== gate.shape.nine_type))
    )
      throw new RoundPersistenceSourceChangedError(roundId);
  };
  try {
    if (options.roundId && options.roundId !== roundId)
      throw new Error('Wrong round persistence lease/source');
    if (options.lease) {
      const entry = leases.get(options.lease);
      if (!entry?.active || entry.roundId !== roundId)
        throw new Error('Invalid, wrong-round or inactive round persistence lease');
      if (
        options.source &&
        (options.source.roundId !== roundId || options.source.epoch !== entry.source.epoch)
      )
        throw new Error('Mismatched round persistence lease/source');
      validateShape();
      return Promise.resolve(work(options.lease));
    }
    if (options.source && options.source.roundId !== roundId)
      throw new Error('Wrong round persistence source');
    if (!options.source && gate.epoch !== 0) throw new RoundPersistenceSourceChangedError(roundId);
    const source = options.source ?? captureRoundPersistenceSource(roundId);
    return withRoundPersistence(source, (lease) => {
      validateShape();
      return work(lease);
    });
  } catch (error) {
    return Promise.reject(error);
  }
}

/** Wait without admission so a cancelled prepared reader can start a fresh acquisition. */
export async function waitForRoundPersistenceReady(roundId: string): Promise<void> {
  const gate = gateFor(roundId);
  while (gate.closed) await gate.reopened;
}

/**
 * Caller resolves network/context first, then supplies the exact shape its exclusive transaction commits.
 * afterCommit is synchronous; it must not acquire a lease or start another transition.
 */
export function withRoundPersistenceTransition<T>(
  roundId: string,
  acceptedShape: RoundScoringShape,
  persist: () => Promise<T>,
  afterCommit: (result: T) => void
): Promise<T> {
  shapeHoleNumbers(acceptedShape);
  const shape = Object.freeze({ ...acceptedShape });
  const gate = gateFor(roundId);
  const perform = async () => {
    gate.closed = true;
    gate.reopened = new Promise<void>((resolve) => {
      gate.reopen = resolve;
    });
    try {
      if (gate.active > 0)
        await new Promise<void>((resolve) => {
          gate.drained = resolve;
        });
      const result = await persist();
      gate.epoch += 1;
      gate.shape = shape;
      afterCommit(result);
      return result;
    } finally {
      gate.drained = undefined;
      gate.closed = false;
      gate.reopen!();
      gate.transitions -= 1;
    }
  };
  const result = gate.transitions++ === 0 ? perform() : gate.tail.then(perform);
  gate.tail = result.then(
    () => {},
    () => {}
  );
  return result;
}
