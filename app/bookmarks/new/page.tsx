import { AppShell } from "../../_components/AppShell";
import { PhotoDraftEntry } from "../../_components/PhotoDraftEntry";

export default function NewBookmarkPage() {
  return (
    <AppShell reserveBottomNavSpace={false}>
      <PhotoDraftEntry />
    </AppShell>
  );
}
