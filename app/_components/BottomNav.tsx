"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/home", label: "ホーム", id: "home" },
  { href: "/bookmarks/new", label: "作成", id: "create" },
  { href: "/mypage", label: "マイページ", id: "mypage" },
];

function NavIcon({ id }: { id: string }) {
  if (id === "home") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-6 w-6">
        <path
          d="M3.75 10.5 12 3.75l8.25 6.75v8.25a1.5 1.5 0 0 1-1.5 1.5h-4.5v-6h-4.5v6h-4.5a1.5 1.5 0 0 1-1.5-1.5V10.5Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (id === "create") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-6 w-6">
        <rect x="3.75" y="3.75" width="16.5" height="16.5" rx="5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-6 w-6">
      <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5.5 20c.45-3.55 2.6-5.5 6.5-5.5s6.05 1.95 6.5 5.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="メインナビゲーション"
      className="pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] left-1/2 z-30 flex -translate-x-1/2 items-center justify-center gap-3.5"
    >
      {navItems.map((item) => {
        const active =
          item.id === "home"
            ? pathname === "/home"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.id}
            href={item.href}
            aria-label={item.label}
            aria-current={active ? "page" : undefined}
            className={`pointer-events-auto flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-full border shadow-[0_8px_24px_rgba(17,24,39,0.14)] transition active:scale-95 ${
              active
                ? "border-[#28B83F] bg-[#28B83F] text-white"
                : "border-white/90 bg-[#FFFEFB]/95 text-zinc-400 backdrop-blur-xl hover:text-zinc-600"
            }`}
          >
            <NavIcon id={item.id} />
            <span className="sr-only">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
