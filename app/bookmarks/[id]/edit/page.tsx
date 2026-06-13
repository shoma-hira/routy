import { AppShell } from "../../../_components/AppShell";
import { EditBookmarkClient } from "./EditBookmarkClient";

export default async function EditBookmarkPage(
  props: PageProps<"/bookmarks/[id]/edit">,
) {
  const { id } = await props.params;

  return (
    <AppShell>
      <EditBookmarkClient postId={id} />
    </AppShell>
  );
}
