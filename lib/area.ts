export function normalizeArea(value: string | null | undefined): string {
  if (!value) return "";

  return value
    .replace(/^📍️?\s*/u, "")
    .replace(/^[\s　]+|[\s　]+$/g, "")
    .replace(/[\s　]+/g, " ")
    .replace(/\s*エリア$/u, "")
    .replace(/^[\s　]+|[\s　]+$/g, "");
}

export function formatAreaLabel(value: string | null | undefined): string {
  const normalized = normalizeArea(value);

  return normalized ? `📍 ${normalized}エリア` : "";
}
