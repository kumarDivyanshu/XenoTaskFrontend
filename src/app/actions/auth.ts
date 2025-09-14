"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Logs the user out by clearing auth cookies.
 * - Clears `auth_token` (HttpOnly) and `display_name`
 * - Redirects to /login (respect `next` param if present)
 */
export async function logoutAction(formData: FormData) {
  const cookieStore = await cookies();

  // Clear cookies by setting empty values with immediate expiry
  const isProd = process.env.NODE_ENV === "production";
  const clearOpts = {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };

  try {
    cookieStore.set("auth_token", "", clearOpts);
    // display_name is not httpOnly
    cookieStore.set("display_name", "", { ...clearOpts, httpOnly: false });
  } catch {
    // Best-effort clearing; ignore
  }

  // Optional: support redirecting back
  const next = (formData.get("next") || "").toString();
  redirect(next && next.startsWith("/") ? next : "/login");
}
