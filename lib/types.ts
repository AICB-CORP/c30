export type ProfileRole = "friend" | "birthday_girl";

export interface Profile {
  id: string;
  pseudo: string;
  avatar_url: string | null;
  bio: string | null;
  mood: string | null;
  skin: Record<string, unknown> | null;
  role: ProfileRole;
  created_at: string;
}

export interface Post {
  id: string;
  author_id: string;
  title: string | null;
  content: string;
  is_private: boolean;
  mood: string | null;
  music_embed: string | null;
  scheduled_for: string | null;
  created_at: string;
  author?: Pick<Profile, "id" | "pseudo" | "avatar_url" | "mood">;
  media?: PostMedia[];
}

export type PostMediaType = "image" | "video" | "audio" | "gif";

export interface PostMedia {
  id: string;
  post_id: string;
  type: PostMediaType;
  url: string;
  position: number;
  caption: string | null;
}

export interface BlabMessage {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
  author?: Pick<Profile, "id" | "pseudo">;
}

export interface Invite {
  id: string;
  code: string;
  email: string | null;
  role: ProfileRole;
  used_at: string | null;
}

export type PostWithRelations = Post & {
  author: Pick<Profile, "id" | "pseudo" | "avatar_url" | "mood"> | null;
  media: PostMedia[];
};
