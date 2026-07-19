"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "../_components/AppShell";
import { LogoutButton } from "../_components/LogoutButton";
import { PostCard, type PostCardPost } from "../_components/PostCard";
import { supabase } from "@/lib/supabase";
import {
  getCurrentUserId,
  getReadableSupabaseError,
} from "@/lib/savedPosts";
import { getFollowCounts } from "@/lib/follows";
import { formatRouteDuration, parseDurationMinutes } from "@/lib/routeTime";

type ActiveTab = "created" | "saved";

type PostRow = {
  id: string;
  title: string;
  area: string | null;
  transport_type: string | null;
  companion_type: string | null;
  budget: number | null;
  cover_image_url: string | null;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

type SavedPostRow = {
  post_id: string;
  created_at: string | null;
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
  return getReadableSupabaseError(error, "投稿を読み込めませんでした。");
}

function getFollowCountsErrorMessage(error: unknown) {
  return getReadableSupabaseError(error, "フォロー情報を読み込めませんでした。");
}

function getDisplayName(profile: ProfileRow | null) {
  return profile?.display_name?.trim() || "ROUTY User";
}

function getUserHandle(userId: string | null) {
  const fallbackId = userId ? userId.slice(0, 8) : "";

  return fallbackId ? `@${fallbackId}` : "";
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

function toPostCard(post: PostRow, scheduleItems: ScheduleItemRow[]): PostCardPost {
  return {
    id: post.id,
    title: post.title,
    author: "ROUTY User",
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

export default function MyPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("created");
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [myPosts, setMyPosts] = useState<PostCardPost[]>([]);
  const [savedPostList, setSavedPostList] = useState<PostCardPost[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [followCounts, setFollowCounts] = useState<FollowCounts | null>(null);
  const [followCountsError, setFollowCountsError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadMyPage() {
      setIsLoading(true);
      setErrorMessage(null);
      setFollowCounts(null);
      setFollowCountsError(null);

      try {
        const currentUserId = await getCurrentUserId();

        const [profileResult, postsResult, savedResult, followCountsResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("id,display_name,avatar_url")
            .eq("id", currentUserId)
            .maybeSingle(),
          supabase
            .from("posts")
            .select(
              "id,title,area,transport_type,companion_type,budget,cover_image_url",
            )
            .eq("user_id", currentUserId)
            .order("created_at", { ascending: false }),
          supabase
            .from("saved_posts")
            .select("post_id,created_at")
            .eq("user_id", currentUserId)
            .order("created_at", { ascending: false }),
          getFollowCounts(currentUserId)
            .then((data) => ({ data, error: null }))
            .catch((error: unknown) => ({ data: null, error })),
        ]);

        if (profileResult.error) throw profileResult.error;
        if (postsResult.error) throw postsResult.error;
        if (savedResult.error) throw savedResult.error;

        const createdPostRows = (postsResult.data ?? []) as PostRow[];
        const savedRows = (savedResult.data ?? []) as SavedPostRow[];
        const savedPostIds = Array.from(
          new Set(savedRows.map((row) => row.post_id).filter(Boolean)),
        );
        let savedPostRows: PostRow[] = [];

        if (savedPostIds.length > 0) {
          const { data: savedPostData, error: savedPostError } = await supabase
            .from("posts")
            .select(
              "id,title,area,transport_type,companion_type,budget,cover_image_url",
            )
            .in("id", savedPostIds)
            .eq("is_published", true);

          if (savedPostError) throw savedPostError;

          const savedPostsById = new Map(
            ((savedPostData ?? []) as PostRow[]).map((post) => [post.id, post]),
          );

          savedPostRows = savedPostIds
            .map((postId) => savedPostsById.get(postId))
            .filter((post): post is PostRow => Boolean(post));
        }

        const allPostIds = Array.from(
          new Set(
            [...createdPostRows, ...savedPostRows]
              .map((post) => post.id)
              .filter(Boolean),
          ),
        );
        let scheduleItemsByPostId = new Map<string, ScheduleItemRow[]>();

        if (allPostIds.length > 0) {
          const { data: scheduleRows, error: scheduleError } = await supabase
            .from("schedule_items")
            .select("post_id,start_time,end_time,time,stay_duration,sort_order,created_at")
            .in("post_id", allPostIds)
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: true });

          if (scheduleError) throw scheduleError;

          scheduleItemsByPostId = groupScheduleItemsByPostId(
            (scheduleRows ?? []) as ScheduleItemRow[],
          );
        }

        const createdPosts = createdPostRows.map((post) =>
          toPostCard(post, scheduleItemsByPostId.get(post.id) ?? []),
        );
        const savedPosts = savedPostRows.map((post) =>
          toPostCard(post, scheduleItemsByPostId.get(post.id) ?? []),
        );

        console.log("ROUTY my page loaded", {
          userId: currentUserId,
          createdPostCount: createdPosts.length,
          savedPostCount: savedPosts.length,
        });

        if (isMounted) {
          setUserId(currentUserId);
          setProfile(profileResult.data as ProfileRow | null);
          setMyPosts(createdPosts);
          setSavedPostList(savedPosts);
          setFollowCounts(followCountsResult.data);
          setFollowCountsError(
            followCountsResult.error
              ? getFollowCountsErrorMessage(followCountsResult.error)
              : null,
          );
        }
      } catch (error) {
        console.error("ROUTY my page load failed", error);
        if (isMounted) {
          setErrorMessage(getErrorMessage(error));
          setProfile(null);
          setMyPosts([]);
          setSavedPostList([]);
          setFollowCounts(null);
          setFollowCountsError(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadMyPage();

    return () => {
      isMounted = false;
    };
  }, []);

  const displayName = getDisplayName(profile);
  const userHandle = getUserHandle(userId);
  const activePosts = activeTab === "created" ? myPosts : savedPostList;
  const emptyMessage =
    activeTab === "created"
      ? "まだ投稿がありません"
      : "保存した投稿はまだありません";
  const profileText = useMemo(() => {
    if (myPosts.length === 0 && savedPostList.length === 0) {
      return "ROUTYで旅のしおりを作成して、気になる投稿を保存できます。";
    }

    return "ROUTYで作成したしおりと保存した投稿をまとめています。";
  }, [myPosts.length, savedPostList.length]);

  return (
    <AppShell>
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-100 bg-white/95 px-4 py-3 backdrop-blur">
        <h1 className="text-lg font-semibold tracking-normal">マイページ</h1>
        <LogoutButton />
      </header>

      <main className="overflow-x-hidden px-2 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-7">
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
          {userHandle ? (
            <p className="mt-0.5 truncate text-sm font-medium text-zinc-500">
              {userHandle}
            </p>
          ) : null}
          <p className="mx-auto mt-3 line-clamp-3 max-w-[320px] text-sm leading-6 text-zinc-700">
            {profileText}
          </p>

          {userId ? (
            <div className="mt-4">
              {followCountsError ? (
                <p className="mx-auto max-w-[320px] rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium leading-5 text-red-700">
                  {followCountsError}
                </p>
              ) : (
                <div className="flex justify-center gap-10">
                  <Link href={`/users/${userId}/following`} className="block">
                    <p className="text-lg font-bold text-zinc-950">
                      {followCounts
                        ? followCounts.followingCount.toLocaleString("ja-JP")
                        : "..."}
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-zinc-500">
                      フォロー中
                    </p>
                  </Link>
                  <Link href={`/users/${userId}/followers`} className="block">
                    <p className="text-lg font-bold text-zinc-950">
                      {followCounts
                        ? followCounts.followerCount.toLocaleString("ja-JP")
                        : "..."}
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-zinc-500">
                      フォロワー
                    </p>
                  </Link>
                </div>
              )}
            </div>
          ) : null}

          <button
            type="button"
            disabled
            className="mt-4 h-10 rounded-full bg-zinc-100 px-5 text-sm font-semibold text-zinc-500"
          >
            プロフィールを編集
          </button>

          {userId ? (
            <Link
              href={`/users/${userId}`}
              className="mx-auto mt-3 block w-fit text-sm font-semibold text-[#057A55]"
            >
              公開プロフィールを見る
            </Link>
          ) : null}
        </section>

        <section className="mt-7">
          <div className="flex justify-center gap-8 border-b border-zinc-100">
            <ProfileTab
              label="作成コンテンツ"
              active={activeTab === "created"}
              onClick={() => setActiveTab("created")}
            />
            <ProfileTab
              label="保存済み"
              active={activeTab === "saved"}
              onClick={() => setActiveTab("saved")}
            />
          </div>

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
          ) : activePosts.length === 0 ? (
            <p className="py-16 text-center text-sm font-medium text-zinc-500">
              {emptyMessage}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 px-4 py-4 pb-28">
              {activePosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </section>
      </main>
    </AppShell>
  );
}

function ProfileTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative h-11 px-1 text-sm transition ${
        active ? "font-semibold text-zinc-950" : "font-medium text-zinc-500"
      }`}
    >
      {label}
      {active ? (
        <span className="absolute bottom-0 left-1/2 h-0.5 w-10 -translate-x-1/2 rounded-full bg-zinc-950" />
      ) : null}
    </button>
  );
}
