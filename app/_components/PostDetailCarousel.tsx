"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { DetailScheduleItem, RoutyPostDetail } from "../_data/posts";

export function PostDetailCarousel({ post }: { post: RoutyPostDetail }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  function handleScroll() {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const nextIndex = Math.round(scroller.scrollLeft / scroller.clientWidth);
    setActiveIndex(Math.max(0, Math.min(2, nextIndex)));
  }

  return (
    <section className="bg-white">
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="flex touch-pan-x snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="投稿詳細カルーセル"
      >
        <CoverSlide post={post} />
        <ScheduleSlide
          page="2/3"
          title="予定タイムスケジュール"
          items={post.plannedSchedule}
        />
        <ScheduleSlide
          page="3/3"
          title="実績タイムスケジュール"
          items={post.actualSchedule}
        />
      </div>

      <div className="flex justify-center gap-1.5 py-3">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className={`h-1.5 rounded-full transition-all ${
              activeIndex === index ? "w-5 bg-zinc-900" : "w-1.5 bg-zinc-300"
            }`}
          />
        ))}
      </div>
    </section>
  );
}

function CoverSlide({ post }: { post: RoutyPostDetail }) {
  return (
    <div className="relative h-[520px] w-full min-w-full shrink-0 snap-center overflow-hidden bg-zinc-100">
      <Image
        src={post.coverImage}
        alt={`${post.title}のタイトル写真`}
        fill
        unoptimized
        priority
        sizes="min(100vw, 430px)"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/5 to-black/65" />

      <div className="absolute right-4 top-4">
        <span className="rounded-full bg-black/45 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
          1/3
        </span>
      </div>

      <div className="absolute bottom-5 left-4 right-4">
        <h1 className="text-2xl font-semibold leading-8 text-white drop-shadow">
          {post.title}
        </h1>
      </div>
    </div>
  );
}

function ScheduleSlide({
  title,
  page,
  items,
}: {
  title: string;
  page: string;
  items: DetailScheduleItem[];
}) {
  return (
    <div className="h-[520px] w-full min-w-full shrink-0 snap-center overflow-y-auto bg-white px-5 py-5">
      <div className="mb-7 flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-zinc-950">{title}</h2>
        <span className="shrink-0 rounded-full bg-zinc-900 px-2.5 py-1 text-xs font-semibold text-white">
          {page}
        </span>
      </div>

      <div className="relative">
        <div className="absolute left-[7px] top-3 h-[calc(100%-24px)] w-px bg-zinc-200" />
        <div className="space-y-7">
          {items.map((item, index) => (
            <TimelineItem
              key={`${getStartTime(item)}-${getContentName(item)}-${index}`}
              item={item}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TimelineItem({ item }: { item: DetailScheduleItem }) {
  const startTime = getStartTime(item);
  const contentName = getContentName(item);
  const endTime = item.endTime || inferEndTimeFromLegacyDuration(startTime, item);
  const duration = calculateDurationText(startTime, endTime);

  return (
    <div className="grid grid-cols-[16px_58px_1fr] gap-3">
      <div className="relative pt-1.5">
        <span className="relative z-10 block h-3.5 w-3.5 rounded-full border-[3px] border-white bg-zinc-900 shadow-[0_0_0_1px_rgba(24,24,27,0.18)]" />
      </div>

      <p className="pt-0.5 text-sm font-semibold leading-6 text-zinc-700">
        {startTime || "--:--"}
      </p>

      <div className="min-w-0 rounded-2xl bg-zinc-50 px-4 py-3">
        <h3 className="truncate text-base font-semibold leading-6 text-zinc-950">
          {contentName}
        </h3>
        {duration ? (
          <p className="mt-1 text-sm font-medium text-zinc-500">{duration}</p>
        ) : (
          <p className="mt-1 text-sm font-medium text-zinc-400">--分</p>
        )}
      </div>
    </div>
  );
}

function getStartTime(item: DetailScheduleItem) {
  return item.startTime ?? item.time ?? "";
}

function getContentName(item: DetailScheduleItem) {
  return item.contentName ?? item.place ?? "";
}

function calculateDurationText(startTime: string, endTime?: string) {
  const startMinutes = toMinutes(startTime);
  const endMinutes = toMinutes(endTime);

  if (startMinutes === null || endMinutes === null) {
    return "";
  }

  const duration = endMinutes - startMinutes;

  if (duration < 0) {
    return "";
  }

  return `${duration}分`;
}

function inferEndTimeFromLegacyDuration(
  startTime: string,
  item: DetailScheduleItem,
) {
  const minutesText = item.duration.match(/\d+/)?.[0];
  const minutes = minutesText ? Number(minutesText) : NaN;

  if (!Number.isFinite(minutes)) {
    return "";
  }

  return addMinutes(startTime, minutes);
}

function addMinutes(time: string, minutes: number) {
  const startMinutes = toMinutes(time);

  if (startMinutes === null) {
    return "";
  }

  const nextMinutes = startMinutes + minutes;
  const hour = Math.floor(nextMinutes / 60) % 24;
  const minute = nextMinutes % 60;

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function toMinutes(time?: string) {
  if (!time) return null;

  const [hourText, minuteText] = time.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return hour * 60 + minute;
}
