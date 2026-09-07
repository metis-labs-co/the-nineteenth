// src/__tests__/components/activity/RoundCommentsReport.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

import { RoundComments } from '@/components/activity/RoundComments';

const mockReport = jest.fn().mockResolvedValue(undefined);
jest.mock('@/hooks/moderation', () => ({
  useReportContent: () => ({ report: mockReport, isReporting: false }),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'me' } }),
}));

jest.mock('@/hooks/activity', () => ({
  useRoundComments: () => ({
    data: [
      { id: 'c1', author_id: 'someone-else', body: 'nice round', created_at: new Date().toISOString(), author: { name: 'Alex', photo_url: null } },
      { id: 'c2', author_id: 'me', body: 'thanks', created_at: new Date().toISOString(), author: { name: 'Me', photo_url: null } },
    ],
    isLoading: false,
  }),
  useDeleteComment: () => ({ mutateAsync: jest.fn() }),
  useLikeComment: () => ({ mutateAsync: jest.fn() }),
  useUnlikeComment: () => ({ mutateAsync: jest.fn() }),
}));

describe('RoundComments reporting', () => {
  beforeEach(() => jest.clearAllMocks());

  it("offers Report on another person's comment", () => {
    render(<RoundComments roundId="r1" />);
    expect(screen.getByLabelText('Report comment by Alex')).toBeTruthy();
  });

  // You can already delete your own comment; offering to report it as well is
  // noise, and self-reports would pollute the operator's queue.
  it('does not offer Report on your own comment', () => {
    render(<RoundComments roundId="r1" />);
    expect(screen.queryByLabelText('Report comment by Me')).toBeNull();
  });

  it('reports the comment with the chosen reason', async () => {
    render(<RoundComments roundId="r1" />);
    fireEvent.press(screen.getByLabelText('Report comment by Alex'));
    fireEvent.press(screen.getByText('Spam'));
    fireEvent.press(screen.getByText('Report'));
    await waitFor(() =>
      expect(mockReport).toHaveBeenCalledWith({
        contentType: 'round_comment',
        contentId: 'c1',
        authorId: 'someone-else',
        reason: 'spam',
        note: undefined,
      })
    );
  });
});
