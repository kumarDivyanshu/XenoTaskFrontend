"use client";
import React, { useActionState } from "react";

type RegisterState = { error?: string | null };

export default function RegisterForm({ action }: { action: (state: RegisterState, formData: FormData) => Promise<RegisterState> }) {
  const [state, formAction, isPending] = useActionState<RegisterState, FormData>(action, { error: null });
  return (
    <form action={formAction} className="w-full space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium">First name</label>
          <input id="firstName" name="firstName" required className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-0 focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
        </div>
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium">Last name</label>
          <input id="lastName" name="lastName" required className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-0 focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
        </div>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-0 focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="password" className="block text-sm font-medium">Password</label>
          <input id="password" name="password" type="password" autoComplete="new-password" required className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-0 focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
        </div>
        <div>
          <label htmlFor="confirm" className="block text-sm font-medium">Confirm password</label>
          <input id="confirm" name="confirm" type="password" autoComplete="new-password" required className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-0 focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600" role="alert">{state.error}</p>}

      <button type="submit" disabled={isPending} className="inline-flex w-full items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">
        {isPending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
