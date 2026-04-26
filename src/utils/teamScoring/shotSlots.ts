/**
 * Shot Slot Configuration
 *
 * Determines which shot contribution slots are tracked on a hole and how
 * they are labelled in the scramble UI. Slot count and labels vary by par:
 *   - Par 3: Tee Shot, Chip, Putt
 *   - Par 4: Tee Shot, Approach, Putt
 *   - Par 5: Tee Shot, Second Shot, Approach, Putt
 *
 * The "Chip" label on par 3 reuses the `approach` JSON field — only the
 * visible label differs between par 3 and par 4/5.
 */

export type ShotSlot = 'teeShot' | 'secondShot' | 'approach' | 'putt';

export type ShotSlotColorKey = 'primary' | 'info' | 'success' | 'warning';

export interface ShotSlotConfig {
  slot: ShotSlot;
  label: string;
  icon: string;
  colorKey: ShotSlotColorKey;
}

const TEE_SHOT: ShotSlotConfig = {
  slot: 'teeShot',
  label: 'Tee Shot',
  icon: 'golf-tee',
  colorKey: 'primary',
};

const SECOND_SHOT: ShotSlotConfig = {
  slot: 'secondShot',
  label: 'Second Shot',
  icon: 'arrow-right-bold',
  colorKey: 'info',
};

const APPROACH: ShotSlotConfig = {
  slot: 'approach',
  label: 'Approach',
  icon: 'flag',
  colorKey: 'success',
};

const CHIP: ShotSlotConfig = {
  slot: 'approach',
  label: 'Chip',
  icon: 'flag',
  colorKey: 'success',
};

const PUTT: ShotSlotConfig = {
  slot: 'putt',
  label: 'Putt',
  icon: 'circle-outline',
  colorKey: 'warning',
};

export function getShotSlotsForPar(par: number): ShotSlotConfig[] {
  if (par === 3) return [TEE_SHOT, CHIP, PUTT];
  if (par === 5) return [TEE_SHOT, SECOND_SHOT, APPROACH, PUTT];
  return [TEE_SHOT, APPROACH, PUTT];
}
