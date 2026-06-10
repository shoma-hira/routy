"use client";

import { useEffect, useState } from "react";
import { AppShell } from "../_components/AppShell";
import { PostCard, type PostCardPost } from "../_components/PostCard";
import { posts as mockPosts } from "../_data/posts";
import { supabase } from "@/lib/supabase";

const tags = ["#カフェ巡り", "#週末旅", "#絶景", "#ランチ"];
const fallbackCoverImage = mockPosts[0]?.coverImage ?? "/globe.svg";

type PostRow = {
  id: string;
  user_id: string;
  title: string;
  cover_image_url: string | null;
  type: string | null;
  is_published: boolean;
  created_at: string;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }

  return "投稿の取得に失敗しました。";
}

function toPostCard(post: PostRow, profile?: ProfileRow): PostCardPost {
  return {
    id: post.id,
    title: post.title,
    author: profile?.display_name?.trim() || "ROUTY User",
    coverImage: post.cover_image_url?.trim() || fallbackCoverImage,
    saved: false,
  };
}

export default function HomePage() {
  const [posts, setPosts] = useState<PostCardPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadPosts() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const { data: postRows, error: postsError } = await supabase
          .from("posts")
          .select("id,user_id,title,cover_image_url,type,is_published,created_at")
          .eq("is_published", true)
          .order("created_at", { ascending: false });

        if (postsError) {
          throw postsError;
        }

        const publishedPosts = (postRows ?? []) as PostRow[];
        const userIds = Array.from(
          new Set(publishedPosts.map((post) => post.user_id).filter(Boolean)),
        );
        let profilesById = new Map<string, ProfileRow>();

        if (userIds.length > 0) {
          const { data: profileRows, error: profilesError } = await supabase
            .from("profiles")
            .select("id,display_name,avatar_url")
            .in("id", userIds);

          if (profilesError) {
            throw profilesError;
          }

          profilesById = new Map(
            ((profileRows ?? []) as ProfileRow[]).map((profile) => [
              profile.id,
              profile,
            ]),
          );
        }

        const nextPosts = publishedPosts.map((post) =>
          toPostCard(post, profilesById.get(post.user_id)),
        );

        console.log("ROUTY home posts loaded", {
          postCount: nextPosts.length,
          profileCount: profilesById.size,
        });

        if (isMounted) {
          setPosts(nextPosts);
        }
      } catch (error) {
        console.error("ROUTY home posts load failed", error);
        if (isMounted) {
          setErrorMessage(getErrorMessage(error));
          setPosts([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadPosts();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <AppShell>
      <header className="sticky top-0 z-10 border-b border-zinc-100 bg-white/95 px-4 py-4 backdrop-blur">
        <h1 className="text-2xl font-semibold tracking-normal">ROUTY</h1>
        <label className="mt-4 block">
          <span className="sr-only">検索</span>
          <input
            type="search"
            placeholder="行き先やユーザーを検索"
            className="h-11 w-full rounded-md border border-zinc-200 bg-zinc-50 px-4 text-[15px] outline-none placeholder:text-zinc-400 focus:border-zinc-900 focus:bg-white"
          />
        </label>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              className="h-8 shrink-0 rounded-full border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700"
            >
              {tag}
            </button>
          ))}
        </div>
      </header>

      {isLoading ? (
        <div className="px-4 py-10 text-center text-sm font-medium text-zinc-500">
          読み込み中...
        </div>
      ) : errorMessage ? (
        <div className="px-4 py-4">
          <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700">
            {errorMessage}
          </p>
        </div>
      ) : posts.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm font-medium text-zinc-500">
          まだ投稿がありません
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-4 py-4 pb-28">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </AppShell>
  );
}
