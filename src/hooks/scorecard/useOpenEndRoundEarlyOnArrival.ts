/**
 * "End round early" shortcut arrival: when a scoring screen is opened from the
 * round details screen with `openEndRoundEarly`, open the end-early sheet once
 * the round is genuinely ready (or bail out with a message if it can't be
 * ended). Fires at most once per mount.
 */
import { useCallback, useEffect, useRef } from 'react';

export interface UseOpenEndRoundEarlyOnArrivalArgs {
  /** The `openEndRoundEarly` route param. */
  requested: boolean;
  /** Store initialised for this round and the screen's metadata has loaded. */
  ready: boolean;
  canEndRoundEarly: boolean;
  isEnded: boolean;
  open: () => void;
  /** Show the "can't end yet" message (the hook then navigates back). */
  onUnavailable: () => void;
  goBack: () => void;
  /** Called once after the request is consumed, e.g. to clear the route param. */
  onHandled?: () => void;
}

export function useOpenEndRoundEarlyOnArrival({
  requested,
  ready,
  canEndRoundEarly,
  isEnded,
  open,
  onUnavailable,
  goBack,
  onHandled,
}: UseOpenEndRoundEarlyOnArrivalArgs) {
  const handledRef = useRef(false);
  const openedByShortcutRef = useRef(false);

  useEffect(() => {
    if (!requested || !ready || handledRef.current) return;
    handledRef.current = true;
    if (!isEnded) {
      if (canEndRoundEarly) {
        openedByShortcutRef.current = true;
        open();
      } else {
        onUnavailable();
        goBack();
      }
    }
    onHandled?.();
  }, [requested, ready, canEndRoundEarly, isEnded, open, onUnavailable, goBack, onHandled]);

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
