import { useMemo, useState } from 'react';
import { useFriends } from '@/hooks/useFriends';
import { usePlaceholderPlayers } from '@/hooks/usePlaceholderPlayers';

/** Friends and guests that can still be added to a round (excludes current players). */
export function useAddablePlayers(excludeIds: string[]) {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: friends, isLoading: friendsLoading } = useFriends();
  const { data: placeholders } = usePlaceholderPlayers();
  const exclude = useMemo(() => new Set(excludeIds), [excludeIds]);

  return {
    friends: (friends ?? []).filter((f) => f.friendship_status === 'accepted' && !exclude.has(f.id)),
    friendsLoading,
    placeholders: (placeholders ?? []).filter((p) => !exclude.has(p.id)),
    searchQuery,
    setSearchQuery,
  };
}
