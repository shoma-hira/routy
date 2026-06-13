"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "../../_components/AppShell";
import { posts as mockPosts } from "../../_data/posts";
import { supabase } from "@/lib/supabase";
import {
  getCurrentUserId,
  getReadableSupabaseError,
  isPostSaved,
  toggleSavedPost,
} from "@/lib/savedPosts";

const fallbackCoverImage = mockPosts[0]?.coverImage ?? "/globe.svg";
const slideCount = 3;

type PostRow = {
  id: string;
  user_id: string;
  title: string;
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
  id: string;
  post_id: string;
  sort_order: number | null;
  time: string | null;
  spot_name: string | null;
  stay_duration: string | null;
  comment: string | null;
  image_url: string | null;
};

type DetailState = {
  post: PostRow;
  profile: ProfileRow | null;
  scheduleItems: ScheduleItemRow[];
};

function getErrorMessage(error: unknown) {
  return getReadableSupabaseError(error, "投稿詳細の取得に失敗しました。");
}

function getTypeLabel(type: string | null) {
  return type === "actual" ? "実績" : "予定";
}

function getAuthorName(profile: ProfileRow | null) {
  return profile?.display_name?.trim() || "ROUTY User";
}

function getCaption() {
  return "キャプションはありません";
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
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
  const [notFound, setNotFound] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const isOwner = Boolean(userId && detail?.post.user_id === userId);

  useEffect(() => {
    let isMounted = true;

    async function loadDetail() {
      setIsLoading(true);
      setErrorMessage(null);
      setNotFound(false);

      try {
        const currentUserId = await getCurrentUserId();
        const { data: post, error: postError } = await supabase
          .from("posts")
          .select("id,user_id,title,cover_image_url,type,is_published,created_at")
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

        if (!post.is_published && post.user_id !== currentUserId) {
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
              "id,post_id,sort_order,time,spot_name,stay_duration,comment,image_url",
            )
            .eq("post_id", post.id)
            .order("sort_order", { ascending: true }),
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
          scheduleItems: (scheduleResult.data ?? []) as ScheduleItemRow[],
        };
        const nextIsSaved = await isPostSaved(currentUserId, post.id);

        console.log("ROUTY post detail loaded", {
          postId: post.id,
          scheduleItemCount: nextDetail.scheduleItems.length,
        });

        if (isMounted) {
          setUserId(currentUserId);
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
    if (!userId || !detail || !isOwner) {
      setSaveErrorMessage("この投稿を削除する権限がありません。");
      return;
    }

    const confirmed = window.confirm(
      "この投稿を削除しますか？この操作は取り消せません。",
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
        .eq("user_id", userId)
        .select("id")
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data?.id) {
        throw new Error("この投稿を削除する権限がありません。");
      }

      console.log("ROUTY delete post success", { postId: detail.post.id });
      router.push("/mypage");
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
          {isOwner ? (
            <>
              <Link
                href={`/bookmarks/${postId}/edit`}
                className="text-sm font-semibold text-zinc-950"
              >
                編集
              </Link>
              <button
                type="button"
                onClick={handleDeletePost}
                disabled={isDeleting}
                className="text-sm font-semibold text-red-600 disabled:cursor-not-allowed disabled:text-zinc-400"
              >
                {isDeleting ? "削除中..." : "削除"}
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
            ★
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
              className="flex touch-pan-x snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              aria-label="投稿詳細スライド"
            >
              <CoverSlide detail={detail} />
              <ScheduleSlide
                title="予定スケジュール"
                page="2/3"
                items={detail.scheduleItems}
                emptyMessage="予定スケジュールはまだありません"
              />
              <ScheduleSlide
                title="実績スケジュール"
                page="3/3"
                items={[]}
                emptyMessage="実績スケジュールはまだありません"
              />
            </div>

            <button
              type="button"
              onClick={() => goToSlide(activeIndex - 1)}
              disabled={activeIndex === 0}
              aria-label="前のスライド"
              className="absolute left-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-lg font-semibold text-zinc-950 shadow-sm disabled:hidden"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => goToSlide(activeIndex + 1)}
              disabled={activeIndex === slideCount - 1}
              aria-label="次のスライド"
              className="absolute right-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-lg font-semibold text-zinc-950 shadow-sm disabled:hidden"
            >
              ›
            </button>

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

          <CaptionSection detail={detail} />
        </article>
      )}
    </AppShell>
  );
}

function CoverSlide({ detail }: { detail: DetailState }) {
  return (
    <div className="relative h-[520px] w-full min-w-full shrink-0 snap-center overflow-hidden bg-zinc-100">
      <Image
        src={detail.post.cover_image_url?.trim() || fallbackCoverImage}
        alt={`${detail.post.title}の表紙画像`}
        fill
        unoptimized
        priority
        sizes="min(100vw, 430px)"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/5 to-black/65" />
      <div className="absolute right-4 top-4">
        <span className="rounded-full bg-black/45 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
          1/3
        </span>
      </div>
      <div className="absolute bottom-5 left-4 right-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-zinc-950">
            {getTypeLabel(detail.post.type)}
          </span>
          <span className="text-xs font-semibold text-white drop-shadow">
            {getAuthorName(detail.profile)}
          </span>
        </div>
        <h1 className="text-2xl font-semibold leading-8 text-white drop-shadow">
          {detail.post.title}
        </h1>
      </div>
    </div>
  );
}

function ScheduleSlide({
  title,
  page,
  items,
  emptyMessage,
}: {
  title: string;
  page: string;
  items: ScheduleItemRow[];
  emptyMessage: string;
}) {
  return (
    <div className="h-[520px] w-full min-w-full shrink-0 snap-center overflow-y-auto overscroll-contain bg-white px-5 py-5">
      <div className="mb-7 flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-zinc-950">{title}</h2>
        <span className="shrink-0 rounded-full bg-zinc-900 px-2.5 py-1 text-xs font-semibold text-white">
          {page}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="rounded-2xl bg-zinc-50 px-4 py-5 text-sm font-medium text-zinc-500">
          {emptyMessage}
        </p>
      ) : (
        <div className="relative">
          <div className="absolute left-[7px] top-3 h-[calc(100%-24px)] w-px bg-zinc-200" />
          <div className="space-y-7">
            {items.map((item, index) => (
              <TimelineItem key={item.id || `${item.post_id}-${index}`} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TimelineItem({ item }: { item: ScheduleItemRow }) {
  return (
    <div className="grid grid-cols-[16px_58px_1fr] gap-3">
      <div className="relative pt-1.5">
        <span className="relative z-10 block h-3.5 w-3.5 rounded-full border-[3px] border-white bg-zinc-900 shadow-[0_0_0_1px_rgba(24,24,27,0.18)]" />
      </div>

      <p className="pt-0.5 text-sm font-semibold leading-6 text-zinc-700">
        {item.time || "--:--"}
      </p>

      <div className="min-w-0 rounded-2xl bg-zinc-50 px-4 py-3">
        <h3 className="text-base font-semibold leading-6 text-zinc-950">
          {item.spot_name || "スポット未設定"}
        </h3>
        {item.stay_duration ? (
          <p className="mt-1 text-sm font-medium text-zinc-500">
            {item.stay_duration}
          </p>
        ) : null}
        {item.comment ? (
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
            {item.comment}
          </p>
        ) : null}
        {item.image_url?.trim() ? (
          <div className="relative mt-4 aspect-[4/3] overflow-hidden rounded-xl bg-zinc-100">
            <Image
              src={item.image_url.trim()}
              alt={`${item.spot_name || "スケジュール"}の写真`}
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

function CaptionSection({ detail }: { detail: DetailState }) {
  const caption = getCaption();
  const postedAt = formatDate(detail.post.created_at);

  return (
    <section className="border-t border-zinc-100 px-5 py-5">
      <p className="text-sm leading-6 text-zinc-800">
        <span className="font-semibold text-zinc-950">
          {getAuthorName(detail.profile)}
        </span>{" "}
        {caption}
      </p>
      {postedAt ? <p className="mt-4 text-xs text-zinc-400">{postedAt}</p> : null}
    </section>
  );
}
