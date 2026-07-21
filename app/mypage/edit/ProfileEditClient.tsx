"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ProfileForm,
  type ProfileFormInitialValues,
  type ProfileFormValues,
} from "@/app/_components/ProfileForm";
import { getCurrentProfile, saveProfile } from "@/lib/profiles";
import { supabase } from "@/lib/supabase";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "プロフィールを読み込めませんでした。時間をおいてもう一度お試しください。";
}

export function ProfileEditClient() {
  const router = useRouter();
  const [initialValues, setInitialValues] = useState<ProfileFormInitialValues | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace("/login");
          return;
        }

        if (userError) {
          throw userError;
        }

        const profile = await getCurrentProfile();

        if (!profile.profile_completed || !profile.username?.trim()) {
          router.replace("/account/setup");
          return;
        }

        if (isMounted) {
          setInitialValues({
            userId: profile.id,
            displayName: profile.display_name ?? "",
            username: profile.username,
            bio: profile.bio ?? "",
            avatarUrl: profile.avatar_url,
            hobbyTags: profile.hobby_tags ?? [],
          });
        }
      } catch (error) {
        if (isMounted) {
          setLoadError(getErrorMessage(error));
        }
      }
    }

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, [router]);

  async function handleSubmit(values: ProfileFormValues) {
    setIsSaving(true);

    try {
      await saveProfile({
        displayName: values.displayName,
        username: values.username,
        bio: values.bio,
        avatarUrl: values.avatarUrl,
        hobbyTags: values.hobbyTags,
      });
      router.replace("/mypage");
      router.refresh();
    } catch (error) {
      setIsSaving(false);
      throw error;
    }
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-4 text-sm font-medium leading-6 text-red-700">
        {loadError}
      </div>
    );
  }

  if (!initialValues) {
    return (
      <div className="py-16 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-[#28B83F]" />
        <p className="mt-4 text-sm font-medium text-zinc-500">プロフィールを読み込んでいます...</p>
      </div>
    );
  }

  return (
    <ProfileForm
      mode="edit"
      initialValues={initialValues}
      submitLabel="変更を保存"
      onSubmit={handleSubmit}
      loading={isSaving}
    />
  );
}
