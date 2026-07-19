"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "../../_components/AppShell";
import { FollowButton } from "../../_components/FollowButton";
import { PostCard, type PostCardPost } from "../../_components/PostCard";
import { getCurrentUserId, getFollowCounts } from "@/lib/follows";
import { formatRouteDuration, parseDurationMinutes } from "@/lib/routeTime";
import { getReadableSupabaseError } from "@/lib/savedPosts";
import { supabase } from "@/lib/supabase";

type ProfileRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

type PostRow = {
  id: string;
  title: string;
  area: string | null;
  transport_type: string | null;
  companion_type: string | null;
  budget: number | null;
  cover_image_url: string | null;
};

type ScheduleItemRow = {
  post_id: string;
  start_time: string | null;
  end_time: string | null;
  time: string | null;
  stay_duration: string | number | null;
  sort_order: number | null;
  created_at: string | null;
};

type FollowCounts = {
  followingCount: number;
  followerCount: number;
};

function getErrorMessage(error: unknown) {
  return getReadableSupabaseError(error, "プロフィールを読み込めませんでした。");
}

function getDisplayName(profile: ProfileRow | null) {
  return profile?.display_name?.trim() || "ROUTY User";
}

function getUserHandle(userId: string) {
  return `@${userId.slice(0, 8)}`;
}

function getInitial(displayName: string) {
  return displayName.trim().charAt(0).toUpperCase() || "R";
}

function toMinutes(time?: string | null) {
  if (!time) return null;

  const [hourText, minuteText] = time.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 26 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return hour * 60 + minute;
}

function getScheduleEndMinutes(item: ScheduleItemRow, startMinutes: number) {
  const endMinutes = toMinutes(item.end_time);
  if (endMinutes !== null && endMinutes > startMinutes) return endMinutes;

  const durationMinutes = parseDurationMinutes(item.stay_duration);
  if (durationMinutes === null) return null;

  return startMinutes + durationMinutes;
}

function getDurationLabel(items: ScheduleItemRow[]) {
  let firstStart: number | null = null;
  let lastEnd: number | null = null;

  items.forEach((item) => {
    const startMinutes = toMinutes(item.start_time ?? item.time);
    if (startMinutes === null) return;

    const endMinutes = getScheduleEndMinutes(item, startMinutes);
    if (endMinutes === null || endMinutes <= startMinutes) return;

    firstStart = firstStart === null ? startMinutes : Math.min(firstStart, startMinutes);
    lastEnd = lastEnd === null ? endMinutes : Math.max(lastEnd, endMinutes);
  });

  if (firstStart === null || lastEnd === null || lastEnd <= firstStart) {
    return "時間未設定";
  }

  return formatRouteDuration(lastEnd - firstStart);
}

function getTransportLabel(value?: string | null) {
  if (value === "walking" || value === "walk") return "徒歩中心";
  if (value === "public_transport" || value === "train") return "電車あり";
  if (value === "car") return "車あり";

  return null;
}

function getCompanionLabel(value?: string | null) {
  if (value === "solo") return "1人";
  if (value === "friends") return "友達";
  if (value === "date") return "デート";
  if (value === "family") return "家族";

  return null;
}

function getBudgetLabel(value?: number | null) {
  if (value === null || value === undefined) return null;

  return value.toLocaleString("ja-JP");
}

function toPostCard(
  post: PostRow,
  scheduleItems: ScheduleItemRow[],
  author: string,
): PostCardPost {
  return {
    id: post.id,
    title: post.title,
    author,
    area: post.area?.trim() || null,
    transportLabel: getTransportLabel(post.transport_type),
    durationLabel: getDurationLabel(scheduleItems),
    budgetLabel: getBudgetLabel(post.budget),
    companionLabel: getCompanionLabel(post.companion_type),
    coverImage: post.cover_image_url?.trim() || null,
  };
}

function groupScheduleItemsByPostId(items: ScheduleItemRow[]) {
  return items.reduce((map, item) => {
    const postItems = map.get(item.post_id) ?? [];
    postItems.push(item);
    map.set(item.post_id, postItems);
    return map;
  }, new Map<string, ScheduleItemRow[]>());
}

function BackIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

export function UserProfileClient({ userId }: { userId: string }) {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [posts, setPosts] = useState<PostCardPost[]>([]);
  const [followCounts, setFollowCounts] = useState<FollowCounts>({
    followingCount: 0,
    followerCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      setIsLoading(true);
      setErrorMessage(null);
      setNotFound(false);

      try {
        const loginUserId = await getCurrentUserId();
        const [profileResult, postsResult, counts] = await Promise.all([
          supabase
            .from("profiles")
            .select("id,display_name,avatar_url")
            .eq("id", userId)
            .maybeSingle(),
          supabase
            .from("posts")
            .select(
              "id,title,area,transport_type,companion_type,budget,cover_image_url",
            )
            .eq("user_id", userId)
            .eq("is_published", true)
            .order("created_at", { ascending: false }),
          getFollowCounts(userId),
        ]);

        if (profileResult.error) throw profileResult.error;
        if (postsResult.error) throw postsResult.error;

        if (!profileResult.data) {
          if (isMounted) {
            setCurrentUserId(loginUserId);
            setProfile(null);
            setPosts([]);
            setFollowCounts(counts);
            setNotFound(true);
          }
          return;
        }

        const postRows = (postsResult.data ?? []) as PostRow[];
        const postIds = postRows.map((post) => post.id);
        let scheduleItemsByPostId = new Map<string, ScheduleItemRow[]>();

        if (postIds.length > 0) {
          const { data: scheduleRows, error: scheduleError } = await supabase
            .from("schedule_items")
            .select("post_id,start_time,end_time,time,stay_duration,sort_order,created_at")
            .in("post_id", postIds)
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: true });

          if (scheduleError) throw scheduleError;

          scheduleItemsByPostId = groupScheduleItemsByPostId(
            (scheduleRows ?? []) as ScheduleItemRow[],
          );
        }

        const displayName = getDisplayName(profileResult.data as ProfileRow);
        const nextPosts = postRows.map((post) =>
          toPostCard(post, scheduleItemsByPostId.get(post.id) ?? [], displayName),
        );

        if (isMounted) {
          setCurrentUserId(loginUserId);
          setProfile(profileResult.data as ProfileRow);
          setPosts(nextPosts);
          setFollowCounts(counts);
        }
      } catch (error) {
        console.error("ROUTY user profile load failed", error);
        if (isMounted) {
          setErrorMessage(getErrorMessage(error));
          setProfile(null);
          setPosts([]);
          setFollowCounts({ followingCount: 0, followerCount: 0 });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const displayName = getDisplayName(profile);
  const userHandle = getUserHandle(userId);
  const isOwnProfile = currentUserId === userId;

  const profileText = useMemo(() => {
    if (notFound) return "ユーザーが見つかりません";
    if (posts.length === 0) return "公開中のしおりはまだありません。";

    return "公開中のしおりをまとめています。";
  }, [notFound, posts.length]);

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/home");
  }

  return (
    <AppShell>
      <header className="sticky top-0 z-10 grid h-14 grid-cols-[56px_1fr_56px] items-center border-b border-zinc-100 bg-white/95 px-2 backdrop-blur">
        <button
          type="button"
          onClick={handleBack}
          className="flex h-10 w-10 items-center justify-center rounded-full text-[#057A55] active:bg-[#F1FAF3]"
          aria-label="戻る"
        >
          <BackIcon />
        </button>
        <h1 className="truncate text-center text-lg font-semibold tracking-normal">
          プロフィール
        </h1>
        <span aria-hidden="true" />
      </header>

      <main className="overflow-x-hidden px-2 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-7">
        {isLoading ? (
          <p className="py-16 text-center text-sm font-medium text-zinc-500">
            読み込み中...
          </p>
        ) : errorMessage ? (
          <div className="px-3 py-5">
            <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700">
              {errorMessage}
            </p>
          </div>
        ) : notFound ? (
          <p className="py-16 text-center text-sm font-medium text-zinc-500">
            ユーザーが見つかりません
          </p>
        ) : (
          <>
            <section className="px-5 text-center">
              <div className="relative mx-auto h-24 w-24">
                {profile?.avatar_url?.trim() ? (
                  <Image
                    src={profile.avatar_url.trim()}
                    alt={`${displayName}のプロフィール画像`}
                    fill
                    unoptimized
                    sizes="96px"
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-zinc-950 text-3xl font-semibold text-white">
                    {getInitial(displayName)}
                  </div>
                )}
              </div>

              <h2 className="mt-4 truncate text-2xl font-semibold leading-8 text-zinc-950">
                {displayName}
              </h2>
              <p className="mt-0.5 truncate text-sm font-medium text-zinc-500">
                {userHandle}
              </p>
              <p className="mx-auto mt-3 line-clamp-3 max-w-[320px] text-sm leading-6 text-zinc-700">
                {profileText}
              </p>

              <div className="mt-5 flex justify-center gap-10">
                <Link href={`/users/${userId}/following`} className="block">
                  <p className="text-lg font-bold text-zinc-950">
                    {followCounts.followingCount.toLocaleString("ja-JP")}
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-zinc-500">フォロー中</p>
                </Link>
                <Link href={`/users/${userId}/followers`} className="block">
                  <p className="text-lg font-bold text-zinc-950">
                    {followCounts.followerCount.toLocaleString("ja-JP")}
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-zinc-500">フォロワー</p>
                </Link>
              </div>

              {!isOwnProfile ? (
                <div className="mt-5 flex justify-center">
                  <FollowButton targetUserId={userId} currentUserId={currentUserId} />
                </div>
              ) : null}
            </section>

            <section className="mt-8">
              <div className="border-b border-zinc-100 px-5 pb-3">
                <h2 className="text-sm font-bold text-zinc-950">公開中のしおり</h2>
              </div>

              {posts.length === 0 ? (
                <p className="py-16 text-center text-sm font-medium text-zinc-500">
                  まだ投稿がありません
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3 px-4 py-4 pb-28">
                  {posts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </AppShell>
  );
}
