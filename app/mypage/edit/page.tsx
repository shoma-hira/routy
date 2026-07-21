import type { Metadata } from "next";
import Link from "next/link";
import { ProfileEditClient } from "./ProfileEditClient";

export const metadata: Metadata = {
  title: "プロフィールを編集 | ROUTY",
};

export default function ProfileEditPage() {
  return (
    <main className="min-h-dvh bg-[#FCFBF7] px-5 py-8 text-zinc-950 sm:py-12">
      <div className="mx-auto w-full max-w-[430px]">
        <header className="mb-8">
          <Link
            href="/mypage"
            className="inline-flex min-h-10 items-center gap-2 rounded-full px-1 text-sm font-bold text-zinc-600 transition hover:text-zinc-950"
          >
            <span aria-hidden="true" className="text-xl leading-none">
              ←
            </span>
            マイページへ戻る
          </Link>
          <h1 className="mt-5 text-center text-3xl font-bold tracking-tight">
            プロフィールを編集
          </h1>
        </header>

        <ProfileEditClient />
      </div>
    </main>
  );
}
