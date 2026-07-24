const cards = Array.from({ length: 3 }, (_, index) => index);

function FeedCardSkeleton() {
  return (
    <article className="overflow-hidden rounded-[20px] border border-[#D8F0DD] bg-white shadow-[0_8px_22px_rgba(17,24,39,0.06)]">
      <div className="relative">
        <div className="grid aspect-[16/9] grid-cols-[3fr_2fr] gap-0.5 bg-white">
          <div className="bg-[#EAF4EC]" />
          <div className="grid grid-rows-2 gap-0.5">
            <div className="bg-[#EAF4EC]" />
            <div className="bg-[#EAF4EC]" />
          </div>
        </div>
        <div className="absolute left-2.5 top-2.5 flex h-9 w-28 items-center gap-2">
          <div className="h-7 w-7 shrink-0 rounded-full bg-white/60 ring-1 ring-white" />
          <div className="h-2.5 w-14 rounded-full bg-white/65" />
        </div>
        <div className="absolute right-2.5 top-2.5 flex h-11 w-11 items-center justify-center">
          <div className="h-5 w-4 border-x-2 border-t-2 border-white/60" />
        </div>
      </div>

      <div className="px-3.5 pb-3 pt-2.5">
        <div className="h-4 w-4/5 rounded-full bg-[#DDE7DF]" />
        <div className="mt-2 flex gap-3">
          <div className="h-3 w-24 rounded-full bg-[#E8EEE9]" />
          <div className="h-3 w-20 rounded-full bg-[#E8EEE9]" />
        </div>
        <div className="mt-2 flex h-5 gap-1.5">
          <div className="h-5 w-14 rounded-full bg-[#EAF4EC]" />
          <div className="h-5 w-16 rounded-full bg-[#EAF4EC]" />
          <div className="h-5 w-12 rounded-full bg-[#EAF4EC]" />
        </div>
      </div>
    </article>
  );
}

export function HomeSkeleton() {
  return (
    <div
      className="animate-pulse space-y-4 px-4 py-5 pb-[calc(2rem+env(safe-area-inset-bottom))] motion-reduce:animate-none"
      role="status"
      aria-label="ホームを読み込み中"
    >
      {cards.map((index) => (
        <FeedCardSkeleton key={index} />
      ))}
      <span className="sr-only">ホームを読み込んでいます</span>
    </div>
  );
}
