"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function logout() {
    setIsLoading(true);
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={isLoading}
      className="text-sm font-semibold text-zinc-500 disabled:opacity-60"
    >
      {isLoading ? "ログアウト中..." : "ログアウト"}
    </button>
  );
}
