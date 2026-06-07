import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 text-zinc-950">
      <div className="w-full max-w-sm">
        <div className="mb-12 text-center">
          <p className="text-4xl font-semibold tracking-normal">ROUTY</p>
          <p className="mt-3 text-sm text-zinc-500">
            身近な旅程を、身内でシンプルに共有。
          </p>
        </div>

        <form className="space-y-4">
          <input
            type="email"
            placeholder="メールアドレス"
            className="h-12 w-full rounded-md border border-zinc-200 px-4 text-base outline-none focus:border-zinc-900"
          />
          <input
            type="password"
            placeholder="パスワード"
            className="h-12 w-full rounded-md border border-zinc-200 px-4 text-base outline-none focus:border-zinc-900"
          />
          <Link
            href="/home"
            className="flex h-12 w-full items-center justify-center rounded-md bg-zinc-950 text-base font-semibold text-white"
          >
            ログイン
          </Link>
        </form>

        <p className="mt-8 text-center text-xs leading-6 text-zinc-400">
          MVPでは認証処理は未接続です
        </p>
      </div>
    </main>
  );
}
