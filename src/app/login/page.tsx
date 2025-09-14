// Server Component file: Login page with Next.js Server Actions
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import React from "react";
import LoginForm from "@/components/auth/LoginForm";

// Types for server action state and API response
type LoginState = {
  error?: string | null;
};

type LoginResponse = {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  accessToken: string; // JWT
};

// Server Action: handles form submission, calls backend, sets cookie, redirects
// Server Action: handles form submission, calls backend, sets cookie, redirects
export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  "use server";

  const email = (formData.get("email") || "").toString().trim();
  const password = (formData.get("password") || "").toString();

  if (!email || !password) {
    return { error: "Please enter both email and password." };
  }

  const base = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!base) {
    return {
      error:
        "API base URL is not configured. Set NEXT_PUBLIC_API_BASE_URL in .env.local.",
    };
  }

  try {
    console.log(base.replace(/\/$/, "") + "/auth/login");
    const res = await fetch(`${base.replace(/\/$/, "")}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });

    const isJson = res.headers
      .get("content-type")
      ?.includes("application/json");
    const raw: unknown = isJson ? await res.json() : null;

    console.log("Login response:", res.status, raw);

    if (!res.ok) {
      const message =
        (raw as { message?: string } | null)?.message ||
        `Login failed (${res.status}).`;
      return { error: message };
    }

    const isLogin = (x: unknown): x is LoginResponse => {
      if (!x || typeof x !== "object") return false;
      const rec = x as Record<string, unknown>;
      return (
        typeof rec.accessToken === "string" && typeof rec.email === "string"
      );
    };

    if (!isLogin(raw)) {
      return { error: "Unexpected response from server." };
    }

    const login: LoginResponse = raw;
    if (!login?.accessToken) {
      return { error: "Invalid response from server: missing token." };
    }

    // Set HttpOnly auth cookie
    // Try without await first - many Next.js versions don't require it
    const cookieStore = await cookies();
    const isProd = process.env.NODE_ENV === "production";
    
    cookieStore.set("auth_token", login.accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    // Set display name cookie
    const displayName =
      [login.firstName, login.lastName]
        .filter((v): v is string => !!v)
        .join(" ") || login.email;
    cookieStore.set("display_name", encodeURIComponent(displayName), {
      httpOnly: false,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

  } catch (err) {
    console.error("Login error", err);
    return { error: "Unable to reach the server. Please try again." };
  }

  // Move redirect outside try-catch to avoid confusion
  // This will throw NEXT_REDIRECT and never return
  redirect("/");
}

// Client form is in components/auth/LoginForm.tsx

export default function LoginPage() {
  return (
    <div className="min-h-[80vh] w-full flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold">Welcome back</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Sign in to access your dashboard
          </p>
        </div>
        <LoginForm action={loginAction} />
        <p className="mt-6 text-center text-xs text-zinc-500">
          By signing in, you agree to our Terms and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
