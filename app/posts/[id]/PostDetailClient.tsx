"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "../../_components/AppShell";
import { supabase } from "@/lib/supabase";
import {
  getCurrentUserId,
  getReadableSupabaseError,
  isPostSaved,
  toggleSavedPost,
} from "@/lib/savedPosts";

const slideCount = 2;

type ProfileRole = "user" | "admin";

type PostRow = {
  id: string;
  user_id: string;
  title: string;
  area: string | null;
  transport_type: string | null;
  companion_type: string | null;
  budget: number | null;
  caption: string | null;
  cover_image_url: string | null;
  is_published: boolean;
  created_at: string;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  role?: ProfileRole | null;
};

type ScheduleItemRow = {
  id: string;
  post_id: string;
  start_time: string | null;
  end_time: string | null;
  content_name: string | null;
  place_name: string | null;
  comment: string | null;
  image_url: string | null;
  sort_order: number | null;
  time: string | null;
  stay_duration: string | number | null;
  spot_name: string | null;
  created_at: string | null;
};

type DetailState = {
  post: PostRow;
  profile: ProfileRow | null;
  scheduleItems: ScheduleItemRow[];
};

function getErrorMessage(error: unknown) {
  return getReadableSupabaseError(error, "投稿詳細の取得に失敗しました。");
}

function normalizeProfileRole(value: unknown): ProfileRole {
  return value === "admin" ? "admin" : "user";
}

function isMissingRoleColumn(error: unknown) {
  const message = getReadableSupabaseError(error, "").toLowerCase();

  return message.includes("role") && message.includes("column");
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

function formatTimelineTime(minutes: number) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes}分`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return rest ? `${hours}時間${rest}分` : `${hours}時間`;
}

function getStartMinutes(item: ScheduleItemRow) {
  return toMinutes(item.start_time ?? item.time);
}

function getEndMinutes(item: ScheduleItemRow) {
  const startMinutes = getStartMinutes(item);
  if (startMinutes === null) return null;

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
    const startMinutes = getStartMinutes(item);
    const endMinutes = getEndMinutes(item);
    if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
      return;
    }

    firstStart = firstStart === null ? startMinutes : Math.min(firstStart, startMinutes);
    lastEnd = lastEnd === null ? endMinutes : Math.max(lastEnd, endMinutes);
  });

  if (firstStart === null || lastEnd === null || lastEnd <= firstStart) {
    return null;
  }

  return formatDuration(lastEnd - firstStart);
}

function getTimeRangeLabel(item: ScheduleItemRow) {
  const startMinutes = getStartMinutes(item);
  if (startMinutes === null) return "時刻未設定";

  const endMinutes = getEndMinutes(item);
  const startLabel = formatTimelineTime(startMinutes);

  if (endMinutes === null || endMinutes <= startMinutes) {
    return startLabel;
  }

  return `${startLabel}〜${formatTimelineTime(endMinutes)}`;
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

function getContentName(item: ScheduleItemRow) {
  return item.content_name?.trim() || item.spot_name?.trim() || "名称未設定";
}

function sortScheduleItems(items: ScheduleItemRow[]) {
  return [...items].sort((a, b) => {
    const startDiff = (getStartMinutes(a) ?? 0) - (getStartMinutes(b) ?? 0);
    if (startDiff !== 0) return startDiff;

    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });
}

export function PostDetailClient({ postId }: { postId: string }) {
  const router = useRouter();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [detail, setDetail] = useState<DetailState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<ProfileRole>("user");
  const [notFound, setNotFound] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const isOwner = Boolean(userId && detail?.post.user_id === userId);
  const isAdmin = currentUserRole === "admin";
  const canDelete = Boolean(detail && userId && (isOwner || isAdmin));
  const isAdminDeletingOtherUserPost = Boolean(detail && isAdmin && !isOwner);

  useEffect(() => {
    let isMounted = true;

    async function loadDetail() {
      setIsLoading(true);
      setErrorMessage(null);
      setNotFound(false);

      try {
        const currentUserId = await getCurrentUserId();
        let currentRole: ProfileRole = "user";
        const currentProfileResult = await supabase
          .from("profiles")
          .select("id,role")
          .eq("id", currentUserId)
          .maybeSingle();

        if (
          currentProfileResult.error &&
          !isMissingRoleColumn(currentProfileResult.error)
        ) {
          throw currentProfileResult.error;
        }

        if (!currentProfileResult.error) {
          currentRole = normalizeProfileRole(currentProfileResult.data?.role);
        }

        const { data: post, error: postError } = await supabase
          .from("posts")
          .select(
            "id,user_id,title,area,transport_type,companion_type,budget,caption,cover_image_url,is_published,created_at",
          )
          .eq("id", postId)
          .maybeSingle();

        if (postError) {
          throw postError;
        }

        if (!post) {
          if (isMounted) {
            setDetail(null);
            setNotFound(true);
          }
          return;
        }

        if (!post.is_published && post.user_id !== currentUserId && currentRole !== "admin") {
          if (isMounted) {
            setDetail(null);
            setNotFound(true);
          }
          return;
        }

        const [profileResult, scheduleResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("id,display_name,avatar_url")
            .eq("id", post.user_id)
            .maybeSingle(),
          supabase
            .from("schedule_items")
            .select(
              "id,post_id,start_time,end_time,content_name,place_name,comment,image_url,sort_order,time,stay_duration,spot_name,created_at",
            )
            .eq("post_id", post.id)
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: true }),
        ]);

        if (profileResult.error) {
          throw profileResult.error;
        }

        if (scheduleResult.error) {
          throw scheduleResult.error;
        }

        const nextDetail = {
          post: post as PostRow,
          profile: profileResult.data as ProfileRow | null,
          scheduleItems: sortScheduleItems(
            (scheduleResult.data ?? []) as ScheduleItemRow[],
          ),
        };
        const nextIsSaved = await isPostSaved(currentUserId, post.id);

        console.log("ROUTY post detail loaded", {
          postId: post.id,
          scheduleItemCount: nextDetail.scheduleItems.length,
        });

        if (isMounted) {
          setUserId(currentUserId);
          setCurrentUserRole(currentRole);
          setIsSaved(nextIsSaved);
          setDetail(nextDetail);
        }
      } catch (error) {
        console.error("ROUTY post detail load failed", error);
        if (isMounted) {
          setDetail(null);
          setErrorMessage(getErrorMessage(error));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadDetail();

    return () => {
      isMounted = false;
    };
  }, [postId]);

  function handleScroll() {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const nextIndex = Math.round(scroller.scrollLeft / scroller.clientWidth);
    setActiveIndex(Math.max(0, Math.min(slideCount - 1, nextIndex)));
  }

  function goToSlide(index: number) {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const nextIndex = Math.max(0, Math.min(slideCount - 1, index));
    scroller.scrollTo({
      left: scroller.clientWidth * nextIndex,
      behavior: "smooth",
    });
    setActiveIndex(nextIndex);
  }

  async function handleToggleSave() {
    if (!userId || !detail) {
      const message = "ログイン中のユーザーまたは投稿を取得できませんでした。";
      console.error("ROUTY detail save toggle failed", message);
      setSaveErrorMessage(message);
      return;
    }

    setIsSaving(true);
    setSaveErrorMessage(null);

    try {
      const nextSaved = await toggleSavedPost({
        userId,
        postId: detail.post.id,
        saved: isSaved,
      });
      setIsSaved(nextSaved);
    } catch (error) {
      const message = getReadableSupabaseError(error, "保存処理に失敗しました。");
      console.error("ROUTY detail save toggle failed", error);
      setSaveErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeletePost() {
    if (!userId || !detail || !canDelete) {
      setSaveErrorMessage("この投稿を削除する権限がありません。");
      return;
    }

    const confirmed = window.confirm(
      isAdminDeletingOtherUserPost
        ? "管理者権限でこの投稿を削除しますか？\n投稿者本人の投稿も削除され、元に戻せません。"
        : "この投稿を削除しますか？\n削除後は元に戻せません。",
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setSaveErrorMessage(null);

    try {
      const { data, error } = await supabase
        .from("posts")
        .delete()
        .eq("id", detail.post.id)
        .select("id")
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data?.id) {
        throw new Error("この投稿を削除する権限がありません。");
      }

      console.log("ROUTY delete post success", { postId: detail.post.id });
      window.alert("投稿を削除しました。");
      router.push("/home");
    } catch (error) {
      console.error("ROUTY delete post failed", error);
      setSaveErrorMessage(
        getReadableSupabaseError(error, "投稿の削除に失敗しました。"),
      );
      setIsDeleting(false);
    }
  }

  return (
    <AppShell>
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-zinc-100 bg-white/95 px-5 backdrop-blur">
        <Link href="/home" className="text-sm font-medium text-zinc-600">
          戻る
        </Link>
        <div className="flex items-center gap-3">
          {canDelete ? (
            <>
              {isOwner ? (
                <Link
                  href={`/bookmarks/${postId}/edit`}
                  className="text-sm font-semibold text-zinc-950"
                >
                  編集
                </Link>
              ) : null}
              <button
                type="button"
                onClick={handleDeletePost}
                disabled={isDeleting}
                className="text-sm font-semibold text-red-600 disabled:cursor-not-allowed disabled:text-zinc-400"
              >
                {isDeleting
                  ? "削除中..."
                  : isAdminDeletingOtherUserPost
                    ? "管理者として削除"
                    : "削除"}
              </button>
            </>
          ) : null}
          <button
            type="button"
            onClick={handleToggleSave}
            disabled={isLoading || isSaving || !detail}
            className={`text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${
              isSaved ? "text-zinc-950" : "text-zinc-400"
            }`}
            aria-label={isSaved ? "保存を解除" : "投稿を保存"}
          >
            {isSaved ? "保存済み" : "保存"}
          </button>
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
      ) : notFound || !detail ? (
        <div className="px-4 py-10 text-center text-sm font-medium text-zinc-500">
          投稿が見つかりません
        </div>
      ) : (
        <article className="bg-zinc-50 pb-28">
          {saveErrorMessage ? (
            <div className="px-4 pt-4">
              <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700">
                {saveErrorMessage}
              </p>
            </div>
          ) : null}
          <section className="relative">
            <div
              ref={scrollerRef}
              onScroll={handleScroll}
              className="flex touch-pan-y snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              aria-label="投稿詳細スライド"
            >
              <OverviewSlide detail={detail} />
              <TimelineSlide items={detail.scheduleItems} />
            </div>

            <div className="flex justify-center gap-1.5 py-3">
              {Array.from({ length: slideCount }, (_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => goToSlide(index)}
                  aria-label={`${index + 1}枚目を表示`}
                  className={`h-1.5 rounded-full transition-all ${
                    activeIndex === index ? "w-5 bg-zinc-900" : "w-1.5 bg-zinc-300"
                  }`}
                />
              ))}
            </div>
          </section>
        </article>
      )}
    </AppShell>
  );
}

function OverviewSlide({ detail }: { detail: DetailState }) {
  const post = detail.post;
  const summaryLabels = [
    getTransportLabel(post.transport_type),
    getDurationLabel(detail.scheduleItems),
    getBudgetLabel(post.budget),
    getCompanionLabel(post.companion_type),
  ].filter(Boolean) as string[];
  const caption = post.caption?.trim();

  return (
    <section className="min-h-[calc(100dvh-92px)] w-full min-w-full shrink-0 snap-start overflow-y-auto bg-white px-4 pb-6 pt-4">
      <div className="mx-auto max-w-[430px]">
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-zinc-100">
          {post.cover_image_url?.trim() ? (
            <Image
              src={post.cover_image_url.trim()}
              alt={`${post.title}のサムネイル画像`}
              fill
              unoptimized
              priority
              sizes="min(100vw, 430px)"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center px-4 text-sm font-semibold text-zinc-400">
              画像未設定
            </div>
          )}
        </div>

        <div className="mt-5">
          <h1 className="text-2xl font-semibold leading-8 text-zinc-950">
            {post.title}
          </h1>
          {post.area?.trim() ? (
            <p className="mt-2 text-sm font-medium text-zinc-500">
              {post.area.trim()}
            </p>
          ) : null}

          {summaryLabels.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {summaryLabels.map((label) => (
                <span
                  key={label}
                  className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-700"
                >
                  {label}
                </span>
              ))}
            </div>
          ) : null}

          {caption ? (
            <p className="mt-6 whitespace-pre-wrap text-sm leading-7 text-zinc-800">
              {caption}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function TimelineSlide({ items }: { items: ScheduleItemRow[] }) {
  return (
    <section className="min-h-[calc(100dvh-92px)] w-full min-w-full shrink-0 snap-start overflow-y-auto bg-white px-4 pb-6 pt-5">
      <div className="mx-auto max-w-[430px]">
        <h2 className="text-xl font-semibold text-zinc-950">タイムライン</h2>

        {items.length === 0 ? (
          <p className="mt-5 rounded-xl bg-zinc-50 px-4 py-5 text-sm font-medium text-zinc-500">
            スケジュールが登録されていません
          </p>
        ) : (
          <div className="relative mt-6">
            <div className="absolute left-[7px] top-3 h-[calc(100%-24px)] w-px bg-zinc-200" />
            <div className="space-y-6">
              {items.map((item, index) => (
                <TimelineItem key={item.id || `${item.post_id}-${index}`} item={item} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function TimelineItem({ item }: { item: ScheduleItemRow }) {
  const placeName = item.place_name?.trim();
  const comment = item.comment?.trim();
  const contentName = getContentName(item);

  return (
    <div className="grid grid-cols-[16px_1fr] gap-3">
      <div className="relative pt-2">
        <span className="relative z-10 block h-3.5 w-3.5 rounded-full border-[3px] border-white bg-zinc-900 shadow-[0_0_0_1px_rgba(24,24,27,0.18)]" />
      </div>

      <div className="min-w-0 rounded-xl bg-zinc-50 px-4 py-3">
        <p className="text-xs font-semibold tabular-nums text-zinc-500">
          {getTimeRangeLabel(item)}
        </p>
        <h3 className="mt-1 text-base font-semibold leading-6 text-zinc-950">
          {contentName}
        </h3>
        {placeName ? (
          <p className="mt-1 text-sm font-medium leading-6 text-zinc-700">
            {placeName}
          </p>
        ) : null}
        {comment ? (
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
            {comment}
          </p>
        ) : null}
        {item.image_url?.trim() ? (
          <div className="relative mt-4 aspect-[4/3] overflow-hidden rounded-xl bg-zinc-100">
            <Image
              src={item.image_url.trim()}
              alt={`${contentName}の画像`}
              fill
              unoptimized
              sizes="min(100vw, 430px)"
              className="object-cover"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
