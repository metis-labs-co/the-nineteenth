import { shouldShowSoft } from '../ForceUpdateModal';

describe('shouldShowSoft', () => {
  it('shows when nothing dismissed yet', () => {
    expect(shouldShowSoft('1.13.1', null)).toBe(true);
  });

  it('hides when dismissed version equals latest', () => {
    expect(shouldShowSoft('1.13.1', '1.13.1')).toBe(false);
  });

  it('hides when dismissed version is newer than latest', () => {
    expect(shouldShowSoft('1.13.1', '1.14.0')).toBe(false);
  });

  it('shows again when latest rises above dismissed', () => {
    expect(shouldShowSoft('1.14.0', '1.13.1')).toBe(true);
  });
});
