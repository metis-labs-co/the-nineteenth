import { notifyRoundAccessLost, onRoundAccessLost } from './roundAccessEvents';

it('notifies subscribers until they unsubscribe', () => {
  const listener = jest.fn();
  const off = onRoundAccessLost(listener);
  notifyRoundAccessLost('r1');
  off();
  notifyRoundAccessLost('r2');
  expect(listener).toHaveBeenCalledTimes(1);
  expect(listener).toHaveBeenCalledWith('r1');
});

it('keeps notifying other subscribers when one throws', () => {
  const thrower = jest.fn(() => {
    throw new Error('boom');
  });
  const listener = jest.fn();
  const offThrower = onRoundAccessLost(thrower);
  const off = onRoundAccessLost(listener);
  expect(() => notifyRoundAccessLost('r1')).not.toThrow();
  offThrower();
  off();
  expect(thrower).toHaveBeenCalledWith('r1');
  expect(listener).toHaveBeenCalledWith('r1');
});
