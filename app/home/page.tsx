import { AppShell } from "../_components/AppShell";
import { PostCard } from "../_components/PostCard";
import { posts } from "../_data/posts";

const tags = ["#カフェ巡り", "#週末旅", "#絶景", "#ランチ"];

export default function HomePage() {
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

      <div className="grid grid-cols-2 gap-3 px-4 py-4 pb-28">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </AppShell>
  );
}
