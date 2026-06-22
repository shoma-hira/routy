"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/home", label: "ホーム", icon: "H", id: "home" },
  { href: "/bookmarks/new", label: "しおり作成", icon: "+", id: "create" },
  { href: "/mypage", label: "マイページ", icon: "M", id: "mypage" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 z-20 w-full max-w-[430px] -translate-x-1/2 border-t border-[#D8F0DD] bg-white/95 backdrop-blur">
      <div className="grid h-16 w-full grid-cols-3 px-3 pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => {
          const active =
            item.id === "home"
              ? pathname === "/home"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const isActiveHome = active && item.id === "home";

          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 text-[11px] font-semibold ${
                isActiveHome ? "text-[#28B83F]" : active ? "text-zinc-950" : "text-zinc-400"
              }`}
            >
              <span
                className={`flex h-6 min-w-6 items-center justify-center rounded-full text-xs font-bold leading-none ${
                  isActiveHome ? "bg-[#F1FAF3]" : ""
                }`}
              >
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
