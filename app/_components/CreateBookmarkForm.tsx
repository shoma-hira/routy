"use client";

import Link from "next/link";
import {
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  type UIEvent as ReactUIEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { normalizeArea } from "@/lib/area";
import { compressImageForUpload } from "@/lib/compressImage";
import { supabase } from "@/lib/supabase";

export type ScheduleContent = {
  contentName: string;
  contentCategory?: string;
  contentDetail?: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  comment: string;
  placeName?: string;
  stayDuration?: string;
  imageUrl?: string;
  start_time?: string | null;
  end_time?: string | null;
  content_name?: string | null;
  place_name?: string | null;
  time?: string | null;
  spotName?: string | null;
  spot_name?: string | null;
  stayDurationLegacy?: string | number | null;
  stay_duration?: string | number | null;
  isLegacyPlaceNameMissing?: boolean;
  isTouched?: boolean;
};
export type ScheduleItemInput = {
  contentName?: string | null;
  contentCategory?: string | null;
  contentDetail?: string | null;
  startDate?: string | null;
  startTime?: string | null;
  endDate?: string | null;
  endTime?: string | null;
  comment?: string | null;
  placeName?: string | null;
  stayDuration?: string | null;
  imageUrl?: string | null;
  image_url?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  content_name?: string | null;
  place_name?: string | null;
  time?: string | null;
  spotName?: string | null;
  spot_name?: string | null;
  stayDurationLegacy?: string | number | null;
  stay_duration?: string | number | null;
  isLegacyPlaceNameMissing?: boolean;
  isTouched?: boolean;
};

export type BookmarkFormValue = {
  title: string;
  coverImageUrl?: string;
  cover_image_url?: string | null;
  existingThumbnailUrl?: string | null;
  type?: string | null;
  isPublished?: boolean;
  routeDate?: string | null;
  route_date?: string | null;
  area?: string | null;
  transportType?: string | null;
  transport_type?: string | null;
  companionType?: string | null;
  companion_type?: string | null;
  budget?: number | string | null;
  weatherType?: string | null;
  weather_type?: string | null;
  caption?: string | null;
  plannedSchedule: ScheduleContent[];
  actualSchedule: ScheduleContent[];
  scheduleItems?: ScheduleContent[];
};

type DraftEvent = {
  index: number | null;
  item: ScheduleContent;
};
type DragSelection = {
  startMinutes: number;
  endMinutes: number;
};
type DatePickerPosition = {
  top: number;
  right: number;
  width: number;
  maxHeight: number;
};
type CreateBookmarkStep = "schedule" | "metadata";
type TransportType = "walking" | "public_transport" | "car";
type CompanionType = "" | "solo" | "friends" | "date" | "family";
type WeatherType = "" | "sunny" | "rain_ok" | "any";
type ScheduleItemRow = {
  post_id: string;
  sort_order: number;
  start_time: string | null;
  end_time: string | null;
  content_name: string;
  place_name: string | null;
  time: string | null;
  spot_name: string;
  stay_duration: string;
  comment: string | null;
  image_url: string | null;
};

const timelineStart = 0;
const timelineEnd = 26 * 60;
const stepMinutes = 5;
const pixelsPerHour = 120;
const pixelsPerMinute = pixelsPerHour / 60;
const minBlockHeight = 28;
const longPressMs = 380;
const moveCancelThreshold = 10;
const postImageBucket = process.env.NEXT_PUBLIC_SUPABASE_POST_IMAGE_BUCKET || "post-images";
const calendarMargin = 12;
const calendarMaxWidth = 320;
const transportOptions: { value: TransportType; label: string }[] = [
  { value: "walking", label: "徒歩中心" },
  { value: "public_transport", label: "電車あり" },
  { value: "car", label: "車あり" },
];
const companionOptions: { value: Exclude<CompanionType, "">; label: string }[] = [
  { value: "solo", label: "1人" },
  { value: "friends", label: "友達" },
  { value: "date", label: "デート" },
  { value: "family", label: "家族" },
];
const weatherOptions: { value: Exclude<WeatherType, "">; label: string }[] = [
  { value: "sunny", label: "晴れ向き" },
  { value: "rain_ok", label: "雨でもOK" },
  { value: "any", label: "どちらでもOK" },
];
const timeOptions = Array.from(
  { length: timelineEnd / stepMinutes + 1 },
  (_, index) => index * stepMinutes,
);

function emptyContent(): ScheduleContent {
  return {
    contentName: "",
    contentCategory: "",
    contentDetail: "",
    placeName: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    comment: "",
    stayDuration: "",
    imageUrl: "",
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "投稿の保存に失敗しました。";
}

function normalizeSchedule(items?: ScheduleItemInput[]) {
  const source = items?.length ? items : [];

  return source.map(normalizeScheduleItem);
}

function normalizeTagToken(value?: string | null) {
  const tag = (value ?? "").trim().replace(/^[#＃]+/, "");

  return tag;
}

function parseTagInput(value?: string | null) {
  const tags = (value ?? "")
    .replace(/[\r\n]+/g, " ")
    .split(/\s+/)
    .map(normalizeTagToken)
    .filter(Boolean);

  return Array.from(new Set(tags));
}

function formatTagInput(value?: string | null) {
  return parseTagInput(value)
    .map((tag) => `#${tag}`)
    .join(" ");
}

export function normalizeScheduleItem(item: ScheduleItemInput): ScheduleContent {
  const rawStartTime = item.start_time ?? item.startTime ?? item.time ?? "";
  const startMinutes = toMinutes(rawStartTime);
  const startTime = startMinutes === null ? "" : formatTimelineTime(startMinutes);
  const legacyDuration = item.stay_duration ?? item.stayDurationLegacy;
  const contentName =
    item.content_name ?? item.contentName ?? item.spot_name ?? item.spotName ?? "";
  const placeName = item.place_name ?? item.placeName ?? "";
  const hasLegacySpotName = Boolean((item.spot_name ?? item.spotName)?.trim());
  const isLegacyPlaceNameMissing =
    item.isLegacyPlaceNameMissing ??
    (hasLegacySpotName && !placeName.trim());
  const inferredEndTime =
    item.end_time ??
    item.endTime ??
    calculateEndTime(startTime, legacyDuration ?? item.stayDuration);
  const endMinutes = toMinutes(inferredEndTime);
  const endTime = endMinutes === null ? "" : formatTimelineTime(endMinutes);
  const stayDuration =
    calculateStayDuration(startTime, endTime) ||
    (item.stayDuration ?? (legacyDuration == null ? "" : String(legacyDuration)));

  return {
    ...emptyContent(),
    ...item,
    contentName: contentName.trim(),
    contentCategory: item.contentCategory ?? "",
    contentDetail: item.contentDetail ?? "",
    placeName,
    startTime,
    startDate: item.startDate ?? "",
    endTime,
    endDate: item.endDate ?? "",
    comment: item.comment ?? "",
    stayDuration,
    imageUrl: item.imageUrl ?? item.image_url ?? "",
    time: item.time ?? null,
    spotName: item.spotName ?? item.spot_name ?? null,
    spot_name: item.spot_name ?? item.spotName ?? null,
    stayDurationLegacy: legacyDuration ?? null,
    stay_duration: legacyDuration ?? null,
    isLegacyPlaceNameMissing,
    isTouched: item.isTouched ?? false,
  };
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

function isFiveMinuteTime(time: string) {
  const minutes = toMinutes(time);

  return minutes !== null && minutes % stepMinutes === 0;
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

function parseDurationMinutes(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return null;

  const text = String(value);

  const hourMatch = text.match(/(\d+)\s*時間/);
  const minuteMatch = text.match(/(\d+)\s*分/);
  const plainNumber = text.match(/^\s*(\d+)\s*$/);
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
  return calculateEndTime(startTime, stayDuration);
}

function calculateEndTime(
  startTime: string,
  stayDuration?: string | number | null,
) {
  const startMinutes = toMinutes(startTime);
  const duration = parseDurationMinutes(stayDuration);

  if (startMinutes === null || duration === null) return "";

  const endMinutes = startMinutes + duration;

  if (endMinutes > timelineEnd || endMinutes % stepMinutes !== 0) {
    return "";
  }

  return formatTimelineTime(endMinutes);
}

function calculateStayDuration(startTime: string, endTime: string) {
  const startMinutes = toMinutes(startTime);
  const endMinutes = toMinutes(endTime);

  if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
    return "";
  }

  return `${endMinutes - startMinutes}分`;
}

function hasValidScheduleTimeRange(item: ScheduleContent) {
  const startMinutes = toMinutes(item.startTime);
  const endMinutes = toMinutes(item.endTime);

  return (
    startMinutes !== null &&
    endMinutes !== null &&
    startMinutes % stepMinutes === 0 &&
    endMinutes % stepMinutes === 0 &&
    endMinutes > startMinutes
  );
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
  return calculateStayDuration(item.startTime, item.endTime) || `${getDurationMinutes(item)}分`;
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

function parseDateInput(value: string) {
  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return new Date();
  }

  return new Date(year, month - 1, day);
}

function formatDateInputValue(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getCalendarDates(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const gridStart = new Date(year, month, 1 - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
}

function getSafeFileName(fileName: string) {
  const fallback = "thumbnail";
  const sanitized = fileName
    .normalize("NFKC")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return sanitized || fallback;
}

function itemHasContent(item: ScheduleContent) {
  return Boolean(
    item.contentName.trim() ||
      item.placeName?.trim() ||
      item.startTime ||
      item.endTime ||
      item.comment.trim() ||
      item.stayDuration?.trim() ||
      item.imageUrl?.trim(),
  );
}

function toScheduleRow(
  item: ScheduleContent,
  postId: string,
  index: number,
): ScheduleItemRow {
  const contentName = formatTagInput(item.contentName);
  const startTime = item.startTime || null;
  const endTime = item.endTime || null;
  const stayDuration = calculateStayDuration(item.startTime, item.endTime);

  return {
    post_id: postId,
    sort_order: index,
    start_time: startTime,
    end_time: endTime,
    content_name: contentName,
    place_name: item.placeName?.trim() || null,
    time: startTime,
    spot_name: contentName,
    stay_duration: stayDuration,
    comment: item.comment.trim() || null,
    image_url: item.imageUrl?.trim() || null,
  };
}

function allowsMissingPlaceName(item: ScheduleContent) {
  return Boolean(item.isLegacyPlaceNameMissing && !item.isTouched);
}

function validateScheduleItemsForStep(items: ScheduleContent[]) {
  const scheduleToValidate = items.filter(itemHasContent);

  if (scheduleToValidate.length === 0) {
    return "スケジュールを1件以上追加してください。";
  }

  const invalidPlaceItem = scheduleToValidate.find(
    (item) => !item.placeName?.trim() && !allowsMissingPlaceName(item),
  );
  if (invalidPlaceItem) {
    return "店名施設名が未入力の項目があります。項目を開いて入力してください。";
  }

  const invalidTimeItem = scheduleToValidate.find(
    (item) =>
      !hasValidScheduleTimeRange(item) ||
      !isFiveMinuteTime(item.startTime) ||
      !isFiveMinuteTime(item.endTime),
  );
  if (invalidTimeItem) {
    return "開始時刻と終了時刻は00:00〜26:00の5分刻みで、終了時刻が開始時刻より後になるようにしてください。";
  }

  return null;
}

function normalizeTransportType(value?: string | null): TransportType | "" {
  if (value === "walking" || value === "public_transport" || value === "car") {
    return value;
  }

  return "";
}

function normalizeCompanionType(value?: string | null): CompanionType {
  if (
    value === "solo" ||
    value === "friends" ||
    value === "date" ||
    value === "family"
  ) {
    return value;
  }

  return "";
}

function normalizeWeatherType(value?: string | null): WeatherType {
  if (value === "sunny" || value === "rain_ok" || value === "any") {
    return value;
  }

  return "";
}

function getInitialThumbnailUrl(initialValue?: BookmarkFormValue) {
  return (
    initialValue?.existingThumbnailUrl ??
    initialValue?.coverImageUrl ??
    initialValue?.cover_image_url ??
    ""
  );
}

function getInitialRouteDate(initialValue?: BookmarkFormValue) {
  return (
    initialValue?.routeDate ||
    initialValue?.route_date ||
    initialValue?.plannedSchedule?.[0]?.startDate ||
    initialValue?.actualSchedule?.[0]?.startDate
  );
}

function validatePostMetadata({
  title,
  routeDate,
  area,
  transportType,
  budget,
}: {
  title: string;
  routeDate: string;
  area: string;
  transportType: TransportType | "";
  budget: string;
}) {
  if (!title.trim()) return "タイトルを入力してください";
  if (!routeDate) return "日付を選択してください";
  if (!normalizeArea(area)) return "エリアを入力してください";
  if (!transportType) return "移動手段を選択してください";

  if (budget.trim()) {
    const normalizedBudget = budget.trim();
    if (!/^\d+$/.test(normalizedBudget)) {
      return "予算は0以上の整数で入力してください";
    }
  }

  return null;
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
  const initialThumbnailUrl = getInitialThumbnailUrl(initialValue);
  const [currentStep, setCurrentStep] =
    useState<CreateBookmarkStep>("schedule");
  const [title, setTitle] = useState(initialValue?.title ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(initialThumbnailUrl);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] =
    useState(initialThumbnailUrl);
  const [selectedThumbnailFile, setSelectedThumbnailFile] = useState<File | null>(null);
  const [thumbnailFileName, setThumbnailFileName] = useState("");
  const [postType] = useState(initialValue?.type ?? "plan");
  const [isPublished] = useState(
    initialValue?.isPublished ?? true,
  );
  const [area, setArea] = useState(normalizeArea(initialValue?.area));
  const [transportType, setTransportType] = useState<TransportType | "">(
    normalizeTransportType(initialValue?.transportType ?? initialValue?.transport_type),
  );
  const [companionType, setCompanionType] = useState<CompanionType>(
    normalizeCompanionType(initialValue?.companionType ?? initialValue?.companion_type),
  );
  const [budget, setBudget] = useState(
    initialValue?.budget == null ? "" : String(initialValue.budget),
  );
  const [weatherType, setWeatherType] = useState<WeatherType>(
    normalizeWeatherType(initialValue?.weatherType ?? initialValue?.weather_type),
  );
  const [caption, setCaption] = useState(initialValue?.caption ?? "");
  const [schedule, setSchedule] = useState<ScheduleContent[]>(
    normalizeSchedule(
      initialValue?.scheduleItems ??
      (initialValue?.type === "actual"
        ? initialValue?.actualSchedule
        : initialValue?.plannedSchedule),
    ),
  );
  const [selectedDate, setSelectedDate] = useState(() =>
    dateInputValue(getInitialRouteDate(initialValue)),
  );
  const [draftEvent, setDraftEvent] = useState<DraftEvent | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [dragSelection, setDragSelection] = useState<DragSelection | null>(null);
  const [isLongPressPending, setIsLongPressPending] = useState(false);
  const [isCreatingSchedule, setIsCreatingSchedule] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() =>
    parseDateInput(selectedDate),
  );
  const [datePickerPosition, setDatePickerPosition] =
    useState<DatePickerPosition | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dateButtonRef = useRef<HTMLButtonElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const thumbnailObjectUrlRef = useRef<string | null>(null);
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
      routeDate: selectedDate,
      area,
      transportType: transportType || null,
      companionType: companionType || null,
      budget: budget.trim() ? Number(budget.trim()) : null,
      weatherType: weatherType || null,
      caption,
      plannedSchedule: postType === "actual" ? [] : schedule,
      actualSchedule: postType === "actual" ? schedule : [],
    }),
    [
      area,
      budget,
      caption,
      companionType,
      coverImageUrl,
      isPublished,
      postType,
      schedule,
      selectedDate,
      title,
      transportType,
      weatherType,
    ],
  );

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }

      const session = dragSessionRef.current;
      if (session?.target.hasPointerCapture(session.pointerId)) {
        session.target.releasePointerCapture(session.pointerId);
      }

      if (thumbnailObjectUrlRef.current) {
        URL.revokeObjectURL(thumbnailObjectUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isDatePickerOpen) return;

    function updateDatePickerPosition() {
      const button = dateButtonRef.current;
      if (!button) return;

      const rect = button.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const width = Math.min(calendarMaxWidth, viewportWidth - calendarMargin * 2);
      let right = Math.max(calendarMargin, viewportWidth - rect.right);

      if (viewportWidth - right - width < calendarMargin) {
        right = Math.max(calendarMargin, viewportWidth - calendarMargin - width);
      }

      let top = Math.max(calendarMargin, rect.bottom + 8);
      let maxHeight = viewportHeight - top - calendarMargin;

      if (maxHeight < 260) {
        top = calendarMargin;
        maxHeight = viewportHeight - calendarMargin * 2;
      }

      setDatePickerPosition({ top, right, width, maxHeight });
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;

      if (
        datePickerRef.current?.contains(target) ||
        dateButtonRef.current?.contains(target)
      ) {
        return;
      }

      setIsDatePickerOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsDatePickerOpen(false);
      }
    }

    updateDatePickerPosition();
    window.addEventListener("resize", updateDatePickerPosition);
    window.addEventListener("scroll", updateDatePickerPosition, true);
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", updateDatePickerPosition);
      window.removeEventListener("scroll", updateDatePickerPosition, true);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDatePickerOpen]);

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

  function openNewEvent() {
    const startTime = "09:00";
    const endTime = sanitizeEndTime(startTime, "10:00");

    setDraftEvent({
      index: null,
      item: {
        ...emptyContent(),
        startDate: selectedDate,
        endDate: selectedDate,
        startTime,
        endTime,
        stayDuration: calculateStayDuration(startTime, endTime) || "60分",
      },
    });
    setFieldError(null);
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

  function saveDraftEvent() {
    if (!draftEvent) return;

    const placeName = draftEvent.item.placeName?.trim() ?? "";
    if (!placeName) {
      setFieldError("店名施設名を入力してください。");
      return;
    }

    const startMinutes = toMinutes(draftEvent.item.startTime);
    const endMinutes = toMinutes(draftEvent.item.endTime);

    if (startMinutes === null || endMinutes === null) {
      setFieldError("開始時刻と終了時刻を正しく設定してください。");
      return;
    }

    if (startMinutes % stepMinutes !== 0 || endMinutes % stepMinutes !== 0) {
      setFieldError("時刻は5分刻みで設定してください。");
      return;
    }

    if (endMinutes <= startMinutes) {
      setFieldError("終了時刻は開始時刻より後にしてください。");
      return;
    }

    const contentName = formatTagInput(draftEvent.item.contentName);

    const nextItem: ScheduleContent = {
      ...draftEvent.item,
      contentName,
      contentCategory: "",
      contentDetail: "",
      placeName,
      startDate: draftEvent.item.startDate || selectedDate,
      endDate: draftEvent.item.endDate || selectedDate,
      stayDuration: `${endMinutes - startMinutes}分`,
      isLegacyPlaceNameMissing: false,
      isTouched: true,
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

  async function uploadThumbnailImage(userId: string, targetPostId: string) {
    if (!selectedThumbnailFile) {
      return coverImageUrl.trim() || null;
    }

    if (!selectedThumbnailFile.type.startsWith("image/")) {
      throw new Error("画像ファイルを選択してください。");
    }

    let uploadFile = selectedThumbnailFile;

    try {
      uploadFile = await compressImageForUpload(selectedThumbnailFile);
    } catch (error) {
      console.warn("ROUTY image compression failed; uploading original image", error);
    }

    const fileId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : String(Date.now());
    const path = `${userId}/${targetPostId}/${fileId}-${getSafeFileName(
      selectedThumbnailFile.name,
    )}`;
    const { error: uploadError } = await supabase.storage
      .from(postImageBucket)
      .upload(path, uploadFile, {
        cacheControl: "3600",
        contentType: uploadFile.type || undefined,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`サムネイル画像のアップロードに失敗しました。${uploadError.message}`);
    }

    const { data } = supabase.storage.from(postImageBucket).getPublicUrl(path);
    const publicUrl = data.publicUrl?.trim();

    if (!publicUrl) {
      throw new Error("サムネイル画像の公開URLを取得できませんでした。");
    }

    setCoverImageUrl(publicUrl);
    return publicUrl;
  }

  async function handleSubmit() {
    console.log(isEdit ? "ROUTY update post" : "ROUTY create post", postValue);

    const trimmedTitle = title.trim();
    const trimmedArea = normalizeArea(area);
    const trimmedBudget = budget.trim();
    const normalizedBudget = trimmedBudget ? Number(trimmedBudget) : null;
    const trimmedCaption = caption.trim();
    const scheduleToSave = schedule.filter(itemHasContent);
    const metadataValidationMessage = validatePostMetadata({
      title,
      routeDate: selectedDate,
      area,
      transportType,
      budget,
    });

    if (metadataValidationMessage) {
      setSubmitError(metadataValidationMessage);
      return;
    }

    const scheduleValidationMessage = validateScheduleItemsForStep(schedule);
    if (scheduleValidationMessage) {
      setSubmitError(scheduleValidationMessage);
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

        const nextCoverImageUrl = await uploadThumbnailImage(user.id, postId);

        const { data: updatedPost, error: updateError } = await supabase
          .from("posts")
          .update({
            title: trimmedTitle,
            route_date: selectedDate,
            area: trimmedArea,
            transport_type: transportType,
            companion_type: companionType || null,
            budget: normalizedBudget,
            weather_type: weatherType || null,
            caption: trimmedCaption || null,
            cover_image_url: nextCoverImageUrl,
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

        const scheduleRows = scheduleToSave.map((item, index) =>
          toScheduleRow(item, postId, index),
        );

        const { error: scheduleError } = await supabase
          .from("schedule_items")
          .insert(scheduleRows);

        if (scheduleError) throw scheduleError;

        router.push("/home");
        return;
      }

      const draftPostImageId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : String(Date.now());
      const nextCoverImageUrl = await uploadThumbnailImage(
        user.id,
        `draft-${draftPostImageId}`,
      );

      const { data: post, error: postError } = await supabase
        .from("posts")
        .insert({
          user_id: user.id,
          title: trimmedTitle,
          route_date: selectedDate,
          area: trimmedArea,
          transport_type: transportType,
          companion_type: companionType || null,
          budget: normalizedBudget,
          weather_type: weatherType || null,
          caption: trimmedCaption || null,
          cover_image_url: nextCoverImageUrl,
          type: "plan",
          is_published: true,
        })
        .select("id")
        .single();

      if (postError) throw postError;
      if (!post?.id) throw new Error("投稿IDを取得できませんでした。");

      const scheduleRows = scheduleToSave.map((item, index) =>
        toScheduleRow(item, post.id, index),
      );

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

  function handleNextStep() {
    const validationMessage = validateScheduleItemsForStep(schedule);

    if (validationMessage) {
      setSubmitError(validationMessage);
      return;
    }

    setSubmitError(null);
    setCurrentStep("metadata");
  }

  function handleBackToScheduleStep() {
    setSubmitError(null);
    setCurrentStep("schedule");
  }

  function handleMetadataSubmit() {
    const validationMessage = validatePostMetadata({
      title,
      routeDate: selectedDate,
      area,
      transportType,
      budget,
    });

    if (validationMessage) {
      setSubmitError(validationMessage);
      return;
    }

    setSubmitError(null);
    handleSubmit();
  }

  function openDatePicker() {
    setCalendarMonth(parseDateInput(selectedDate));
    setIsDatePickerOpen((current) => !current);
  }

  function selectDate(date: Date) {
    setSelectedDate(formatDateInputValue(date));
    setIsDatePickerOpen(false);
  }

  function moveCalendarMonth(offset: number) {
    setCalendarMonth((current) => {
      const nextMonth = new Date(current);
      nextMonth.setMonth(current.getMonth() + offset, 1);
      return nextMonth;
    });
  }

  function openThumbnailPicker() {
    thumbnailInputRef.current?.click();
  }

  function handleThumbnailChange(file: File | null) {
    if (thumbnailObjectUrlRef.current) {
      URL.revokeObjectURL(thumbnailObjectUrlRef.current);
      thumbnailObjectUrlRef.current = null;
    }

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setSelectedThumbnailFile(null);
      setThumbnailPreviewUrl(coverImageUrl);
      setThumbnailFileName("");
      setSubmitError("画像ファイルを選択してください。");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    thumbnailObjectUrlRef.current = previewUrl;
    setSelectedThumbnailFile(file);
    setThumbnailPreviewUrl(previewUrl);
    setThumbnailFileName(file.name);
    setSubmitError(null);
  }

  function removeThumbnail() {
    if (thumbnailObjectUrlRef.current) {
      URL.revokeObjectURL(thumbnailObjectUrlRef.current);
      thumbnailObjectUrlRef.current = null;
    }

    setCoverImageUrl("");
    setSelectedThumbnailFile(null);
    setThumbnailPreviewUrl("");
    setThumbnailFileName("");

    if (thumbnailInputRef.current) {
      thumbnailInputRef.current.value = "";
    }
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-zinc-50 pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <header className="z-20 flex h-14 shrink-0 items-center justify-between border-b border-zinc-100 bg-white/95 px-4 backdrop-blur">
        {currentStep === "schedule" ? (
          <Link href={returnHref} className="text-sm font-medium text-zinc-600">
            戻る
          </Link>
        ) : (
          <span className="w-14" aria-hidden="true" />
        )}
        <h1 className="text-base font-semibold text-zinc-950">
          {currentStep === "schedule" ? "しおり編集" : isEdit ? "しおり編集" : "しおり作成"}
        </h1>
        {currentStep === "schedule" ? (
          <button
            type="button"
            onClick={handleNextStep}
            className="w-14 text-right text-sm font-semibold text-emerald-700"
          >
            次へ
          </button>
        ) : (
          <span className="w-14" aria-hidden="true" />
        )}
      </header>

      {currentStep === "schedule" && isDatePickerOpen && datePickerPosition
        ? createPortal(
            <DatePickerPopover
              refElement={datePickerRef}
              month={calendarMonth}
              selectedDate={selectedDate}
              position={datePickerPosition}
              onPreviousMonth={() => moveCalendarMonth(-1)}
              onNextMonth={() => moveCalendarMonth(1)}
              onSelectDate={selectDate}
            />,
            document.body,
          )
        : null}

      {currentStep === "schedule" ? (
        <ScheduleEditorStep
          scrollerRef={scrollerRef}
          isCreatingSchedule={isCreatingSchedule}
          isLongPressPending={isLongPressPending}
          sortedSchedule={sortedSchedule}
          dragSelection={dragSelection}
          onPointerDown={handleTimelinePointerDown}
          onPointerMove={handleTimelinePointerMove}
          onPointerUp={handleTimelinePointerUp}
          onPointerCancel={handleTimelinePointerCancel}
          onScroll={handleTimelineScroll}
          onOpenExistingEvent={openExistingEvent}
          onOpenNewEvent={openNewEvent}
          submitError={submitError}
        />
      ) : (
        <PostMetadataStep
          isEdit={isEdit}
          isSubmitting={isSubmitting}
          submitError={submitError}
          title={title}
          routeDate={selectedDate}
          area={area}
          transportType={transportType}
          companionType={companionType}
          budget={budget}
          weatherType={weatherType}
          caption={caption}
          thumbnailPreviewUrl={thumbnailPreviewUrl}
          thumbnailFileName={thumbnailFileName}
          thumbnailInputRef={thumbnailInputRef}
          onTitleChange={setTitle}
          onRouteDateChange={setSelectedDate}
          onAreaChange={setArea}
          onTransportTypeChange={setTransportType}
          onCompanionTypeChange={setCompanionType}
          onBudgetChange={setBudget}
          onWeatherTypeChange={setWeatherType}
          onCaptionChange={setCaption}
          onThumbnailChange={handleThumbnailChange}
          onOpenThumbnailPicker={openThumbnailPicker}
          onRemoveThumbnail={removeThumbnail}
          onBack={handleBackToScheduleStep}
          onSubmit={handleMetadataSubmit}
        />
      )}
      {currentStep === "schedule" && draftEvent ? (
        <EventSheet
          draft={draftEvent}
          fieldError={fieldError}
          onChange={updateDraft}
          onCancel={closeDraft}
          onSave={saveDraftEvent}
          onRemove={draftEvent.index === null ? undefined : removeDraftEvent}
        />
      ) : null}
    </div>
  );
}

function ScheduleEditorStep({
  scrollerRef,
  isCreatingSchedule,
  isLongPressPending,
  sortedSchedule,
  dragSelection,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onScroll,
  onOpenExistingEvent,
  onOpenNewEvent,
  submitError,
}: {
  scrollerRef: RefObject<HTMLDivElement | null>;
  isCreatingSchedule: boolean;
  isLongPressPending: boolean;
  sortedSchedule: { item: ScheduleContent; index: number }[];
  dragSelection: DragSelection | null;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onScroll: (event: ReactUIEvent<HTMLDivElement>) => void;
  onOpenExistingEvent: (index: number) => void;
  onOpenNewEvent: () => void;
  submitError: string | null;
}) {
  return (
    <>
      <section className="min-h-0 flex-1 overflow-hidden bg-white px-4 py-3">
        <div className="mx-auto flex h-full max-w-[430px] min-w-0 flex-col gap-3">
          <div className="shrink-0">
            <p className="text-sm font-semibold text-zinc-950">時間表</p>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              開始時間を長押しし、そのまま下にドラッグして時間を設定
            </p>
          </div>

          <div className="relative min-h-0 flex-1">
            <div className="absolute right-3 top-3 z-10">
            {isCreatingSchedule ? (
              <span className="rounded-full bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
                長押し中
              </span>
            ) : null}
            </div>

            <div
              ref={scrollerRef}
              data-long-press-pending={isLongPressPending || undefined}
              data-creating-schedule={isCreatingSchedule || undefined}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCancel}
              onScroll={onScroll}
              onContextMenu={(event) => event.preventDefault()}
              className={`h-full min-h-0 w-full min-w-0 overflow-y-auto overflow-x-hidden overscroll-contain rounded-2xl border border-emerald-100 bg-zinc-50 shadow-sm ${
                isCreatingSchedule ? "touch-none select-none" : "touch-pan-y"
              }`}
            >
              <div
                className="relative w-full min-w-0"
                style={{ height: timelineEnd * pixelsPerMinute }}
              >
                <TimelineGrid />

                {sortedSchedule.map(({ item, index }) => (
                  <TimelineEventBlock
                    key={`${index}-${item.startTime}-${item.placeName ?? item.contentName}`}
                    item={item}
                    onClick={() => onOpenExistingEvent(index)}
                  />
                ))}

                {dragSelection ? (
                  <SelectionBlock selection={dragSelection} />
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>
      <div className="shrink-0 border-t border-zinc-100 bg-white px-4 py-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
        {submitError ? (
          <p className="mx-auto mb-3 max-w-[430px] rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium leading-5 text-red-700">
            {submitError}
          </p>
        ) : null}
        <button
          type="button"
          onClick={onOpenNewEvent}
          className="mx-auto flex h-12 w-full max-w-[430px] items-center justify-center rounded-xl border border-emerald-300 bg-white text-sm font-semibold text-emerald-700 active:bg-emerald-50"
        >
          ＋ スケジュールを追加
        </button>
      </div>
    </>
  );
}

function PostMetadataStep({
  isEdit,
  isSubmitting,
  submitError,
  title,
  routeDate,
  area,
  transportType,
  companionType,
  budget,
  weatherType,
  caption,
  thumbnailPreviewUrl,
  thumbnailFileName,
  thumbnailInputRef,
  onTitleChange,
  onRouteDateChange,
  onAreaChange,
  onTransportTypeChange,
  onCompanionTypeChange,
  onBudgetChange,
  onWeatherTypeChange,
  onCaptionChange,
  onThumbnailChange,
  onOpenThumbnailPicker,
  onRemoveThumbnail,
  onBack,
  onSubmit,
}: {
  isEdit: boolean;
  isSubmitting: boolean;
  submitError: string | null;
  title: string;
  routeDate: string;
  area: string;
  transportType: TransportType | "";
  companionType: CompanionType;
  budget: string;
  weatherType: WeatherType;
  caption: string;
  thumbnailPreviewUrl: string;
  thumbnailFileName: string;
  thumbnailInputRef: RefObject<HTMLInputElement | null>;
  onTitleChange: (value: string) => void;
  onRouteDateChange: (value: string) => void;
  onAreaChange: (value: string) => void;
  onTransportTypeChange: (value: TransportType | "") => void;
  onCompanionTypeChange: (value: CompanionType) => void;
  onBudgetChange: (value: string) => void;
  onWeatherTypeChange: (value: WeatherType) => void;
  onCaptionChange: (value: string) => void;
  onThumbnailChange: (file: File | null) => void;
  onOpenThumbnailPicker: () => void;
  onRemoveThumbnail: () => void;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <>
      <section className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-zinc-50 px-4 py-5">
        <div className="mx-auto max-w-[390px] space-y-4">
          <div className="px-1">
            <h2 className="text-xl font-semibold text-zinc-950">投稿情報</h2>
            <p className="mt-1 text-sm leading-6 text-zinc-500">
              ルート全体の情報を入力してください
            </p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-zinc-950">
                サムネイル画像
              </span>
              <span className="text-xs font-semibold text-emerald-700">任意</span>
            </div>
            <input
              ref={thumbnailInputRef}
              type="file"
              accept="image/*"
              onChange={(event) => {
                onThumbnailChange(event.target.files?.[0] ?? null);
                event.target.value = "";
              }}
              className="sr-only"
            />
            <div className="flex min-w-0 items-center gap-3">
              {thumbnailPreviewUrl ? (
                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumbnailPreviewUrl}
                    alt="サムネイル画像プレビュー"
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-xs font-semibold text-emerald-700/60">
                  未設定
                </div>
              )}
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={onOpenThumbnailPicker}
                  className="h-10 rounded-full bg-emerald-700 px-4 text-sm font-semibold text-white active:bg-emerald-800"
                >
                  {thumbnailPreviewUrl ? "画像を変更" : "画像を選択"}
                </button>
                {thumbnailPreviewUrl ? (
                  <button
                    type="button"
                    onClick={onRemoveThumbnail}
                    className="ml-2 h-10 rounded-full bg-zinc-100 px-3 text-sm font-semibold text-zinc-600 active:bg-zinc-200"
                  >
                    削除
                  </button>
                ) : null}
                {thumbnailFileName || thumbnailPreviewUrl ? (
                  <p className="mt-2 truncate text-xs text-zinc-500">
                    {thumbnailFileName || "設定済み"}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <label className="block rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
            <span className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold text-zinc-950">
              タイトル
              <span className="text-xs font-semibold text-emerald-700">必須</span>
            </span>
            <input
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              maxLength={100}
              placeholder="自由が丘で作業して　雑貨屋巡りする日"
              className="h-12 w-full rounded-xl border border-zinc-100 bg-zinc-50 px-3 text-sm outline-none placeholder:text-zinc-400 focus:border-emerald-500 focus:bg-white"
            />
            <p className="mt-2 text-xs font-medium leading-5 text-zinc-500">
              PNGでは全角スペースを入れた位置で改行されます
            </p>
            <p className="mt-1 text-xs font-medium leading-5 text-zinc-400">
              例：自由が丘で作業して　雑貨屋巡りする日
            </p>
          </label>

          <label className="block rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
            <span className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold text-zinc-950">
              日付
              <span className="text-xs font-semibold text-emerald-700">必須</span>
            </span>
            <input
              type="date"
              value={routeDate}
              onChange={(event) => onRouteDateChange(event.target.value)}
              className="h-12 w-full rounded-xl border border-zinc-100 bg-zinc-50 px-3 text-sm font-semibold outline-none focus:border-emerald-500 focus:bg-white"
            />
          </label>

          <label className="block rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
            <span className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold text-zinc-950">
              エリア
              <span className="text-xs font-semibold text-emerald-700">必須</span>
            </span>
            <input
              value={area}
              onChange={(event) => onAreaChange(event.target.value)}
              placeholder="例：中目黒、鎌倉、横浜"
              className="h-12 w-full rounded-xl border border-zinc-100 bg-zinc-50 px-3 text-sm outline-none placeholder:text-zinc-400 focus:border-emerald-500 focus:bg-white"
            />
            <p className="mt-2 text-xs font-medium leading-5 text-zinc-500">
              このルートの代表エリアを1つ入力
            </p>
          </label>

          <label className="block rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
            <span className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold text-zinc-950">
              移動手段
              <span className="text-xs font-semibold text-emerald-700">必須</span>
            </span>
            <select
              value={transportType}
              onChange={(event) =>
                onTransportTypeChange(event.target.value as TransportType | "")
              }
              className="h-12 w-full rounded-xl border border-zinc-100 bg-zinc-50 px-3 text-sm font-semibold outline-none focus:border-emerald-500 focus:bg-white"
            >
              <option value="">選択してください</option>
              {transportOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
            <span className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold text-zinc-950">
              一緒に行く人
              <span className="text-xs font-semibold text-zinc-400">任意</span>
            </span>
            <select
              value={companionType}
              onChange={(event) =>
                onCompanionTypeChange(event.target.value as CompanionType)
              }
              className="h-12 w-full rounded-xl border border-zinc-100 bg-zinc-50 px-3 text-sm font-semibold outline-none focus:border-emerald-500 focus:bg-white"
            >
              <option value="">未選択</option>
              {companionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
            <span className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold text-zinc-950">
              予算
              <span className="text-xs font-semibold text-zinc-400">任意</span>
            </span>
            <div className="grid grid-cols-[1fr_auto] items-center gap-2">
              <input
                inputMode="numeric"
                value={budget}
                onChange={(event) => onBudgetChange(event.target.value)}
                placeholder="2500"
                className="h-12 w-full rounded-xl border border-zinc-100 bg-zinc-50 px-3 text-sm outline-none placeholder:text-zinc-400 focus:border-emerald-500 focus:bg-white"
              />
              <span className="text-sm font-semibold text-zinc-500">円</span>
            </div>
          </label>

          <label className="block rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
            <span className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold text-zinc-950">
              おすすめ天候
              <span className="text-xs font-semibold text-zinc-400">任意</span>
            </span>
            <select
              value={weatherType}
              onChange={(event) =>
                onWeatherTypeChange(event.target.value as WeatherType)
              }
              className="h-12 w-full rounded-xl border border-zinc-100 bg-zinc-50 px-3 text-sm font-semibold outline-none focus:border-emerald-500 focus:bg-white"
            >
              <option value="">未選択</option>
              {weatherOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
            <span className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold text-zinc-950">
              キャプション
              <span className="text-xs font-semibold text-zinc-400">任意</span>
            </span>
            <textarea
              value={caption}
              onChange={(event) => onCaptionChange(event.target.value)}
              placeholder="朝から無理なく楽しめるルートです。"
              rows={4}
              className="w-full resize-none rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-3 text-sm leading-6 outline-none placeholder:text-zinc-400 focus:border-emerald-500 focus:bg-white"
            />
          </label>
        </div>

        {submitError ? (
          <p className="mx-auto mt-4 max-w-[390px] rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium leading-6 text-red-700">
            {submitError}
          </p>
        ) : null}
      </section>
      <div className="grid shrink-0 grid-cols-2 gap-3 border-t border-zinc-100 bg-white px-4 py-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={onBack}
          className="h-12 rounded-xl border border-zinc-200 bg-white text-sm font-semibold text-zinc-700"
        >
          戻る
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="h-12 rounded-xl bg-emerald-700 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          {isSubmitting ? "保存中..." : isEdit ? "変更を保存" : "投稿する"}
        </button>
      </div>
    </>
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
          className="absolute left-[68px] right-0 border-t border-dashed border-emerald-100/70"
          style={{ top: minutes * pixelsPerMinute }}
        />
      ))}
      {hours.map((hour) => (
        <div
          key={hour}
          className="absolute left-0 right-0 border-t border-zinc-200/80"
          style={{ top: hour * pixelsPerHour }}
        >
          <div className="absolute left-0 top-[-10px] w-[58px] pr-2 text-right text-[11px] font-semibold tabular-nums text-zinc-500">
            {formatTimelineTime(hour * 60)}
          </div>
          <span className="absolute left-[62px] top-[-4px] h-2 w-2 rounded-full bg-emerald-500" />
        </div>
      ))}
      <div className="absolute bottom-0 left-[68px] right-0 border-t border-zinc-200/80" />
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

  return (
    <button
      type="button"
      data-event-block
      onClick={onClick}
      className="absolute left-[72px] right-3 min-w-0 overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50 py-2 pl-4 pr-3 text-left shadow-sm transition active:scale-[0.99]"
      style={{ top, height }}
    >
      <span className="absolute bottom-2 left-2 top-2 w-1 rounded-full bg-emerald-500" />
      <p className="block min-w-0 overflow-hidden truncate text-xs font-bold tabular-nums text-emerald-700">
        {item.startTime}〜{formatTimelineTime(endMinutes)}
      </p>
      <p className="mt-0.5 block min-w-0 overflow-hidden text-ellipsis text-sm font-bold leading-5 text-zinc-950 line-clamp-2">
        {item.placeName?.trim() || item.contentName || "未設定"}
      </p>
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
      className="pointer-events-none absolute left-[72px] right-3 rounded-xl border border-emerald-500 bg-emerald-100/70 px-3 py-2 shadow-sm ring-4 ring-emerald-500/10"
      style={{ top, height }}
    >
      <p className="text-sm font-semibold tabular-nums text-emerald-900">
        {formatTimelineTime(selection.startMinutes)}〜
        {formatTimelineTime(selection.endMinutes)}
      </p>
      <p className="text-xs font-semibold text-emerald-700">
        {formatDuration(selection.endMinutes - selection.startMinutes)}
      </p>
    </div>
  );
}

function DatePickerPopover({
  refElement,
  month,
  selectedDate,
  position,
  onPreviousMonth,
  onNextMonth,
  onSelectDate,
}: {
  refElement: { current: HTMLDivElement | null };
  month: Date;
  selectedDate: string;
  position: DatePickerPosition;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onSelectDate: (date: Date) => void;
}) {
  const dates = getCalendarDates(month);
  const todayValue = formatDateInputValue(new Date());
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

  return (
    <div
      ref={refElement}
      className="fixed rounded-xl border border-zinc-200 bg-white p-3 shadow-2xl"
      style={{
        top: position.top,
        right: position.right,
        width: position.width,
        maxHeight: position.maxHeight,
        overflowY: "auto",
        zIndex: 1000,
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onPreviousMonth}
          aria-label="前の月"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 active:bg-zinc-50"
        >
          <span aria-hidden="true">‹</span>
        </button>
        <p className="text-sm font-semibold tabular-nums text-zinc-950">
          {month.getFullYear()}年{month.getMonth() + 1}月
        </p>
        <button
          type="button"
          onClick={onNextMonth}
          aria-label="次の月"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 active:bg-zinc-50"
        >
          <span aria-hidden="true">›</span>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {weekdays.map((weekday) => (
          <div key={weekday} className="py-1 text-[11px] font-semibold text-zinc-400">
            {weekday}
          </div>
        ))}
        {dates.map((date) => {
          const value = formatDateInputValue(date);
          const isSelected = value === selectedDate;
          const isToday = value === todayValue;
          const isCurrentMonth = date.getMonth() === month.getMonth();

          return (
            <button
              key={value}
              type="button"
              onClick={() => onSelectDate(date)}
              className={`flex h-9 items-center justify-center rounded-lg text-sm font-semibold tabular-nums ${
                isSelected
                  ? "bg-zinc-950 text-white"
                  : isToday
                    ? "bg-teal-50 text-teal-700 ring-1 ring-teal-200"
                    : isCurrentMonth
                      ? "text-zinc-800 active:bg-zinc-100"
                      : "text-zinc-300 active:bg-zinc-50"
              }`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EventSheet({
  draft,
  fieldError,
  onChange,
  onCancel,
  onSave,
  onRemove,
}: {
  draft: DraftEvent;
  fieldError: string | null;
  onChange: (field: keyof ScheduleContent, value: string) => void;
  onCancel: () => void;
  onSave: () => void;
  onRemove?: () => void;
}) {
  const startMinutes = toMinutes(draft.item.startTime) ?? timelineStart;
  const duration = getDurationMinutes(draft.item);
  const tags = parseTagInput(draft.item.contentName);
  const [tagDraft, setTagDraft] = useState("");

  function updateTags(nextTags: string[]) {
    onChange("contentName", formatTagInput(nextTags.join(" ")));
  }

  function addTag() {
    const nextTags = parseTagInput(tagDraft);
    if (nextTags.length === 0) return;

    updateTags([...tags, ...nextTags]);
    setTagDraft("");
  }

  function removeTag(tagToRemove: string) {
    updateTags(tags.filter((tag) => tag !== tagToRemove));
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/35 px-0">
      <div className="max-h-[90dvh] w-full max-w-[430px] overflow-y-auto rounded-t-3xl bg-white px-4 pb-[calc(18px+env(safe-area-inset-bottom))] pt-3 shadow-2xl">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-zinc-300" />
        <div className="mb-5 grid grid-cols-[64px_1fr_64px] items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 text-left text-sm font-semibold text-zinc-500"
          >
            閉じる
          </button>
          <div className="min-w-0 text-center">
            <h2 className="truncate text-base font-semibold text-zinc-950">
              {draft.index === null ? "スケジュールを追加" : "スケジュールを編集"}
            </h2>
            <p className="mt-1 text-xs font-semibold tabular-nums text-emerald-700">
              {draft.item.startTime}〜{draft.item.endTime} / {formatDuration(duration)}
            </p>
          </div>
          {onRemove ? (
            <button
              type="button"
              onClick={onRemove}
              className="h-10 rounded-full bg-red-50 px-3 text-sm font-semibold text-red-600 active:bg-red-100"
            >
              削除
            </button>
          ) : (
            <span aria-hidden="true" />
          )}
        </div>

        <div className="space-y-3">
          <label className="block rounded-2xl bg-zinc-50 p-3 ring-1 ring-zinc-100">
            <span className="flex items-center justify-between gap-3 text-xs font-semibold text-zinc-600">
              <span>店舗施設名</span>
              <span className="text-emerald-700">必須</span>
            </span>
            <input
              value={draft.item.placeName ?? ""}
              onChange={(event) => onChange("placeName", event.target.value)}
              placeholder="例：amber、マルシンスパ、フェリーチェ"
              className="mt-2 h-12 w-full rounded-xl border border-zinc-100 bg-white px-3 text-sm outline-none placeholder:text-zinc-400 focus:border-emerald-500"
            />
          </label>

          <div className="block rounded-2xl bg-zinc-50 p-3 ring-1 ring-zinc-100">
            <span className="flex items-center justify-between gap-3 text-xs font-semibold text-zinc-600">
              <span>タグ</span>
              <span className="text-zinc-400">任意</span>
            </span>
            <div className="mt-3 flex gap-2">
              <input
                value={tagDraft}
                onChange={(event) => setTagDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  addTag();
                }}
                placeholder="タグを入力"
                className="h-11 min-w-0 flex-1 rounded-xl border border-zinc-100 bg-white px-3 text-sm outline-none placeholder:text-zinc-400 focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={addTag}
                className="h-11 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white active:bg-emerald-800"
              >
                追加
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {tags.length > 0 ? (
                tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 text-sm font-semibold text-emerald-700"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="-mr-1 flex h-6 w-6 items-center justify-center rounded-full text-emerald-700 active:bg-emerald-100"
                      aria-label={`${tag}を削除`}
                    >
                      ×
                    </button>
                  </span>
                ))
              ) : (
                <p className="py-1 text-xs font-medium text-zinc-400">
                  タグはまだ追加されていません
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block rounded-2xl bg-zinc-50 p-3 ring-1 ring-zinc-100">
              <span className="text-xs font-semibold text-zinc-600">開始時刻</span>
              <select
                value={draft.item.startTime}
                onChange={(event) => onChange("startTime", event.target.value)}
                className="mt-2 h-12 w-full rounded-xl border border-zinc-100 bg-white px-3 text-sm font-semibold tabular-nums outline-none focus:border-emerald-500"
              >
                {timeOptions.slice(0, -1).map((minutes) => (
                  <option key={minutes} value={formatTimelineTime(minutes)}>
                    {formatTimelineTime(minutes)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block rounded-2xl bg-zinc-50 p-3 ring-1 ring-zinc-100">
              <span className="text-xs font-semibold text-zinc-600">終了時刻</span>
              <select
                value={draft.item.endTime}
                onChange={(event) => onChange("endTime", event.target.value)}
                className="mt-2 h-12 w-full rounded-xl border border-zinc-100 bg-white px-3 text-sm font-semibold tabular-nums outline-none focus:border-emerald-500"
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

          {fieldError ? (
            <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold leading-5 text-red-700">
              {fieldError}
            </p>
          ) : null}

          <label className="block rounded-2xl bg-zinc-50 p-3 ring-1 ring-zinc-100">
            <span className="flex items-center justify-between gap-3 text-xs font-semibold text-zinc-600">
              <span>コメント</span>
              <span className="text-zinc-400">任意</span>
            </span>
            <textarea
              value={draft.item.comment}
              onChange={(event) => onChange("comment", event.target.value)}
              placeholder="メモやおすすめポイントを入力"
              rows={4}
              className="mt-2 w-full resize-none rounded-xl border border-zinc-100 bg-white px-3 py-3 text-sm leading-6 outline-none placeholder:text-zinc-400 focus:border-emerald-500"
            />
          </label>
        </div>

        <div className="sticky bottom-0 -mx-4 mt-5 grid grid-cols-2 gap-3 border-t border-zinc-100 bg-white px-4 pt-3">
          <button
            type="button"
            onClick={onCancel}
            className="h-12 rounded-xl border border-zinc-200 bg-white text-sm font-semibold text-zinc-700 active:bg-zinc-50"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={onSave}
            className="h-12 rounded-xl bg-emerald-700 text-sm font-semibold text-white active:bg-emerald-800"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
