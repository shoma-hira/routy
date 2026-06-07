export function BookmarkForm({ mode }: { mode: "create" | "edit" }) {
  const isEdit = mode === "edit";

  return (
    <form className="space-y-6">
      <label className="block">
        <span className="text-sm font-medium text-zinc-800">タイトル</span>
        <input
          defaultValue={isEdit ? "鎌倉、朝から海まで歩く半日ルート" : ""}
          placeholder="例: 週末の鎌倉半日ルート"
          className="mt-2 h-12 w-full rounded-md border border-zinc-200 px-4 text-base outline-none focus:border-zinc-900"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-zinc-800">予定/実績</span>
        <select
          defaultValue={isEdit ? "実績" : "予定"}
          className="mt-2 h-12 w-full rounded-md border border-zinc-200 bg-white px-4 text-base outline-none focus:border-zinc-900"
        >
          <option>予定</option>
          <option>実績</option>
        </select>
      </label>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900">
            タイムスケジュール
          </h2>
          <button
            type="button"
            className="h-9 rounded-md border border-zinc-200 px-3 text-sm font-medium"
          >
            追加
          </button>
        </div>
        {[0, 1].map((item) => (
          <section key={item} className="space-y-3 rounded-md bg-zinc-50 p-4">
            <div className="grid grid-cols-[92px_1fr] gap-3">
              <input
                defaultValue={isEdit && item === 0 ? "09:00" : ""}
                placeholder="時間"
                className="h-11 rounded-md border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-900"
              />
              <input
                defaultValue={isEdit && item === 0 ? "鎌倉駅" : ""}
                placeholder="スポット名"
                className="h-11 rounded-md border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-900"
              />
            </div>
            <input
              defaultValue={isEdit && item === 0 ? "15分" : ""}
              placeholder="滞在時間"
              className="h-11 w-full rounded-md border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-900"
            />
            <textarea
              defaultValue={
                isEdit && item === 0
                  ? "駅前でコーヒーを買って出発。朝は人が少なく歩きやすい。"
                  : ""
              }
              placeholder="コメント"
              rows={3}
              className="w-full resize-none rounded-md border border-zinc-200 p-3 text-sm outline-none focus:border-zinc-900"
            />
            <button
              type="button"
              className="h-11 w-full rounded-md border border-dashed border-zinc-300 text-sm font-medium text-zinc-500"
            >
              写真を追加
            </button>
          </section>
        ))}
      </div>

      <button
        type="button"
        className="h-12 w-full rounded-md bg-zinc-950 text-base font-semibold text-white"
      >
        {isEdit ? "変更を保存" : "しおりを作成"}
      </button>
    </form>
  );
}
