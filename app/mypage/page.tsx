"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "../_components/AppShell";
import { LogoutButton } from "../_components/LogoutButton";
import { posts as mockPosts } from "../_data/posts";
import { supabase } from "@/lib/supabase";
import {
  getCurrentUserId,
  getReadableSupabaseError,
} from "@/lib/savedPosts";

const fallbackCoverImage = mockPosts[0]?.coverImage ?? "/globe.svg";

type MyPost = {
  id: string;
  title: string;
  coverImage: string;
  type: string | null;
  createdAt: string;
};

type SavedPost = MyPost & {
  author: string;
  savedAt: string | null;
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
};

function getErrorMessage(error: unknown) {
  return getReadableSupabaseError(error, "マイページの投稿取得に失敗しました。");
}

function getTypeLabel(type: string | null) {
  return type === "actual" ? "実績" : "予定";
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function toMyPost(row: PostRow): MyPost {
  return {
    id: row.id,
    title: row.title,
    coverImage: row.cover_image_url?.trim() || fallbackCoverImage,
    type: row.type,
    createdAt: row.created_at,
  };
}

function toSavedPost(
  row: PostRow,
  profile: ProfileRow | undefined,
  savedAt: string | null,
): SavedPost {
  return {
    ...toMyPost(row),
    author: profile?.display_name?.trim() || "ROUTY User",
    savedAt,
  };
}

function MyPostCard({
  post,
  isDeleting,
  onDelete,
}: {
  post: MyPost;
  isDeleting: boolean;
  onDelete: (postId: string) => void;
}) {
  return (
    <article className="grid grid-cols-[84px_1fr] gap-4">
      <Link
        href={`/posts/${post.id}`}
        className="relative aspect-square overflow-hidden rounded-md bg-zinc-100"
      >
        <Image
          src={post.coverImage}
          alt={`${post.title}の表紙画像`}
          fill
          unoptimized
          sizes="84px"
          className="object-cover"
        />
      </Link>
      <div className="min-w-0 py-1">
        <Link href={`/posts/${post.id}`} className="block">
          <p className="line-clamp-2 text-[15px] font-semibold leading-6">
            {post.title}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
            <span>{getTypeLabel(post.type)}</span>
            {formatDate(post.createdAt) ? <span>{formatDate(post.createdAt)}</span> : null}
          </div>
        </Link>
        <div className="mt-2 flex items-center gap-3 text-sm font-semibold">
          <Link href={`/bookmarks/${post.id}/edit`} className="text-zinc-950">
            編集
          </Link>
          <button
            type="button"
            onClick={() => onDelete(post.id)}
            disabled={isDeleting}
            className="text-red-600 disabled:cursor-not-allowed disabled:text-zinc-400"
          >
            {isDeleting ? "削除中..." : "削除"}
          </button>
        </div>
      </div>
    </article>
  );
}

function SavedPostCard({ post }: { post: SavedPost }) {
  return (
    <Link href={`/posts/${post.id}`} className="grid grid-cols-[84px_1fr] gap-4">
      <div className="relative aspect-square overflow-hidden rounded-md bg-zinc-100">
        <Image
          src={post.coverImage}
          alt={`${post.title}の表紙画像`}
          fill
          unoptimized
          sizes="84px"
          className="object-cover"
        />
      </div>
      <div className="min-w-0 py-1">
        <p className="line-clamp-2 text-[15px] font-semibold leading-6">
          {post.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
          <span>{post.author}</span>
          <span>{getTypeLabel(post.type)}</span>
          {formatDate(post.savedAt || post.createdAt) ? (
            <span>{formatDate(post.savedAt || post.createdAt)}</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export default function MyPage() {
  const router = useRouter();
  const [myPosts, setMyPosts] = useState<MyPost[]>([]);
  const [savedPostList, setSavedPostList] = useState<SavedPost[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadMyPosts() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const userId = await getCurrentUserId();

        const { data, error } = await supabase
          .from("posts")
          .select("id,user_id,title,cover_image_url,type,created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (error) {
          throw error;
        }

        const nextPosts = ((data ?? []) as PostRow[]).map(toMyPost);
        const { data: savedRows, error: savedError } = await supabase
          .from("saved_posts")
          .select("post_id")
          .eq("user_id", userId);

        if (savedError) {
          throw savedError;
        }

        const savedPostRows = (savedRows ?? []) as { post_id: string }[];
        const savedPostIds = Array.from(
          new Set(savedPostRows.map((row) => row.post_id).filter(Boolean)),
        );
        let nextSavedPosts: SavedPost[] = [];

        if (savedPostIds.length > 0) {
          const { data: savedPostData, error: savedPostError } = await supabase
            .from("posts")
            .select("id,user_id,title,cover_image_url,type,created_at")
            .in("id", savedPostIds)
            .eq("is_published", true);

          if (savedPostError) {
            throw savedPostError;
          }

          const savedPostsById = new Map(
            ((savedPostData ?? []) as PostRow[]).map((post) => [post.id, post]),
          );
          const profileUserIds = Array.from(
            new Set(
              Array.from(savedPostsById.values())
                .map((post) => post.user_id)
                .filter(Boolean),
            ),
          );
          let profilesById = new Map<string, ProfileRow>();

          if (profileUserIds.length > 0) {
            const { data: profileRows, error: profileError } = await supabase
              .from("profiles")
              .select("id,display_name")
              .in("id", profileUserIds);

            if (profileError) {
              throw profileError;
            }

            profilesById = new Map(
              ((profileRows ?? []) as ProfileRow[]).map((profile) => [
                profile.id,
                profile,
              ]),
            );
          }

          nextSavedPosts = savedPostRows
            .map((savedRow) => {
              const post = savedPostsById.get(savedRow.post_id);
              if (!post) return null;

              return toSavedPost(
                post,
                profilesById.get(post.user_id),
                null,
              );
            })
            .filter((post): post is SavedPost => Boolean(post));
        }

        console.log("ROUTY my posts loaded", {
          userId,
          postCount: nextPosts.length,
          savedPostCount: nextSavedPosts.length,
        });

        if (isMounted) {
          setUserId(userId);
          setMyPosts(nextPosts);
          setSavedPostList(nextSavedPosts);
        }
      } catch (error) {
        console.error("ROUTY my posts load failed", error);
        if (isMounted) {
          setErrorMessage(getErrorMessage(error));
          setMyPosts([]);
          setSavedPostList([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadMyPosts();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleDeletePost(postId: string) {
    if (!userId) {
      setErrorMessage("ログイン中のユーザーを取得できませんでした。");
      return;
    }

    const confirmed = window.confirm(
      "この投稿を削除しますか？この操作は取り消せません。",
    );

    if (!confirmed) {
      return;
    }

    setDeletingPostId(postId);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId)
        .eq("user_id", userId)
        .select("id")
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data?.id) {
        throw new Error("この投稿を削除する権限がありません。");
      }

      console.log("ROUTY my page delete post success", { postId });
      setMyPosts((posts) => posts.filter((post) => post.id !== postId));
      setSavedPostList((posts) => posts.filter((post) => post.id !== postId));
      router.push("/mypage");
    } catch (error) {
      console.error("ROUTY my page delete post failed", error);
      setErrorMessage(
        getReadableSupabaseError(error, "投稿の削除に失敗しました。"),
      );
    } finally {
      setDeletingPostId(null);
    }
  }

  return (
    <AppShell>
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-100 bg-white/95 px-5 py-4 backdrop-blur">
        <h1 className="text-xl font-semibold">マイページ</h1>
        <LogoutButton />
      </header>

      <div className="px-5 py-6">
        <section className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-950 text-xl font-semibold text-white">
            R
          </div>
          <div>
            <h2 className="text-lg font-semibold">Routy User</h2>
            <p className="text-sm text-zinc-500">投稿 {myPosts.length}件</p>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="mb-4 text-base font-semibold">自分の投稿</h2>
          {isLoading ? (
            <p className="py-6 text-center text-sm font-medium text-zinc-500">
              読み込み中...
            </p>
          ) : errorMessage ? (
            <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700">
              {errorMessage}
            </p>
          ) : myPosts.length === 0 ? (
            <p className="rounded-2xl bg-zinc-50 px-4 py-5 text-sm font-medium text-zinc-500">
              まだ投稿がありません
            </p>
          ) : (
            <div className="space-y-5">
              {myPosts.map((post) => (
                <MyPostCard
                  key={post.id}
                  post={post}
                  isDeleting={deletingPostId === post.id}
                  onDelete={handleDeletePost}
                />
              ))}
            </div>
          )}
        </section>

        <section className="mt-10">
          <h2 className="mb-4 text-base font-semibold">保存した投稿</h2>
          {isLoading ? (
            <p className="py-6 text-center text-sm font-medium text-zinc-500">
              読み込み中...
            </p>
          ) : errorMessage ? (
            <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700">
              {errorMessage}
            </p>
          ) : savedPostList.length === 0 ? (
            <p className="rounded-2xl bg-zinc-50 px-4 py-5 text-sm font-medium text-zinc-500">
              まだ保存した投稿がありません
            </p>
          ) : (
            <div className="space-y-5">
              {savedPostList.map((post) => (
                <SavedPostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
