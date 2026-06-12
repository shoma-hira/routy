"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

const INVITE_ONLY_MESSAGE = "現在は招待ユーザーのみ利用できます";
const EMAIL_REQUIRED_MESSAGE =
  "Googleアカウントからメールアドレスを取得できませんでした。";

export function GoogleLoginButton() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const authError = searchParams.get("error");
  const authErrorMessage =
    authError === "invite_only"
      ? INVITE_ONLY_MESSAGE
      : authError === "email_required"
        ? EMAIL_REQUIRED_MESSAGE
        : null;

  async function signInWithGoogle() {
    setIsLoading(true);
    setErrorMessage(null);

    const redirectTo = `${window.location.origin}/login`;

    console.log("ROUTY Google OAuth redirectTo", redirectTo);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });

    console.log("ROUTY Google OAuth result", { data, error });

    if (error) {
      setErrorMessage("Googleログインを開始できませんでした。");
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {authErrorMessage ? (
        <p className="rounded-md border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700">
          {authErrorMessage}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="rounded-md border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700">
          {errorMessage}
        </p>
      ) : null}

      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={isLoading}
        className="flex h-12 w-full items-center justify-center gap-3 rounded-md border border-zinc-200 bg-white text-base font-semibold text-zinc-950 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full border border-zinc-200 text-sm font-bold text-zinc-700">
          G
        </span>
        {isLoading ? "接続中..." : "Googleでログイン"}
      </button>
    </div>
  );
}
