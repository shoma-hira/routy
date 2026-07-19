"use client";

import Image from "next/image";
import Link from "next/link";
import { formatAreaLabel } from "@/lib/area";

export type PostCardPost = {
  id: string;
  title: string;
  author: string;
  area?: string | null;
  transportLabel?: string | null;
  durationLabel?: string | null;
  budgetLabel?: string | null;
  companionLabel?: string | null;
  coverImage?: string | null;
  saved?: boolean;
  isSaving?: boolean;
};

type PostCardVariant = "default" | "home";

function InfoPill({
  children,
  variant = "default",
}: {
  children: string;
  variant?: PostCardVariant;
}) {
  const className =
    variant === "home"
      ? "min-w-0 truncate rounded-full border border-[#D8F0DD] bg-[#F1FAF3] px-2 py-1 text-[10px] font-semibold leading-none text-[#057A55]"
      : "min-w-0 truncate rounded-md bg-zinc-100 px-1.5 py-1 text-[10px] font-semibold leading-none text-zinc-700";

  return <span className={className}>{children}</span>;
}

export function PostCard({
  post,
  onToggleSave,
  variant = "default",
}: {
  post: PostCardPost;
  onToggleSave?: (postId: string) => void;
  variant?: PostCardVariant;
}) {
  const isSaved = Boolean(post.saved);
  const detailHref = `/posts/${post.id}`;
  const areaLabel = formatAreaLabel(post.area);
  const secondaryLabels = [post.budgetLabel, post.companionLabel].filter(
    Boolean,
  ) as string[];
  const infoLabels = [
    post.transportLabel,
    post.durationLabel || "時間未設定",
    ...secondaryLabels,
  ].filter(Boolean) as string[];
  const isHome = variant === "home";

  return (
    <article
      className={
        isHome
          ? "relative min-w-0 overflow-hidden rounded-2xl border border-[#D8F0DD] bg-white shadow-[0_8px_24px_rgba(17,24,39,0.06)]"
          : "relative min-w-0 overflow-hidden rounded-xl border border-zinc-100 bg-white shadow-sm"
      }
    >
      <Link href={detailHref} className="block">
        <div
          className={
            isHome
              ? "relative aspect-[16/10] w-full overflow-hidden bg-[#F1FAF3]"
              : "relative aspect-square w-full overflow-hidden bg-zinc-100"
          }
        >
          {post.coverImage ? (
            <Image
              src={post.coverImage}
              alt={`${post.title}のサムネイル画像`}
              fill
              unoptimized
              loading="lazy"
              sizes="calc((min(100vw, 430px) - 44px) / 2)"
              className="object-cover"
            />
          ) : (
            <div
              className={
                isHome
                  ? "flex h-full w-full items-center justify-center bg-[#F1FAF3] px-3 text-center text-[11px] font-semibold leading-5 text-[#6B7280]"
                  : "flex h-full w-full items-center justify-center bg-zinc-100 px-3 text-center text-[11px] font-semibold leading-5 text-zinc-400"
              }
            >
              画像未設定
            </div>
          )}
        </div>
      </Link>

      {onToggleSave && !isHome ? (
        <button
          type="button"
          onClick={() => onToggleSave(post.id)}
          disabled={post.isSaving}
          aria-label={isSaved ? "保存を解除" : "投稿を保存"}
          className={`absolute ${
            isHome ? "bottom-3 right-3 h-8 w-8" : "right-2 top-2 h-7 w-7"
          } flex items-center justify-center rounded-full border text-sm shadow-sm transition ${
            isSaved
              ? "border-[#28B83F] bg-[#28B83F] text-white"
              : "border-white/90 bg-white/95 text-[#057A55]"
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {isSaved ? "★" : "☆"}
        </button>
      ) : null}

      <Link href={detailHref} className={isHome ? "block p-3 pb-12" : "block p-2.5"}>
        <h2
          className={
            isHome
              ? "line-clamp-2 min-h-[38px] text-[13px] font-bold leading-[1.45] text-[#111827]"
              : "line-clamp-2 min-h-[34px] text-[12px] font-semibold leading-[1.45] text-zinc-950"
          }
        >
          {post.title}
        </h2>
        {areaLabel ? (
          <p
            className={
              isHome
                ? "mt-1.5 flex min-w-0 items-center gap-1 truncate text-[11px] font-semibold leading-4 text-[#057A55]"
                : "mt-1 truncate text-[11px] font-medium leading-4 text-zinc-500"
            }
          >
            <span className="truncate">{areaLabel}</span>
          </p>
        ) : null}

        <div className={isHome ? "mt-2 flex flex-wrap gap-1.5" : "mt-2 grid grid-cols-2 gap-1.5"}>
          {infoLabels.map((label) => (
            <InfoPill key={label} variant={variant}>
              {label}
            </InfoPill>
          ))}
        </div>
      </Link>
    </article>
  );
}
