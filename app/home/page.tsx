"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "../_components/AppShell";
import { getCurrentUserId, getReadableSupabaseError } from "@/lib/savedPosts";
import { parseDurationMinutes } from "@/lib/routeTime";
import { supabase } from "@/lib/supabase";

const categoryTags = ["# ランニング", "# サウナ", "# カフェ", "# デート"];

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

type HomePost = {
  id: string;
  title: string;
  area: string | null;
  transportLabel: string;
  durationLabel: string;
  budgetLabel: string;
  companionLabel: string;
  coverImage: string | null;
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

function getScheduleEndMinutes(item: ScheduleItemRow, startMinutes: number) {
  const endMinutes = toMinutes(item.end_time);
  if (endMinutes !== null && endMinutes > startMinutes) return endMinutes;

  const durationMinutes = parseDurationMinutes(item.stay_duration);
  if (durationMinutes === null) return null;

  return startMinutes + durationMinutes;
}

function formatDuration(minutes: number) {
  if (!Number.isFinite(minutes) || minutes <= 0) return "4時間";

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (hours > 0 && rest > 0) return `${hours}時間${rest}分`;
  if (hours > 0) return `${hours}時間`;

  return `${rest}分`;
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
    return "4時間";
  }

  return formatDuration(lastEnd - firstStart);
}

function getTransportLabel(value?: string | null) {
  if (value === "walking" || value === "walk") return "徒歩あり";
  if (value === "public_transport" || value === "train") return "電車あり";
  if (value === "car") return "車あり";

  return "徒歩あり";
}

function getCompanionLabel(value?: string | null) {
  if (value === "solo") return "ひとり";
  if (value === "friends") return "友達";
  if (value === "date") return "デート";
  if (value === "family") return "家族";

  return "デート";
}

function getBudgetLabel(value?: number | null) {
  if (value === null || value === undefined) return "2,000円";

  return `${value.toLocaleString("ja-JP")}円`;
}

function toHomePost(post: PostRow, scheduleItems: ScheduleItemRow[]): HomePost {
  return {
    id: post.id,
    title: post.title,
    area: post.area?.trim() || null,
    transportLabel: getTransportLabel(post.transport_type),
    durationLabel: getDurationLabel(scheduleItems),
    budgetLabel: getBudgetLabel(post.budget),
    companionLabel: getCompanionLabel(post.companion_type),
    coverImage: post.cover_image_url?.trim() || null,
  };
}

function splitTitleByFullWidthSpace(title: string) {
  const lines = title
    .split("　")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1) return null;

  return [lines[0], lines.slice(1).join("　")];
}

function SearchIcon() {
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
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function PostCard({
  post,
  imagePriority = false,
}: {
  post: HomePost;
  imagePriority?: boolean;
}) {
  const areaLabel = post.area ? `${post.area}エリア` : "エリア未設定";
  const titleLines = splitTitleByFullWidthSpace(post.title);
  const infoLabels = [
    post.transportLabel,
    post.durationLabel,
    post.budgetLabel,
    post.companionLabel,
  ];

  return (
    <article className="min-w-0 overflow-hidden rounded-2xl border border-[#D8F0DD] bg-white shadow-[0_8px_22px_rgba(17,24,39,0.06)]">
      <Link href={`/posts/${post.id}`} className="block">
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#F1FAF3]">
          {post.coverImage ? (
            <Image
              src={post.coverImage}
              alt={`${post.title}のサムネイル画像`}
              fill
              preload={imagePriority}
              loading={imagePriority ? undefined : "lazy"}
              decoding="async"
              quality={60}
              sizes="calc((min(100vw, 430px) - 44px) / 2)"
              className="pointer-events-none object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center px-3 text-center text-[11px] font-semibold leading-5 text-[#057A55]/60">
              画像未設定
            </div>
          )}
        </div>

        <div className="p-3">
          <h2
            className={`min-h-[38px] text-[13px] font-bold leading-[1.45] text-[#111827] ${
              titleLines ? "" : "line-clamp-2"
            }`}
          >
            {titleLines ? (
              <>
                <span className="block whitespace-nowrap">{titleLines[0]}</span>
                <span className="block whitespace-nowrap">{titleLines[1]}</span>
              </>
            ) : (
              post.title
            )}
          </h2>
          <p className="mt-1.5 flex min-w-0 items-center gap-1 text-[11px] font-semibold leading-4 text-[#057A55]">
            <span aria-hidden="true">📍</span>
            <span className="truncate">{areaLabel}</span>
          </p>

          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {infoLabels.map((label) => (
              <span
                key={label}
                className="min-w-0 truncate rounded-full border border-[#D8F0DD] bg-[#F1FAF3] px-2 py-1 text-center text-[10px] font-semibold leading-none text-[#057A55]"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </Link>
    </article>
  );
}

export default function HomePage() {
  const [posts, setPosts] = useState<HomePost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadPosts() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const [, postsResult] = await Promise.all([
          getCurrentUserId(),
          supabase
            .from("posts")
            .select(
              "id,title,area,transport_type,companion_type,budget,cover_image_url",
            )
            .eq("is_published", true)
            .order("created_at", { ascending: false }),
        ]);

        if (postsResult.error) throw postsResult.error;

        const publishedPosts = (postsResult.data ?? []) as PostRow[];
        const postIds = publishedPosts.map((post) => post.id);
        let scheduleItemsByPostId = new Map<string, ScheduleItemRow[]>();

        if (postIds.length > 0) {
          const { data: scheduleRows, error: scheduleError } = await supabase
            .from("schedule_items")
            .select("post_id,start_time,end_time,time,stay_duration,sort_order,created_at")
            .in("post_id", postIds)
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: true });

          if (scheduleError) throw scheduleError;

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

        const nextPosts = publishedPosts.map((post) =>
          toHomePost(post, scheduleItemsByPostId.get(post.id) ?? []),
        );

        console.log("ROUTY home posts loaded", {
          postCount: nextPosts.length,
        });

        if (isMounted) {
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

  return (
    <AppShell>
      <header className="bg-white px-4 pb-4 pt-8">
        <h1 className="text-[40px] font-extrabold leading-none tracking-[0.04em] text-[#28B83F]">
          ROUTY
        </h1>

        <div className="relative mt-5 flex h-12 items-center rounded-2xl border border-[#D8F0DD] bg-[#F8FCF9] px-4 text-[#6B7280]">
          <span className="mr-3 text-[#057A55]">
            <SearchIcon />
          </span>
          <span className="text-[15px] font-medium">行き先やユーザーを検索</span>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categoryTags.map((tag) => (
            <span
              key={tag}
              className="h-8 shrink-0 rounded-full border border-[#D8F0DD] bg-white px-3 py-2 text-xs font-semibold leading-none text-[#057A55]"
            >
              {tag}
            </span>
          ))}
        </div>
      </header>

      {isLoading ? (
        <div className="px-4 py-10 text-center text-sm font-medium text-[#6B7280]">
          読み込み中...
        </div>
      ) : errorMessage ? (
        <div className="px-4 py-4">
          <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700">
            {errorMessage}
          </p>
        </div>
      ) : posts.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm font-medium text-[#6B7280]">
          まだ投稿がありません
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-4 py-4 pb-[calc(9rem+env(safe-area-inset-bottom))]">
          {posts.map((post, index) => (
            <PostCard key={post.id} post={post} imagePriority={index === 0} />
          ))}
        </div>
      )}
    </AppShell>
  );
}
