import { Suspense } from "react";
import { GoogleLoginButton } from "../_components/GoogleLoginButton";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 text-zinc-950">
      <div className="w-full max-w-sm">
        <div className="mb-12 text-center">
          <p className="text-4xl font-semibold tracking-normal">ROUTY</p>
          <p className="mt-3 text-sm text-zinc-500">
            身近な旅程を、シンプルに共有する
          </p>
        </div>

        <Suspense fallback={null}>
          <GoogleLoginButton />
        </Suspense>

        <p className="mt-8 text-center text-xs leading-6 text-zinc-400">
          Googleアカウントでログインしてください
        </p>
      </div>
    </main>
  );
}
