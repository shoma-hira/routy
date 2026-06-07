import type { RoutyPostDetail } from "../_data/posts";

export function CaptionSection({ post }: { post: RoutyPostDetail }) {
  return (
    <section className="border-t border-zinc-100 px-5 py-5">
      <p className="text-sm leading-6 text-zinc-800">
        <span className="font-semibold text-zinc-950">{post.userName}</span>{" "}
        {post.caption}
      </p>
      <div className="mt-3 flex flex-wrap gap-x-2 gap-y-1">
        {post.hashtags.map((tag) => (
          <span key={tag} className="text-sm font-medium text-zinc-600">
            {tag}
          </span>
        ))}
      </div>
      <p className="mt-4 text-xs text-zinc-400">{post.postedAt}</p>
    </section>
  );
}
