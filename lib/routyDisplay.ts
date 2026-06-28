import { normalizeArea } from "@/lib/area";

export type RoutyDisplayPostSource = {
  id: string;
  user_id?: string | null;
  title?: string | null;
  route_date?: string | null;
  area?: string | null;
  transport_type?: string | null;
  companion_type?: string | null;
  budget?: number | null;
  weather_type?: string | null;
  caption?: string | null;
  cover_image_url?: string | null;
  type?: string | null;
  is_published?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type RoutyDisplayScheduleItemSource = {
  id?: string | null;
  post_id?: string | null;
  sort_order?: number | null;
  start_time?: string | null;
  end_time?: string | null;
  content_name?: string | null;
  place_name?: string | null;
  comment?: string | null;
  image_url?: string | null;
  time?: string | null;
  spot_name?: string | null;
  stay_duration?: string | number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type RoutyDisplayScheduleItem<
  TRaw extends RoutyDisplayScheduleItemSource = RoutyDisplayScheduleItemSource,
> = {
  raw: TRaw;
  displayNumber: number;
  sortOrder: number;
  startTime: string | null;
  endTime: string | null;
  contentName: string;
  placeName: string;
  comment: string;
  imageUrl: string | null;
  displayTime: string;
  displayTitle: string;
  displaySubtitle: string;
  displayNote: string;
};

export type RoutyDisplayPost<
  TPost extends RoutyDisplayPostSource = RoutyDisplayPostSource,
  TScheduleItem extends RoutyDisplayScheduleItemSource = RoutyDisplayScheduleItemSource,
> = {
  raw: TPost;
  id: string;
  title: string;
  caption: string;
  area: string;
  transportType: string | null;
  budget: number | null;
  companionType: string | null;
  coverImageUrl: string | null;
  tags: string[];
  durationMinutes: number | null;
  scheduleItems: RoutyDisplayScheduleItem<TScheduleItem>[];
};

function cleanText(value?: string | null) {
  return value?.trim() ?? "";
}

function normalizeTagToken(value?: string | null) {
  const tag = cleanText(value).replace(/^[#＃]+/, "");

  return tag ? `#${tag}` : "";
}

export function parseRoutyDisplayTags(value?: string | null) {
  const tags = cleanText(value)
    .replace(/[\r\n]+/g, " ")
    .split(/\s+/)
    .map(normalizeTagToken)
    .filter(Boolean);

  return Array.from(new Set(tags));
}

function parseTimeToMinutes(value?: string | null) {
  const text = cleanText(value);
  if (!text) return null;

  const match = text.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);

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

  return hour * 60 + minute;
}

function formatTime(value?: string | null) {
  const minutes = parseTimeToMinutes(value);
  if (minutes === null) return cleanText(value);

  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function compareNullableNumbers(a: number | null, b: number | null) {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;

  return a - b;
}

function compareNullableDates(a?: string | null, b?: string | null) {
  const aTime = a ? Date.parse(a) : Number.NaN;
  const bTime = b ? Date.parse(b) : Number.NaN;
  const aValue = Number.isFinite(aTime) ? aTime : null;
  const bValue = Number.isFinite(bTime) ? bTime : null;

  return compareNullableNumbers(aValue, bValue);
}

function getScheduleSortOrder(
  item: RoutyDisplayScheduleItemSource,
  fallbackIndex: number,
) {
  return typeof item.sort_order === "number" ? item.sort_order : fallbackIndex;
}

export function sortRoutyDisplayScheduleItems<
  TScheduleItem extends RoutyDisplayScheduleItemSource,
>(items: TScheduleItem[]) {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const sortOrderDiff =
        getScheduleSortOrder(a.item, a.index) -
        getScheduleSortOrder(b.item, b.index);
      if (sortOrderDiff !== 0) return sortOrderDiff;

      const startTimeDiff = compareNullableNumbers(
        parseTimeToMinutes(a.item.start_time ?? a.item.time),
        parseTimeToMinutes(b.item.start_time ?? b.item.time),
      );
      if (startTimeDiff !== 0) return startTimeDiff;

      const createdAtDiff = compareNullableDates(
        a.item.created_at,
        b.item.created_at,
      );
      if (createdAtDiff !== 0) return createdAtDiff;

      return a.index - b.index;
    })
    .map(({ item }) => item);
}

function getDisplayTime(item: RoutyDisplayScheduleItemSource) {
  const startTime = formatTime(item.start_time ?? item.time);
  const endTime = formatTime(item.end_time);

  if (startTime && endTime) return `${startTime}〜${endTime}`;
  if (startTime) return startTime;
  if (endTime) return endTime;

  return "";
}

function getContentName(item: RoutyDisplayScheduleItemSource) {
  return cleanText(item.content_name) || cleanText(item.spot_name);
}

function getDisplayTitle(item: RoutyDisplayScheduleItemSource) {
  return cleanText(item.place_name) || getContentName(item);
}

function getDisplaySubtitle(item: RoutyDisplayScheduleItemSource) {
  const contentName = getContentName(item);
  const placeName = cleanText(item.place_name);

  return placeName && contentName !== placeName ? contentName : "";
}

export function toRoutyDisplayScheduleItems<
  TScheduleItem extends RoutyDisplayScheduleItemSource,
>(items: TScheduleItem[]): RoutyDisplayScheduleItem<TScheduleItem>[] {
  return sortRoutyDisplayScheduleItems(items).map((item, index) => {
    const startTime = cleanText(item.start_time ?? item.time) || null;
    const endTime = cleanText(item.end_time) || null;
    const contentName = getContentName(item);
    const placeName = cleanText(item.place_name);

    return {
      raw: item,
      displayNumber: index + 1,
      sortOrder: getScheduleSortOrder(item, index),
      startTime,
      endTime,
      contentName,
      placeName,
      comment: cleanText(item.comment),
      imageUrl: cleanText(item.image_url) || null,
      displayTime: getDisplayTime(item),
      displayTitle: getDisplayTitle(item),
      displaySubtitle: getDisplaySubtitle(item),
      displayNote: cleanText(item.comment),
    };
  });
}

export function getRoutyDisplayDurationMinutes(
  items: RoutyDisplayScheduleItemSource[],
) {
  let firstStart: number | null = null;
  let lastEnd: number | null = null;

  for (const item of items) {
    const start = parseTimeToMinutes(item.start_time ?? item.time);
    const end = parseTimeToMinutes(item.end_time);
    if (start === null) continue;

    firstStart = firstStart === null ? start : Math.min(firstStart, start);

    if (end !== null && end > start) {
      lastEnd = lastEnd === null ? end : Math.max(lastEnd, end);
      continue;
    }

    lastEnd = lastEnd === null ? start : Math.max(lastEnd, start);
  }

  if (firstStart === null || lastEnd === null || lastEnd <= firstStart) {
    return null;
  }

  return lastEnd - firstStart;
}

function addUniqueTag(tags: string[], value?: string | null) {
  for (const normalized of parseRoutyDisplayTags(value)) {
    if (!normalized || tags.includes(normalized)) continue;

    tags.push(normalized);
  }
}

function getDisplayTags(
  post: RoutyDisplayPostSource,
  scheduleItems: RoutyDisplayScheduleItemSource[],
) {
  const tags: string[] = [];

  addUniqueTag(tags, normalizeArea(post.area));
  addUniqueTag(tags, post.transport_type);
  addUniqueTag(tags, post.companion_type);

  for (const item of scheduleItems) {
    addUniqueTag(tags, getContentName(item));
  }

  return tags;
}

export function toRoutyDisplayPost<
  TPost extends RoutyDisplayPostSource,
  TScheduleItem extends RoutyDisplayScheduleItemSource,
>({
  post,
  scheduleItems,
}: {
  post: TPost;
  scheduleItems: TScheduleItem[];
}): RoutyDisplayPost<TPost, TScheduleItem> {
  const displayScheduleItems = toRoutyDisplayScheduleItems(scheduleItems);
  const sortedRawScheduleItems = displayScheduleItems.map((item) => item.raw);

  return {
    raw: post,
    id: post.id,
    title: cleanText(post.title),
    caption: cleanText(post.caption),
    area: normalizeArea(post.area),
    transportType: cleanText(post.transport_type) || null,
    budget: post.budget ?? null,
    companionType: cleanText(post.companion_type) || null,
    coverImageUrl: cleanText(post.cover_image_url) || null,
    tags: getDisplayTags(post, sortedRawScheduleItems),
    durationMinutes: getRoutyDisplayDurationMinutes(sortedRawScheduleItems),
    scheduleItems: displayScheduleItems,
  };
}
