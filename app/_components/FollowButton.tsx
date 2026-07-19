"use client";

import { useEffect, useState } from "react";
import {
  followUser,
  getCurrentUserId,
  isFollowing,
  isFollowingForUser,
  unfollowUser,
} from "@/lib/follows";

export function FollowButton({
  targetUserId,
  currentUserId,
  initialIsFollowing,
}: {
  targetUserId: string;
  currentUserId?: string | null;
  initialIsFollowing?: boolean;
}) {
  const [isCurrentUserTarget, setIsCurrentUserTarget] = useState(false);
  const [isFollowed, setIsFollowed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadFollowState() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const loginUserId = currentUserId ?? (await getCurrentUserId());
        const isSelf = loginUserId === targetUserId;

        if (!isMounted) return;

        setIsCurrentUserTarget(isSelf);

        if (isSelf) {
          setIsFollowed(false);
          return;
        }

        const nextIsFollowed =
          initialIsFollowing !== undefined
            ? initialIsFollowing
            : currentUserId
              ? await isFollowingForUser(loginUserId, targetUserId)
              : await isFollowing(targetUserId);

        if (isMounted) {
          setIsFollowed(nextIsFollowed);
        }
      } catch (error) {
        console.error("ROUTY follow state load failed", error);
        if (isMounted) {
          setErrorMessage("フォロー状態を取得できませんでした。");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadFollowState();

    return () => {
      isMounted = false;
    };
  }, [currentUserId, initialIsFollowing, targetUserId]);

  async function handleToggleFollow() {
    if (isLoading || isMutating || isCurrentUserTarget) return;

    const previousIsFollowed = isFollowed;

    setIsMutating(true);
    setErrorMessage(null);
    setIsFollowed(!previousIsFollowed);

    try {
      if (previousIsFollowed) {
        await unfollowUser(targetUserId);
      } else {
        await followUser(targetUserId);
      }
    } catch (error) {
      console.error("ROUTY follow toggle failed", error);
      setIsFollowed(previousIsFollowed);
      setErrorMessage("フォロー操作に失敗しました。");
    } finally {
      setIsMutating(false);
    }
  }

  if (isCurrentUserTarget) {
    return null;
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleToggleFollow}
        disabled={isLoading || isMutating}
        className={`h-9 rounded-full px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
          isFollowed
            ? "border border-[#28B83F] bg-white text-[#057A55] active:bg-[#F1FAF3]"
            : "border border-[#28B83F] bg-[#28B83F] text-white active:bg-[#229D36]"
        }`}
      >
        {isLoading ? "確認中" : isFollowed ? "フォロー中" : "フォロー"}
      </button>
      {errorMessage ? (
        <p className="max-w-[140px] text-right text-[10px] font-medium leading-4 text-red-600">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
