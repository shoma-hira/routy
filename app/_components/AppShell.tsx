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
          reserveBottomNavSpace ? "pb-24" : ""
        } ${contentClassName}`}
      >
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
