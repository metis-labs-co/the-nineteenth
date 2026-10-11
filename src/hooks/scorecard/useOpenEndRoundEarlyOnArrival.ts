/**
 * "End round early" shortcut arrival: when a scoring screen is opened from the
 * round details screen with `openEndRoundEarly`, open the end-early sheet once
 * the round is genuinely ready (or bail out with a message if it can't be
 * ended). Fires at most once per mount.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseOpenEndRoundEarlyOnArrivalArgs {
  /** The `openEndRoundEarly` route param. */
  requested: boolean;
  /** Store initialised for this round, players loaded and the screen's metadata has loaded. */
  ready: boolean;
  canEndRoundEarly: boolean;
  isEnded: boolean;
  open: () => void;
  /** Whether the end-early sheet is currently visible (confirms open() worked). */
  sheetVisible: boolean;
  /** Show the "can't end yet" message (the hook then navigates back). */
  onUnavailable: () => void;
  goBack: () => void;
  /** Called once after the request is consumed, e.g. to clear the route param. */
  onHandled?: () => void;
}

type Phase = 'idle' | 'armed' | 'opening' | 'done';

/**
 * idle -> armed (one render after `ready` first holds, so eligibility is read
 * after same-commit store effects have settled) -> opening (open() called;
 * verify the sheet really became visible) -> done.
 */
export function useOpenEndRoundEarlyOnArrival({
  requested,
  ready,
  canEndRoundEarly,
  isEnded,
  open,
  sheetVisible,
  onUnavailable,
  goBack,
  onHandled,
}: UseOpenEndRoundEarlyOnArrivalArgs) {
  const [phase, setPhase] = useState<Phase>('idle');
  const openedByShortcutRef = useRef(false);

  useEffect(() => {
    if (!requested) return;
    const bail = () => {
      setPhase('done');
      onHandled?.();
      onUnavailable();
      goBack();
    };
    if (phase === 'idle') {
      if (ready) setPhase('armed');
    } else if (phase === 'armed') {
      if (isEnded) {
        setPhase('done');
        onHandled?.();
      } else if (!canEndRoundEarly) {
        bail();
      } else {
        open();
        setPhase('opening');
      }
    } else if (phase === 'opening') {
      if (sheetVisible) {
        openedByShortcutRef.current = true;
        setPhase('done');
        onHandled?.();
      } else {
        bail();
      }
    }
  }, [requested, phase, ready, canEndRoundEarly, isEnded, open, sheetVisible, onUnavailable, goBack, onHandled]);

  /** Wrap the sheet's onCancel so cancelling a shortcut-opened sheet returns to round details. */
  const wrapCancel = useCallback(
    (onCancel: () => void) => () => {
      onCancel();
      if (openedByShortcutRef.current) {
        openedByShortcutRef.current = false;
        goBack();
      }
    },
    [goBack]
  );

  return { wrapCancel };
}

export const END_EARLY_UNAVAILABLE_TITLE = "Can't end this round yet";
export const END_EARLY_UNAVAILABLE_MESSAGE =
  'Every player needs a completed hole, and this phone must be scoring all players.';
