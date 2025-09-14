import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { logoutAction } from "./actions/auth";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Xeno Analytics Dashboard",
  description: "Shopify Data Ingestion & Insights Service by Xeno",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const isAuthed = Boolean(cookieStore.get?.("auth_token")?.value);

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <header className="w-full border-b border-zinc-200 dark:border-zinc-800">
          <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
            <Link href="/" className="font-medium">Xeno</Link>
            {isAuthed ? (
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="rounded-md border px-3 py-1.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  aria-label="Logout"
                >
                  Logout
                </button>
              </form>
            ) : null}
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
