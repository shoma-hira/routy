"use client";

import { useEffect, useState } from "react";
import { AppShell } from "../_components/AppShell";
import { PostCard, type PostCardPost } from "../_components/PostCard";
import { supabase } from "@/lib/supabase";
import {
  getCurrentUserId,
  getReadableSupabaseError,
  getSavedPostIds,
  toggleSavedPost,
} from "@/lib/savedPosts";

const tags = ["#カフェ巡り", "#週末旅", "#絶景", "#ランチ"];

type PostRow = {
  id: string;
  user_id: string;
  title: string;
  area: string | null;
  transport_type: string | null;
  companion_type: string | null;
  budget: number | null;
  cover_image_url: string | null;
  type: string | null;
  is_published: boolean;
  created_at: string;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
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

function getErrorMessage(error: unknown) {
  return getReadableSupabaseError(error, "投稿の取得に失敗しました。");
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

function parseDurationMinutes(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return null;

  const text = String(value);
  const hourMatch = text.match(/(\d+)\s*時間/);
  const minuteMatch = text.match(/(\d+)\s*分/);
  const plainNumber = text.match(/^\s*(\d+)\s*$/);
  const hours = hourMatch ? Number(hourMatch[1]) : 0;
  const minutes = minuteMatch
    ? Number(minuteMatch[1])
    : plainNumber
      ? Number(plainNumber[1])
      : 0;
  const total = hours * 60 + minutes;

  return total > 0 ? total : null;
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes}分`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return rest ? `${hours}時間${rest}分` : `${hours}時間`;
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

  return formatDuration(lastEnd - firstStart);
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
  profile: ProfileRow | undefined,
  savedPostIds: Set<string>,
  scheduleItems: ScheduleItemRow[],
): PostCardPost {
  return {
    id: post.id,
    title: post.title,
    author: profile?.display_name?.trim() || "ROUTY User",
    area: post.area?.trim() || null,
    transportLabel: getTransportLabel(post.transport_type),
    durationLabel: getDurationLabel(scheduleItems),
    budgetLabel: getBudgetLabel(post.budget),
    companionLabel: getCompanionLabel(post.companion_type),
    coverImage: post.cover_image_url?.trim() || null,
    saved: savedPostIds.has(post.id),
  };
}

export default function HomePage() {
  const [posts, setPosts] = useState<PostCardPost[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadPosts() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const currentUserId = await getCurrentUserId();
        const { data: postRows, error: postsError } = await supabase
          .from("posts")
          .select(
            "id,user_id,title,area,transport_type,companion_type,budget,cover_image_url,type,is_published,created_at",
          )
          .eq("is_published", true)
          .order("created_at", { ascending: false });

        if (postsError) {
          throw postsError;
        }

        const publishedPosts = (postRows ?? []) as PostRow[];
        const savedPostIds = await getSavedPostIds(currentUserId);
        const postIds = publishedPosts.map((post) => post.id);
        let scheduleItemsByPostId = new Map<string, ScheduleItemRow[]>();

        if (postIds.length > 0) {
          const { data: scheduleRows, error: scheduleError } = await supabase
            .from("schedule_items")
            .select("post_id,start_time,end_time,time,stay_duration,sort_order,created_at")
            .in("post_id", postIds)
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: true });

          if (scheduleError) {
            throw scheduleError;
          }

          scheduleItemsByPostId = ((scheduleRows ?? []) as ScheduleItemRow[]).reduce(
            (map, item) => {
              const items = map.get(item.post_id) ?? [];
              items.push(item);
              map.set(item.post_id, items);
              return map;
            },
            new Map<string, ScheduleItemRow[]>(),
          );
        }

        const userIds = Array.from(
          new Set(publishedPosts.map((post) => post.user_id).filter(Boolean)),
        );
        let profilesById = new Map<string, ProfileRow>();

        if (userIds.length > 0) {
          const { data: profileRows, error: profilesError } = await supabase
            .from("profiles")
            .select("id,display_name,avatar_url")
            .in("id", userIds);

          if (profilesError) {
            throw profilesError;
          }

          profilesById = new Map(
            ((profileRows ?? []) as ProfileRow[]).map((profile) => [
              profile.id,
              profile,
            ]),
          );
        }

        const nextPosts = publishedPosts.map((post) =>
          toPostCard(
            post,
            profilesById.get(post.user_id),
            savedPostIds,
            scheduleItemsByPostId.get(post.id) ?? [],
          ),
        );

        console.log("ROUTY home posts loaded", {
          postCount: nextPosts.length,
          profileCount: profilesById.size,
        });

        if (isMounted) {
          setUserId(currentUserId);
          setPosts(nextPosts);
        }
      } catch (error) {
        console.error("ROUTY home posts load failed", error);
        if (isMounted) {
          setErrorMessage(getErrorMessage(error));
          setPosts([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadPosts();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleToggleSave(postId: string) {
    if (!userId) {
      const message = "ログイン中のユーザーを取得できませんでした。";
      console.error("ROUTY save toggle failed", message);
      setSaveErrorMessage(message);
      return;
    }

    const target = posts.find((post) => post.id === postId);
    if (!target) return;

    setSaveErrorMessage(null);
    setPosts((currentPosts) =>
      currentPosts.map((post) =>
        post.id === postId ? { ...post, isSaving: true } : post,
      ),
    );

    try {
      const nextSaved = await toggleSavedPost({
        userId,
        postId,
        saved: Boolean(target.saved),
      });

      setPosts((currentPosts) =>
        currentPosts.map((post) =>
          post.id === postId
            ? { ...post, saved: nextSaved, isSaving: false }
            : post,
        ),
      );
    } catch (error) {
      const message = getReadableSupabaseError(error, "保存処理に失敗しました。");
      console.error("ROUTY save toggle failed", error);
      setSaveErrorMessage(message);
      setPosts((currentPosts) =>
        currentPosts.map((post) =>
          post.id === postId ? { ...post, isSaving: false } : post,
        ),
      );
    }
  }

  return (
    <AppShell>
      <header className="sticky top-0 z-10 border-b border-zinc-100 bg-white/95 px-4 py-4 backdrop-blur">
        <h1 className="text-2xl font-semibold tracking-normal">ROUTY</h1>
        <label className="mt-4 block">
          <span className="sr-only">検索</span>
          <input
            type="search"
            placeholder="行き先やユーザーを検索"
            className="h-11 w-full rounded-md border border-zinc-200 bg-zinc-50 px-4 text-[15px] outline-none placeholder:text-zinc-400 focus:border-zinc-900 focus:bg-white"
          />
        </label>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              className="h-8 shrink-0 rounded-full border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700"
            >
              {tag}
            </button>
          ))}
        </div>
      </header>

      {isLoading ? (
        <div className="px-4 py-10 text-center text-sm font-medium text-zinc-500">
          読み込み中...
        </div>
      ) : errorMessage ? (
        <div className="px-4 py-4">
          <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700">
            {errorMessage}
          </p>
        </div>
      ) : posts.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm font-medium text-zinc-500">
          まだ投稿がありません
        </div>
      ) : (
        <>
          {saveErrorMessage ? (
            <div className="px-4 pt-4">
              <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700">
                {saveErrorMessage}
              </p>
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-3 px-4 py-4 pb-28">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onToggleSave={handleToggleSave}
              />
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}
