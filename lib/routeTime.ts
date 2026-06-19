export function parseRouteTimeToMinutes(time?: string | null) {
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

  return hour * 60 + minute;
}

export function parseDurationMinutes(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  const text = String(value).trim().toLowerCase();
  const plainNumber = text.match(/^(\d+)$/);
  if (plainNumber) return Number(plainNumber[1]);

  const hourMatch = text.match(/(\d+)\s*(?:時間|hours?|h)/);
  const minuteMatch = text.match(/(\d+)\s*(?:分|minutes?|mins?|m)/);
  const hours = hourMatch ? Number(hourMatch[1]) : 0;
  const minutes = minuteMatch ? Number(minuteMatch[1]) : 0;
  const total = hours * 60 + minutes;

  return total > 0 ? total : null;
}

export function formatRouteDuration(minutes: number) {
  if (!Number.isFinite(minutes) || minutes <= 0) return "時間未設定";
  if (minutes < 60) return `${minutes}分`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return rest ? `${hours}時間${rest}分` : `${hours}時間`;
}

export function formatRouteTime(minutes: number) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
