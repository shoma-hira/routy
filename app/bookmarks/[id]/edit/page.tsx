import { AppShell } from "../../../_components/AppShell";
import {
  CreateBookmarkForm,
  type BookmarkFormValue,
} from "../../../_components/CreateBookmarkForm";
import { getPostDetail, posts, type RoutyPostDetail } from "../../../_data/posts";

export async function generateStaticParams() {
  return posts.map((post) => ({ id: post.id }));
}

function toFormValue(post: RoutyPostDetail): BookmarkFormValue {
  const defaultDate = "2026-06-06";

  return {
    title: post.title,
    plannedSchedule: post.plannedSchedule.map((item, index) => ({
      contentName: item.place,
      startDate: defaultDate,
      startTime: item.time,
      endDate: defaultDate,
      endTime: "",
      comment: post.schedule[index]?.comment ?? "",
    })),
    actualSchedule: post.actualSchedule.map((item, index) => ({
      contentName: item.place,
      startDate: defaultDate,
      startTime: item.time,
      endDate: defaultDate,
      endTime: "",
      comment: post.schedule[index]?.comment ?? "",
    })),
  };
}

export default async function EditBookmarkPage(
  props: PageProps<"/bookmarks/[id]/edit">,
) {
  const { id } = await props.params;
  const post = getPostDetail(id);

  return (
    <AppShell>
      <CreateBookmarkForm
        mode="edit"
        initialValue={toFormValue(post)}
        returnHref={`/posts/${post.id}`}
      />
    </AppShell>
  );
}
