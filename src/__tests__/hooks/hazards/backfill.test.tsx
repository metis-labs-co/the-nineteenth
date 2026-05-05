import { renderHook, waitFor } from '@testing-library/react-native';
import { useHazardBackfill } from '@/hooks/hazards/backfill';

const mockInvoke = jest.fn();
jest.mock('@/services/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
  },
}));

describe('useHazardBackfill', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    mockInvoke.mockResolvedValue({ data: { success: true }, error: null });
  });

  it('returns wasAttempted=false when no courseId', () => {
    const { result } = renderHook(() => useHazardBackfill(undefined));
    expect(result.current.wasAttempted).toBe(false);
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('invokes ingest-course-hazards with courseId', async () => {
    renderHook(() => useHazardBackfill('course-123'));
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('ingest-course-hazards', {
        body: { courseId: 'course-123' },
      });
    });
  });

  it('invokes only once per courseId across re-renders', async () => {
    const { rerender } = renderHook(({ id }) => useHazardBackfill(id), {
      initialProps: { id: 'course-123' },
    });
    rerender({ id: 'course-123' });
    rerender({ id: 'course-123' });
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledTimes(1);
    });
  });
});
