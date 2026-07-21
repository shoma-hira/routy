import { BottomNav } from "./BottomNav";

export function AppShell({
  children,
  contentClassName = "max-w-[430px]",
  reserveBottomNavSpace = true,
}: {
  children: React.ReactNode;
  contentClassName?: string;
  reserveBottomNavSpace?: boolean;
}) {
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-zinc-50 text-zinc-950">
      <main
        className={`mx-auto min-h-screen w-full overflow-x-hidden bg-white ${
          reserveBottomNavSpace
            ? "pb-[calc(7.75rem+env(safe-area-inset-bottom))]"
            : ""
        } ${contentClassName}`}
      >
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
