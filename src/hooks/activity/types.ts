/**
 * Activity Feed - Types
 *
 * Shapes mirror the get_activity_feed / get_round_feed_card RPC return
 * columns and the round_comments / round_photos tables.
 */

/** A player who appears within a feed card (one per submitted scorecard). */
export interface FeedParticipant {
  player_id: string;
  name: string;
  photo_url: string | null;
  total_gross: number | null;
  total_net: number | null;
  total_points: number | null;
}

/** A photo as returned inside a feed card (storage path, no URL yet). */
export interface FeedPhoto {
  id: string;
  storage_path: string;
  width: number | null;
  height: number | null;
  uploader_id: string;
}

/** One round card in the activity feed (grouped per round). */
export interface ActivityFeedCard {
  round_id: string;
  competition_id: string | null;
  course_name: string;
  club_name: string;
  club_location: string | null;
  round_date: string | null;
  game_type: string;
  is_team_round: boolean;
  activity_at: string;
  participants: FeedParticipant[];
  photos: FeedPhoto[];
  like_count: number;
  comment_count: number;
  viewer_has_liked: boolean;
}

/** A comment on a round, with author profile joined in. */
export interface RoundComment {
  id: string;
  round_id: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  author: {
    id: string;
    name: string;
    photo_url: string | null;
  } | null;
}

/** A round photo resolved to a displayable (signed) URL. */
export interface RoundPhoto extends FeedPhoto {
  url: string | null;
}

/** A feed card for the Home preview, with its cover photo pre-signed. */
export interface HomeActivityPreviewCard extends ActivityFeedCard {
  /** Signed URL for the round's first photo, or null when there are none. */
  coverPhotoUrl: string | null;
}

export interface AddCommentInput {
  roundId: string;
  body: string;
}

export interface UploadRoundPhotoInput {
  roundId: string;
  /** Local file URI from expo-image-picker. */
  uri: string;
  width?: number;
  height?: number;
  /** File extension without the dot, e.g. "jpg". Defaults to "jpg". */
  ext?: string;
  mimeType?: string;
}

export interface DeleteCommentInput {
  commentId: string;
  roundId: string;
}

export interface DeleteRoundPhotoInput {
  photoId: string;
  roundId: string;
  storagePath?: string;
}
