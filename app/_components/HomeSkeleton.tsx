const skeletonCards = Array.from({ length: 6 }, (_, index) => index);

function PostCardSkeleton() {
  return (
    <article
      className="min-w-0 overflow-hidden rounded-2xl border border-[#D8F0DD] bg-white shadow-[0_8px_22px_rgba(17,24,39,0.06)]"
      aria-hidden="true"
    >
      <div className="aspect-[16/10] w-full bg-[#EEF7F0]" />

      <div className="p-3">
        <div className="min-h-[38px] space-y-2 py-0.5">
          <div className="h-3.5 w-11/12 rounded-full bg-zinc-200/80" />
          <div className="h-3.5 w-3/4 rounded-full bg-zinc-200/80" />
        </div>

        <div className="mt-1.5 flex h-4 items-center gap-1">
          <div className="h-2.5 w-2.5 rounded-full bg-[#D8F0DD]" />
          <div className="h-2.5 w-2/3 rounded-full bg-[#D8F0DD]" />
        </div>

        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="h-[18px] rounded-full border border-[#D8F0DD] bg-[#F1FAF3]"
            />
          ))}
        </div>
      </div>
    </article>
  );
}

export function HomeSkeleton() {
  return (
    <div
      className="grid animate-pulse grid-cols-2 gap-3 px-4 py-4 pb-[calc(9rem+env(safe-area-inset-bottom))] motion-reduce:animate-none"
      role="status"
      aria-label="投稿を読み込み中"
    >
      {skeletonCards.map((index) => (
        <PostCardSkeleton key={index} />
      ))}
      <span className="sr-only">投稿を読み込んでいます</span>
    </div>
  );
}
