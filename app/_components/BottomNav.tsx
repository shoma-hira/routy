"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/home", label: "ホーム", icon: "H", id: "home" },
  { href: "/home#search", label: "検索", icon: "S", id: "search" },
  { href: "/mypage", label: "マイページ", icon: "M", id: "mypage" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 z-20 w-full max-w-[430px] -translate-x-1/2 border-t border-zinc-200 bg-white/95 backdrop-blur">
      <div className="grid h-16 w-full grid-cols-3 px-3 pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => {
          const active =
            item.id === "search"
              ? false
              : item.id === "home"
                ? pathname === "/home"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium ${
                active ? "text-zinc-950" : "text-zinc-400"
              }`}
            >
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full text-xs font-semibold leading-none">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
