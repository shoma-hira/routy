import Link from "next/link";
import { AppShell } from "../../_components/AppShell";
import { CaptionSection } from "../../_components/CaptionSection";
import { PostDetailCarousel } from "../../_components/PostDetailCarousel";
import { getPostDetail, posts } from "../../_data/posts";

export async function generateStaticParams() {
  return posts.map((post) => ({ id: post.id }));
}

export default async function PostDetailPage(props: PageProps<"/posts/[id]">) {
  const { id } = await props.params;
  const post = getPostDetail(id);

  return (
    <AppShell>
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-zinc-100 bg-white/95 px-5 backdrop-blur">
        <Link href="/home" className="text-sm font-medium text-zinc-600">
          戻る
        </Link>
        <Link
          href={`/bookmarks/${post.id}/edit`}
          className="text-sm font-semibold text-zinc-950"
        >
          編集
        </Link>
      </header>

      <article className="bg-white">
        <PostDetailCarousel post={post} />
        <CaptionSection post={post} />
      </article>
    </AppShell>
  );
}
