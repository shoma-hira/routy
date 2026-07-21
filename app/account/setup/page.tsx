import type { Metadata } from "next";
import { AccountSetupClient } from "./AccountSetupClient";

export const metadata: Metadata = {
  title: "プロフィールを作成 | ROUTY",
};

export default function AccountSetupPage() {
  return (
    <main className="min-h-dvh bg-[#FCFBF7] px-5 py-10 text-zinc-950 sm:py-14">
      <div className="mx-auto w-full max-w-[430px]">
        <header className="mb-9 text-center">
          <p className="text-sm font-bold tracking-[0.16em] text-[#28B83F]">ROUTY</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">プロフィールを作成</h1>
          <p className="mt-4 text-sm font-medium leading-6 text-zinc-600">
            ROUTYで使うプロフィールを設定しましょう
          </p>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            名前、ユーザーネーム、自己紹介、趣味タグは
            <br />
            他のユーザーにも表示されます
          </p>
        </header>

        <AccountSetupClient />
      </div>
    </main>
  );
}
