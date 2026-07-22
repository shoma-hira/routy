export function PostDetailSkeleton() {
  return (
    <div
      className="animate-pulse bg-white pb-28 motion-reduce:animate-none"
      role="status"
      aria-label="投稿詳細を読み込み中"
    >
      <div className="aspect-[4/3] w-full bg-[#EEF7F0]" />
      <div className="px-5 pb-8 pt-6">
        <div className="h-6 w-11/12 rounded-full bg-zinc-200/80" />
        <div className="mt-3 h-6 w-3/4 rounded-full bg-zinc-200/80" />
        <div className="mt-4 flex gap-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-7 w-16 rounded-full bg-[#EEF7F0]" />
          ))}
        </div>
        <div className="mt-6 flex items-center gap-3 border-t border-zinc-100 pt-5">
          <div className="h-11 w-11 rounded-full bg-zinc-200/80" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-28 rounded-full bg-zinc-200/80" />
            <div className="h-3 w-20 rounded-full bg-zinc-100" />
          </div>
        </div>
        <div className="mt-7 space-y-5 border-t border-zinc-100 pt-6">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="flex gap-3">
              <div className="h-3.5 w-3.5 rounded-full bg-emerald-200" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-16 rounded-full bg-emerald-100" />
                <div className="h-4 w-2/3 rounded-full bg-zinc-200/80" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">投稿詳細を読み込んでいます</span>
    </div>
  );
}
