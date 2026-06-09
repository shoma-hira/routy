import Link from "next/link";
import Image from "next/image";
import type { RoutyPost } from "../_data/posts";

export function PostCard({ post }: { post: RoutyPost }) {
  return (
    <article className="min-w-0 w-full overflow-hidden rounded-xl border border-zinc-100 bg-white">
      <Link href={`/posts/${post.id}`} className="block w-full">
        <div className="relative aspect-square w-full overflow-hidden bg-zinc-100">
          <Image
            src={post.coverImage}
            alt={`${post.title}の表紙画像`}
            fill
            unoptimized
            sizes="calc((min(100vw, 430px) - 44px) / 2)"
            className="object-cover"
          />
        </div>
      </Link>
      <div className="flex items-start gap-2 p-2.5">
        <Link href={`/posts/${post.id}`} className="min-w-0 flex-1">
          <h2 className="line-clamp-2 text-[12px] font-semibold leading-[1.45] text-zinc-950">
            {post.title}
          </h2>
          <p className="mt-1 truncate text-[11px] leading-4 text-zinc-500">
            {post.author}
          </p>
        </Link>
        <button
          type="button"
          aria-label="投稿を保存"
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs ${
            post.saved
              ? "border-zinc-950 bg-zinc-950 text-white"
              : "border-zinc-200 bg-white text-zinc-700"
          }`}
        >
          {post.saved ? "●" : "○"}
        </button>
      </div>
    </article>
  );
}
