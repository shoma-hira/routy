import Link from "next/link";
import Image from "next/image";
import { AppShell } from "../_components/AppShell";
import { LogoutButton } from "../_components/LogoutButton";
import { myPosts, savedPosts, type RoutyPost } from "../_data/posts";

function CompactPost({ post }: { post: RoutyPost }) {
  return (
    <Link href={`/posts/${post.id}`} className="grid grid-cols-[84px_1fr] gap-4">
      <div className="relative aspect-square overflow-hidden rounded-md bg-zinc-100">
        <Image
          src={post.coverImage}
          alt={`${post.title}の表紙画像`}
          fill
          unoptimized
          sizes="84px"
          className="object-cover"
        />
      </div>
      <div className="min-w-0 py-1">
        <p className="line-clamp-2 text-[15px] font-semibold leading-6">
          {post.title}
        </p>
        <p className="mt-1 text-sm text-zinc-500">{post.author}</p>
      </div>
    </Link>
  );
}

export default function MyPage() {
  return (
    <AppShell>
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-100 bg-white/95 px-5 py-4 backdrop-blur">
        <h1 className="text-xl font-semibold">マイページ</h1>
        <LogoutButton />
      </header>

      <div className="px-5 py-6">
        <section className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-950 text-xl font-semibold text-white">
            R
          </div>
          <div>
            <h2 className="text-lg font-semibold">Routy User</h2>
            <p className="text-sm text-zinc-500">投稿 {myPosts.length}件</p>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="mb-4 text-base font-semibold">自分の投稿</h2>
          <div className="space-y-5">
            {myPosts.map((post) => (
              <CompactPost key={post.id} post={post} />
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="mb-4 text-base font-semibold">保存した投稿</h2>
          <div className="space-y-5">
            {savedPosts.map((post) => (
              <CompactPost key={post.id} post={post} />
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
