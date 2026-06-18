"use client";

import Image from "next/image";
import Link from "next/link";

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

function InfoPill({ children }: { children: string }) {
  return (
    <span className="min-w-0 truncate rounded-md bg-zinc-100 px-1.5 py-1 text-[10px] font-semibold leading-none text-zinc-700">
      {children}
    </span>
  );
}

export function PostCard({
  post,
  onToggleSave,
}: {
  post: PostCardPost;
  onToggleSave?: (postId: string) => void;
}) {
  const isSaved = Boolean(post.saved);
  const detailHref = `/posts/${post.id}`;
  const secondaryLabels = [post.budgetLabel, post.companionLabel].filter(
    Boolean,
  ) as string[];

  return (
    <article className="relative min-w-0 overflow-hidden rounded-xl border border-zinc-100 bg-white shadow-sm">
      <Link href={detailHref} className="block">
        <div className="relative aspect-square w-full overflow-hidden bg-zinc-100">
          {post.coverImage ? (
            <Image
              src={post.coverImage}
              alt={`${post.title}のサムネイル画像`}
              fill
              unoptimized
              sizes="calc((min(100vw, 430px) - 44px) / 2)"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-zinc-100 px-3 text-center text-[11px] font-semibold leading-5 text-zinc-400">
              画像未設定
            </div>
          )}
        </div>
      </Link>

      <button
        type="button"
        onClick={() => onToggleSave?.(post.id)}
        disabled={post.isSaving || !onToggleSave}
        aria-label={isSaved ? "保存を解除" : "投稿を保存"}
        className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border text-xs shadow-sm ${
          isSaved
            ? "border-zinc-950 bg-zinc-950 text-white"
            : "border-white/80 bg-white/95 text-zinc-700"
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {isSaved ? "●" : "○"}
      </button>

      <Link href={detailHref} className="block p-2.5">
        <h2 className="line-clamp-2 min-h-[34px] text-[12px] font-semibold leading-[1.45] text-zinc-950">
          {post.title}
        </h2>
        {post.area ? (
          <p className="mt-1 truncate text-[11px] font-medium leading-4 text-zinc-500">
            {post.area}
          </p>
        ) : null}

        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {post.transportLabel ? <InfoPill>{post.transportLabel}</InfoPill> : null}
          <InfoPill>{post.durationLabel || "時間未設定"}</InfoPill>
          {secondaryLabels.map((label) => (
            <InfoPill key={label}>{label}</InfoPill>
          ))}
        </div>
      </Link>
    </article>
  );
}
