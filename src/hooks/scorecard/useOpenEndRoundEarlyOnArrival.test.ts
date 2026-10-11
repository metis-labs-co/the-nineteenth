import { renderHook } from '@testing-library/react-native';
import { useOpenEndRoundEarlyOnArrival } from './useOpenEndRoundEarlyOnArrival';

function setup(overrides: Partial<Parameters<typeof useOpenEndRoundEarlyOnArrival>[0]> = {}) {
  const args = {
    requested: true,
    ready: true,
    canEndRoundEarly: true,
    isEnded: false,
    open: jest.fn(),
    onUnavailable: jest.fn(),
    goBack: jest.fn(),
    onHandled: jest.fn(),
    ...overrides,
  };
  const hook = renderHook((p: typeof args) => useOpenEndRoundEarlyOnArrival(p), { initialProps: args });
  return { args, ...hook };
}

describe('useOpenEndRoundEarlyOnArrival', () => {
  it('opens once when requested, ready and eligible, then clears the request', () => {
    const { args } = setup();
    expect(args.open).toHaveBeenCalledTimes(1);
    expect(args.onUnavailable).not.toHaveBeenCalled();
    expect(args.onHandled).toHaveBeenCalledTimes(1);
  });

  it('waits until ready', () => {
    const { args, rerender } = setup({ ready: false });
    expect(args.open).not.toHaveBeenCalled();
    expect(args.onUnavailable).not.toHaveBeenCalled();
    rerender({ ...args, ready: true });
    expect(args.open).toHaveBeenCalledTimes(1);
  });

  it('reports unavailable once when ready but not eligible', () => {
    const { args, rerender } = setup({ canEndRoundEarly: false });
    expect(args.onUnavailable).toHaveBeenCalledTimes(1);
    expect(args.open).not.toHaveBeenCalled();
    rerender({ ...args });
    expect(args.onUnavailable).toHaveBeenCalledTimes(1);
  });

  it('does nothing when not requested', () => {
    const { args } = setup({ requested: false });
    expect(args.open).not.toHaveBeenCalled();
    expect(args.onUnavailable).not.toHaveBeenCalled();
  });

  it('does nothing when the round is already ended', () => {
    const { args } = setup({ isEnded: true });
    expect(args.open).not.toHaveBeenCalled();
    expect(args.onUnavailable).not.toHaveBeenCalled();
  });

  it('does not re-fire on re-render', () => {
    const { args, rerender } = setup();
    rerender({ ...args });
    rerender({ ...args, canEndRoundEarly: false });
    expect(args.open).toHaveBeenCalledTimes(1);
    expect(args.onUnavailable).not.toHaveBeenCalled();
  });

  it('cancel wrapper calls onCancel then goes back when the shortcut opened the sheet', () => {
    const { args, result } = setup();
    const order: string[] = [];
    const onCancel = jest.fn(() => order.push('cancel'));
    (args.goBack as jest.Mock).mockImplementation(() => order.push('back'));
    result.current.wrapCancel(onCancel)();
    expect(order).toEqual(['cancel', 'back']);
    // A second cancel (sheet reopened manually) must not navigate again.
    result.current.wrapCancel(onCancel)();
    expect(args.goBack).toHaveBeenCalledTimes(1);
  });

  it('cancel wrapper does not go back when the shortcut did not open the sheet', () => {
    const { args, result } = setup({ requested: false });
    const onCancel = jest.fn();
    result.current.wrapCancel(onCancel)();
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(args.goBack).not.toHaveBeenCalled();
  });
});
