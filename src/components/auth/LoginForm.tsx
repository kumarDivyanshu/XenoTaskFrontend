"use client";
import React, { useActionState } from "react";

type LoginState = { error?: string | null };

export default function LoginForm({ action }: { action: (state: LoginState, formData: FormData) => Promise<LoginState> }) {
  const [state, formAction, isPending] = useActionState<LoginState, FormData>(action, { error: null });

  return (
    <form action={formAction} className="w-full space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-0 focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" placeholder="you@example.com" />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-0 focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" placeholder="••••••••" />
      </div>

      {state?.error && (
        <p className="text-sm text-red-600" role="alert">{state.error}</p>
      )}

      <button type="submit" disabled={isPending} className="inline-flex w-full items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">
        {isPending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
