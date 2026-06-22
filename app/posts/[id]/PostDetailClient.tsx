"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "../../_components/AppShell";
import { formatAreaLabel } from "@/lib/area";
import { supabase } from "@/lib/supabase";
import {
  getCurrentUserId,
  getReadableSupabaseError,
  isPostSaved,
  toggleSavedPost,
} from "@/lib/savedPosts";
import {
  formatRouteDuration,
  formatRouteTime,
  parseDurationMinutes,
  parseRouteTimeToMinutes,
} from "@/lib/routeTime";

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

function getStartMinutes(item: ScheduleItemRow) {
  return parseRouteTimeToMinutes(item.start_time ?? item.time);
}

function getEndMinutes(item: ScheduleItemRow) {
  const startMinutes = getStartMinutes(item);
  if (startMinutes === null) return null;

  const endMinutes = parseRouteTimeToMinutes(item.end_time);
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

  return formatRouteDuration(lastEnd - firstStart);
}

function getTimeRangeLabel(item: ScheduleItemRow) {
  const startMinutes = getStartMinutes(item);
  if (startMinutes === null) return "時刻未設定";

  const endMinutes = getEndMinutes(item);
  const startLabel = formatRouteTime(startMinutes);

  if (endMinutes === null || endMinutes <= startMinutes) {
    return startLabel;
  }

  return `${startLabel}〜${formatRouteTime(endMinutes)}`;
}

function getTransportLabel(value?: string | null) {
  if (value === "walking" || value === "walk") return "徒歩あり";
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

  return `${value.toLocaleString("ja-JP")}円`;
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

function SummaryPill({ children }: { children: string }) {
  return (
    <span className="rounded-full border border-[#D8F0DD] bg-[#F1FAF3] px-3 py-1.5 text-xs font-semibold text-[#057A55]">
      {children}
    </span>
  );
}

function BackIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21 12 17 5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16Z" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="currentColor"
    >
      <circle cx="5" cy="12" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="19" cy="12" r="1.7" />
    </svg>
  );
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

        if (postError) throw postError;

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

        if (profileResult.error) throw profileResult.error;
        if (scheduleResult.error) throw scheduleResult.error;

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

    if (!confirmed) return;

    setIsDeleting(true);
    setSaveErrorMessage(null);

    try {
      const { data, error } = await supabase
        .from("posts")
        .delete()
        .eq("id", detail.post.id)
        .select("id")
        .maybeSingle();

      if (error) throw error;

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

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/home");
  }

  return (
    <AppShell>
      <header className="sticky top-0 z-20 grid h-14 grid-cols-[56px_1fr_96px] items-center border-b border-[#D8F0DD] bg-white/95 px-3 backdrop-blur">
        <button
          type="button"
          onClick={handleBack}
          className="flex h-10 w-10 items-center justify-center rounded-full text-[#057A55] active:bg-[#F1FAF3]"
          aria-label="戻る"
        >
          <BackIcon />
        </button>
        <p className="text-center text-sm font-bold text-[#111827]">投稿詳細</p>
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={handleToggleSave}
            disabled={isLoading || isSaving || !detail}
            className={`flex h-10 w-10 items-center justify-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-50 ${
              isSaved
                ? "border-[#28B83F] bg-[#28B83F] text-white"
                : "border-[#D8F0DD] bg-white text-[#057A55] active:bg-[#F1FAF3]"
            }`}
            aria-label={isSaved ? "保存を解除" : "投稿を保存"}
          >
            <BookmarkIcon filled={isSaved} />
          </button>
          {canDelete ? (
            <details className="relative">
              <summary
                className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 marker:hidden active:bg-zinc-50"
                aria-label="メニュー"
              >
                <MoreIcon />
              </summary>
              <div className="absolute right-0 top-11 z-30 w-40 overflow-hidden rounded-xl border border-zinc-100 bg-white py-1 text-sm shadow-lg">
                {isOwner ? (
                  <Link
                    href={`/bookmarks/${postId}/edit`}
                    className="block px-4 py-2 font-semibold text-zinc-800 active:bg-zinc-50"
                  >
                    編集
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={handleDeletePost}
                  disabled={isDeleting}
                  className="block w-full px-4 py-2 text-left font-semibold text-red-600 disabled:cursor-not-allowed disabled:text-zinc-400 active:bg-red-50"
                >
                  {isDeleting
                    ? "削除中..."
                    : isAdminDeletingOtherUserPost
                      ? "管理者として削除"
                      : "削除"}
                </button>
              </div>
            </details>
          ) : (
            <span className="h-10 w-10" aria-hidden="true" />
          )}
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
        <article className="bg-white pb-28">
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
              <OverviewSlide
                detail={detail}
                activeIndex={activeIndex}
                onSelectSlide={goToSlide}
              />
              <TimelineSlide detail={detail} />
            </div>
          </section>
        </article>
      )}
    </AppShell>
  );
}

function SlideDots({
  activeIndex,
  onSelect,
}: {
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="flex justify-center gap-1.5 py-4">
      {Array.from({ length: slideCount }, (_, index) => (
        <button
          key={index}
          type="button"
          onClick={() => onSelect(index)}
          aria-label={`${index + 1}枚目を表示`}
          className={`h-1.5 rounded-full transition-all ${
            activeIndex === index ? "w-6 bg-[#28B83F]" : "w-1.5 bg-zinc-200"
          }`}
        />
      ))}
    </div>
  );
}

function OverviewSlide({
  detail,
  activeIndex,
  onSelectSlide,
}: {
  detail: DetailState;
  activeIndex: number;
  onSelectSlide: (index: number) => void;
}) {
  const post = detail.post;
  const areaLabel = formatAreaLabel(post.area);
  const summaryLabels = [
    getTransportLabel(post.transport_type),
    getDurationLabel(detail.scheduleItems),
    getBudgetLabel(post.budget),
    getCompanionLabel(post.companion_type),
  ].filter(Boolean) as string[];
  const caption = post.caption?.trim();

  return (
    <section className="min-h-[calc(100dvh-112px)] w-full min-w-full shrink-0 snap-start overflow-y-auto bg-white pb-2">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#F1FAF3]">
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
          <div className="flex h-full w-full items-center justify-center px-4 text-sm font-semibold text-[#057A55]/60">
            画像未設定
          </div>
        )}
      </div>

      <SlideDots activeIndex={activeIndex} onSelect={onSelectSlide} />

      <div className="px-5 pb-7 pt-2">
        <h1 className="line-clamp-2 text-2xl font-bold leading-8 text-[#111827]">
          {post.title}
        </h1>
        {areaLabel ? (
          <p className="mt-2 flex min-w-0 items-center gap-1.5 text-sm font-semibold text-[#057A55]">
            <span className="truncate">{areaLabel}</span>
          </p>
        ) : null}

        {summaryLabels.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {summaryLabels.map((label) => (
              <SummaryPill key={label}>{label}</SummaryPill>
            ))}
          </div>
        ) : null}

        {caption ? (
          <section className="mt-7 border-t border-zinc-100 pt-6">
            <h2 className="text-lg font-bold text-[#111827]">
              このルートのポイント
            </h2>
            <p className="mt-3 whitespace-pre-wrap text-[15px] leading-7 text-zinc-800">
              {caption}
            </p>
          </section>
        ) : null}
      </div>
    </section>
  );
}

function TimelineSlide({ detail }: { detail: DetailState }) {
  const post = detail.post;
  const areaLabel = formatAreaLabel(post.area);

  return (
    <section className="min-h-[calc(100dvh-112px)] w-full min-w-full shrink-0 snap-start overflow-y-auto bg-white px-5 pb-8 pt-5">
      <div className="flex items-center gap-3">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-emerald-50">
          {post.cover_image_url?.trim() ? (
            <Image
              src={post.cover_image_url.trim()}
              alt={`${post.title}のサムネイル画像`}
              fill
              unoptimized
              sizes="64px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-emerald-700/55">
              画像未設定
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-semibold leading-5 text-zinc-950">
            {post.title}
          </p>
          {areaLabel ? (
            <p className="mt-1 truncate text-xs font-semibold text-emerald-700">
              {areaLabel}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-5 border-t border-zinc-100 pt-5">
        <h2 className="text-xl font-semibold text-zinc-950">タイムライン</h2>

        {detail.scheduleItems.length === 0 ? (
          <p className="mt-5 rounded-xl bg-zinc-50 px-4 py-5 text-sm font-medium text-zinc-500">
            スケジュールが登録されていません
          </p>
        ) : (
          <div className="relative mt-6">
            <div className="absolute left-[7px] top-3 h-[calc(100%-24px)] w-px bg-emerald-200" />
            <div className="space-y-7">
              {detail.scheduleItems.map((item, index) => (
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
  const imageUrl = item.image_url?.trim();
  const contentName = getContentName(item);

  return (
    <div className="grid grid-cols-[16px_1fr] gap-3">
      <div className="relative pt-2">
        <span className="relative z-10 block h-3.5 w-3.5 rounded-full border-[3px] border-white bg-emerald-600 shadow-[0_0_0_1px_rgba(5,150,105,0.25)]" />
      </div>

      <div className="min-w-0">
        <p className="text-xs font-bold tabular-nums text-emerald-700">
          {getTimeRangeLabel(item)}
        </p>
        <div className={imageUrl ? "mt-2 grid grid-cols-[1fr_88px] gap-3" : "mt-2"}>
          <div className="min-w-0">
            <h3 className="text-base font-semibold leading-6 text-zinc-950">
              {contentName}
            </h3>
            {placeName ? (
              <p className="mt-1 text-sm leading-6 text-zinc-700">{placeName}</p>
            ) : null}
            {comment ? (
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-600">
                {comment}
              </p>
            ) : null}
          </div>
          {imageUrl ? (
            <div className="relative h-24 overflow-hidden rounded-xl bg-zinc-100">
              <Image
                src={imageUrl}
                alt={`${contentName}の画像`}
                fill
                unoptimized
                sizes="88px"
                className="object-cover"
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
