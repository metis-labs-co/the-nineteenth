import { __applyCommentLikeForTest as applyCommentLike } from './mutations';
import type { RoundComment } from './types';

function comment(over: Partial<RoundComment> = {}): RoundComment {
  return {
    id: 'c1',
    round_id: 'r1',
    author_id: 'a1',
    body: 'nice',
    created_at: '2026-06-21T00:00:00Z',
    updated_at: '2026-06-21T00:00:00Z',
    like_count: 0,
    viewer_has_liked: false,
    author: null,
    ...over,
  };
}

describe('applyCommentLike', () => {
  it('likes a not-yet-liked comment', () => {
    const out = applyCommentLike([comment()], 'c1', true);
    expect(out?.[0]).toMatchObject({ viewer_has_liked: true, like_count: 1 });
  });

  it('is idempotent when liking an already-liked comment', () => {
    const out = applyCommentLike([comment({ viewer_has_liked: true, like_count: 1 })], 'c1', true);
    expect(out?.[0]).toMatchObject({ viewer_has_liked: true, like_count: 1 });
  });

  it('unlikes a liked comment and never goes below zero', () => {
    const out = applyCommentLike([comment({ viewer_has_liked: true, like_count: 1 })], 'c1', false);
    expect(out?.[0]).toMatchObject({ viewer_has_liked: false, like_count: 0 });
    const out2 = applyCommentLike([comment({ viewer_has_liked: false, like_count: 0 })], 'c1', false);
    expect(out2?.[0]).toMatchObject({ viewer_has_liked: false, like_count: 0 });
  });

  it('leaves other comments and undefined caches untouched', () => {
    const other = comment({ id: 'c2' });
    const out = applyCommentLike([other], 'c1', true);
    expect(out?.[0]).toBe(other);
    expect(applyCommentLike(undefined, 'c1', true)).toBeUndefined();
  });
});
