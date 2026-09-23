"use client";

import { useMemo, useState } from "react";
import { CreateBookmarkForm, type BookmarkFormValue, type ScheduleContent } from "./CreateBookmarkForm";
import { readPhotoDraft, toDateKey, toDraftTime, type PhotoDraftPhoto } from "@/lib/photoDraft";

function makeItem(photo: PhotoDraftPhoto, index: number, selectedDate: string): ScheduleContent {
  const startTime = toDraftTime(photo.capturedAt);
  const endMinutes = startTime ? (Number(startTime.slice(0, 2)) * 60 + Number(startTime.slice(3)) + 60) : 60;
  const endTime = startTime ? `${String(Math.min(26, Math.floor(endMinutes / 60))).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}` : "02:00";
  return {
    clientId: photo.id,
    contentName: "",
    placeName: "",
    startDate: selectedDate,
    startTime,
    endDate: selectedDate,
    endTime: startTime ? endTime : "",
    comment: "",
    stayDuration: startTime ? "60分（写真から仮入力）" : "",
    imageFile: null,
    imagePreviewUrl: photo.dataUrl,
    imageUrl: "",
    isPhotoDraft: true,
    photoSourceLabel: photo.capturedAt ? "写真から仮入力" : "写真（時刻未取得・未配置）",
    photoDraftId: photo.id,
    isTouched: false,
    contentCategory: "",
    contentDetail: "",
  } as ScheduleContent;
}

function dataUrlToFile(dataUrl: string, name: string) {
  const [header, body] = dataUrl.split(",");
  const binary = atob(body);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new File([bytes], name, { type: header.match(/data:([^;]+)/)?.[1] || "image/jpeg" });
}

export function PhotoDraftEntry() {
  const [photos, setPhotos] = useState<PhotoDraftPhoto[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [processing, setProcessing] = useState(false);
  const [editor, setEditor] = useState<BookmarkFormValue | null>(null);

  const dates = useMemo(() => Array.from(new Set(photos.map((p) => toDateKey(p.capturedAt)).filter(Boolean))) as string[], [photos]);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setProcessing(true);
    const next: PhotoDraftPhoto[] = [];
    for (const [index, file] of Array.from(files).entries()) {
      if (!file.type.startsWith("image/") || !(file.type === "image/jpeg" || file.type === "image/png" || file.type === "image/webp")) {
        next.push({ id: `${index}-${file.name}`, name: file.name, dataUrl: "", capturedAt: null, latitude: null, longitude: null, parseError: "JPEG、PNG、WebPのみ対応しています。写真なし作成へ進めます。" });
        continue;
      }
      try { next.push(await readPhotoDraft(file, index)); } catch { next.push({ id: `${index}-${file.name}`, name: file.name, dataUrl: "", capturedAt: null, latitude: null, longitude: null, parseError: "写真の読み取りに失敗しました" }); }
    }
    setPhotos((current) => [...current, ...next]);
    const nextDates = Array.from(new Set(next.map((p) => toDateKey(p.capturedAt)).filter(Boolean))) as string[];
    if (!selectedDate && nextDates.length) { setSelectedDate(nextDates[0]); setTargetDate(nextDates[0]); }
    setProcessing(false);
  }

  async function createDraft() {
    const date = targetDate || selectedDate || dates[0] || new Date().toISOString().slice(0, 10);
    const usable = photos.filter((p) => p.dataUrl).filter((p) => !p.capturedAt || toDateKey(p.capturedAt) === date);
    setEditor({ title: "", routeDate: date, area: "", transportType: "", caption: "", plannedSchedule: usable.map((p, i) => ({ ...makeItem(p, i, date), imageFile: dataUrlToFile(p.dataUrl, p.name) })), actualSchedule: [], isPhotoDraft: true });
  }

  if (editor) return <CreateBookmarkForm initialValue={editor} />;

  return <div className="min-h-[100dvh] bg-[#FFFEFB] px-5 py-8"><div className="mx-auto max-w-[430px]"><h1 className="text-2xl font-bold text-zinc-950">写真からしおりを作成</h1><p className="mt-2 text-sm leading-6 text-zinc-600">写真の撮影日時を予定の仮入力に使います。店名・時間・場所はカレンダー画面で確認して修正できます。</p><label className="mt-6 flex h-32 cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-emerald-200 bg-white text-sm font-bold text-emerald-700"><input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple className="sr-only" onChange={(e) => { void handleFiles(e.target.files); e.target.value = ""; }} />写真を選択（複数可）</label>{processing ? <p className="mt-4 text-sm font-semibold text-emerald-700">写真を解析しています...</p> : null}{photos.length ? <div className="mt-5 space-y-3">{dates.length > 1 ? <label className="block rounded-xl bg-white p-4 text-sm font-semibold">対象日<select className="mt-2 h-11 w-full rounded-lg border px-3" value={targetDate} onChange={(e) => setTargetDate(e.target.value)}>{dates.map((date) => <option key={date}>{date}</option>)}</select><span className="mt-2 block text-xs font-normal text-zinc-500">別の日付・日付不明の写真は未配置で保持します。</span></label> : null}{photos.map((photo) => <div key={photo.id} className="flex items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-zinc-100">{photo.dataUrl ? <img src={photo.dataUrl} alt="" className="h-16 w-16 rounded-lg object-cover" /> : <div className="h-16 w-16 rounded-lg bg-zinc-100" />}<div className="min-w-0"><p className="truncate text-sm font-semibold">{photo.name}</p><p className="text-xs text-zinc-500">{photo.capturedAt ? `${photo.capturedAt.replace("T", " ")}（仮入力）` : "撮影日時なし・未配置"}</p>{photo.parseError ? <p className="text-xs text-amber-700">{photo.parseError}</p> : null}</div></div>)}<button type="button" disabled={processing} onClick={() => void createDraft()} className="h-12 w-full rounded-xl bg-emerald-700 text-sm font-bold text-white disabled:bg-zinc-300">写真から下書きを作成</button></div> : null}<button type="button" onClick={() => setEditor({ title: "", routeDate: "", area: "", transportType: "", plannedSchedule: [], actualSchedule: [] })} className="mt-4 h-12 w-full rounded-xl border border-zinc-200 bg-white text-sm font-bold text-zinc-700">写真を使わず作成</button></div></div>;
}
