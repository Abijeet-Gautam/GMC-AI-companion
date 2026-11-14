export type TreeRole = 'anonymous' | 'visitor' | 'owner' | 'moderator' | 'super_admin';
export type AccessMode = 'open' | 'event_window' | 'invite';
export type LeafStatus = 'published' | 'hidden' | 'removed';
export type LeafShape = 'oval' | 'maple' | 'heart' | 'willow';
export type SkyTheme = 'dusk' | 'dawn' | 'night' | 'forest';
export type MessageStatus = 'pending' | 'ready' | 'failed' | 'skipped';

export interface TreeTheme {
  sky?: SkyTheme;
  canopy?: 'ember' | 'jade' | 'violet' | 'rose';
  leafPalette?: string[];
  leafShape?: LeafShape;
}

export interface Leaf {
  id: string;
  tree_id: string;
  author_id: string | null;
  body: string;
  status: LeafStatus;
  position: number;
  color: string | null;
  leaf_shape: LeafShape | null;
  flagged: boolean;
  ai_message: string | null;
  ai_sources: SourceCitation[] | null;
  ai_commentary: boolean;
  message_status: MessageStatus;
  created_at: string;
}

export interface SourceCitation {
  title: string;
  source: string; // author / work (e.g. "Marcus Aurelius, Meditations")
  url?: string | null;
}

export interface TreeSummary {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  access_mode: AccessMode;
  event_starts_at: string | null;
  event_ends_at: string | null;
  invite_enabled: boolean;
  theme: TreeTheme;
  is_global: boolean;
  updated_at: string;
}

export interface AuthContext {
  /** null when not signed in */
  userId: string | null;
  role: TreeRole;
  mode: 'request' | 'service';
  /** resolved tree id (uuid) — available inside withTree callbacks */
  treeId: string;
}
