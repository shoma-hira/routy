import { supabase } from "@/lib/supabase";

type FollowCounts = {
  followingCount: number;
  followerCount: number;
};

function assertNotSelfFollow(currentUserId: string, targetUserId: string) {
  if (currentUserId === targetUserId) {
    throw new Error("自分自身をフォローすることはできません。");
  }
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

export async function isFollowing(targetUserId: string) {
  const currentUserId = await getCurrentUserId();

  return isFollowingForUser(currentUserId, targetUserId);
}

export async function isFollowingForUser(currentUserId: string, targetUserId: string) {
  if (currentUserId === targetUserId) {
    return false;
  }

  const { data, error } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", currentUserId)
    .eq("following_id", targetUserId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

export async function followUser(targetUserId: string, knownCurrentUserId?: string) {
  const currentUserId = knownCurrentUserId ?? (await getCurrentUserId());
  assertNotSelfFollow(currentUserId, targetUserId);

  const { error } = await supabase.from("follows").insert({
    follower_id: currentUserId,
    following_id: targetUserId,
  });

  if (error) {
    if (error.code === "23505") {
      return true;
    }

    throw error;
  }

  return true;
}

export async function unfollowUser(targetUserId: string, knownCurrentUserId?: string) {
  const currentUserId = knownCurrentUserId ?? (await getCurrentUserId());

  if (currentUserId === targetUserId) {
    return false;
  }

  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", currentUserId)
    .eq("following_id", targetUserId);

  if (error) {
    throw error;
  }

  return false;
}

export async function getFollowCounts(userId: string): Promise<FollowCounts> {
  const [followingUserIds, followerUserIds] = await Promise.all([
    getFollowingUserIds(userId),
    getFollowerUserIds(userId),
  ]);
  const relatedUserIds = Array.from(
    new Set([...followingUserIds, ...followerUserIds]),
  );

  if (relatedUserIds.length === 0) {
    return {
      followingCount: 0,
      followerCount: 0,
    };
  }

  const { data: publicProfiles, error } = await supabase
    .from("profiles")
    .select("id,username")
    .in("id", relatedUserIds)
    .eq("profile_completed", true)
    .not("username", "is", null);

  if (error) {
    throw error;
  }

  const publicUserIds = new Set(
    (publicProfiles ?? [])
      .filter((profile) => Boolean(profile.username?.trim()))
      .map((profile) => profile.id),
  );

  return {
    followingCount: new Set(followingUserIds.filter((id) => publicUserIds.has(id))).size,
    followerCount: new Set(followerUserIds.filter((id) => publicUserIds.has(id))).size,
  };
}

export async function getFollowingUserIds(userId: string) {
  const { data, error } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => row.following_id);
}

export async function getFollowerUserIds(userId: string) {
  const { data, error } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("following_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => row.follower_id);
}
