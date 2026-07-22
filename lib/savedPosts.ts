import { supabase } from "@/lib/supabase";

export type SavedPostRow = {
  user_id: string;
  post_id: string;
  created_at?: string | null;
};

export function getReadableSupabaseError(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }

  return fallback;
}

export async function getCurrentUserId() {
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

export async function getSavedPostIds(userId: string) {
  const { data, error } = await supabase
    .from("saved_posts")
    .select("post_id")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return new Set(((data ?? []) as Pick<SavedPostRow, "post_id">[]).map((row) => row.post_id));
}

export async function isPostSaved(userId: string, postId: string) {
  const { data, error } = await supabase
    .from("saved_posts")
    .select("post_id")
    .eq("user_id", userId)
    .eq("post_id", postId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

export async function toggleSavedPost({
  userId,
  postId,
  saved,
}: {
  userId: string;
  postId: string;
  saved: boolean;
}) {
  if (saved) {
    const { error } = await supabase
      .from("saved_posts")
      .delete()
      .eq("user_id", userId)
      .eq("post_id", postId);

    if (error) {
      throw error;
    }

    return false;
  }

  const { error } = await supabase.from("saved_posts").insert({
    user_id: userId,
    post_id: postId,
  });

  if (error) {
    if ("code" in error && error.code === "23505") {
      return true;
    }

    throw error;
  }

  return true;
}
