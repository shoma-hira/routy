"use client";

import { useEffect, useState } from "react";
import {
  CreateBookmarkForm,
  normalizeScheduleItem,
  type BookmarkFormValue,
  type ScheduleContent,
} from "../../../_components/CreateBookmarkForm";
import { supabase } from "@/lib/supabase";
import {
  getCurrentUserId,
  getReadableSupabaseError,
} from "@/lib/savedPosts";

type PostRow = {
  id: string;
  user_id: string;
  title: string;
  cover_image_url: string | null;
  type: string | null;
  is_published: boolean;
  route_date: string | null;
  area: string | null;
  transport_type: string | null;
  companion_type: string | null;
  budget: number | null;
  weather_type: string | null;
  caption: string | null;
};

type ScheduleItemRow = {
  id: string;
  post_id: string;
  sort_order: number | null;
  start_time: string | null;
  end_time: string | null;
  content_name: string | null;
  place_name: string | null;
  time: string | null;
  spot_name: string | null;
  stay_duration: string | null;
  comment: string | null;
  image_url: string | null;
};

function getErrorMessage(error: unknown) {
  return getReadableSupabaseError(error, "投稿の編集情報を取得できませんでした。");
}

function toScheduleContent(row: ScheduleItemRow): ScheduleContent {
  return normalizeScheduleItem(row);
}

function toFormValue(
  post: PostRow,
  scheduleItems: ScheduleItemRow[],
): BookmarkFormValue {
  const schedule = scheduleItems.length
    ? scheduleItems.map(toScheduleContent)
    : [toScheduleContent({
        id: "empty",
        post_id: post.id,
        sort_order: 0,
        start_time: null,
        end_time: null,
        content_name: null,
        place_name: null,
        time: null,
        spot_name: null,
        stay_duration: null,
        comment: null,
        image_url: null,
      })];

  return {
    title: post.title,
    coverImageUrl: post.cover_image_url ?? "",
    cover_image_url: post.cover_image_url,
    existingThumbnailUrl: post.cover_image_url,
    type: post.type,
    isPublished: post.is_published,
    routeDate: post.route_date,
    route_date: post.route_date,
    area: post.area,
    transportType: post.transport_type,
    transport_type: post.transport_type,
    companionType: post.companion_type,
    companion_type: post.companion_type,
    budget: post.budget,
    weatherType: post.weather_type,
    weather_type: post.weather_type,
    caption: post.caption,
    plannedSchedule: post.type === "actual" ? [] : schedule,
    actualSchedule: post.type === "actual" ? schedule : [],
  };
}

export function EditBookmarkClient({ postId }: { postId: string }) {
  const [initialValue, setInitialValue] = useState<BookmarkFormValue | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadPost() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const userId = await getCurrentUserId();
        const { data: post, error: postError } = await supabase
          .from("posts")
          .select(
            "id,user_id,title,cover_image_url,type,is_published,route_date,area,transport_type,companion_type,budget,weather_type,caption",
          )
          .eq("id", postId)
          .maybeSingle();

        if (postError) {
          throw postError;
        }

        if (!post) {
          throw new Error("投稿が見つかりません。");
        }

        if (post.user_id !== userId) {
          throw new Error("この投稿を編集する権限がありません。");
        }

        const { data: scheduleItems, error: scheduleError } = await supabase
          .from("schedule_items")
          .select(
            "id,post_id,sort_order,start_time,end_time,content_name,place_name,time,spot_name,stay_duration,comment,image_url",
          )
          .eq("post_id", postId)
          .order("sort_order", { ascending: true });

        if (scheduleError) {
          throw scheduleError;
        }

        if (isMounted) {
          setInitialValue(
            toFormValue(
              post as PostRow,
              (scheduleItems ?? []) as ScheduleItemRow[],
            ),
          );
        }
      } catch (error) {
        console.error("ROUTY edit post load failed", error);
        if (isMounted) {
          setInitialValue(null);
          setErrorMessage(getErrorMessage(error));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadPost();

    return () => {
      isMounted = false;
    };
  }, [postId]);

  if (isLoading) {
    return (
      <div className="px-4 py-10 text-center text-sm font-medium text-zinc-500">
        読み込み中...
      </div>
    );
  }

  if (errorMessage || !initialValue) {
    return (
      <div className="px-4 py-4">
        <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700">
          {errorMessage ?? "投稿の編集情報を取得できませんでした。"}
        </p>
      </div>
    );
  }

  return (
    <CreateBookmarkForm
      mode="edit"
      postId={postId}
      initialValue={initialValue}
      returnHref={`/posts/${postId}`}
    />
  );
}
