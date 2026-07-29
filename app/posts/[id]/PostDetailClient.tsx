"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "../../_components/AppShell";
import { FollowButton } from "../../_components/FollowButton";
import { PostDetailSkeleton } from "../../_components/PostDetailSkeleton";
import { formatAreaLabel } from "@/lib/area";
import {
  parseRoutyDisplayTags,
  toRoutyDisplayScheduleItems,
  type RoutyDisplayScheduleItem,
} from "@/lib/routyDisplay";
import { supabase } from "@/lib/supabase";
import {
  getCurrentUserId,
  getReadableSupabaseError,
  isPostSaved,
  toggleSavedPost,
} from "@/lib/savedPosts";
import {
  formatRouteDuration,
  parseDurationMinutes,
  parseRouteTimeToMinutes,
} from "@/lib/routeTime";

const slideCount = 2;

const SharePngTemplate = dynamic(
  () =>
    import("../../_components/SharePngTemplate").then(
      (module) => module.SharePngTemplate,
    ),
  { ssr: false },
);

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
  username: string | null;
  avatar_url: string | null;
  profile_completed: boolean;
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

function getProfileDisplayName(profile: ProfileRow | null) {
  return profile?.display_name?.trim() || "ROUTY User";
}

function getProfileInitial(displayName: string) {
  return displayName.trim().charAt(0).toUpperCase() || "R";
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

function getShareTransportLabel(value?: string | null) {
  if (value === "walking" || value === "walk") return "徒歩あり";
  if (value === "public_transport" || value === "train") return "電車あり";
  if (value === "car") return "車あり";

  return null;
}

function getShareCompanionLabel(value?: string | null) {
  if (value === "solo") return "1人";
  if (value === "friends") return "友達";
  if (value === "date") return "デート";
  if (value === "family") return "家族";

  return null;
}

function getShareBudgetLabel(value?: number | null) {
  if (value === null || value === undefined) return null;

  return `${value.toLocaleString("ja-JP")}円`;
}

function getShareDurationLabel(items: ScheduleItemRow[]) {
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

  const totalMinutes = lastEnd - firstStart;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) return `${hours}時間${minutes}分`;
  if (hours > 0) return `${hours}時間`;

  return `${minutes}分`;
}

function getShareAreaLabel(value?: string | null) {
  const normalized = value
    ?.replace(/^📍\s*/u, "")
    .replace(/\s*エリア$/u, "")
    .trim();

  return normalized ? `${normalized}エリア` : "";
}

function splitTitleByFullWidthSpace(title: string) {
  const lines = title
    .split("　")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1) return null;

  return [lines[0], lines.slice(1).join("　")];
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
    <span className="box-border flex min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded-[14px] border border-[#D8F0DD] bg-white px-1 py-2 text-[clamp(8px,2.3vw,11px)] font-semibold text-[#057A55] shadow-sm">
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

function DownloadIcon() {
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
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

export function PostDetailClient({ postId }: { postId: string }) {
  const router = useRouter();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const shareImageRef = useRef<HTMLDivElement>(null);
  const [detail, setDetail] = useState<DetailState | null>(null);
  const [isPostLoading, setIsPostLoading] = useState(true);
  const [isAuthorLoading, setIsAuthorLoading] = useState(false);
  const [isScheduleLoading, setIsScheduleLoading] = useState(false);
  const [isSavedLoading, setIsSavedLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isSavedReady, setIsSavedReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingShareImage, setIsGeneratingShareImage] = useState(false);
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
      setIsPostLoading(true);
      setIsAuthorLoading(false);
      setIsScheduleLoading(false);
      setIsSavedLoading(false);
      setIsSavedReady(false);
      setErrorMessage(null);
      setNotFound(false);

      try {
        const currentUserResultPromise = getCurrentUserId()
          .then((currentUserId) => ({ currentUserId, error: null }))
          .catch((error: unknown) => ({ currentUserId: null, error }));
        const postResult = await supabase
          .from("posts")
          .select(
            "id,user_id,title,area,transport_type,companion_type,budget,caption,cover_image_url,is_published,created_at",
          )
          .eq("id", postId)
          .maybeSingle();

        if (postResult.error) throw postResult.error;

        if (!postResult.data) {
          if (isMounted) {
            setDetail(null);
            setNotFound(true);
          }
          return;
        }

        const post = postResult.data as PostRow;
        const initialDetail: DetailState = {
          post,
          profile: null,
          scheduleItems: [],
        };

        if (post.is_published && isMounted) {
          setDetail(initialDetail);
          setIsPostLoading(false);
        }

        const loadAuthor = async () => {
          if (isMounted) setIsAuthorLoading(true);

          try {
            const profileResult = await supabase
              .from("profiles")
              .select("id,display_name,username,avatar_url,profile_completed")
              .eq("id", post.user_id)
              .maybeSingle();

            if (profileResult.error) throw profileResult.error;
            if (isMounted) {
              setDetail((current) =>
                current
                  ? { ...current, profile: profileResult.data as ProfileRow | null }
                  : current,
              );
            }
          } catch (error) {
            console.error("ROUTY post author load failed", error);
          } finally {
            if (isMounted) setIsAuthorLoading(false);
          }
        };

        const loadSchedule = async () => {
          if (isMounted) setIsScheduleLoading(true);

          try {
            const scheduleResult = await supabase
              .from("schedule_items")
              .select(
                "id,post_id,start_time,end_time,content_name,place_name,comment,image_url,sort_order,time,stay_duration,spot_name,created_at",
              )
              .eq("post_id", post.id)
              .order("sort_order", { ascending: true })
              .order("created_at", { ascending: true });

            if (scheduleResult.error) throw scheduleResult.error;
            const scheduleItems = sortScheduleItems(
              (scheduleResult.data ?? []) as ScheduleItemRow[],
            );

            if (isMounted) {
              setDetail((current) =>
                current ? { ...current, scheduleItems } : current,
              );
            }
          } catch (error) {
            console.error("ROUTY post schedule load failed", error);
          } finally {
            if (isMounted) setIsScheduleLoading(false);
          }
        };

        const auxiliaryTasks = post.is_published
          ? [loadAuthor(), loadSchedule()]
          : [];
        const currentUserResult = await currentUserResultPromise;

        if (!currentUserResult.currentUserId) {
          if (!post.is_published) throw currentUserResult.error;
          console.error("ROUTY post current user load failed", currentUserResult.error);
          await Promise.allSettled(auxiliaryTasks);
          return;
        }

        const currentUserId = currentUserResult.currentUserId;

        if (!isMounted) return;

        setUserId(currentUserId);

        const currentRolePromise = supabase
          .from("profiles")
          .select("id,role")
          .eq("id", currentUserId)
          .maybeSingle();
        setIsSavedLoading(true);
        const savedPromise = isPostSaved(currentUserId, post.id)
          .then((saved) => {
            if (isMounted) {
              setIsSaved(saved);
              setIsSavedReady(true);
            }
          })
          .catch((error) => {
            console.error("ROUTY post saved state load failed", error);
            if (isMounted) {
              setSaveErrorMessage("保存状態を取得できませんでした。");
            }
          })
          .finally(() => {
            if (isMounted) setIsSavedLoading(false);
          });

        const currentProfileResult = await currentRolePromise;
        let currentRole: ProfileRole = "user";

        if (
          currentProfileResult.error &&
          !isMissingRoleColumn(currentProfileResult.error)
        ) {
          console.error("ROUTY current user role load failed", currentProfileResult.error);
        } else if (!currentProfileResult.error) {
          currentRole = normalizeProfileRole(currentProfileResult.data?.role);
        }

        if (!isMounted) return;
        setCurrentUserRole(currentRole);

        if (!post.is_published && post.user_id !== currentUserId && currentRole !== "admin") {
          setDetail(null);
          setNotFound(true);
          return;
        }

        if (!post.is_published) {
          setDetail(initialDetail);
          setIsPostLoading(false);
          auxiliaryTasks.push(loadAuthor(), loadSchedule());
        }

        await Promise.allSettled([
          ...auxiliaryTasks,
          savedPromise,
        ]);
      } catch (error) {
        console.error("ROUTY post detail load failed", error);
        if (isMounted) {
          setDetail(null);
          setErrorMessage(getErrorMessage(error));
        }
      } finally {
        if (isMounted) {
          setIsPostLoading(false);
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

  async function handleSaveShareImage() {
    if (!detail || !userId || detail.post.user_id !== userId) {
      setSaveErrorMessage("シェア画像を保存できるのは投稿者本人のみです。");
      return;
    }

    setIsGeneratingShareImage(true);
    setSaveErrorMessage(null);

    try {
      const htmlToImagePromise = import("html-to-image");
      let shareImageElement = shareImageRef.current;

      for (let frame = 0; !shareImageElement && frame < 120; frame += 1) {
        await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
        shareImageElement = shareImageRef.current;
      }

      if (!shareImageElement) {
        throw new Error("シェア画像の生成準備ができていません。");
      }

      const { toPng } = await htmlToImagePromise;
      const dataUrl = await toPng(shareImageElement, {
        backgroundColor: "transparent",
        pixelRatio: 3,
        cacheBust: true,
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `routy-share-${detail.post.id}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("ROUTY share image generation failed", error);
      setSaveErrorMessage(
        "シェア画像の生成に失敗しました。時間をおいて再度お試しください。",
      );
    } finally {
      setIsGeneratingShareImage(false);
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
      <header className="sticky top-0 z-20 grid h-14 grid-cols-[112px_1fr_112px] items-center border-b border-[#D8F0DD] bg-white/95 px-2 backdrop-blur">
        <button
          type="button"
          onClick={handleBack}
          className="flex h-10 w-10 items-center justify-center rounded-full text-[#057A55] active:bg-[#F1FAF3]"
          aria-label="戻る"
        >
          <BackIcon />
        </button>
        <p className="text-center text-sm font-bold text-[#111827]">投稿詳細</p>
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={handleToggleSave}
            disabled={
              isPostLoading || isSavedLoading || !isSavedReady || isSaving || !detail
            }
            className={`flex h-10 w-10 items-center justify-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-50 ${
              isSaved
                ? "border-[#28B83F] bg-[#28B83F] text-white"
                : "border-[#D8F0DD] bg-white text-[#057A55] active:bg-[#F1FAF3]"
            }`}
            aria-label={isSaved ? "保存を解除" : "投稿を保存"}
          >
            <BookmarkIcon filled={isSaved} />
          </button>
          {isOwner ? (
            <button
              type="button"
              onClick={handleSaveShareImage}
              disabled={isGeneratingShareImage || isScheduleLoading}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#D8F0DD] bg-white text-[#057A55] transition active:bg-[#F1FAF3] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="シェア画像を保存"
            >
              <DownloadIcon />
            </button>
          ) : null}
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

      {isPostLoading ? (
        <PostDetailSkeleton />
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
              className="block"
              aria-label="投稿詳細スライド"
            >
              <OverviewSlide
                detail={detail}
                currentUserId={userId}
                isAuthorLoading={isAuthorLoading}
                isScheduleLoading={isScheduleLoading}
                activeIndex={activeIndex}
                onSelectSlide={goToSlide}
              />
              <TimelineSlide detail={detail} isLoading={isScheduleLoading} />
            </div>
          </section>
          {isOwner && isGeneratingShareImage ? (
            <div className="fixed top-0 left-[-10000px] h-[450px] w-[360px] overflow-hidden">
              <div ref={shareImageRef} className="h-[450px] w-[360px] bg-transparent">
                <SharePngTemplate
                  title={detail.post.title}
                  area={getShareAreaLabel(detail.post.area)}
                  infoChips={
                    [
                      getShareTransportLabel(detail.post.transport_type),
                      getShareDurationLabel(detail.scheduleItems),
                      getShareBudgetLabel(detail.post.budget),
                      getShareCompanionLabel(detail.post.companion_type),
                    ].filter(Boolean) as string[]
                  }
                  items={toRoutyDisplayScheduleItems(detail.scheduleItems).map(
                    (item) => ({
                      time: item.startTime ?? item.displayTime,
                      placeName: item.displayTitle,
                    }),
                  )}
                />
              </div>
            </div>
          ) : null}
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

function normalizeDisplayTitle(value: string | null | undefined) {
  return value?.replace(/[\s　]+/g, " ").trim() || "";
}

function OverviewSlide({ detail, currentUserId, isAuthorLoading, isScheduleLoading }: { detail: DetailState; currentUserId: string | null; isAuthorLoading: boolean; isScheduleLoading: boolean; activeIndex: number; onSelectSlide: (index: number) => void }) {
  const post = detail.post;
  const areaLabel = formatAreaLabel(post.area)?.replace(/\s*エリア$/u, "");
  const summaryLabels = [areaLabel, getTransportLabel(post.transport_type), getDurationLabel(detail.scheduleItems), getBudgetLabel(post.budget), getCompanionLabel(post.companion_type)].filter(Boolean) as string[];
  const caption = post.caption?.trim();
  const profileName = getProfileDisplayName(detail.profile);
  const profileUsername = detail.profile?.profile_completed ? detail.profile.username?.trim() || null : null;
  const hasPublicProfile = Boolean(profileUsername);
  return (
    <section className="w-full bg-[#FFFCF7] px-6 pb-2 pt-4">
      <div className="flex items-center justify-between gap-3">
        <Link href={`/users/${post.user_id}`} className="flex min-w-0 items-center gap-3">
          <div className="relative h-[clamp(52px,14vw,60px)] w-[clamp(52px,14vw,60px)] shrink-0 overflow-hidden rounded-full bg-zinc-900">
            {detail.profile?.avatar_url?.trim() ? <Image src={detail.profile.avatar_url.trim()} alt="プロフィール画像" fill unoptimized sizes="56px" className="object-cover" /> : <div className="flex h-full items-center justify-center text-lg font-bold text-white">{getProfileInitial(profileName)}</div>}
          </div>
          <div className="min-w-0"><p className="truncate text-[17px] font-bold text-zinc-900">{profileName}</p>{profileUsername ? <p className="truncate text-sm text-zinc-500">@{profileUsername}</p> : null}</div>
        </Link>
        {hasPublicProfile && currentUserId !== post.user_id ? <FollowButton targetUserId={post.user_id} currentUserId={currentUserId} /> : null}
      </div>
      <div className="mt-4 box-border w-full max-w-full">
        <h1 className="box-border w-full max-w-full whitespace-nowrap text-[clamp(18px,5.5vw,30px)] font-bold leading-[1.2] tracking-[-0.02em] text-zinc-900">{normalizeDisplayTitle(post.title)}</h1>
      </div>
      {caption ? <p className="mt-2 whitespace-pre-wrap text-[15px] leading-[1.6] text-zinc-700">{caption}</p> : null}
      {summaryLabels.length > 0 || isScheduleLoading ? <div className="mt-5 grid grid-cols-[1.25fr_1fr_1.2fr_1fr_.75fr] gap-1 overflow-hidden pb-1">{summaryLabels.map((label, index) => <SummaryPill key={`${index}-${label}`}>{label}</SummaryPill>)}{isScheduleLoading ? <span className="h-9 min-w-0 rounded-xl border border-zinc-100 bg-white" /> : null}</div> : null}
    </section>
  );
}
function TimelineSlide({
  detail,
  isLoading,
}: {
  detail: DetailState;
  isLoading: boolean;
}) {
  const post = detail.post;
  const areaLabel = formatAreaLabel(post.area);
  const displayScheduleItems = toRoutyDisplayScheduleItems(detail.scheduleItems);
  const titleLines = splitTitleByFullWidthSpace(post.title);

  return (
    <section className="w-full bg-white px-5 pb-[calc(110px+env(safe-area-inset-bottom))] pt-3">
      <div className="hidden">
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
          <p
            className={`text-sm font-semibold leading-5 text-zinc-950 ${
              titleLines ? "" : "line-clamp-2"
            }`}
          >
            {titleLines ? (
              <>
                <span className="block">{titleLines[0]}</span>
                <span className="block">{titleLines[1]}</span>
              </>
            ) : (
              post.title
            )}
          </p>
          {areaLabel ? (
            <p className="mt-1 truncate text-xs font-semibold text-emerald-700">
              {areaLabel}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-3 border-t border-zinc-100 pt-3">
        <h2 className="text-xl font-semibold text-zinc-950">タイムライン</h2>

        {isLoading ? (
          <div
            className="mt-6 animate-pulse space-y-7 motion-reduce:animate-none"
            role="status"
            aria-label="タイムラインを読み込み中"
          >
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="grid grid-cols-[16px_1fr] gap-3">
                <div className="mt-1.5 h-3.5 w-3.5 rounded-full bg-emerald-200" />
                <div className="space-y-2">
                  <div className="h-3 w-16 rounded-full bg-emerald-100" />
                  <div className="h-4 w-2/3 rounded-full bg-zinc-200" />
                  <div className="h-3 w-1/2 rounded-full bg-zinc-100" />
                </div>
              </div>
            ))}
          </div>
        ) : displayScheduleItems.length === 0 ? (
          <p className="mt-5 rounded-xl bg-zinc-50 px-4 py-5 text-sm font-medium text-zinc-500">
            スケジュールが登録されていません
          </p>
        ) : (
          <div className="relative mt-4 w-full min-w-0">
            <div className="absolute left-[7px] top-3 h-[calc(100%-24px)] w-px bg-emerald-200" />
            <div className="space-y-4">
              {displayScheduleItems.map((item) => (
                <TimelineItem
                  key={item.raw.id || `${item.raw.post_id}-${item.displayNumber}`}
                  item={item}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function TimelineItem({ item }: { item: RoutyDisplayScheduleItem<ScheduleItemRow> }) {
  const tags = parseRoutyDisplayTags(item.displaySubtitle);
  const timeParts = (item.displayTime?.replace(/\s+/g, " ").trim() || "--:--").split(/\s*[〜～-]\s*/);
  const startTime = timeParts[0] || "--:--";
  const endTime = timeParts[1] || "";
  const hasPhoto = Boolean(item.imageUrl);
  const hasNote = Boolean(item.displayNote?.trim());
  return (
    <article className="relative border-b border-dashed border-zinc-200 py-2 pl-5 last:border-b-0">
      <span aria-hidden="true" className="absolute left-0 top-2 h-3.5 w-3.5 rounded-full border-[3px] border-white bg-emerald-600" />
      <div className="grid w-full min-w-0 grid-cols-[72px_minmax(0,1fr)] gap-x-3">
        <div className="flex min-w-0 flex-col items-center pt-0.5 text-[clamp(11px,3.1vw,13px)] font-bold leading-5 tabular-nums text-emerald-700">
          <span className="whitespace-nowrap">{startTime}</span>
          {endTime ? <span aria-hidden="true" className="my-0.5 h-3 w-px bg-emerald-300" /> : null}
          {endTime ? <span className="whitespace-nowrap">{endTime}</span> : null}
        </div>
        <div className="min-w-0">
          <h3 className="break-words text-[16px] font-bold leading-6 text-zinc-950 [word-break:normal]">{item.displayTitle || "スポット未設定"}</h3>
          {tags.length > 0 ? <div className="mt-1 flex flex-wrap gap-1">{tags.slice(0, 3).map((tag) => <span key={tag} className="whitespace-nowrap rounded-md bg-emerald-50 px-1.5 py-0.5 text-[clamp(8px,2.3vw,10px)] font-semibold text-emerald-800">{tag}</span>)}</div> : null}
          {hasPhoto && hasNote ? (
            <div className="mt-2 grid w-full min-w-0 grid-cols-[clamp(112px,36vw,145px)_minmax(0,1fr)] items-start gap-2.5">
              <div className="w-full min-w-0 shrink-0"><TimelinePhoto imageUrl={item.imageUrl!} title={item.displayTitle || item.contentName} /></div>
              <p className="relative w-full min-w-0 rounded-[16px] border border-[#e7dfd2] bg-[#f7f2e9] px-3 py-2.5 whitespace-pre-wrap break-normal text-[clamp(10px,3vw,12px)] leading-[1.5] text-zinc-600 shadow-sm before:absolute before:left-[-7px] before:top-5 before:h-3 before:w-3 before:rotate-45 before:border-b before:border-l before:border-[#e7dfd2] before:bg-[#f7f2e9] [overflow-wrap:normal] [word-break:normal]">{item.displayNote}</p>
            </div>
          ) : hasPhoto ? (
            <div className="mt-2 w-[clamp(112px,36vw,145px)]"><TimelinePhoto imageUrl={item.imageUrl!} title={item.displayTitle || item.contentName} /></div>
          ) : hasNote ? (
            <p className="relative mt-2 w-full min-w-0 rounded-[16px] border border-[#e7dfd2] bg-[#f7f2e9] px-3 py-2.5 whitespace-pre-wrap break-normal text-[clamp(10px,3vw,12px)] leading-[1.5] text-zinc-600 shadow-sm [overflow-wrap:normal] [word-break:normal]">{item.displayNote}</p>
          ) : null}
        </div>
      </div>

    </article>
  );
}

function TimelinePhoto({ imageUrl, title }: { imageUrl: string; title: string }) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className="relative h-[104px] w-[104px] overflow-hidden rounded-xl bg-zinc-100" onClick={() => setOpen(true)} aria-label="写真を拡大"><Image src={imageUrl} alt={`${title}の写真`} fill unoptimized sizes="104px" className="object-cover" /></button>
    {open ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" role="dialog" aria-modal="true" onClick={() => setOpen(false)}><Image src={imageUrl} alt={`${title}の写真`} width={1200} height={900} unoptimized className="max-h-[90vh] w-auto max-w-full rounded-lg object-contain" onClick={(event) => event.stopPropagation()} /><button type="button" className="absolute right-4 top-4 h-11 w-11 rounded-full bg-white text-xl" onClick={() => setOpen(false)} aria-label="閉じる">×</button></div> : null}
  </>;
}
