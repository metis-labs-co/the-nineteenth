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
