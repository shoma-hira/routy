"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

const INVITE_ONLY_ERROR = "invite_only";
const EMAIL_REQUIRED_ERROR = "email_required";
const publicPaths = ["/login"];

function isPublicPath(pathname: string) {
  return publicPaths.some((path) => pathname === path);
}

function getErrorDetails(error: unknown) {
  if (!error || typeof error !== "object") {
    return {
      message: String(error),
      details: null,
      hint: null,
      code: null,
      raw: String(error),
    };
  }

  const errorRecord = error as Record<string, unknown>;

  return {
    message: errorRecord.message ?? null,
    details: errorRecord.details ?? null,
    hint: errorRecord.hint ?? null,
    code: errorRecord.code ?? null,
    raw: JSON.stringify(errorRecord, null, 2),
  };
}

function logAuthError(error: unknown) {
  console.error("ROUTY auth check failed", getErrorDetails(error));
}

function getUserName(user: User) {
  return (
    user.user_metadata.full_name ??
    user.user_metadata.name ??
    user.email?.split("@")[0] ??
    "ROUTY User"
  );
}

async function ensureAllowedUser(user: User) {
  const email = user.email?.trim().toLowerCase();

  console.log("ROUTY auth allowed_users check input", {
    sessionUserEmail: user.email ?? null,
    normalizedEmail: email ?? null,
  });

  if (!email) {
    throw new Error("Googleアカウントからメールアドレスを取得できませんでした。");
  }

  const { data, error } = await supabase
    .from("allowed_users")
    .select("email")
    .eq("email", email)
    .limit(1);

  console.log("ROUTY auth allowed_users check result", {
    sessionUserEmail: user.email ?? null,
    normalizedEmail: email,
    allowedUsersData: data,
    allowedUsersError: error,
  });

  if (error) {
    throw error;
  }

  return data.length > 0;
}

async function ensureProfile(user: User) {
  if (!user.email) {
    throw new Error("profiles作成に必要なメールアドレスがありません。");
  }

  const { error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        email: user.email,
        display_name: getUserName(user),
        avatar_url: user.user_metadata.avatar_url ?? null,
      },
      { onConflict: "id" },
    );

  if (error) {
    throw error;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const checkedUserIdRef = useRef<string | null>(null);

  const handleInviteOnly = useCallback(async () => {
    checkedUserIdRef.current = null;
    await supabase.auth.signOut();
    router.replace(`/login?error=${INVITE_ONLY_ERROR}`);
  }, [router]);

  const handleEmailRequired = useCallback(async () => {
    checkedUserIdRef.current = null;
    await supabase.auth.signOut();
    router.replace(`/login?error=${EMAIL_REQUIRED_ERROR}`);
  }, [router]);

  const routeForSession = useCallback(
    (session: Session | null) => {
      if (!session && !isPublicPath(pathname)) {
        router.replace("/login");
        return;
      }

      if (session && pathname === "/login") {
        router.replace("/home");
      }
    },
    [pathname, router],
  );

  const processSession = useCallback(
    async (session: Session | null) => {
      try {
        if (!session) {
          checkedUserIdRef.current = null;
          routeForSession(null);
          return;
        }

        console.log("ROUTY auth session user", {
          email: session.user.email ?? null,
          id: session.user.id,
        });

        if (checkedUserIdRef.current !== session.user.id) {
          let isAllowed = false;

          try {
            isAllowed = await ensureAllowedUser(session.user);
          } catch (error) {
            logAuthError(error);
            await handleEmailRequired();
            return;
          }

          if (!isAllowed) {
            await handleInviteOnly();
            return;
          }

          await ensureProfile(session.user);
          checkedUserIdRef.current = session.user.id;
        }

        routeForSession(session);
      } catch (error) {
        logAuthError(error);
        await supabase.auth.signOut();
        router.replace("/login");
      } finally {
        setIsChecking(false);
      }
    },
    [handleEmailRequired, handleInviteOnly, routeForSession, router],
  );

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (isMounted) {
        processSession(data.session);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      processSession(session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [processSession]);

  const isProtectedRouteChecking = isChecking && !isPublicPath(pathname);

  return (
    <>
      {isProtectedRouteChecking ? (
        <div className="flex min-h-screen items-center justify-center bg-white text-zinc-950">
          <p className="text-2xl font-semibold tracking-normal">ROUTY</p>
        </div>
      ) : null}
      <div className={isProtectedRouteChecking ? "hidden" : undefined}>
        {children}
      </div>
    </>
  );
}
