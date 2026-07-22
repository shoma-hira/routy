"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "../_components/AppShell";
import { LogoutButton } from "../_components/LogoutButton";
import { PostCard, type PostCardPost } from "../_components/PostCard";
import { getFollowCounts } from "@/lib/follows";
import { getCurrentProfile, type CurrentProfile } from "@/lib/profiles";
import { formatRouteDuration, parseDurationMinutes } from "@/lib/routeTime";
import { getCurrentUserId, getReadableSupabaseError } from "@/lib/savedPosts";
import { supabase } from "@/lib/supabase";

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
  return getReadableSupabaseError(error, "マイページを読み込めませんでした。");
}

function getDisplayName(profile: CurrentProfile | null) {
  return profile?.display_name?.trim() || "ROUTY User";
}

function getInitial(displayName: string) {
  return Array.from(displayName.trim())[0]?.toUpperCase() || "R";
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
  const [profile, setProfile] = useState<CurrentProfile | null>(null);
  const [myPosts, setMyPosts] = useState<PostCardPost[]>([]);
  const [savedPostList, setSavedPostList] = useState<PostCardPost[]>([]);
  const [followCounts, setFollowCounts] = useState<FollowCounts | null>(null);
  const [followCountsError, setFollowCountsError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadMyPage() {
      setIsLoading(true);
      setErrorMessage(null);
      setFollowCounts(null);
      setFollowCountsError(false);

      try {
        const currentUserId = await getCurrentUserId();
        const [currentProfile, postsResult, savedResult, followCountsResult] =
          await Promise.all([
            getCurrentProfile(currentUserId),
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
            .select(
              "post_id,start_time,end_time,time,stay_duration,sort_order,created_at",
            )
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

        if (isMounted) {
          setProfile(currentProfile);
          setMyPosts(createdPosts);
          setSavedPostList(savedPosts);
          setFollowCounts(followCountsResult.data);
          setFollowCountsError(Boolean(followCountsResult.error));
        }
      } catch (error) {
        console.error("ROUTY my page load failed", error);

        if (isMounted) {
          setErrorMessage(getErrorMessage(error));
          setProfile(null);
          setMyPosts([]);
          setSavedPostList([]);
          setFollowCounts(null);
          setFollowCountsError(false);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadMyPage();

    return () => {
      isMounted = false;
    };
  }, []);

  const displayName = getDisplayName(profile);
  const activePosts = activeTab === "created" ? myPosts : savedPostList;
  const emptyMessage =
    activeTab === "created"
      ? "まだ投稿がありません"
      : "保存した投稿はまだありません";

  return (
    <AppShell>
      <div className="min-h-dvh bg-[#FFFEFB]">
        <header className="flex h-16 items-center justify-between px-5">
          <h1 className="text-lg font-bold tracking-tight text-zinc-950">マイページ</h1>
          <LogoutButton />
        </header>

        {isLoading ? (
          <MyPageSkeleton />
        ) : errorMessage || !profile ? (
          <main className="px-5 py-8">
            <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-4 text-sm font-medium leading-6 text-red-700">
              {errorMessage ?? "プロフィールを読み込めませんでした。"}
            </p>
          </main>
        ) : (
          <main className="overflow-x-hidden">
            <section className="px-5 pb-8 pt-3">
              <div className="flex items-start gap-5">
                <div className="relative flex h-[92px] w-[92px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#E8F7EB] text-3xl font-bold text-[#17852B] ring-4 ring-white shadow-[0_8px_24px_rgba(23,133,43,0.12)]">
                  {profile.avatar_url?.trim() && !avatarFailed ? (
                    <Image
                      src={profile.avatar_url.trim()}
                      alt={`${displayName}のプロフィール画像`}
                      fill
                      unoptimized
                      sizes="92px"
                      className="object-cover"
                      onError={() => setAvatarFailed(true)}
                    />
                  ) : (
                    <span aria-hidden="true">{getInitial(displayName)}</span>
                  )}
                </div>

                <div className="min-w-0 flex-1 pt-1">
                  <h2 className="truncate text-xl font-bold leading-7 text-zinc-950">
                    {displayName}
                  </h2>
                  {profile.username ? (
                    <p className="mt-0.5 truncate text-sm font-semibold text-zinc-500">
                      @{profile.username}
                    </p>
                  ) : null}

                  <div className="mt-4 flex items-center gap-5">
                    <FollowCountLink
                      href={`/users/${profile.id}/followers`}
                      count={followCounts?.followerCount}
                      label="フォロワー"
                    />
                    <FollowCountLink
                      href={`/users/${profile.id}/following`}
                      count={followCounts?.followingCount}
                      label="フォロー中"
                    />
                  </div>
                </div>
              </div>

              {followCountsError ? (
                <p className="mt-3 text-xs font-medium text-amber-700">
                  フォロー情報を読み込めませんでした。
                </p>
              ) : null}

              {profile.bio?.trim() ? (
                <p className="mt-5 whitespace-pre-wrap text-sm font-medium leading-6 text-zinc-700">
                  {profile.bio.trim()}
                </p>
              ) : null}

              {profile.hobby_tags && profile.hobby_tags.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {profile.hobby_tags.slice(0, 5).map((tag) => (
                    <span
                      key={tag.toLowerCase()}
                      className="rounded-full bg-[#EAF7EC] px-3 py-1.5 text-xs font-bold text-[#176C28]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}

              <Link
                href="/mypage/edit"
                className="mt-6 flex h-11 w-full items-center justify-center rounded-full border border-zinc-200 bg-white text-sm font-bold text-zinc-800 shadow-[0_3px_12px_rgba(17,24,39,0.04)] transition hover:border-[#BDE8C5] hover:text-[#17852B]"
              >
                プロフィールを編集
              </Link>
            </section>

            <section>
              <div className="grid grid-cols-2 border-b border-zinc-100 px-5">
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

              {activePosts.length === 0 ? (
                <p className="px-5 py-20 text-center text-sm font-semibold text-zinc-500">
                  {emptyMessage}
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3 px-5 py-5">
                  {activePosts.map((post) => (
                    <PostCard key={post.id} post={post} variant="mypage" />
                  ))}
                </div>
              )}
            </section>
          </main>
        )}
      </div>
    </AppShell>
  );
}

function FollowCountLink({
  href,
  count,
  label,
}: {
  href: string;
  count?: number;
  label: string;
}) {
  return (
    <Link href={href} className="min-w-0 text-left">
      <span className="text-sm font-extrabold text-zinc-950">
        {count === undefined ? "—" : count.toLocaleString("ja-JP")}
      </span>
      <span className="ml-1 text-[11px] font-semibold text-zinc-500">{label}</span>
    </Link>
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
      className={`relative h-13 text-sm transition ${
        active ? "font-bold text-zinc-950" : "font-semibold text-zinc-400"
      }`}
    >
      {label}
      {active ? (
        <span className="absolute bottom-0 left-1/2 h-0.5 w-14 -translate-x-1/2 rounded-full bg-[#28B83F]" />
      ) : null}
    </button>
  );
}

function MyPageSkeleton() {
  return (
    <main className="animate-pulse px-5 pt-4">
      <div className="flex gap-5">
        <div className="h-[92px] w-[92px] shrink-0 rounded-full bg-zinc-100" />
        <div className="flex-1 pt-2">
          <div className="h-5 w-4/5 rounded-full bg-zinc-100" />
          <div className="mt-3 h-3 w-2/5 rounded-full bg-zinc-100" />
          <div className="mt-5 h-4 w-full rounded-full bg-zinc-100" />
        </div>
      </div>
      <div className="mt-6 h-3 w-full rounded-full bg-zinc-100" />
      <div className="mt-3 h-3 w-4/5 rounded-full bg-zinc-100" />
      <div className="mt-6 h-11 rounded-full bg-zinc-100" />
      <div className="mt-10 grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="overflow-hidden rounded-2xl bg-white ring-1 ring-zinc-100">
            <div className="aspect-[4/3] bg-zinc-100" />
            <div className="space-y-2 p-3">
              <div className="h-3 w-full rounded-full bg-zinc-100" />
              <div className="h-3 w-2/3 rounded-full bg-zinc-100" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
