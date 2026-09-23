"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

export type StoryPost = {
  title: string;
  area: string | null;
  companion_type: string | null;
  caption: string | null;
  route_date?: string | null;
};

export type StoryProfile = {
  display_name: string | null;
  username: string | null;
};

export type StoryItem = {
  id: string;
  start_time: string | null;
  end_time: string | null;
  content_name: string | null;
  place_name: string | null;
  comment: string | null;
  image_url: string | null;
  stay_duration: string | number | null;
  spot_name: string | null;
};

type StoryDetail = { post: StoryPost; profile: StoryProfile | null; scheduleItems: StoryItem[] };

function text(value?: string | number | null) { return value === null || value === undefined ? "" : String(value).trim(); }
function time(item: StoryItem) { return text(item.start_time) || ""; }
function spot(item: StoryItem) { return text(item.place_name) || text(item.content_name) || text(item.spot_name) || "スポット未設定"; }
function author(profile: StoryProfile | null) { return text(profile?.display_name) || text(profile?.username) || "ROUTY User"; }
function dateLabel(value?: string | null) { if (!value) return ""; const date = new Date(`${value}T00:00:00`); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" }); }

export function StoryPostViewer({ detail, isLoading, onClose, onSave, isSaved, isSaving, onShare, onEdit, onDelete, canManage, isOwner, isDeleting }: { detail: StoryDetail; isLoading: boolean; onClose: () => void; onSave: () => void; isSaved: boolean; isSaving: boolean; onShare?: () => void; onEdit?: () => void; onDelete?: () => void; canManage?: boolean; isOwner?: boolean; isDeleting?: boolean }) {
  const items = detail.scheduleItems;
  const slides = useMemo(() => [...items, null], [items]);
  const [index, setIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const current = slides[index];

  useEffect(() => {
    const next = slides[index + 1];
    if (next?.image_url) { const image = new window.Image(); image.src = next.image_url; }
  }, [index, slides]);
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) { if (event.key === "ArrowRight") setIndex((value) => Math.min(slides.length - 1, value + 1)); if (event.key === "ArrowLeft") setIndex((value) => Math.max(0, value - 1)); }
    window.addEventListener("keydown", onKeyDown); return () => window.removeEventListener("keydown", onKeyDown);
  }, [slides.length]);

  function move(delta: number) { setIndex((value) => Math.max(0, Math.min(slides.length - 1, value + delta))); }
  if (isLoading) return <div className="flex min-h-dvh items-center justify-center bg-zinc-950 text-sm text-white/70">コンテンツを読み込み中...</div>;

  return <section className="fixed inset-0 z-50 min-h-dvh overflow-hidden bg-zinc-950 text-white" aria-label="投稿ストーリー">
    <div className="absolute left-3 right-3 top-3 z-30 flex gap-1.5" aria-label={`全${slides.length}枚中${index + 1}枚目`}>
      {slides.map((_, itemIndex) => <span key={itemIndex} className={`h-1 flex-1 rounded-full ${itemIndex <= index ? "bg-white" : "bg-white/35"}`} />)}
    </div>
    <div className="absolute left-4 right-4 top-7 z-30 flex items-center justify-between gap-2">
      <div className="flex gap-2">
        <button type="button" onClick={(event) => { event.stopPropagation(); onSave(); }} disabled={isSaving} className="rounded-full bg-black/45 px-3 py-2 text-xs font-bold backdrop-blur">{isSaved ? "保存済み" : "保存"}</button>
        {isOwner && onShare ? <button type="button" onClick={(event) => { event.stopPropagation(); onShare(); }} className="rounded-full bg-black/45 px-3 py-2 text-xs font-bold backdrop-blur">共有</button> : null}
        {canManage && onEdit ? <button type="button" onClick={(event) => { event.stopPropagation(); onEdit(); }} className="rounded-full bg-black/45 px-3 py-2 text-xs font-bold backdrop-blur">編集</button> : null}
        {canManage && onDelete ? <button type="button" onClick={(event) => { event.stopPropagation(); onDelete(); }} disabled={isDeleting} className="rounded-full bg-black/45 px-3 py-2 text-xs font-bold text-red-200 backdrop-blur">{isDeleting ? "削除中" : "削除"}</button> : null}
      </div>
      <div className="flex gap-2">
      <button type="button" onClick={(event) => { event.stopPropagation(); setIndex(slides.length - 1); }} className="rounded-full bg-black/45 px-3 py-2 text-xs font-bold backdrop-blur">しおり</button>
      <button type="button" onClick={(event) => { event.stopPropagation(); onClose(); }} className="rounded-full bg-black/45 px-3 py-2 text-xs font-bold backdrop-blur">閉じる</button>
      </div>
    </div>
    <div className="pointer-events-none absolute inset-0 z-20 grid grid-cols-2" aria-hidden="true">
      <button type="button" aria-label="前のスライド" onClick={() => move(-1)} className="pointer-events-auto cursor-default" />
      <button type="button" aria-label="次のスライド" onClick={() => move(1)} className="pointer-events-auto cursor-default" />
    </div>
    <div className="relative z-10 min-h-[calc(100dvh-3.5rem)]">
      {current ? <StoryContentSlide item={current} index={index} total={items.length} detail={detail} failed={failedImages.has(current.id)} onImageError={() => setFailedImages((value) => new Set(value).add(current.id))} /> : <StorySummarySlide detail={detail} onSave={onSave} isSaved={isSaved} isSaving={isSaving} />}
    </div>
  </section>;
}

function StoryContentSlide({ item, index, total, detail, failed, onImageError }: { item: StoryItem; index: number; total: number; detail: StoryDetail; failed: boolean; onImageError: () => void }) {
  const image = text(item.image_url) && !failed;
  const content = <div className="relative z-10 flex max-h-[72dvh] w-full max-w-[620px] flex-col justify-end overflow-y-auto px-6 pb-10 pt-24 [text-shadow:0_1px_4px_rgba(0,0,0,.6)]"><p className="text-sm font-bold text-white/80">{author(detail.profile)} · {index + 1} / {total} スポット</p><p className="mt-2 text-2xl font-black leading-tight">{spot(item)}</p>{time(item) ? <p className="mt-2 text-base font-bold">{time(item)}{item.end_time ? `〜${item.end_time}` : ""}</p> : null}{text(item.comment) ? <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-white/90">{item.comment}</p> : null}{text(item.stay_duration) ? <p className="mt-3 text-xs font-semibold text-white/80">滞在時間 {text(item.stay_duration)}</p> : null}{detail.post.caption && index === 0 ? <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-white/85">{detail.post.caption}</p> : null}{detail.post.route_date ? <p className="mt-4 text-xs font-semibold text-white/70">{dateLabel(detail.post.route_date)}</p> : null}</div>;
  return <article className={`relative flex min-h-dvh items-end overflow-hidden ${image ? "bg-zinc-900" : "bg-gradient-to-br from-[#244636] via-[#52735d] to-[#1d2d29]"}`}>{image ? <Image src={text(item.image_url)} alt={`${spot(item)}の写真`} fill unoptimized sizes="100vw" className="object-cover" onError={onImageError} /> : null}<div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/85" />{!image ? <span className="absolute left-6 top-24 rounded-full border border-white/30 bg-black/20 px-3 py-1 text-xs font-bold text-white/80">写真なし</span> : null}{content}</article>;
}

function StorySummarySlide({ detail, onSave, isSaved, isSaving }: { detail: StoryDetail; onSave: () => void; isSaved: boolean; isSaving: boolean }) {
  return <article className="min-h-dvh overflow-y-auto bg-[#fffcf7] px-5 pb-12 pt-24 text-zinc-900"><div className="mx-auto max-w-[620px]"><p className="text-xs font-bold tracking-[.18em] text-emerald-700">ROUTY JOURNAL</p><h1 className="mt-3 break-words text-3xl font-black leading-tight">{detail.post.title}</h1><p className="mt-3 text-sm font-semibold text-zinc-500">{author(detail.profile)}</p>{detail.post.area ? <p className="mt-5 text-sm font-bold text-emerald-800">{detail.post.area}</p> : null}{detail.post.companion_type ? <p className="mt-1 text-sm text-zinc-600">{detail.post.companion_type}</p> : null}{detail.post.caption ? <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-zinc-700">{detail.post.caption}</p> : null}<div className="relative mt-8 border-l-2 border-emerald-200 pl-5">{detail.scheduleItems.map((item) => <div key={item.id} className="relative mb-6 last:mb-0"><span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-[#fffcf7] bg-emerald-600" /><p className="text-xs font-bold tabular-nums text-emerald-700">{time(item) || "時刻未設定"}{item.end_time ? `〜${item.end_time}` : ""}</p><h2 className="mt-1 break-words text-lg font-black">{spot(item)}</h2>{text(item.comment) ? <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-zinc-600">{item.comment}</p> : null}{text(item.stay_duration) ? <p className="mt-1 text-xs font-semibold text-zinc-500">滞在時間 {text(item.stay_duration)}</p> : null}</div>)}</div><button type="button" onClick={(event) => { event.stopPropagation(); onSave(); }} disabled={isSaving} className={`mt-9 h-12 w-full rounded-full text-sm font-bold ${isSaved ? "bg-emerald-700 text-white" : "border border-emerald-200 bg-white text-emerald-800"}`}>{isSaving ? "保存中..." : isSaved ? "保存済み" : "保存する"}</button></div></article>;
}
