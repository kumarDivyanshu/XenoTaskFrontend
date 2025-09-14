import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import React from "react";
// Onboarding form is rendered server-side to avoid client prop function serialization issues

type TenantAccess = {
  accessId: number;
  tenantId: string;
  shopDomain: string;
  shopName: string | null;
  role: string;
  createdAt: string;
  isActive: boolean;
};

type ActionState = { error?: string | null; success?: boolean };

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;

async function fetchTenants(token: string): Promise<TenantAccess[] | { error: string }> {
  if (!apiBase) return { error: "API base URL not configured" };
  const res = await fetch(`${apiBase.replace(/\/$/, "")}/tenant-access/my-tenants`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : null;
  console.log("Fetched tenants:", res.status, data);
  if (res.status === 401) {
    // Token invalid/expired, send user to login
    redirect(`/login?next=/tenants`);
  }
  if (!res.ok) {
    const message = (data as { message?: string } | null)?.message || `Failed to load tenants (${res.status}).`;
    return { error: message };
  }
  return data as TenantAccess[];
}

export async function onboardTenantAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  "use server";
  const cookieStore = await cookies();
  const token = cookieStore.get?.("auth_token")?.value;
  if (!token) return { error: "Not authenticated." };
  if (!apiBase) return { error: "API base URL not configured." };

  const shopDomain = (formData.get("shopDomain") || "").toString().trim();
  const accessToken = (formData.get("accessToken") || "").toString().trim();
  if (!shopDomain || !accessToken) return { error: "Shop domain and access token are required." };

  // Pre-validate Shopify Admin API token before saving to backend
  const normalizeDomain = (d: string) => d.toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const domain = normalizeDomain(shopDomain);
  const shopApiUrl = `https://${domain}/admin/api/2024-10/shop.json`;

  try {
    const shopifyRes = await fetch(shopApiUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      // never cache auth checks
      cache: "no-store",
    });

    const ct = shopifyRes.headers.get("content-type") || "";
    const isJson = ct.includes("application/json");
    const body: unknown = isJson ? await shopifyRes.json().catch(() => null) : await shopifyRes.text().catch(() => "");

    if (!shopifyRes.ok) {
      const pickErrorMessage = (b: unknown): string | null => {
        if (!b || typeof b !== "object") return null;
        const rec = b as Record<string, unknown>;
        const tryStringify = (val: unknown): string | null => {
          if (typeof val === "string") return val;
          if (val && typeof val === "object") {
            try { return JSON.stringify(val); } catch { return null; }
          }
          return null;
        };
        return (
          tryStringify(rec.errors) ||
          tryStringify(rec.error) ||
          (typeof rec.message === "string" ? rec.message : null)
        );
      };

      const msg = isJson
        ? pickErrorMessage(body)
        : (typeof body === "string" && body.trim().length > 0 ? body : null);
      return { error: msg || `Shopify token validation failed (${shopifyRes.status}).` };
    }
  } catch {
    return { error: "Unable to reach Shopify. Check the shop domain and token." };
  }

  const res = await fetch(`${apiBase.replace(/\/$/, "")}/tenant-access/onboard`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ shopDomain, accessToken }),
    cache: "no-store",
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : null;
  if (!res.ok) {
    const message = (data as { message?: string } | null)?.message || `Onboarding failed (${res.status}).`;
    return { error: message };
  }

  revalidatePath("/tenants");
  return { success: true, error: null };
}

// Wrapper for <form action> usage (expects only FormData and returns void)
export async function onboardTenantSubmit(formData: FormData): Promise<void> {
  "use server";
  const result = await onboardTenantAction({ error: null, success: false }, formData);
  if (result?.error) {
    redirect(`/tenants?error=${encodeURIComponent(result.error)}`);
  }
  redirect("/tenants");
}

// Delete tenant server action
export async function deleteTenantAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  "use server";
  const cookieStore = await cookies();
  const token = cookieStore.get?.("auth_token")?.value;
  if (!token) return { error: "Not authenticated." };
  if (!apiBase) return { error: "API base URL not configured." };

  const tenantId = (formData.get("tenantId") || "").toString().trim();
  if (!tenantId) return { error: "Missing tenant id." };

  const res = await fetch(`${apiBase.replace(/\/$/, "")}/tenants/${tenantId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const isJson = res.headers.get("content-type")?.includes("application/json");
    const body: unknown = isJson ? await res.json().catch(() => null) : await res.text().catch(() => "");
    const msg = (() => {
      if (typeof body === "string") return body;
      if (body && typeof body === "object") {
        const rec = body as Record<string, unknown>;
        if (typeof rec.message === "string") return rec.message;
      }
      return null;
    })();
    return { error: msg || `Failed to delete (${res.status}).` };
  }

  revalidatePath("/tenants");
  return { success: true };
}

// Wrapper for delete action to use in <form action>
export async function deleteTenantSubmit(formData: FormData): Promise<void> {
  "use server";
  const result = await deleteTenantAction({ error: null, success: false }, formData);
  if (result?.error) {
    redirect(`/tenants?error=${encodeURIComponent(result.error)}`);
  }
  redirect("/tenants");
}

export default async function TenantsPage({ searchParams }: { searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const sp = (await searchParams) || {};
  const cookieStore = await cookies();
  const token = cookieStore.get?.("auth_token")?.value;
  if (!token) redirect("/login");
  if (!apiBase) return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-2">Tenants</h1>
      <p className="text-red-600">API base URL is not configured.</p>
    </div>
  );

  const data = await fetchTenants(token);

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Your Stores</h1>
        <p className="text-sm text-zinc-500">Manage your connected Shopify stores</p>
      </div>

      <div className="mb-8 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="mb-3 text-lg font-medium">Connect a new store</h2>
        {typeof sp?.error === "string" && sp.error ? (
          <p className="mb-3 text-sm text-red-600">{sp.error}</p>
        ) : null}
        <form action={onboardTenantSubmit} className="space-y-3">
          <div>
            <label htmlFor="shopDomain" className="block text-sm font-medium">Shop domain</label>
            <input id="shopDomain" name="shopDomain" placeholder="myshop.myshopify.com" className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900" />
          </div>
          <div>
            <label htmlFor="accessToken" className="block text-sm font-medium">Access token</label>
            <input id="accessToken" name="accessToken" type="password" className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900" />
          </div>
          <button type="submit" className="inline-flex items-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900">
            Connect store
          </button>
        </form>
      </div>

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
        <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="text-lg font-medium">My stores</h2>
        </div>
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {Array.isArray(data) ? (
            data.length === 0 ? (
              <div className="p-4 text-sm text-zinc-500">No stores connected yet.</div>
            ) : (
              data.map((t) => (
                <div key={t.accessId} className="flex items-center justify-between p-4">
                  <div>
                    <div className="font-medium">{t.shopName || t.shopDomain}</div>
                    <div className="text-xs text-zinc-500">{t.shopDomain} • Role: {t.role} • Active: {t.isActive ? "Yes" : "No"}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link href={`/tenants/${t.tenantId}`} className="text-sm text-blue-600 hover:underline">View details</Link>
                    <form action={deleteTenantSubmit}>
                      <input type="hidden" name="tenantId" value={t.tenantId} />
                      <button type="submit" className="text-sm text-red-600 hover:underline">Delete</button>
                    </form>
                  </div>
                </div>
              ))
            )
          ) : (
            <div className="p-4 text-sm text-red-600">{data.error}</div>
          )}
        </div>
      </div>
    </div>
  );
}
