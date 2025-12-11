// Global test timeout
jest.setTimeout(10000);

// Silence console warnings in tests
const originalWarn = console.warn;
console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('Animated')
  ) {
    return;
  }
  originalWarn.apply(console, args);
};
