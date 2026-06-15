"use client";

import Link from "next/link";
import {
  type PointerEvent as ReactPointerEvent,
  type UIEvent as ReactUIEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export type ScheduleContent = {
  contentName: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  comment: string;
  stayDuration?: string;
  imageUrl?: string;
  attachmentName?: string;
};

export type BookmarkFormValue = {
  title: string;
  coverImageUrl?: string;
  type?: string | null;
  isPublished?: boolean;
  plannedSchedule: ScheduleContent[];
  actualSchedule: ScheduleContent[];
};

type DraftEvent = {
  index: number | null;
  item: ScheduleContent;
  imagePreviewUrl?: string;
};
type DragSelection = {
  startMinutes: number;
  endMinutes: number;
};

const timelineStart = 0;
const timelineEnd = 26 * 60;
const stepMinutes = 5;
const pixelsPerHour = 120;
const pixelsPerMinute = pixelsPerHour / 60;
const minBlockHeight = 28;
const longPressMs = 380;
const moveCancelThreshold = 10;

const timeOptions = Array.from(
  { length: timelineEnd / stepMinutes + 1 },
  (_, index) => index * stepMinutes,
);

function emptyContent(): ScheduleContent {
  return {
    contentName: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    comment: "",
    stayDuration: "",
    imageUrl: "",
    attachmentName: "",
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "投稿の保存に失敗しました。";
}

function normalizeSchedule(items?: ScheduleContent[]) {
  const source = items?.length ? items : [];

  return source.map((item) => {
    const startMinutes = toMinutes(item.startTime);
    const inferredEnd =
      item.endTime || inferEndTimeFromDuration(item.startTime, item.stayDuration);

    return {
      ...emptyContent(),
      ...item,
      startTime: startMinutes === null ? "" : formatTimelineTime(startMinutes),
      endTime: inferredEnd,
    };
  });
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
    hour > 26 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  const total = hour * 60 + minute;
  return total < timelineStart || total > timelineEnd ? null : total;
}

function snapToFiveMinutes(minutes: number) {
  return Math.round(minutes / stepMinutes) * stepMinutes;
}

function clampTimelineMinutes(minutes: number) {
  return Math.max(timelineStart, Math.min(timelineEnd, minutes));
}

function snapTimelineMinutes(minutes: number) {
  return clampTimelineMinutes(snapToFiveMinutes(clampTimelineMinutes(minutes)));
}

function createDragSelection(anchorMinutes: number, currentMinutes: number) {
  const anchor = snapTimelineMinutes(anchorMinutes);
  const current = snapTimelineMinutes(currentMinutes);
  let startMinutes = Math.min(anchor, current);
  let endMinutes = Math.max(anchor, current);

  if (endMinutes - startMinutes < stepMinutes) {
    if (endMinutes >= timelineEnd) {
      startMinutes = Math.max(timelineStart, timelineEnd - stepMinutes);
      endMinutes = timelineEnd;
    } else {
      endMinutes = Math.min(timelineEnd, startMinutes + stepMinutes);
    }
  }

  return { startMinutes, endMinutes };
}

function formatTimelineTime(minutes: number) {
  const clamped = Math.max(timelineStart, Math.min(timelineEnd, minutes));
  const hour = Math.floor(clamped / 60);
  const minute = clamped % 60;

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes}分`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return rest ? `${hours}時間${rest}分` : `${hours}時間`;
}

function parseDurationMinutes(value?: string) {
  if (!value) return null;

  const hourMatch = value.match(/(\d+)\s*時間/);
  const minuteMatch = value.match(/(\d+)\s*分/);
  const plainNumber = value.match(/^\s*(\d+)\s*$/);
  const hours = hourMatch ? Number(hourMatch[1]) : 0;
  const minutes = minuteMatch
    ? Number(minuteMatch[1])
    : plainNumber
      ? Number(plainNumber[1])
      : 0;
  const total = hours * 60 + minutes;

  return total > 0 ? total : null;
}

function inferEndTimeFromDuration(startTime: string, stayDuration?: string) {
  const startMinutes = toMinutes(startTime);
  const duration = parseDurationMinutes(stayDuration);

  if (startMinutes === null || duration === null) return "";

  return formatTimelineTime(Math.min(timelineEnd, startMinutes + duration));
}

function getDurationMinutes(item: ScheduleContent) {
  const startMinutes = toMinutes(item.startTime);
  const endMinutes = toMinutes(item.endTime);

  if (startMinutes === null || endMinutes === null) {
    return parseDurationMinutes(item.stayDuration) ?? stepMinutes;
  }

  return Math.max(stepMinutes, endMinutes - startMinutes);
}

function getStayDuration(item: ScheduleContent) {
  return `${getDurationMinutes(item)}分`;
}

function sanitizeEndTime(startTime: string, endTime: string) {
  const startMinutes = toMinutes(startTime) ?? timelineStart;
  const endMinutes = toMinutes(endTime) ?? startMinutes + stepMinutes;
  const nextEnd = Math.max(startMinutes + stepMinutes, endMinutes);

  return formatTimelineTime(Math.min(timelineEnd, nextEnd));
}

function dateInputValue(value?: string) {
  if (value) return value;
  return new Date().toISOString().slice(0, 10);
}

function itemHasContent(item: ScheduleContent) {
  return Boolean(
    item.contentName.trim() ||
      item.startTime ||
      item.endTime ||
      item.comment.trim() ||
      item.stayDuration?.trim() ||
      item.imageUrl?.trim(),
  );
}

export function CreateBookmarkForm({
  mode = "create",
  postId,
  initialValue,
  returnHref = "/home",
}: {
  mode?: "create" | "edit";
  postId?: string;
  initialValue?: BookmarkFormValue;
  returnHref?: string;
}) {
  const router = useRouter();
  const isEdit = mode === "edit";
  const [title, setTitle] = useState(initialValue?.title ?? "");
  const [coverImageUrl] = useState(
    initialValue?.coverImageUrl ?? "",
  );
  const [postType] = useState(initialValue?.type ?? "plan");
  const [isPublished] = useState(
    initialValue?.isPublished ?? true,
  );
  const [schedule, setSchedule] = useState<ScheduleContent[]>(
    normalizeSchedule(
      initialValue?.type === "actual"
        ? initialValue?.actualSchedule
        : initialValue?.plannedSchedule,
    ),
  );
  const [selectedDate, setSelectedDate] = useState(() =>
    dateInputValue(
      initialValue?.plannedSchedule?.[0]?.startDate ||
        initialValue?.actualSchedule?.[0]?.startDate,
    ),
  );
  const [draftEvent, setDraftEvent] = useState<DraftEvent | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [dragSelection, setDragSelection] = useState<DragSelection | null>(null);
  const [isLongPressPending, setIsLongPressPending] = useState(false);
  const [isCreatingSchedule, setIsCreatingSchedule] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragSessionRef = useRef<{
    pointerId: number;
    target: HTMLDivElement;
    x: number;
    y: number;
    anchorMinutes: number;
    isDragging: boolean;
  } | null>(null);
  const dragSelectionRef = useRef<DragSelection | null>(null);
  const pointerYRef = useRef<number | null>(null);
  const lockedScrollTopRef = useRef(0);

  const sortedSchedule = useMemo(
    () =>
      schedule
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => toMinutes(item.startTime) !== null)
        .sort(
          (a, b) =>
            (toMinutes(a.item.startTime) ?? 0) - (toMinutes(b.item.startTime) ?? 0),
        ),
    [schedule],
  );

  const postValue = useMemo<BookmarkFormValue>(
    () => ({
      title,
      coverImageUrl,
      type: postType,
      isPublished,
      plannedSchedule: postType === "actual" ? [] : schedule,
      actualSchedule: postType === "actual" ? schedule : [],
    }),
    [coverImageUrl, isPublished, postType, schedule, title],
  );

  useEffect(() => {
    return () => {
      if (draftEvent?.imagePreviewUrl) {
        URL.revokeObjectURL(draftEvent.imagePreviewUrl);
      }
    };
  }, [draftEvent?.imagePreviewUrl]);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }

      const session = dragSessionRef.current;
      if (session?.target.hasPointerCapture(session.pointerId)) {
        session.target.releasePointerCapture(session.pointerId);
      }
    };
  }, []);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !isCreatingSchedule) return;

    function preventTouchScroll(event: TouchEvent) {
      event.preventDefault();
    }

    scroller.addEventListener("touchmove", preventTouchScroll, {
      passive: false,
    });

    return () => {
      scroller.removeEventListener("touchmove", preventTouchScroll);
    };
  }, [isCreatingSchedule]);

  function clearLongPressTimer() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function releasePointerCapture() {
    const session = dragSessionRef.current;
    if (!session) return;

    if (session.target.hasPointerCapture(session.pointerId)) {
      session.target.releasePointerCapture(session.pointerId);
    }
  }

  function resetDragState() {
    clearLongPressTimer();
    releasePointerCapture();
    dragSessionRef.current = null;
    dragSelectionRef.current = null;
    pointerYRef.current = null;
    setDragSelection(null);
    setIsLongPressPending(false);
    setIsCreatingSchedule(false);
  }

  function setCurrentDragSelection(selection: DragSelection) {
    dragSelectionRef.current = selection;
    setDragSelection(selection);
  }

  function getMinutesFromClientY(clientY: number) {
    const scroller = scrollerRef.current;
    if (!scroller) return timelineStart;

    const rect = scroller.getBoundingClientRect();
    const y = clientY - rect.top + scroller.scrollTop;

    return snapTimelineMinutes(y / pixelsPerMinute);
  }

  function updateDragSelection(anchorMinutes: number, pointerY: number) {
    const currentMinutes = getMinutesFromClientY(pointerY);
    setCurrentDragSelection(createDragSelection(anchorMinutes, currentMinutes));
  }

  function handleTimelinePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || draftEvent) return;
    if ((event.target as HTMLElement).closest("[data-event-block]")) return;

    resetDragState();
    const startMinutes = getMinutesFromClientY(event.clientY);
    dragSessionRef.current = {
      pointerId: event.pointerId,
      target: event.currentTarget,
      x: event.clientX,
      y: event.clientY,
      anchorMinutes: startMinutes,
      isDragging: false,
    };
    pointerYRef.current = event.clientY;
    setIsLongPressPending(true);

    longPressTimerRef.current = setTimeout(() => {
      const session = dragSessionRef.current;
      if (!session || session.pointerId !== event.pointerId) return;

      lockedScrollTopRef.current = session.target.scrollTop;
      session.isDragging = true;
      try {
        session.target.setPointerCapture(session.pointerId);
      } catch {
        // Pointer capture can fail if the browser already cancelled the pointer.
        resetDragState();
        return;
      }
      setIsLongPressPending(false);
      setIsCreatingSchedule(true);
      setCurrentDragSelection(
        createDragSelection(
          session.anchorMinutes,
          getMinutesFromClientY(pointerYRef.current ?? event.clientY),
        ),
      );
    }, longPressMs);
  }

  function handleTimelinePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const session = dragSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;

    pointerYRef.current = event.clientY;

    if (!session.isDragging) {
      const distance = Math.hypot(event.clientX - session.x, event.clientY - session.y);

      if (distance > moveCancelThreshold) {
        resetDragState();
      }
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    session.target.scrollTop = lockedScrollTopRef.current;
    updateDragSelection(session.anchorMinutes, event.clientY);
    session.target.scrollTop = lockedScrollTopRef.current;
  }

  function handleTimelinePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const session = dragSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) {
      resetDragState();
      return;
    }

    clearLongPressTimer();

    if (session.isDragging) {
      updateDragSelection(session.anchorMinutes, event.clientY);
    }

    const finalSelection = session.isDragging
      ? dragSelectionRef.current ??
        createDragSelection(session.anchorMinutes, getMinutesFromClientY(event.clientY))
      : null;

    releasePointerCapture();

    if (finalSelection) {
      const startTime = formatTimelineTime(finalSelection.startMinutes);
      const endTime = formatTimelineTime(finalSelection.endMinutes);

      setDraftEvent({
        index: null,
        item: {
          ...emptyContent(),
          startDate: selectedDate,
          endDate: selectedDate,
          startTime,
          endTime,
          stayDuration: `${finalSelection.endMinutes - finalSelection.startMinutes}分`,
        },
      });
    }

    dragSessionRef.current = null;
    dragSelectionRef.current = null;
    setDragSelection(null);
    pointerYRef.current = null;
    setIsLongPressPending(false);
    setIsCreatingSchedule(false);
  }

  function handleTimelinePointerCancel(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragSessionRef.current?.pointerId !== event.pointerId) return;
    resetDragState();
  }

  function handleTimelineScroll(event: ReactUIEvent<HTMLDivElement>) {
    if (!dragSessionRef.current?.isDragging) return;
    event.currentTarget.scrollTop = lockedScrollTopRef.current;
  }

  function openExistingEvent(index: number) {
    const item = schedule[index];
    if (!item) return;

    setDraftEvent({
      index,
      item: {
        ...emptyContent(),
        ...item,
        startDate: item.startDate || selectedDate,
        endDate: item.endDate || selectedDate,
        endTime:
          item.endTime ||
          inferEndTimeFromDuration(item.startTime, item.stayDuration) ||
          sanitizeEndTime(item.startTime, item.startTime),
      },
    });
    setFieldError(null);
  }

  function closeDraft() {
    if (draftEvent?.imagePreviewUrl) {
      URL.revokeObjectURL(draftEvent.imagePreviewUrl);
    }
    setDraftEvent(null);
    setFieldError(null);
  }

  function updateDraft(field: keyof ScheduleContent, value: string) {
    setDraftEvent((current) => {
      if (!current) return current;

      const nextItem = { ...current.item, [field]: value };

      if (field === "startTime") {
        nextItem.endTime = sanitizeEndTime(value, nextItem.endTime);
      }

      if (field === "endTime") {
        nextItem.endTime = sanitizeEndTime(nextItem.startTime, value);
      }

      nextItem.stayDuration = `${getDurationMinutes(nextItem)}分`;

      return { ...current, item: nextItem };
    });
  }

  function handleDraftFile(file: File | null) {
    setDraftEvent((current) => {
      if (!current) return current;
      if (current.imagePreviewUrl) URL.revokeObjectURL(current.imagePreviewUrl);
      if (!file) {
        return {
          ...current,
          imagePreviewUrl: undefined,
          item: { ...current.item, attachmentName: "", imageUrl: "" },
        };
      }

      return {
        ...current,
        imagePreviewUrl: URL.createObjectURL(file),
        item: {
          ...current.item,
          attachmentName: file.name,
          imageUrl: current.item.imageUrl || "",
        },
      };
    });
  }

  function saveDraftEvent() {
    if (!draftEvent) return;

    const contentName = draftEvent.item.contentName.trim();
    if (!contentName) {
      setFieldError("コンテンツ名を入力してください。");
      return;
    }

    const startMinutes = toMinutes(draftEvent.item.startTime);
    const endMinutes = toMinutes(draftEvent.item.endTime);

    if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
      setFieldError("終了時刻は開始時刻より後にしてください。");
      return;
    }

    const nextItem: ScheduleContent = {
      ...draftEvent.item,
      contentName,
      startDate: draftEvent.item.startDate || selectedDate,
      endDate: draftEvent.item.endDate || selectedDate,
      stayDuration: `${endMinutes - startMinutes}分`,
    };

    setSchedule((items) => {
      if (draftEvent.index === null) {
        return [...items, nextItem].sort(
          (a, b) => (toMinutes(a.startTime) ?? 0) - (toMinutes(b.startTime) ?? 0),
        );
      }

      return items
        .map((item, index) => (index === draftEvent.index ? nextItem : item))
        .sort((a, b) => (toMinutes(a.startTime) ?? 0) - (toMinutes(b.startTime) ?? 0));
    });

    closeDraft();
  }

  function removeDraftEvent() {
    if (!draftEvent || draftEvent.index === null) {
      closeDraft();
      return;
    }

    setSchedule((items) =>
      items.filter((_, index) => index !== draftEvent.index),
    );
    closeDraft();
  }

  async function handleSubmit() {
    console.log(isEdit ? "ROUTY update post" : "ROUTY create post", postValue);

    const trimmedTitle = title.trim();
    const scheduleToSave = schedule.filter(itemHasContent);

    if (!trimmedTitle) {
      setSubmitError("タイトルを入力してください。");
      return;
    }

    if (scheduleToSave.length === 0) {
      setSubmitError("スケジュールを1件以上追加してください。");
      return;
    }

    const invalidItem = scheduleToSave.find((item) => !item.contentName.trim());
    if (invalidItem) {
      setSubmitError("コンテンツ名が未入力の項目があります。項目を開いて入力してください。");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) {
        throw new Error("ログイン情報を取得できませんでした。再ログインしてください。");
      }

      if (isEdit) {
        if (!postId) throw new Error("編集対象の投稿IDを取得できませんでした。");

        const { data: existingPost, error: ownerCheckError } = await supabase
          .from("posts")
          .select("id,user_id")
          .eq("id", postId)
          .maybeSingle();

        if (ownerCheckError) throw ownerCheckError;
        if (!existingPost || existingPost.user_id !== user.id) {
          throw new Error("この投稿を編集する権限がありません。");
        }

        const { data: updatedPost, error: updateError } = await supabase
          .from("posts")
          .update({
            title: trimmedTitle,
            cover_image_url: coverImageUrl.trim() || null,
            type: postType || "plan",
            is_published: isPublished,
          })
          .eq("id", postId)
          .eq("user_id", user.id)
          .select("id")
          .maybeSingle();

        if (updateError) throw updateError;
        if (!updatedPost?.id) throw new Error("投稿を更新する権限がありません。");

        const { error: deleteScheduleError } = await supabase
          .from("schedule_items")
          .delete()
          .eq("post_id", postId);

        if (deleteScheduleError) throw deleteScheduleError;

        const scheduleRows = scheduleToSave.map((item, index) => ({
          post_id: postId,
          sort_order: index,
          time: item.startTime || null,
          spot_name: item.contentName.trim(),
          stay_duration: getStayDuration(item),
          comment: item.comment.trim() || null,
          image_url: item.imageUrl?.trim() || null,
        }));

        const { error: scheduleError } = await supabase
          .from("schedule_items")
          .insert(scheduleRows);

        if (scheduleError) throw scheduleError;

        router.push(`/posts/${postId}`);
        return;
      }

      const { data: post, error: postError } = await supabase
        .from("posts")
        .insert({
          user_id: user.id,
          title: trimmedTitle,
          cover_image_url: coverImageUrl.trim() || null,
          type: "plan",
          is_published: true,
        })
        .select("id")
        .single();

      if (postError) throw postError;
      if (!post?.id) throw new Error("投稿IDを取得できませんでした。");

      const scheduleRows = scheduleToSave.map((item, index) => ({
        post_id: post.id,
        sort_order: index,
        time: item.startTime || null,
        spot_name: item.contentName.trim(),
        stay_duration: getStayDuration(item),
        comment: item.comment.trim() || null,
        image_url: item.imageUrl?.trim() || null,
      }));

      const { error: scheduleError } = await supabase
        .from("schedule_items")
        .insert(scheduleRows);

      if (scheduleError) throw scheduleError;

      router.push("/home");
    } catch (error) {
      console.error(isEdit ? "ROUTY update post failed" : "ROUTY create post failed", error);
      setSubmitError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  function openDatePicker() {
    const input = dateInputRef.current;
    if (!input) return;
    const dateInput = input as HTMLInputElement & { showPicker?: () => void };

    if (dateInput.showPicker) {
      dateInput.showPicker();
      return;
    }

    dateInput.click();
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-zinc-50 pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <header className="z-20 flex h-14 shrink-0 items-center justify-between border-b border-zinc-100 bg-white/95 px-4 backdrop-blur">
        <Link href={returnHref} className="text-sm font-medium text-zinc-600">
          戻る
        </Link>
        <h1 className="text-base font-semibold text-zinc-950">
          {isEdit ? "しおり編集" : "しおり作成"}
        </h1>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="text-sm font-semibold text-zinc-950 disabled:text-zinc-400"
        >
          {isSubmitting ? "保存中..." : "保存"}
        </button>
      </header>

      <section className="shrink-0 border-b border-zinc-100 bg-white px-3 py-2">
        <div className="grid grid-cols-[1fr_auto] items-center gap-2">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="タイトルを入力"
            className="h-11 min-w-0 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-base font-medium outline-none placeholder:text-zinc-400 focus:border-zinc-900 focus:bg-white"
          />
          <div className="relative flex shrink-0 items-center gap-1.5">
            <input
              ref={dateInputRef}
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="absolute right-0 top-0 h-px w-px opacity-0"
              tabIndex={-1}
            />
            <span className="hidden text-xs font-semibold tabular-nums text-zinc-500 min-[380px]:inline">
              {selectedDate.slice(5).replace("-", "/")}
            </span>
            <button
              type="button"
              onClick={openDatePicker}
              aria-label="日付を選択"
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-800 shadow-sm active:bg-zinc-50"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              >
                <path d="M8 2v4" />
                <path d="M16 2v4" />
                <rect width="18" height="18" x="3" y="4" rx="2" />
                <path d="M3 10h18" />
              </svg>
            </button>
          </div>
        </div>

        {submitError ? (
          <p className="mt-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium leading-5 text-red-700">
            {submitError}
          </p>
        ) : null}
      </section>

      <section className="min-h-0 flex-1 bg-zinc-50 px-3 py-2">
        <div className="relative h-full min-h-0">
          <div className="absolute right-3 top-3 z-10">
            {isCreatingSchedule ? (
              <span className="rounded-full bg-zinc-900 px-2.5 py-1 text-xs font-semibold text-white">
                長押し中
              </span>
            ) : null}
          </div>

          <div
            ref={scrollerRef}
            data-long-press-pending={isLongPressPending || undefined}
            data-creating-schedule={isCreatingSchedule || undefined}
            onPointerDown={handleTimelinePointerDown}
            onPointerMove={handleTimelinePointerMove}
            onPointerUp={handleTimelinePointerUp}
            onPointerCancel={handleTimelinePointerCancel}
            onScroll={handleTimelineScroll}
            onContextMenu={(event) => event.preventDefault()}
            className={`h-full min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain rounded-lg border border-zinc-200 bg-white shadow-sm ${
              isCreatingSchedule ? "touch-none select-none" : "touch-pan-y"
            }`}
          >
            <div
              className="relative w-full"
              style={{ height: timelineEnd * pixelsPerMinute }}
            >
              <TimelineGrid />

              {sortedSchedule.map(({ item, index }) => (
                <TimelineEventBlock
                  key={`${index}-${item.startTime}-${item.contentName}`}
                  item={item}
                  onClick={() => openExistingEvent(index)}
                />
              ))}

              {dragSelection ? (
                <SelectionBlock selection={dragSelection} />
              ) : null}
            </div>
          </div>
        </div>
      </section>
      {draftEvent ? (
        <EventSheet
          draft={draftEvent}
          fieldError={fieldError}
          onChange={updateDraft}
          onFileChange={handleDraftFile}
          onCancel={closeDraft}
          onSave={saveDraftEvent}
          onRemove={draftEvent.index === null ? undefined : removeDraftEvent}
        />
      ) : null}
    </div>
  );
}

function TimelineGrid() {
  const hours = Array.from({ length: 27 }, (_, hour) => hour);
  const halfHours = Array.from({ length: 52 }, (_, index) => (index + 1) * 30);

  return (
    <>
      {halfHours.map((minutes) => (
        <div
          key={`half-${minutes}`}
          className="absolute left-[72px] right-0 border-t border-dashed border-zinc-100"
          style={{ top: minutes * pixelsPerMinute }}
        />
      ))}
      {hours.map((hour) => (
        <div
          key={hour}
          className="absolute left-0 right-0 border-t border-zinc-200"
          style={{ top: hour * pixelsPerHour }}
        >
          <div className="absolute left-0 top-[-10px] w-[64px] pr-2 text-right text-xs font-semibold tabular-nums text-zinc-500">
            {formatTimelineTime(hour * 60)}
          </div>
        </div>
      ))}
      <div className="absolute bottom-0 left-[72px] right-0 border-t border-zinc-200" />
    </>
  );
}

function TimelineEventBlock({
  item,
  onClick,
}: {
  item: ScheduleContent;
  onClick: () => void;
}) {
  const startMinutes = toMinutes(item.startTime) ?? timelineStart;
  const duration = getDurationMinutes(item);
  const endMinutes = Math.min(timelineEnd, startMinutes + duration);
  const top = startMinutes * pixelsPerMinute;
  const height = Math.max(minBlockHeight, (endMinutes - startMinutes) * pixelsPerMinute);
  const compact = height < 52;

  return (
    <button
      type="button"
      data-event-block
      onClick={onClick}
      className="absolute left-[76px] right-3 overflow-hidden rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-left shadow-sm transition active:scale-[0.99]"
      style={{ top, height }}
    >
      <p className="truncate text-sm font-semibold leading-5 text-teal-950">
        {item.contentName || "名称未入力"}
      </p>
      <p className="text-xs font-semibold tabular-nums text-teal-700">
        {item.startTime}〜{formatTimelineTime(endMinutes)}
      </p>
      {!compact && item.comment ? (
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-teal-900/75">
          {item.comment}
        </p>
      ) : null}
    </button>
  );
}

function SelectionBlock({ selection }: { selection: DragSelection }) {
  const top = selection.startMinutes * pixelsPerMinute;
  const height = Math.max(
    minBlockHeight,
    (selection.endMinutes - selection.startMinutes) * pixelsPerMinute,
  );

  return (
    <div
      className="pointer-events-none absolute left-[76px] right-3 rounded-lg border border-zinc-900 bg-zinc-900/12 px-3 py-2 shadow-sm ring-4 ring-zinc-900/5"
      style={{ top, height }}
    >
      <p className="text-sm font-semibold tabular-nums text-zinc-950">
        {formatTimelineTime(selection.startMinutes)}〜
        {formatTimelineTime(selection.endMinutes)}
      </p>
      <p className="text-xs font-semibold text-zinc-700">
        {formatDuration(selection.endMinutes - selection.startMinutes)}
      </p>
    </div>
  );
}

function EventSheet({
  draft,
  fieldError,
  onChange,
  onFileChange,
  onCancel,
  onSave,
  onRemove,
}: {
  draft: DraftEvent;
  fieldError: string | null;
  onChange: (field: keyof ScheduleContent, value: string) => void;
  onFileChange: (file: File | null) => void;
  onCancel: () => void;
  onSave: () => void;
  onRemove?: () => void;
}) {
  const startMinutes = toMinutes(draft.item.startTime) ?? timelineStart;
  const duration = getDurationMinutes(draft.item);
  const imageSrc = draft.imagePreviewUrl || draft.item.imageUrl?.trim();

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/35 px-0">
      <div className="max-h-[88dvh] w-full max-w-[430px] overflow-y-auto rounded-t-2xl bg-white px-4 pb-[calc(20px+env(safe-area-inset-bottom))] pt-4 shadow-2xl">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-zinc-300" />
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-zinc-950">
              {draft.index === null ? "スケジュールを追加" : "スケジュールを編集"}
            </h2>
            <p className="mt-1 text-sm font-medium tabular-nums text-zinc-500">
              {draft.item.startTime}〜{draft.item.endTime} / {formatDuration(duration)}
            </p>
          </div>
          {onRemove ? (
            <button
              type="button"
              onClick={onRemove}
              className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-600"
            >
              削除
            </button>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-zinc-600">髢句ｧ区凾蛻ｻ</span>
              <select
                value={draft.item.startTime}
                onChange={(event) => onChange("startTime", event.target.value)}
                className="mt-1.5 h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none focus:border-zinc-900"
              >
                {timeOptions.slice(0, -1).map((minutes) => (
                  <option key={minutes} value={formatTimelineTime(minutes)}>
                    {formatTimelineTime(minutes)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-zinc-600">邨ゆｺ・凾蛻ｻ</span>
              <select
                value={draft.item.endTime}
                onChange={(event) => onChange("endTime", event.target.value)}
                className="mt-1.5 h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none focus:border-zinc-900"
              >
                {timeOptions
                  .filter((minutes) => minutes > startMinutes)
                  .map((minutes) => (
                    <option key={minutes} value={formatTimelineTime(minutes)}>
                      {formatTimelineTime(minutes)}
                    </option>
                  ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-semibold text-zinc-600">
              コンテンツ名
            </span>
            <input
              value={draft.item.contentName}
              onChange={(event) => onChange("contentName", event.target.value)}
              placeholder="渋谷スクランブルスクエア"
              className="mt-1.5 h-11 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm outline-none placeholder:text-zinc-400 focus:border-zinc-900 focus:bg-white"
            />
            {fieldError ? (
              <span className="mt-1.5 block text-xs font-semibold text-red-600">
                {fieldError}
              </span>
            ) : null}
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-zinc-600">添付ファイル</span>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
              className="mt-1.5 block w-full text-sm text-zinc-700 file:mr-3 file:h-10 file:rounded-lg file:border-0 file:bg-zinc-900 file:px-3 file:text-sm file:font-semibold file:text-white"
            />
            <span className="mt-1.5 block text-xs leading-5 text-zinc-500">
              画像アップロードの保存先は未実装です。既存の画像URLがある場合のみDBへ保存します。
            </span>
          </label>

          {imageSrc ? (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageSrc}
                alt="添付画像プレビュー"
                className="max-h-52 w-full rounded-md object-cover"
              />
              <button
                type="button"
                onClick={() => onFileChange(null)}
                className="mt-2 h-9 rounded-lg bg-white px-3 text-sm font-semibold text-zinc-700 ring-1 ring-zinc-200"
              >
                画像を削除
              </button>
            </div>
          ) : draft.item.attachmentName ? (
            <div className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2">
              <span className="truncate text-sm font-medium text-zinc-700">
                {draft.item.attachmentName}
              </span>
              <button
                type="button"
                onClick={() => onFileChange(null)}
                className="text-sm font-semibold text-zinc-500"
              >
                削除
              </button>
            </div>
          ) : null}

          <label className="block">
            <span className="text-xs font-semibold text-zinc-600">コメント</span>
            <textarea
              value={draft.item.comment}
              onChange={(event) => onChange("comment", event.target.value)}
              placeholder="メモや補足を入力"
              rows={4}
              className="mt-1.5 w-full resize-none rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm leading-6 outline-none placeholder:text-zinc-400 focus:border-zinc-900 focus:bg-white"
            />
          </label>
        </div>

        <div className="sticky bottom-0 -mx-4 mt-5 grid grid-cols-2 gap-3 border-t border-zinc-100 bg-white px-4 pt-3">
          <button
            type="button"
            onClick={onCancel}
            className="h-12 rounded-lg border border-zinc-200 bg-white text-sm font-semibold text-zinc-700"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={onSave}
            className="h-12 rounded-lg bg-zinc-950 text-sm font-semibold text-white"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
