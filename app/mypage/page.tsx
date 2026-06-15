"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "../_components/AppShell";
import { LogoutButton } from "../_components/LogoutButton";
import { posts as mockPosts } from "../_data/posts";
import { supabase } from "@/lib/supabase";
import {
  getCurrentUserId,
  getReadableSupabaseError,
} from "@/lib/savedPosts";

const fallbackCoverImage = mockPosts[0]?.coverImage ?? "/globe.svg";

type ActiveTab = "created" | "saved";

type GridPost = {
  id: string;
  title: string;
  coverImage: string;
  hasCoverImage: boolean;
  createdAt: string;
};

type PostRow = {
  id: string;
  user_id: string;
  title: string;
  cover_image_url: string | null;
  type: string | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

type SavedPostRow = {
  post_id: string;
  created_at: string | null;
};

function getErrorMessage(error: unknown) {
  return getReadableSupabaseError(error, "投稿を読み込めませんでした");
}

function toGridPost(row: PostRow): GridPost {
  const coverImage = row.cover_image_url?.trim();

  return {
    id: row.id,
    title: row.title,
    coverImage: coverImage || fallbackCoverImage,
    hasCoverImage: Boolean(coverImage),
    createdAt: row.created_at,
  };
}

function getDisplayName(profile: ProfileRow | null) {
  return profile?.display_name?.trim() || "ROUTY User";
}

function getUserHandle(userId: string | null) {
  const fallbackId = userId ? userId.slice(0, 8) : "";

  return fallbackId ? `@${fallbackId}` : "";
}

function getInitial(displayName: string) {
  return displayName.trim().charAt(0).toUpperCase() || "R";
}

export default function MyPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("created");
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [myPosts, setMyPosts] = useState<GridPost[]>([]);
  const [savedPostList, setSavedPostList] = useState<GridPost[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadMyPage() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const currentUserId = await getCurrentUserId();

        const [profileResult, postsResult, savedResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("id,display_name,avatar_url")
            .eq("id", currentUserId)
            .maybeSingle(),
          supabase
            .from("posts")
            .select("id,user_id,title,cover_image_url,type,created_at")
            .eq("user_id", currentUserId)
            .order("created_at", { ascending: false }),
          supabase
            .from("saved_posts")
            .select("post_id,created_at")
            .eq("user_id", currentUserId)
            .order("created_at", { ascending: false }),
        ]);

        if (profileResult.error) throw profileResult.error;
        if (postsResult.error) throw postsResult.error;
        if (savedResult.error) throw savedResult.error;

        const createdPosts = ((postsResult.data ?? []) as PostRow[]).map(
          toGridPost,
        );
        const savedRows = (savedResult.data ?? []) as SavedPostRow[];
        const savedPostIds = Array.from(
          new Set(savedRows.map((row) => row.post_id).filter(Boolean)),
        );
        let savedPosts: GridPost[] = [];

        if (savedPostIds.length > 0) {
          const { data: savedPostData, error: savedPostError } = await supabase
            .from("posts")
            .select("id,user_id,title,cover_image_url,type,created_at")
            .in("id", savedPostIds)
            .eq("is_published", true);

          if (savedPostError) throw savedPostError;

          const savedPostsById = new Map(
            ((savedPostData ?? []) as PostRow[]).map((post) => [post.id, post]),
          );

          savedPosts = savedPostIds
            .map((postId) => savedPostsById.get(postId))
            .filter((post): post is PostRow => Boolean(post))
            .map(toGridPost);
        }

        console.log("ROUTY my page loaded", {
          userId: currentUserId,
          createdPostCount: createdPosts.length,
          savedPostCount: savedPosts.length,
        });

        if (isMounted) {
          setUserId(currentUserId);
          setProfile(profileResult.data as ProfileRow | null);
          setMyPosts(createdPosts);
          setSavedPostList(savedPosts);
        }
      } catch (error) {
        console.error("ROUTY my page load failed", error);
        if (isMounted) {
          setErrorMessage(getErrorMessage(error));
          setProfile(null);
          setMyPosts([]);
          setSavedPostList([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadMyPage();

    return () => {
      isMounted = false;
    };
  }, []);

  const displayName = getDisplayName(profile);
  const userHandle = getUserHandle(userId);
  const activePosts = activeTab === "created" ? myPosts : savedPostList;
  const emptyMessage =
    activeTab === "created"
      ? "まだ投稿がありません"
      : "保存した投稿はまだありません";
  const profileText = useMemo(() => {
    if (myPosts.length === 0 && savedPostList.length === 0) {
      return "ROUTYで旅のしおりを作成して、気になる投稿を保存できます。";
    }

    return "ROUTYで作成したしおりと保存した投稿をまとめています。";
  }, [myPosts.length, savedPostList.length]);

  return (
    <AppShell contentClassName="max-w-[640px]">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-100 bg-white/95 px-4 py-3 backdrop-blur">
        <h1 className="text-lg font-semibold tracking-normal">マイページ</h1>
        <LogoutButton />
      </header>

      <main className="overflow-x-hidden px-2 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-7">
        <section className="px-5 text-center">
          <div className="relative mx-auto h-24 w-24">
            {profile?.avatar_url?.trim() ? (
              <Image
                src={profile.avatar_url.trim()}
                alt={`${displayName}のプロフィール画像`}
                fill
                unoptimized
                sizes="96px"
                className="rounded-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-full bg-zinc-950 text-3xl font-semibold text-white">
                {getInitial(displayName)}
              </div>
            )}
          </div>

          <h2 className="mt-4 truncate text-2xl font-semibold leading-8 text-zinc-950">
            {displayName}
          </h2>
          {userHandle ? (
            <p className="mt-0.5 truncate text-sm font-medium text-zinc-500">
              {userHandle}
            </p>
          ) : null}
          <p className="mx-auto mt-3 line-clamp-3 max-w-[320px] text-sm leading-6 text-zinc-700">
            {profileText}
          </p>

          <button
            type="button"
            disabled
            className="mt-4 h-10 rounded-full bg-zinc-100 px-5 text-sm font-semibold text-zinc-500"
          >
            プロフィールを編集
          </button>
        </section>

        <section className="mt-7">
          <div className="flex justify-center gap-8 border-b border-zinc-100">
            <ProfileTab
              label="作成コンテンツ"
              active={activeTab === "created"}
              onClick={() => setActiveTab("created")}
            />
            <ProfileTab
              label="保存済み"
              active={activeTab === "saved"}
              onClick={() => setActiveTab("saved")}
            />
          </div>

          {isLoading ? (
            <p className="py-16 text-center text-sm font-medium text-zinc-500">
              読み込み中...
            </p>
          ) : errorMessage ? (
            <div className="px-3 py-5">
              <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700">
                {errorMessage}
              </p>
            </div>
          ) : activePosts.length === 0 ? (
            <p className="py-16 text-center text-sm font-medium text-zinc-500">
              {emptyMessage}
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-1.5 px-1.5 pt-3">
              {activePosts.map((post) => (
                <PostGridCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </section>
      </main>
    </AppShell>
  );
}

function ProfileTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative h-11 px-1 text-sm transition ${
        active ? "font-semibold text-zinc-950" : "font-medium text-zinc-500"
      }`}
    >
      {label}
      {active ? (
        <span className="absolute bottom-0 left-1/2 h-0.5 w-10 -translate-x-1/2 rounded-full bg-zinc-950" />
      ) : null}
    </button>
  );
}

function PostGridCard({ post }: { post: GridPost }) {
  return (
    <Link
      href={`/posts/${post.id}`}
      className="group relative block aspect-[2/3] overflow-hidden rounded-lg bg-zinc-100"
    >
      {post.hasCoverImage ? (
        <Image
          src={post.coverImage}
          alt={post.title}
          fill
          unoptimized
          sizes="(max-width: 640px) 33vw, 210px"
          className="object-cover transition duration-200 group-active:scale-[0.98]"
        />
      ) : (
        <>
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            unoptimized
            sizes="(max-width: 640px) 33vw, 210px"
            className="object-cover opacity-25"
          />
          <div className="absolute inset-0 flex items-end bg-zinc-900/55 p-2">
            <p className="line-clamp-4 text-xs font-semibold leading-5 text-white">
              {post.title}
            </p>
          </div>
        </>
      )}
    </Link>
  );
}
