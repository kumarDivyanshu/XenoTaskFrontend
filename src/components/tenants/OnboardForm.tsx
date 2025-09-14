"use client";
import React, { useActionState } from "react";

type ActionState = { error?: string | null; success?: boolean };

export default function OnboardForm({ action }: { action: (state: ActionState, formData: FormData) => Promise<ActionState> }) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(action, { error: null, success: false });
  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label htmlFor="shopDomain" className="block text-sm font-medium">Shop domain</label>
        <input id="shopDomain" name="shopDomain" placeholder="myshop.myshopify.com" className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900" />
      </div>
      <div>
        <label htmlFor="accessToken" className="block text-sm font-medium">Access token</label>
        <input id="accessToken" name="accessToken" type="password" className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900" />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-600">Store connected successfully.</p>}
      <button type="submit" disabled={isPending} className="inline-flex items-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900">
        {isPending ? "Connecting…" : "Connect store"}
      </button>
    </form>
  );
}
