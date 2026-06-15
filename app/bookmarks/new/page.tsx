import { AppShell } from "../../_components/AppShell";
import { CreateBookmarkForm } from "../../_components/CreateBookmarkForm";

export default function NewBookmarkPage() {
  return (
    <AppShell reserveBottomNavSpace={false}>
      <CreateBookmarkForm />
    </AppShell>
  );
}
