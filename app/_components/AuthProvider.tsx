"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

const INVITE_ONLY_ERROR = "invite_only";
const EMAIL_REQUIRED_ERROR = "email_required";
const ACCOUNT_SETUP_PATH = "/account/setup";
const publicPaths = ["/login"];

type AuthProfile = {
  id: string;
  email: string | null;
  username: string | null;
  profile_completed: boolean;
};

function isPublicPath(pathname: string) {
  return publicPaths.some((path) => pathname === path);
}

function getRouteTarget(
  pathname: string,
  session: Session | null,
  profile?: AuthProfile,
) {
  if (!session && !isPublicPath(pathname)) {
    return "/login";
  }

  if (!session || !profile) {
    return null;
  }

  const hasCompletedProfile =
    profile.profile_completed && Boolean(profile.username?.trim());

  if (!hasCompletedProfile) {
    return pathname === ACCOUNT_SETUP_PATH ? null : ACCOUNT_SETUP_PATH;
  }

  if (pathname === "/login" || pathname === ACCOUNT_SETUP_PATH) {
    return "/home";
  }

  return null;
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
  const name = (
    user.user_metadata.full_name ??
    user.user_metadata.name ??
    user.email?.split("@")[0] ??
    "ROUTY User"
  );

  return Array.from(String(name).trim()).slice(0, 30).join("") || "ROUTY User";
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

  const { data: existingProfile, error: selectError } = await supabase
    .from("profiles")
    .select("id,email,username,profile_completed")
    .eq("id", user.id)
    .maybeSingle();

  if (selectError) {
    throw selectError;
  }

  if (existingProfile) {
    const profile = existingProfile as AuthProfile;

    if (profile.email !== user.email) {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ email: user.email })
        .eq("id", user.id);

      if (updateError) {
        throw updateError;
      }
    }

    return profile;
  }

  const { data: insertedProfile, error: insertError } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      email: user.email,
      display_name: getUserName(user),
      avatar_url: user.user_metadata.avatar_url ?? null,
      profile_completed: false,
    })
    .select("id,email,username,profile_completed")
    .single();

  if (!insertError) {
    return insertedProfile as AuthProfile;
  }

  // getSession and onAuthStateChange can race on the first login. If the other
  // request created the row first, read that row instead of overwriting it.
  if (insertError.code === "23505") {
    const { data: racedProfile, error: racedProfileError } = await supabase
      .from("profiles")
      .select("id,email,username,profile_completed")
      .eq("id", user.id)
      .single();

    if (racedProfileError) {
      throw racedProfileError;
    }

    return racedProfile as AuthProfile;
  }

  throw insertError;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile>();
  const checkedUserIdRef = useRef<string | null>(null);
  const authCheckIdRef = useRef(0);

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

  const processSession = useCallback(
    async (session: Session | null) => {
      const authCheckId = authCheckIdRef.current + 1;
      authCheckIdRef.current = authCheckId;

      try {
        if (!session) {
          checkedUserIdRef.current = null;
          setSession(null);
          setProfile(undefined);
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
            if (authCheckIdRef.current !== authCheckId) return;
            logAuthError(error);
            await handleEmailRequired();
            return;
          }

          if (authCheckIdRef.current !== authCheckId) return;

          if (!isAllowed) {
            await handleInviteOnly();
            return;
          }

          checkedUserIdRef.current = session.user.id;
        }

        const profile = await ensureProfile(session.user);

        if (authCheckIdRef.current !== authCheckId) return;
        setSession(session);
        setProfile(profile);
      } catch (error) {
        if (authCheckIdRef.current !== authCheckId) return;
        logAuthError(error);
        checkedUserIdRef.current = null;
        await supabase.auth.signOut();
        router.replace("/login");
      } finally {
        if (authCheckIdRef.current === authCheckId) {
          setIsChecking(false);
        }
      }
    },
    [handleEmailRequired, handleInviteOnly, router],
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

  useEffect(() => {
    function handleProfileUpdated(event: Event) {
      const updatedProfile = (event as CustomEvent<Partial<AuthProfile>>).detail;

      setProfile((currentProfile) =>
        currentProfile ? { ...currentProfile, ...updatedProfile } : currentProfile,
      );
    }

    window.addEventListener("routy:profile-updated", handleProfileUpdated);
    return () => {
      window.removeEventListener("routy:profile-updated", handleProfileUpdated);
    };
  }, []);

  const routeTarget = isChecking
    ? null
    : getRouteTarget(pathname, session, profile);

  useEffect(() => {
    if (routeTarget) {
      router.replace(routeTarget);
    }
  }, [routeTarget, router]);

  const isRouteChecking = isChecking || Boolean(routeTarget);

  return (
    <>
      {isRouteChecking ? (
        <div className="min-h-screen bg-white" aria-hidden="true" />
      ) : null}
      <div className={isRouteChecking ? "hidden" : undefined}>
        {children}
      </div>
    </>
  );
}
