import type { Database } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export type CurrentProfile = Pick<
  ProfileRow,
  | "id"
  | "email"
  | "display_name"
  | "username"
  | "bio"
  | "avatar_url"
  | "hobby_tags"
  | "profile_completed"
  | "updated_at"
  | "role"
>;

export type PublicProfile = Pick<
  ProfileRow,
  | "id"
  | "display_name"
  | "username"
  | "bio"
  | "avatar_url"
  | "hobby_tags"
  | "profile_completed"
  | "updated_at"
>;

export type SaveProfileInput = {
  displayName: string;
  username: string;
  bio: string;
  avatarUrl?: string | null;
  hobbyTags: string[];
  markCompleted?: boolean;
};

const currentProfileColumns =
  "id,email,display_name,username,bio,avatar_url,hobby_tags,profile_completed,updated_at,role";
const publicProfileColumns =
  "id,display_name,username,bio,avatar_url,hobby_tags,profile_completed,updated_at";
const usernamePattern = /^[a-z0-9_]+$/;

function getCharacterCount(value: string) {
  return Array.from(value).length;
}

function getValidationError(errors: Array<string | null>) {
  return errors.find((error): error is string => error !== null) ?? null;
}

async function getAuthenticatedUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!user) {
    throw new Error("ログイン中のユーザーを取得できませんでした。");
  }

  return user.id;
}

export function normalizeUsername(value: string) {
  return value.trim().replace(/^@/, "").toLowerCase();
}

export function validateUsername(value: string) {
  const username = normalizeUsername(value);

  if (username.length < 3 || username.length > 20) {
    return "ユーザーネームは3〜20文字で入力してください。";
  }

  if (!usernamePattern.test(username)) {
    return "ユーザーネームは半角英小文字、数字、_のみ使用できます。";
  }

  return null;
}

export function validateDisplayName(value: string) {
  const displayName = value.trim();
  const length = getCharacterCount(displayName);

  if (length < 1 || length > 30) {
    return "名前は1〜30文字で入力してください。";
  }

  return null;
}

export function validateBio(value: string) {
  if (getCharacterCount(value) > 160) {
    return "自己紹介は160文字以内で入力してください。";
  }

  return null;
}

export function normalizeHobbyTags(tags: string[]) {
  const normalizedTags: string[] = [];
  const seenTags = new Set<string>();

  for (const tag of tags) {
    const normalizedTag = tag.trim();
    const duplicateKey = normalizedTag.toLowerCase();

    if (!normalizedTag || seenTags.has(duplicateKey)) {
      continue;
    }

    seenTags.add(duplicateKey);
    normalizedTags.push(normalizedTag);

    if (normalizedTags.length === 5) {
      break;
    }
  }

  return normalizedTags;
}

export function validateHobbyTags(tags: string[]) {
  if (tags.length > 5) {
    return "趣味タグは5件以内にしてください。";
  }

  const seenTags = new Set<string>();

  for (const tag of tags) {
    const normalizedTag = tag.trim();

    if (!normalizedTag) {
      return "空の趣味タグは保存できません。";
    }

    if (getCharacterCount(normalizedTag) > 20) {
      return "趣味タグは1件につき20文字以内にしてください。";
    }

    const duplicateKey = normalizedTag.toLowerCase();

    if (seenTags.has(duplicateKey)) {
      return "同じ趣味タグを複数登録することはできません。";
    }

    seenTags.add(duplicateKey);
  }

  return null;
}

export async function getCurrentProfile(currentUserId?: string) {
  const userId = currentUserId ?? (await getAuthenticatedUserId());
  const { data, error } = await supabase
    .from("profiles")
    .select(currentProfileColumns)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("プロフィールが見つかりませんでした。");
  }

  return data as CurrentProfile;
}

export async function getPublicProfileById(userId: string) {
  if (!userId.trim()) {
    throw new Error("ユーザーIDが指定されていません。");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(publicProfileColumns)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? (data as PublicProfile) : null;
}

export async function isUsernameAvailable(username: string, excludeUserId?: string) {
  const normalizedUsername = normalizeUsername(username);
  const validationError = validateUsername(normalizedUsername);

  if (validationError) {
    throw new Error(validationError);
  }

  let query = supabase
    .from("profiles")
    .select("id")
    .eq("username", normalizedUsername)
    .limit(1);

  if (excludeUserId) {
    query = query.neq("id", excludeUserId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data.length === 0;
}

export async function saveProfile(input: SaveProfileInput) {
  const userId = await getAuthenticatedUserId();
  const displayName = input.displayName.trim();
  const username = normalizeUsername(input.username);
  const bio = input.bio.trim();
  const hobbyTags = normalizeHobbyTags(input.hobbyTags);
  const validationError = getValidationError([
    validateDisplayName(displayName),
    validateUsername(username),
    validateBio(bio),
    validateHobbyTags(hobbyTags),
  ]);

  if (validationError) {
    throw new Error(validationError);
  }

  if (!(await isUsernameAvailable(username, userId))) {
    throw new Error("このユーザーネームはすでに使用されています。");
  }

  const updates: ProfileUpdate = {
    display_name: displayName,
    username,
    bio: bio || null,
    hobby_tags: hobbyTags.length > 0 ? hobbyTags : null,
    updated_at: new Date().toISOString(),
  };

  if (input.avatarUrl !== undefined) {
    updates.avatar_url = input.avatarUrl?.trim() || null;
  }

  if (input.markCompleted === true) {
    updates.profile_completed = true;
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select(publicProfileColumns)
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("このユーザーネームはすでに使用されています。");
    }

    throw error;
  }

  const savedProfile = data as PublicProfile;

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("routy:profile-updated", { detail: savedProfile }),
    );
  }

  return savedProfile;
}
