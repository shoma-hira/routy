"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "../_components/AppShell";
import { HomeSkeleton } from "../_components/HomeSkeleton";
import { normalizeArea } from "@/lib/area";
import {
  formatRouteDuration,
  parseDurationMinutes,
  parseRouteTimeToMinutes,
} from "@/lib/routeTime";
import {
  getCurrentUserId,
  getReadableSupabaseError,
  getSavedPostIds,
  toggleSavedPost,
} from "@/lib/savedPosts";
import { supabase } from "@/lib/supabase";

const genreLabels = [
  "新着",
  "フォロワー",
  "朝活",
  "1日充実プラン",
  "カフェ巡り",
  "自然",
  "デート",
  "ひとり時間",
];

type PostRow = {
  id: string;
  user_id: string;
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
  image_url: string | null;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

type HomePost = {
  id: string;
  title: string;
  areaLabel: string | null;
  durationLabel: string | null;
  tags: string[];
  images: string[];
  authorName: string;
  authorAvatar: string | null;
  saved: boolean;
  savedReady: boolean;
  isSavePending: boolean;
};

function getErrorMessage(error: unknown) {
  return getReadableSupabaseError(error, "投稿の取得に失敗しました。");
}

function getScheduleEndMinutes(item: ScheduleItemRow, startMinutes: number) {
  const endMinutes = parseRouteTimeToMinutes(item.end_time);
  if (endMinutes !== null && endMinutes > startMinutes) return endMinutes;

  const durationMinutes = parseDurationMinutes(item.stay_duration);
  return durationMinutes === null ? null : startMinutes + durationMinutes;
}

function getDurationLabel(items: ScheduleItemRow[]) {
  let firstStart: number | null = null;
  let lastEnd: number | null = null;

  items.forEach((item) => {
    const startMinutes = parseRouteTimeToMinutes(item.start_time ?? item.time);
    if (startMinutes === null) return;

    const endMinutes = getScheduleEndMinutes(item, startMinutes);
    if (endMinutes === null || endMinutes <= startMinutes) return;

    firstStart = firstStart === null ? startMinutes : Math.min(firstStart, startMinutes);
    lastEnd = lastEnd === null ? endMinutes : Math.max(lastEnd, endMinutes);
  });

  return firstStart !== null && lastEnd !== null && lastEnd > firstStart
    ? formatRouteDuration(lastEnd - firstStart)
    : null;
}

function getTransportLabel(value?: string | null) {
  if (value === "walking" || value === "walk") return "徒歩あり";
  if (value === "public_transport" || value === "train") return "電車あり";
  if (value === "car") return "車あり";
  return null;
}

function getCompanionLabel(value?: string | null) {
  if (value === "solo") return "ひとり";
  if (value === "friends") return "友達";
  if (value === "date") return "デート";
  if (value === "family") return "家族";
  return null;
}

function getBudgetLabel(value?: number | null) {
  return value === null || value === undefined
    ? null
    : `${value.toLocaleString("ja-JP")}円`;
}

function asHashLabel(value?: string | null) {
  const label = value?.trim().replace(/^[#＃]+/, "");
  return label ? `#${label}` : null;
}

function getInitial(value: string) {
  return Array.from(value.trim())[0]?.toUpperCase() || "R";
}

function toHomePost(
  post: PostRow,
  scheduleItems: ScheduleItemRow[] = [],
  profile?: ProfileRow,
): HomePost {
  const area = normalizeArea(post.area);
  const images = [
    post.cover_image_url?.trim() || null,
    ...scheduleItems.map((item) => item.image_url?.trim() || null),
  ].reduce<string[]>((result, image) => {
    if (image && !result.includes(image)) result.push(image);
    return result;
  }, []);
  const tags = [
    getTransportLabel(post.transport_type),
    getBudgetLabel(post.budget),
    getCompanionLabel(post.companion_type),
  ]
    .map(asHashLabel)
    .filter((tag): tag is string => Boolean(tag))
    .slice(0, 3);

  return {
    id: post.id,
    title: post.title,
    areaLabel: area ? `${area}エリア` : null,
    durationLabel:
      scheduleItems.length > 0 ? getDurationLabel(scheduleItems) : null,
    tags,
    images,
    authorName:
      profile?.username?.trim() ||
      profile?.display_name?.trim() ||
      "ROUTY User",
    authorAvatar: profile?.avatar_url?.trim() || null,
    saved: false,
    savedReady: false,
    isSavePending: false,
  };
}

function LocationIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" strokeLinecap="round" />
    </svg>
  );
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path d="M6.75 4.75A1.75 1.75 0 0 1 8.5 3h7a1.75 1.75 0 0 1 1.75 1.75V21L12 17.4 6.75 21V4.75Z" />
    </svg>
  );
}

function CollageImage({
  src,
  alt,
  priority = false,
}: {
  src: string;
  alt: string;
  priority?: boolean;
}) {
  return (
    <div className="relative h-full min-h-0 overflow-hidden bg-[#EAF4EC]">
      <Image
        src={src}
        alt={alt}
        fill
        preload={priority}
        loading={priority ? undefined : "lazy"}
        decoding="async"
        quality={60}
        sizes="(max-width: 430px) 65vw, 280px"
        className="pointer-events-none object-cover"
      />
    </div>
  );
}

function PostCollage({
  post,
  priority,
}: {
  post: HomePost;
  priority: boolean;
}) {
  const [mainImage, secondImage, thirdImage] = post.images;

  if (!mainImage) {
    return (
      <div className="flex aspect-[16/9] items-center justify-center bg-[#EAF4EC] text-xs font-semibold text-[#55715E]">
        画像未設定
      </div>
    );
  }

  if (!secondImage) {
    return (
      <div className="aspect-[16/9]">
        <CollageImage
          src={mainImage}
          alt={`${post.title}の画像`}
          priority={priority}
        />
      </div>
    );
  }

  return (
    <div className="grid aspect-[16/9] grid-cols-[3fr_2fr] gap-0.5 bg-white">
      <CollageImage
        src={mainImage}
        alt={`${post.title}のメイン画像`}
        priority={priority}
      />
      <div className={`grid min-h-0 gap-0.5 ${thirdImage ? "grid-rows-2" : ""}`}>
        <CollageImage src={secondImage} alt={`${post.title}の画像 2`} />
        {thirdImage ? (
          <CollageImage src={thirdImage} alt={`${post.title}の画像 3`} />
        ) : null}
      </div>
    </div>
  );
}

function HomePostCard({
  post,
  priority = false,
  onToggleSave,
}: {
  post: HomePost;
  priority?: boolean;
  onToggleSave: (postId: string) => void;
}) {
  return (
    <article className="relative overflow-hidden rounded-[20px] border border-[#D8F0DD] bg-white shadow-[0_8px_22px_rgba(17,24,39,0.06)]">
      <Link
        href={`/posts/${post.id}`}
        aria-label={`${post.title}の詳細を見る`}
        className="absolute inset-0 z-0"
      />

      <div className="pointer-events-none relative z-[1]">
        <div className="relative">
          <PostCollage post={post} priority={priority} />
          <div className="absolute left-2.5 top-2.5 flex h-9 max-w-[68%] items-center gap-2">
            <div className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#EAF7EC] text-[11px] font-bold text-[#214B35] ring-1 ring-white">
              {post.authorAvatar ? (
                <Image
                  src={post.authorAvatar}
                  alt=""
                  fill
                  unoptimized
                  sizes="28px"
                  className="object-cover"
                />
              ) : (
                <span aria-hidden="true">{getInitial(post.authorName)}</span>
              )}
            </div>
            <span className="min-w-0 truncate whitespace-nowrap text-[11px] font-bold leading-4 text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.75)]">
              {post.authorName}
            </span>
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onToggleSave(post.id);
            }}
            disabled={!post.savedReady || post.isSavePending}
            aria-label={post.saved ? "保存を解除" : "投稿を保存"}
            aria-pressed={post.saved}
            className={`pointer-events-auto absolute right-2.5 top-2.5 z-10 flex h-11 w-11 items-center justify-center transition active:scale-95 disabled:cursor-wait disabled:opacity-45 [&_svg]:h-5 [&_svg]:w-5 [&_svg]:drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)] ${
              post.saved ? "text-[#214B35]" : "text-white"
            }`}
          >
            <BookmarkIcon filled={post.saved} />
          </button>
        </div>

        <div className="px-3.5 pb-3 pt-2.5">
          <h2 className="truncate whitespace-nowrap text-[15px] font-bold leading-5 text-[#183C2B]">
            {post.title}
          </h2>

          <div className="mt-1.5 flex h-4 min-w-0 items-center gap-3 overflow-hidden text-[11px] font-semibold leading-4 text-[#6D7D72]">
            {post.areaLabel ? (
              <span className="flex min-w-0 items-center gap-1">
                <LocationIcon />
                <span className="truncate">{post.areaLabel}</span>
              </span>
            ) : null}
            {post.durationLabel ? (
              <span className="flex shrink-0 items-center gap-1">
                <ClockIcon />
                {post.durationLabel}
              </span>
            ) : null}
          </div>

          <div className="mt-2 flex h-5 min-w-0 gap-1.5 overflow-hidden">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="max-w-[42%] shrink-0 truncate rounded-full border border-[#D8F0DD] bg-[#F1FAF3] px-2 py-1 text-[10px] font-bold leading-none text-[#214B35]"
              >
                {tag}
              </span>
            ))}
          </div>

        </div>
      </div>
    </article>
  );
}

export default function HomePage() {
  const [activeGenre, setActiveGenre] = useState("新着");
  const [posts, setPosts] = useState<HomePost[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isPostsLoading, setIsPostsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadPosts() {
      setIsPostsLoading(true);
      setErrorMessage(null);
      const currentUserIdPromise = getCurrentUserId().catch((error: unknown) => {
        console.error("ROUTY home current user load failed", error);
        return null;
      });

      try {
        const postsResult = await supabase
          .from("posts")
          .select(
            "id,user_id,title,area,transport_type,companion_type,budget,cover_image_url",
          )
          .eq("is_published", true)
          .order("created_at", { ascending: false });

        if (postsResult.error) throw postsResult.error;

        const publishedPosts = (postsResult.data ?? []) as PostRow[];
        if (isMounted) {
          setPosts(publishedPosts.map((post) => toHomePost(post)));
          setIsPostsLoading(false);
        }

        const postIds = publishedPosts.map((post) => post.id);
        const authorIds = Array.from(
          new Set(publishedPosts.map((post) => post.user_id).filter(Boolean)),
        );
        const schedulePromise =
          postIds.length > 0
            ? supabase
                .from("schedule_items")
                .select(
                  "post_id,start_time,end_time,time,stay_duration,image_url",
                )
                .in("post_id", postIds)
                .order("sort_order", { ascending: true })
                .order("created_at", { ascending: true })
            : Promise.resolve({ data: [], error: null });
        const profilesPromise =
          authorIds.length > 0
            ? supabase
                .from("profiles")
                .select("id,display_name,username,avatar_url")
                .in("id", authorIds)
            : Promise.resolve({ data: [], error: null });
        const interactionsPromise = currentUserIdPromise.then(async (userId) => {
          if (!userId) {
            return {
              userId: null,
              savedPostIds: null,
            };
          }

          try {
            const savedPostIds = await getSavedPostIds(userId);
            return { userId, savedPostIds };
          } catch (error) {
            console.error(
              "ROUTY home saved state load failed",
              error,
            );
            return { userId, savedPostIds: null };
          }
        });

        const [scheduleResult, profilesResult, interactions] = await Promise.all([
          schedulePromise,
          profilesPromise,
          interactionsPromise,
        ]);

        if (scheduleResult.error) {
          console.error(
            "ROUTY home schedule metadata load failed",
            scheduleResult.error,
          );
        }
        if (profilesResult.error) {
          console.error(
            "ROUTY home author profiles load failed",
            profilesResult.error,
          );
        }

        const scheduleItemsByPostId = (
          (scheduleResult.data ?? []) as ScheduleItemRow[]
        ).reduce((map, item) => {
          const items = map.get(item.post_id) ?? [];
          items.push(item);
          map.set(item.post_id, items);
          return map;
        }, new Map<string, ScheduleItemRow[]>());
        const profilesById = new Map(
          ((profilesResult.data ?? []) as ProfileRow[]).map((profile) => [
            profile.id,
            profile,
          ]),
        );

        if (isMounted) {
          setCurrentUserId(interactions.userId);
          setPosts(
            publishedPosts.map((post) => {
              const homePost = toHomePost(
                post,
                scheduleResult.error
                  ? []
                  : (scheduleItemsByPostId.get(post.id) ?? []),
                profilesResult.error
                  ? undefined
                  : profilesById.get(post.user_id),
              );

              return {
                ...homePost,
                saved: interactions.savedPostIds?.has(post.id) ?? false,
                savedReady: interactions.savedPostIds !== null,
              };
            }),
          );
        }
      } catch (error) {
        console.error("ROUTY home posts load failed", error);
        if (isMounted) {
          setErrorMessage(getErrorMessage(error));
          setPosts([]);
        }
      } finally {
        if (isMounted) setIsPostsLoading(false);
      }
    }

    void loadPosts();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleToggleSave(postId: string) {
    if (!currentUserId) return;

    const targetPost = posts.find((post) => post.id === postId);
    if (!targetPost || !targetPost.savedReady || targetPost.isSavePending) {
      return;
    }

    const previousSaved = targetPost.saved;
    const optimisticSaved = !previousSaved;

    setPosts((currentPosts) =>
      currentPosts.map((post) =>
        post.id === postId
          ? {
              ...post,
              saved: optimisticSaved,
              isSavePending: true,
            }
          : post,
      ),
    );

    try {
      const saved = await toggleSavedPost({
        userId: currentUserId,
        postId,
        saved: previousSaved,
      });
      setPosts((currentPosts) =>
        currentPosts.map((post) =>
          post.id === postId
            ? { ...post, saved, isSavePending: false }
            : post,
        ),
      );
    } catch (error) {
      console.error("ROUTY home save toggle failed", error);
      setPosts((currentPosts) =>
        currentPosts.map((post) =>
          post.id === postId
            ? {
                ...post,
                saved: previousSaved,
                isSavePending: false,
              }
            : post,
        ),
      );
    }
  }

  return (
    <AppShell>
      <div className="min-h-dvh bg-[#FFFEF9] pb-[calc(2rem+env(safe-area-inset-bottom))]">
        <header className="border-b border-[#D8F0DD] bg-[#FFFEF9] pb-3 pt-8">
          <h1 className="px-5 text-[35px] font-black leading-none tracking-[0.055em] text-[#214B35]">
            ROUTY
          </h1>

          <div className="mt-6 flex gap-2.5 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {genreLabels.map((genre) => {
              const active = genre === activeGenre;

              return (
                <button
                  key={genre}
                  type="button"
                  onClick={() => setActiveGenre(genre)}
                  aria-pressed={active}
                  className={`h-10 shrink-0 rounded-full border px-4 text-xs font-bold transition ${
                    active
                      ? "border-[#214B35] bg-[#214B35] text-white"
                      : "border-[#D8F0DD] bg-white text-[#214B35]"
                  }`}
                >
                  {genre}
                </button>
              );
            })}
          </div>
        </header>

        {isPostsLoading ? (
          <HomeSkeleton />
        ) : errorMessage ? (
          <div className="px-4 py-6">
            <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700">
              {errorMessage}
            </p>
          </div>
        ) : posts.length === 0 ? (
          <p className="px-5 py-16 text-center text-sm font-semibold text-[#6D7D72]">
            まだ投稿がありません
          </p>
        ) : (
          <div className="space-y-4 px-4 py-5 pb-[calc(2rem+env(safe-area-inset-bottom))]">
            {posts.map((post, index) => (
              <HomePostCard
                key={post.id}
                post={post}
                priority={index === 0}
                onToggleSave={handleToggleSave}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
