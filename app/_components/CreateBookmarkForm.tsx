"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type ScheduleContent = {
  contentName: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  comment: string;
};

export type BookmarkFormValue = {
  title: string;
  plannedSchedule: ScheduleContent[];
  actualSchedule: ScheduleContent[];
};

type ScheduleKind = "planned" | "actual";
type TimeField = "startTime" | "endTime";

const emptyContent = (): ScheduleContent => ({
  contentName: "",
  startDate: "",
  startTime: "",
  endDate: "",
  endTime: "",
  comment: "",
});

const hourOptions = Array.from({ length: 24 }, (_, index) =>
  String(index).padStart(2, "0"),
);

const minuteOptions = Array.from({ length: 60 }, (_, index) =>
  String(index).padStart(2, "0"),
);

export function CreateBookmarkForm({
  mode = "create",
  initialValue,
  returnHref = "/home",
}: {
  mode?: "create" | "edit";
  initialValue?: BookmarkFormValue;
  returnHref?: string;
}) {
  const router = useRouter();
  const isEdit = mode === "edit";
  const [title, setTitle] = useState(initialValue?.title ?? "");
  const [activeKind, setActiveKind] = useState<ScheduleKind>("planned");
  const [plannedSchedule, setPlannedSchedule] = useState<ScheduleContent[]>(
    initialValue?.plannedSchedule?.length
      ? initialValue.plannedSchedule
      : [emptyContent()],
  );
  const [actualSchedule, setActualSchedule] = useState<ScheduleContent[]>(
    initialValue?.actualSchedule ?? [],
  );

  const activeSchedule =
    activeKind === "planned" ? plannedSchedule : actualSchedule;
  const activeLabel = activeKind === "planned" ? "予定" : "実績";

  const postValue = useMemo<BookmarkFormValue>(
    () => ({
      title,
      plannedSchedule,
      actualSchedule,
    }),
    [actualSchedule, plannedSchedule, title],
  );

  function setScheduleForKind(
    kind: ScheduleKind,
    updater: (items: ScheduleContent[]) => ScheduleContent[],
  ) {
    if (kind === "planned") {
      setPlannedSchedule((items) => updater(items));
      return;
    }

    setActualSchedule((items) => updater(items));
  }

  function switchKind(kind: ScheduleKind) {
    setActiveKind(kind);
    if (kind === "actual" && actualSchedule.length === 0) {
      setActualSchedule([emptyContent()]);
    }
  }

  function updateContent(
    index: number,
    field: keyof ScheduleContent,
    value: string,
  ) {
    setScheduleForKind(activeKind, (items) =>
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  }

  function addContent() {
    setScheduleForKind(activeKind, (items) => [...items, emptyContent()]);
  }

  function removeContent(index: number) {
    setScheduleForKind(activeKind, (items) => {
      const nextItems = items.filter((_, itemIndex) => itemIndex !== index);
      return nextItems.length > 0 ? nextItems : [emptyContent()];
    });
  }

  function handleSubmit() {
    console.log(isEdit ? "ROUTY update post" : "ROUTY create post", postValue);
    if (isEdit) {
      router.push(returnHref);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-zinc-100 bg-white/95 px-4 backdrop-blur">
        <Link href={returnHref} className="text-sm font-medium text-zinc-600">
          {isEdit ? "戻る" : "閉じる"}
        </Link>
        <h1 className="text-base font-semibold text-zinc-950">
          {isEdit ? "しおり編集" : "しおり作成"}
        </h1>
        <button
          type="button"
          onClick={handleSubmit}
          className="text-sm font-semibold text-zinc-950"
        >
          {isEdit ? "保存" : "投稿"}
        </button>
      </header>

      <div className="space-y-5 px-4 py-5 pb-28">
        <section>
          <label className="block">
            <span className="text-sm font-semibold text-zinc-900">
              タイトル
            </span>
            <input
              name="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="自由が丘でのんびり過ごす休日"
              className="mt-2 h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-base outline-none placeholder:text-zinc-400 focus:border-zinc-900"
            />
          </label>
        </section>

        <section>
          <p className="mb-2 text-sm font-semibold text-zinc-900">
            予定 / 実績
          </p>
          <div className="grid grid-cols-2 rounded-xl bg-zinc-200/70 p-1">
            {[
              ["planned", "予定"],
              ["actual", "実績"],
            ].map(([kind, label]) => (
              <button
                key={kind}
                type="button"
                onClick={() => switchKind(kind as ScheduleKind)}
                className={`h-10 rounded-lg text-sm font-semibold transition ${
                  activeKind === kind
                    ? "bg-white text-zinc-950 shadow-sm"
                    : "text-zinc-500"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-zinc-900">
                タイムスケジュール
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {activeLabel}の内容を入力中
              </p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-zinc-500 ring-1 ring-zinc-200">
              {activeSchedule.length}件
            </span>
          </div>

          {activeSchedule.map((item, index) => (
            <ScheduleContentCard
              key={`${activeKind}-${index}`}
              item={item}
              index={index}
              onChange={updateContent}
              onRemove={removeContent}
            />
          ))}
        </section>

        <button
          type="button"
          onClick={addContent}
          className="h-12 w-full rounded-xl border border-dashed border-zinc-300 bg-white text-sm font-semibold text-zinc-700"
        >
          コンテンツを追加
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          className="h-12 w-full rounded-xl bg-zinc-950 text-base font-semibold text-white"
        >
          {isEdit ? "保存する" : "投稿する"}
        </button>
      </div>
    </div>
  );
}

function ScheduleContentCard({
  item,
  index,
  onChange,
  onRemove,
}: {
  item: ScheduleContent;
  index: number;
  onChange: (index: number, field: keyof ScheduleContent, value: string) => void;
  onRemove: (index: number) => void;
}) {
  const [openTimeField, setOpenTimeField] = useState<TimeField | null>(null);

  function toggleTimeField(field: TimeField) {
    setOpenTimeField((current) => (current === field ? null : field));
  }

  return (
    <article className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-zinc-900">
          コンテンツ {index + 1}
        </h2>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-500"
        >
          削除
        </button>
      </div>

      <div className="space-y-4">
        <label className="block">
          <span className="text-xs font-semibold text-zinc-600">
            コンテンツ名
          </span>
          <input
            value={item.contentName}
            onChange={(event) =>
              onChange(index, "contentName", event.target.value)
            }
            placeholder="カフェ ルーティ"
            className="mt-1.5 h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm outline-none placeholder:text-zinc-400 focus:border-zinc-900 focus:bg-white"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-semibold text-zinc-600">開始日</span>
            <input
              type="date"
              value={item.startDate}
              onChange={(event) =>
                onChange(index, "startDate", event.target.value)
              }
              className="mt-1.5 h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm outline-none focus:border-zinc-900 focus:bg-white"
            />
          </label>
          <TimePickerField
            label="開始時刻"
            value={item.startTime}
            isOpen={openTimeField === "startTime"}
            onToggle={() => toggleTimeField("startTime")}
            onChange={(value) => onChange(index, "startTime", value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-semibold text-zinc-600">終了日</span>
            <input
              type="date"
              value={item.endDate}
              onChange={(event) =>
                onChange(index, "endDate", event.target.value)
              }
              className="mt-1.5 h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm outline-none focus:border-zinc-900 focus:bg-white"
            />
          </label>
          <TimePickerField
            label="終了時刻"
            value={item.endTime}
            isOpen={openTimeField === "endTime"}
            onToggle={() => toggleTimeField("endTime")}
            onChange={(value) => onChange(index, "endTime", value)}
          />
        </div>

        <label className="block">
          <span className="text-xs font-semibold text-zinc-600">コメント</span>
          <textarea
            value={item.comment}
            onChange={(event) => onChange(index, "comment", event.target.value)}
            placeholder="モーニングが美味しかった。窓側の席がおすすめ。"
            rows={4}
            className="mt-1.5 w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm leading-6 outline-none placeholder:text-zinc-400 focus:border-zinc-900 focus:bg-white"
          />
        </label>
      </div>
    </article>
  );
}

function TimePickerField({
  label,
  value,
  isOpen,
  onToggle,
  onChange,
}: {
  label: string;
  value: string;
  isOpen: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
}) {
  const [selectedHour = "00", selectedMinute = "00"] = value.split(":");

  function setHour(hour: string) {
    onChange(`${hour}:${selectedMinute}`);
  }

  function setMinute(minute: string) {
    onChange(`${selectedHour}:${minute}`);
  }

  return (
    <div className="block">
      <span className="text-xs font-semibold text-zinc-600">{label}</span>
      <button
        type="button"
        onClick={onToggle}
        className={`mt-1.5 flex h-11 w-full items-center justify-between rounded-xl border px-3 text-left text-sm outline-none transition ${
          isOpen
            ? "border-zinc-900 bg-white"
            : "border-zinc-200 bg-zinc-50 text-zinc-950"
        }`}
      >
        <span className={value ? "font-semibold text-zinc-950" : "text-zinc-400"}>
          {value || "未設定"}
        </span>
      </button>

      {isOpen ? (
        <div className="mt-2 rounded-2xl border border-zinc-100 bg-white p-3 shadow-sm">
          <div className="grid grid-cols-2 gap-3">
            <TimeWheel
              label="時間"
              options={hourOptions}
              selectedValue={selectedHour}
              onSelect={setHour}
            />
            <TimeWheel
              label="分"
              options={minuteOptions}
              selectedValue={selectedMinute}
              onSelect={setMinute}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TimeWheel({
  label,
  options,
  selectedValue,
  onSelect,
}: {
  label: string;
  options: string[];
  selectedValue: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-center text-xs font-semibold text-zinc-500">
        {label}
      </p>
      <div className="h-36 snap-y snap-mandatory overflow-y-auto rounded-xl bg-zinc-50 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="py-11">
          {options.map((option) => {
            const selected = option === selectedValue;

            return (
              <button
                key={option}
                type="button"
                onClick={() => onSelect(option)}
                className={`mb-1 flex h-9 w-full snap-center items-center justify-center rounded-lg text-base font-semibold transition ${
                  selected
                    ? "border border-zinc-200 bg-white text-zinc-950 shadow-sm"
                    : "text-zinc-300"
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
