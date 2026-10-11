import { useEffect, useState } from 'react';
import { renderHook } from '@testing-library/react-native';
import { useOpenEndRoundEarlyOnArrival } from './useOpenEndRoundEarlyOnArrival';

interface Opts {
  requested: boolean;
  ready: boolean;
  canEndRoundEarly: boolean;
  isEnded: boolean;
  /** open() is a silent no-op (like useEndRoundEarly's guarded open). */
  openNoop: boolean;
  /** Eligibility only becomes true after a same-commit effect runs once ready. */
  flipEligibleAfterReady: boolean;
}

function setup(overrides: Partial<Opts> = {}, initial?: Partial<Opts>) {
  const calls = {
    open: jest.fn(),
    onUnavailable: jest.fn(),
    goBack: jest.fn(),
    onHandled: jest.fn(),
    order: [] as string[],
  };
  const base: Opts = {
    requested: true,
    ready: true,
    canEndRoundEarly: true,
    isEnded: false,
    openNoop: false,
    flipEligibleAfterReady: false,
    ...overrides,
    ...initial,
  };
  const hook = renderHook(
    (o: Opts) => {
      const [visible, setVisible] = useState(false);
      const [flipped, setFlipped] = useState(false);
      // Mimics the screen's store effect that runs just before the arrival effect.
      useEffect(() => {
        if (o.flipEligibleAfterReady && o.ready && !flipped) setFlipped(true);
      }, [o.ready, o.flipEligibleAfterReady, flipped]);
      const result = useOpenEndRoundEarlyOnArrival({
        requested: o.requested,
        ready: o.ready,
        canEndRoundEarly: o.flipEligibleAfterReady ? flipped : o.canEndRoundEarly,
        isEnded: o.isEnded,
        open: () => {
          calls.open();
          if (!o.openNoop) setVisible(true);
        },
        sheetVisible: visible,
        onUnavailable: () => {
          calls.order.push('unavailable');
          calls.onUnavailable();
        },
        goBack: () => {
          calls.order.push('back');
          calls.goBack();
        },
        onHandled: () => {
          calls.order.push('handled');
          calls.onHandled();
        },
      });
      return result;
    },
    { initialProps: base }
  );
  return { base, calls, ...hook };
}

describe('useOpenEndRoundEarlyOnArrival', () => {
  it('opens once when requested, ready and eligible, then clears the request', () => {
    const { calls } = setup();
    expect(calls.open).toHaveBeenCalledTimes(1);
    expect(calls.onUnavailable).not.toHaveBeenCalled();
    expect(calls.onHandled).toHaveBeenCalledTimes(1);
  });

  it('waits until ready', () => {
    const { base, calls, rerender } = setup({ ready: false });
    expect(calls.open).not.toHaveBeenCalled();
    expect(calls.onUnavailable).not.toHaveBeenCalled();
    rerender({ ...base, ready: true });
    expect(calls.open).toHaveBeenCalledTimes(1);
  });

  it('opens (not unavailable) when eligibility flips false to true on the render after ready', () => {
    const { calls } = setup({ flipEligibleAfterReady: true });
    expect(calls.onUnavailable).not.toHaveBeenCalled();
    expect(calls.goBack).not.toHaveBeenCalled();
    expect(calls.open).toHaveBeenCalledTimes(1);
  });

  it('reports unavailable once when ready but not eligible, clearing the param before going back', () => {
    const { base, calls, rerender } = setup({ canEndRoundEarly: false });
    expect(calls.onUnavailable).toHaveBeenCalledTimes(1);
    expect(calls.open).not.toHaveBeenCalled();
    expect(calls.order).toEqual(['handled', 'unavailable', 'back']);
    rerender({ ...base });
    expect(calls.onUnavailable).toHaveBeenCalledTimes(1);
    expect(calls.goBack).toHaveBeenCalledTimes(1);
  });

  it('falls back to unavailable when open() silently did not show the sheet', () => {
    const { calls, result } = setup({ openNoop: true });
    expect(calls.open).toHaveBeenCalledTimes(1);
    expect(calls.order).toEqual(['handled', 'unavailable', 'back']);
    // Not treated as shortcut-opened: a later cancel does not navigate again.
    result.current.wrapCancel(jest.fn())();
    expect(calls.goBack).toHaveBeenCalledTimes(1);
  });

  it('does nothing when not requested', () => {
    const { calls } = setup({ requested: false });
    expect(calls.open).not.toHaveBeenCalled();
    expect(calls.onUnavailable).not.toHaveBeenCalled();
  });

  it('does nothing when the round is already ended', () => {
    const { calls } = setup({ isEnded: true });
    expect(calls.open).not.toHaveBeenCalled();
    expect(calls.onUnavailable).not.toHaveBeenCalled();
    expect(calls.goBack).not.toHaveBeenCalled();
  });

  it('does not re-fire on re-render', () => {
    const { base, calls, rerender } = setup();
    rerender({ ...base });
    rerender({ ...base, canEndRoundEarly: false });
    expect(calls.open).toHaveBeenCalledTimes(1);
    expect(calls.onUnavailable).not.toHaveBeenCalled();
  });

  it('cancel wrapper calls onCancel then goes back once when the shortcut opened the sheet', () => {
    const { calls, result } = setup();
    const onCancel = jest.fn(() => calls.order.push('cancel'));
    result.current.wrapCancel(onCancel)();
    expect(calls.order.slice(-2)).toEqual(['cancel', 'back']);
    result.current.wrapCancel(onCancel)();
    expect(calls.goBack).toHaveBeenCalledTimes(1);
  });

  it('cancel wrapper does not go back when the shortcut did not open the sheet', () => {
    const { calls, result } = setup({ requested: false });
    const onCancel = jest.fn();
    result.current.wrapCancel(onCancel)();
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(calls.goBack).not.toHaveBeenCalled();
  });
});
