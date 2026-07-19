"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "../../_components/AppShell";
import { FollowButton } from "../../_components/FollowButton";
import {
  getCurrentUserId,
  getFollowerUserIds,
  getFollowingUserIds,
} from "@/lib/follows";
import { getReadableSupabaseError } from "@/lib/savedPosts";
import { supabase } from "@/lib/supabase";

type FollowListType = "followers" | "following";

type ProfileRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

function getErrorMessage(error: unknown) {
  return getReadableSupabaseError(error, "ユーザー一覧を読み込めませんでした。");
}

function getDisplayName(profile: ProfileRow) {
  return profile.display_name?.trim() || "ROUTY User";
}

function getInitial(displayName: string) {
  return displayName.trim().charAt(0).toUpperCase() || "R";
}

function getHandle(userId: string) {
  return `@${userId.slice(0, 8)}`;
}

function BackIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function UserListItem({
  profile,
  currentUserId,
}: {
  profile: ProfileRow;
  currentUserId: string | null;
}) {
  const displayName = getDisplayName(profile);
  const isOwnUser = currentUserId === profile.id;

  return (
    <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3">
      <Link href={`/users/${profile.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-zinc-950">
          {profile.avatar_url?.trim() ? (
            <Image
              src={profile.avatar_url.trim()}
              alt={`${displayName}のプロフィール画像`}
              fill
              unoptimized
              sizes="48px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-base font-bold text-white">
              {getInitial(displayName)}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-zinc-950">{displayName}</p>
          <p className="mt-0.5 truncate text-xs font-medium text-zinc-500">
            {getHandle(profile.id)}
          </p>
        </div>
      </Link>
      {!isOwnUser ? <FollowButton targetUserId={profile.id} /> : null}
    </div>
  );
}

export function FollowListClient({
  userId,
  type,
}: {
  userId: string;
  type: FollowListType;
}) {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadUsers() {
      setIsLoading(true);
      setErrorMessage(null);
      setNotFound(false);

      try {
        const loginUserId = await getCurrentUserId();
        const { data: ownerProfile, error: ownerError } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", userId)
          .maybeSingle();

        if (ownerError) throw ownerError;

        if (!ownerProfile) {
          if (isMounted) {
            setCurrentUserId(loginUserId);
            setProfiles([]);
            setNotFound(true);
          }
          return;
        }

        const userIds =
          type === "followers"
            ? await getFollowerUserIds(userId)
            : await getFollowingUserIds(userId);

        if (userIds.length === 0) {
          if (isMounted) {
            setCurrentUserId(loginUserId);
            setProfiles([]);
          }
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("id,display_name,avatar_url")
          .in("id", userIds);

        if (error) throw error;

        const profilesById = new Map(
          ((data ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]),
        );
        const orderedProfiles = userIds
          .map((id) => profilesById.get(id))
          .filter((profile): profile is ProfileRow => Boolean(profile));

        if (isMounted) {
          setCurrentUserId(loginUserId);
          setProfiles(orderedProfiles);
        }
      } catch (error) {
        console.error("ROUTY follow list load failed", error);
        if (isMounted) {
          setErrorMessage(getErrorMessage(error));
          setProfiles([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadUsers();

    return () => {
      isMounted = false;
    };
  }, [type, userId]);

  const title = type === "followers" ? "フォロワー" : "フォロー中";
  const emptyMessage =
    type === "followers"
      ? "まだフォロワーはいません"
      : "まだ誰もフォローしていません";

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(`/users/${userId}`);
  }

  return (
    <AppShell>
      <header className="sticky top-0 z-10 grid h-14 grid-cols-[56px_1fr_56px] items-center border-b border-zinc-100 bg-white/95 px-2 backdrop-blur">
        <button
          type="button"
          onClick={handleBack}
          className="flex h-10 w-10 items-center justify-center rounded-full text-[#057A55] active:bg-[#F1FAF3]"
          aria-label="戻る"
        >
          <BackIcon />
        </button>
        <h1 className="truncate text-center text-lg font-semibold tracking-normal">
          {title}
        </h1>
        <span aria-hidden="true" />
      </header>

      <main className="pb-[calc(6rem+env(safe-area-inset-bottom))]">
        {isLoading ? (
          <p className="py-16 text-center text-sm font-medium text-zinc-500">
            読み込み中...
          </p>
        ) : errorMessage ? (
          <div className="px-4 py-5">
            <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700">
              {errorMessage}
            </p>
          </div>
        ) : notFound ? (
          <p className="py-16 text-center text-sm font-medium text-zinc-500">
            ユーザーが見つかりません
          </p>
        ) : profiles.length === 0 ? (
          <p className="py-16 text-center text-sm font-medium text-zinc-500">
            {emptyMessage}
          </p>
        ) : (
          <div className="pt-2">
            {profiles.map((profile) => (
              <UserListItem
                key={profile.id}
                profile={profile}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        )}
      </main>
    </AppShell>
  );
}
