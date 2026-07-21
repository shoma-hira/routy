"use client";

import Image from "next/image";
import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  isUsernameAvailable,
  normalizeHobbyTags,
  normalizeUsername,
  validateBio,
  validateDisplayName,
  validateHobbyTags,
  validateUsername,
} from "@/lib/profiles";

export type ProfileFormValues = {
  displayName: string;
  username: string;
  bio: string;
  avatarUrl: string | null;
  hobbyTags: string[];
};

export type ProfileFormInitialValues = ProfileFormValues & {
  userId?: string;
};

type ProfileFormProps = {
  mode: "create" | "edit";
  initialValues: ProfileFormInitialValues;
  submitLabel: string;
  onSubmit: (values: ProfileFormValues) => Promise<void>;
  loading?: boolean;
};

type FieldErrors = Partial<Record<"displayName" | "username" | "bio" | "hobbyTags", string>>;
type UsernameStatus = "idle" | "checking" | "available" | "unavailable";

const fieldClassName =
  "mt-2 w-full rounded-2xl border border-transparent bg-zinc-100 px-4 text-base text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-[#28B83F] focus:bg-white";
const usernameUnavailableMessage = "このユーザーネームはすでに使用されています。";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "プロフィールを保存できませんでした。時間をおいてもう一度お試しください。";
}

function getInitial(displayName: string) {
  return Array.from(displayName.trim())[0]?.toUpperCase() || "R";
}

export function ProfileForm({
  mode,
  initialValues,
  submitLabel,
  onSubmit,
  loading = false,
}: ProfileFormProps) {
  const [displayName, setDisplayName] = useState(initialValues.displayName);
  const [username, setUsername] = useState(normalizeUsername(initialValues.username));
  const [bio, setBio] = useState(initialValues.bio);
  const [hobbyTags, setHobbyTags] = useState(
    normalizeHobbyTags(initialValues.hobbyTags),
  );
  const [hobbyTagInput, setHobbyTagInput] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>(() =>
    initialValues.username && !validateUsername(initialValues.username)
      ? "available"
      : "idle",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const usernameCheckIdRef = useRef(0);
  const isBusy = loading || isSubmitting;
  const hasMaximumHobbyTags = hobbyTags.length >= 5;
  const bioLength = Array.from(bio).length;

  function setFieldError(field: keyof FieldErrors, message: string | null) {
    setFieldErrors((current) => {
      const next = { ...current };

      if (message) {
        next[field] = message;
      } else {
        delete next[field];
      }

      return next;
    });
  }

  async function checkUsernameAvailability(value = username) {
    const normalizedValue = normalizeUsername(value);
    const validationError = validateUsername(normalizedValue);
    const checkId = usernameCheckIdRef.current + 1;
    usernameCheckIdRef.current = checkId;

    if (validationError) {
      setUsernameStatus("idle");
      setFieldError("username", validationError);
      return false;
    }

    setFieldError("username", null);
    setUsernameStatus("checking");

    try {
      const isAvailable = await isUsernameAvailable(
        normalizedValue,
        initialValues.userId,
      );

      if (usernameCheckIdRef.current !== checkId) {
        return false;
      }

      setUsernameStatus(isAvailable ? "available" : "unavailable");

      if (!isAvailable) {
        setFieldError("username", usernameUnavailableMessage);
      }

      return isAvailable;
    } catch (error) {
      if (usernameCheckIdRef.current === checkId) {
        setUsernameStatus("idle");
        setFieldError("username", getErrorMessage(error));
      }

      return false;
    }
  }

  function addHobbyTag() {
    if (hasMaximumHobbyTags) {
      setFieldError("hobbyTags", "趣味タグは5件まで追加できます。");
      return;
    }

    const nextTag = hobbyTagInput.trim();

    if (!nextTag) {
      setFieldError("hobbyTags", "趣味タグを入力してください。");
      return;
    }

    if (Array.from(nextTag).length > 20) {
      setFieldError("hobbyTags", "趣味タグは1件につき20文字以内にしてください。");
      return;
    }

    if (hobbyTags.some((tag) => tag.toLowerCase() === nextTag.toLowerCase())) {
      setFieldError("hobbyTags", "同じ趣味タグは追加できません。");
      return;
    }

    const nextTags = [...hobbyTags, nextTag];
    const validationError = validateHobbyTags(nextTags);

    if (validationError) {
      setFieldError("hobbyTags", validationError);
      return;
    }

    setHobbyTags(nextTags);
    setHobbyTagInput("");
    setFieldError("hobbyTags", null);
  }

  function handleHobbyTagKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    addHobbyTag();
  }

  function removeHobbyTag(tagToRemove: string) {
    setHobbyTags((current) => current.filter((tag) => tag !== tagToRemove));
    setFieldError("hobbyTags", null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isBusy) {
      return;
    }

    const normalizedDisplayName = displayName.trim();
    const normalizedUsername = normalizeUsername(username);
    const normalizedBio = bio.trim();
    const normalizedTags = normalizeHobbyTags(hobbyTags);
    const nextErrors: FieldErrors = {};
    const displayNameError = validateDisplayName(normalizedDisplayName);
    const usernameError = validateUsername(normalizedUsername);
    const bioError = validateBio(normalizedBio);
    const hobbyTagsError = validateHobbyTags(normalizedTags);

    if (displayNameError) nextErrors.displayName = displayNameError;
    if (usernameError) nextErrors.username = usernameError;
    if (bioError) nextErrors.bio = bioError;
    if (hobbyTagsError) nextErrors.hobbyTags = hobbyTagsError;

    setFieldErrors(nextErrors);
    setFormError(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    if (!(await checkUsernameAvailability(normalizedUsername))) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        displayName: normalizedDisplayName,
        username: normalizedUsername,
        bio: normalizedBio,
        avatarUrl: initialValues.avatarUrl,
        hobbyTags: normalizedTags,
      });
    } catch (error) {
      const message = getErrorMessage(error);
      setFormError(message);

      if (message === usernameUnavailableMessage) {
        setUsernameStatus("unavailable");
        setFieldError("username", message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-7">
      {formError ? (
        <p
          role="alert"
          className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700"
        >
          {formError}
        </p>
      ) : null}

      <div className="flex justify-center">
        <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-[#E8F7EB] text-3xl font-bold text-[#17852B] ring-4 ring-white shadow-[0_8px_24px_rgba(23,133,43,0.14)]">
          {initialValues.avatarUrl && !avatarFailed ? (
            <Image
              src={initialValues.avatarUrl}
              alt={`${displayName.trim() || "ユーザー"}のプロフィール画像`}
              fill
              unoptimized
              sizes="96px"
              className="object-cover"
              onError={() => setAvatarFailed(true)}
            />
          ) : (
            <span aria-hidden="true">{getInitial(displayName)}</span>
          )}
        </div>
      </div>

      <div>
        <label htmlFor={`${mode}-display-name`} className="text-sm font-bold text-zinc-800">
          名前 <span className="text-[#28B83F]">*</span>
        </label>
        <input
          id={`${mode}-display-name`}
          value={displayName}
          onChange={(event) => {
            setDisplayName(event.target.value);
            setFieldError("displayName", null);
          }}
          onBlur={() => setFieldError("displayName", validateDisplayName(displayName))}
          maxLength={30}
          autoComplete="name"
          placeholder="ROUTYで表示する名前"
          aria-invalid={Boolean(fieldErrors.displayName)}
          className={`${fieldClassName} h-13`}
        />
        {fieldErrors.displayName ? (
          <p className="mt-2 text-xs font-medium text-red-600">{fieldErrors.displayName}</p>
        ) : null}
      </div>

      <div>
        <label htmlFor={`${mode}-username`} className="text-sm font-bold text-zinc-800">
          ユーザーネーム <span className="text-[#28B83F]">*</span>
        </label>
        <div className="relative mt-2">
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-base font-semibold text-zinc-500">
            @
          </span>
          <input
            id={`${mode}-username`}
            value={username}
            onChange={(event) => {
              usernameCheckIdRef.current += 1;
              setUsername(normalizeUsername(event.target.value));
              setUsernameStatus("idle");
              setFieldError("username", null);
            }}
            onBlur={() => void checkUsernameAvailability()}
            maxLength={20}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="username"
            placeholder="username"
            aria-invalid={Boolean(fieldErrors.username)}
            className="h-13 w-full rounded-2xl border border-transparent bg-zinc-100 py-0 pl-9 pr-4 text-base text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-[#28B83F] focus:bg-white"
          />
        </div>
        {usernameStatus === "checking" ? (
          <p className="mt-2 text-xs font-medium text-zinc-500">確認中...</p>
        ) : usernameStatus === "available" ? (
          <p className="mt-2 text-xs font-semibold text-[#17852B]">
            このユーザーネームは使用できます
          </p>
        ) : fieldErrors.username ? (
          <p className="mt-2 text-xs font-medium text-red-600">{fieldErrors.username}</p>
        ) : (
          <p className="mt-2 text-xs leading-5 text-zinc-500">
            3〜20文字の半角英小文字、数字、_が使えます
          </p>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between gap-4">
          <label htmlFor={`${mode}-bio`} className="text-sm font-bold text-zinc-800">
            自己紹介 <span className="font-normal text-zinc-400">任意</span>
          </label>
          <span className={`text-xs ${bioLength > 160 ? "text-red-600" : "text-zinc-400"}`}>
            {bioLength}/160
          </span>
        </div>
        <textarea
          id={`${mode}-bio`}
          value={bio}
          onChange={(event) => {
            setBio(event.target.value);
            setFieldError("bio", validateBio(event.target.value));
          }}
          rows={5}
          placeholder="好きな休日の過ごし方などを書いてみましょう"
          aria-invalid={Boolean(fieldErrors.bio)}
          className={`${fieldClassName} resize-none py-3 leading-6`}
        />
        {fieldErrors.bio ? (
          <p className="mt-2 text-xs font-medium text-red-600">{fieldErrors.bio}</p>
        ) : null}
      </div>

      <div>
        <div className="flex items-center justify-between gap-4">
          <label htmlFor={`${mode}-hobby-tag`} className="text-sm font-bold text-zinc-800">
            趣味タグ <span className="font-normal text-zinc-400">任意</span>
          </label>
          <span className="text-xs text-zinc-400">{hobbyTags.length}/5</span>
        </div>

        {hobbyTags.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {hobbyTags.map((tag) => (
              <span
                key={tag.toLowerCase()}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-[#E8F7EB] py-1.5 pl-3 pr-2 text-sm font-semibold text-[#176C28]"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeHobbyTag(tag)}
                  disabled={isBusy}
                  aria-label={`${tag}を削除`}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-base leading-none text-[#488854] transition hover:bg-white/70 disabled:opacity-50"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-3 flex gap-2">
          <input
            id={`${mode}-hobby-tag`}
            value={hobbyTagInput}
            onChange={(event) => {
              setHobbyTagInput(event.target.value);
              setFieldError("hobbyTags", null);
            }}
            onKeyDown={handleHobbyTagKeyDown}
            disabled={hasMaximumHobbyTags || isBusy}
            maxLength={20}
            placeholder={hasMaximumHobbyTags ? "5件まで追加済み" : "例：サウナ"}
            className="h-12 min-w-0 flex-1 rounded-2xl border border-transparent bg-zinc-100 px-4 text-base outline-none transition placeholder:text-zinc-400 focus:border-[#28B83F] focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          />
          <button
            type="button"
            onClick={addHobbyTag}
            disabled={hasMaximumHobbyTags || isBusy || !hobbyTagInput.trim()}
            className="h-12 shrink-0 rounded-2xl bg-zinc-900 px-5 text-sm font-bold text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35"
          >
            追加
          </button>
        </div>
        {fieldErrors.hobbyTags ? (
          <p className="mt-2 text-xs font-medium text-red-600">{fieldErrors.hobbyTags}</p>
        ) : (
          <p className="mt-2 text-xs leading-5 text-zinc-500">Enterキーでも追加できます</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isBusy || usernameStatus === "checking"}
        className="h-14 w-full rounded-full bg-[#28B83F] text-base font-bold text-white shadow-[0_10px_24px_rgba(40,184,63,0.22)] transition hover:bg-[#24A839] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55"
      >
        {isBusy ? "保存中..." : submitLabel}
      </button>
    </form>
  );
}
