// Server Component file: Registration page with Next.js Server Actions
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import React from "react";
import RegisterForm from "../../components/auth/RegisterForm";

type RegisterState = {
	error?: string | null;
};

type RegisterResponse = {
	userId: string;
	email: string;
	firstName?: string;
	lastName?: string;
	accessToken: string;
};

export async function registerAction(_prev: RegisterState, formData: FormData): Promise<RegisterState> {
	"use server";

	const firstName = (formData.get("firstName") || "").toString().trim();
	const lastName = (formData.get("lastName") || "").toString().trim();
	const email = (formData.get("email") || "").toString().trim();
	const password = (formData.get("password") || "").toString();
	const confirm = (formData.get("confirm") || "").toString();

	if (!firstName || !lastName || !email || !password) {
		return { error: "All fields are required." };
	}
	if (password !== confirm) {
		return { error: "Passwords do not match." };
	}

	const base = process.env.NEXT_PUBLIC_API_BASE_URL;
	if (!base) {
		return { error: "API base URL is not configured. Set NEXT_PUBLIC_API_BASE_URL in .env.local." };
	}

	try {
		console.log("Sending registration request to:", `${base.replace(/\/$/, "")}/auth/register`);
		
		const res = await fetch(`${base.replace(/\/$/, "")}/auth/register`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ 
				firstName, 
				lastName, 
				email, 
				password 
			}),
			cache: "no-store",
		});

		const isJson = res.headers.get("content-type")?.includes("application/json");
		let raw: unknown = null;
		
		// Try to get response body even if not JSON
		try {
			if (isJson) {
				raw = await res.json();
			} else {
				// Try to read as text to see if there's any error message
				const textResponse = await res.text();
				console.log("Non-JSON response body:", textResponse);
				raw = textResponse ? { message: textResponse } : null;
			}
		} catch (parseError) {
			console.log("Failed to parse response:", parseError);
		}

		console.log("Register response:", res.status, raw);
		console.log("Response headers:", Object.fromEntries(res.headers.entries()));

		if (!res.ok) {
			const message = (raw as { message?: string } | null)?.message || `Registration failed (${res.status}).`;
			return { error: message };
		}

		const isRegister = (x: unknown): x is RegisterResponse => {
			if (!x || typeof x !== "object") return false;
			const rec = x as Record<string, unknown>;
			return typeof rec.accessToken === "string" && typeof rec.email === "string";
		};

		if (!isRegister(raw)) {
			return { error: "Unexpected response from server." };
		}

		const result: RegisterResponse = raw;
		if (!result?.accessToken) {
			return { error: "Invalid response from server: missing token." };
		}

		// Set HttpOnly auth cookie (match login pattern exactly)
		const cookieStore = await cookies();
		const isProd = process.env.NODE_ENV === "production";
		
		cookieStore.set("auth_token", result.accessToken, {
			httpOnly: true,
			secure: isProd,
			sameSite: "lax",
			path: "/",
			maxAge: 60 * 60 * 24 * 7, // 7 days
		});

		// Set display name cookie
		const displayName = [result.firstName, result.lastName]
			.filter((v): v is string => !!v)
			.join(" ") || result.email;
		cookieStore.set("display_name", encodeURIComponent(displayName), {
			httpOnly: false,
			secure: isProd,
			sameSite: "lax",
			path: "/",
			maxAge: 60 * 60 * 24 * 7,
		});

	} catch (err) {
		console.error("Registration error:", err);
		return { error: "Unable to reach the server. Please try again." };
	}

	// Move redirect outside try-catch to avoid confusion
	redirect("/");
}
// Client form is in components/auth/RegisterForm.tsx

export default function RegisterPage() {
	return (
		<div className="min-h-[80vh] w-full flex items-center justify-center px-4">
			<div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
				<div className="mb-6 text-center">
					<h1 className="text-2xl font-semibold">Create your account</h1>
					<p className="mt-1 text-sm text-zinc-500">Start your journey with Xeno Analytics</p>
				</div>
				<RegisterForm action={registerAction} />
				<p className="mt-6 text-center text-xs text-zinc-500">
					By creating an account, you agree to our Terms and Privacy Policy.
				</p>
			</div>
		</div>
	);
}

