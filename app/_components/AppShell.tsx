import { BottomNav } from "./BottomNav";

export function AppShell({
  children,
  contentClassName = "max-w-[430px]",
}: {
  children: React.ReactNode;
  contentClassName?: string;
}) {
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-zinc-50 text-zinc-950">
      <main
        className={`mx-auto min-h-screen w-full overflow-x-hidden bg-white pb-24 ${contentClassName}`}
      >
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
