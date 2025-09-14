import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import RevenueAreaChart from "@/components/analytics/RevenueAreaChart";
import StatusBreakdownChart, { StatusDatum } from "@/components/analytics/StatusBreakdownChart";
import TopCustomersChart from "@/components/analytics/TopCustomersChart";
import DonutChart from "@/components/analytics/DonutChart";
import { subDays, formatISO, format } from "date-fns";

type TenantAccess = {
  accessId: number;
  tenantId: string;
  shopDomain: string;
  shopName: string | null;
  role: string;
  createdAt: string;
  isActive: boolean;
};

type TenantStats = {
  tenantId: string;
  totalRevenue?: number;
  totalOrders?: number;
  totalCustomers?: number;
  // ...extend with fields from your backend DTO
};

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;

async function fetchJson<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : null;
  if (!res.ok) {
    const message = (data as { message?: string } | null)?.message || `Request failed (${res.status}).`;
    throw new Error(message);
  }
  return data as T;
}

export default async function TenantDetailsPage({ params, searchParams }: { params: Promise<{ tenantId: string }>; searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const { tenantId } = await params;
  const sp = (await searchParams) || {};
    
  if (!apiBase) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold mb-2">Tenant</h1>
        <p className="text-red-600">API base URL is not configured.</p>
      </div>
    );
  }

  const cookieStore = await cookies();
  const token = cookieStore.get?.("auth_token")?.value;
  if (!token) redirect("/login");

  const base = apiBase.replace(/\/$/, "");
  let access: TenantAccess;
  try {
    access = await fetchJson<TenantAccess>(`${base}/tenant-access/tenant/${tenantId}`, token);
  } catch (e) {
    const msg = (e as Error)?.message || "";
    if (msg.includes("(401)")) redirect(`/login?next=/tenants/${tenantId}`);
    throw e;
  }
  const stats = await fetchJson<TenantStats>(`${base}/tenant-access/tenant/${tenantId}/stats`, token).catch(() => ({ tenantId } as TenantStats));

  // Build analytics queries using provided controller contract
  const now = new Date();
  const start30 = subDays(now, 29); // last 30 days inclusive
  console.log("Fetched analytics data start date:", { start30 });
  const startIso = formatISO(start30);
  const endIso = formatISO(now);
  const revenueUrl = `${base}/analytics/revenue?start=${encodeURIComponent(startIso)}&end=${encodeURIComponent(endIso)}`;
  const revenueDailyUrl = `${base}/analytics/revenue/daily?start=${encodeURIComponent(format(start30, "yyyy-MM-dd"))}&end=${encodeURIComponent(format(now, "yyyy-MM-dd"))}`;
  const statusUrl = `${base}/analytics/orders/status-breakdown`;
  const topCustomersUrl = `${base}/analytics/customers/top?limit=5`;
  const rawLimit = Array.isArray(sp.stockLimit) ? sp.stockLimit[0] : sp.stockLimit;
  const limitCandidate = parseInt((rawLimit as string) || "5", 10);
  const allowed = [5, 10, 20, 50];
  const stockLimit = allowed.includes(limitCandidate) ? limitCandidate : 5;
  const stockoutUrl = `${base}/analytics/customers/stockout?limit=${stockLimit}`;

  // New analytics endpoints
  const aovUrl = `${base}/analytics/aov?start=${encodeURIComponent(startIso)}&end=${encodeURIComponent(endIso)}`;
  const uptUrl = `${base}/analytics/upt?start=${encodeURIComponent(startIso)}&end=${encodeURIComponent(endIso)}`;
  const cancellationUrl = `${base}/analytics/orders/cancellation-rate?start=${encodeURIComponent(startIso)}&end=${encodeURIComponent(endIso)}`;
  const rawProdLimit = Array.isArray(sp.prodLimit) ? sp.prodLimit[0] : sp.prodLimit;
  const prodLimitCandidate = parseInt((rawProdLimit as string) || "5", 10);
  const prodLimit = allowed.includes(prodLimitCandidate) ? prodLimitCandidate : 5;
  const rawProdBy = Array.isArray(sp.prodBy) ? sp.prodBy[0] : sp.prodBy;
  const prodBy = (rawProdBy === "quantity" || rawProdBy === "revenue") ? (rawProdBy as "quantity" | "revenue") : "revenue";
  const productsTopUrl = `${base}/analytics/products/top?by=${encodeURIComponent(prodBy)}&limit=${prodLimit}&start=${encodeURIComponent(startIso)}&end=${encodeURIComponent(endIso)}`;
  const newVsReturningUrl = `${base}/analytics/customers/new-vs-returning?start=${encodeURIComponent(startIso)}&end=${encodeURIComponent(endIso)}`;

  // Helper for adding tenant header
  const fetchWithTenant = async <T,>(url: string) => {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Tenant-ID": tenantId,
      },
      cache: "no-store",
    });
    const isJson = res.headers.get("content-type")?.includes("application/json");
    const data = isJson ? await res.json() : null;
    if (res.status === 401) {
      redirect(`/login?next=/tenants/${tenantId}`);
    }
    if (!res.ok) {
      const message = (data as { message?: string } | null)?.message || `Request failed (${res.status}).`;
      throw new Error(message);
    }
    return data as T;
  };

  const [revenueTotal, revenueDailyRaw, statusBreakdown, topCustomersRaw, stockoutRaw, aovResp, uptResp, cancelResp, productsTopRaw, nvrResp] = await Promise.all([
    fetchWithTenant<{ totalRevenue: number }>(revenueUrl).catch(() => ({ totalRevenue: 0 })),
    fetchWithTenant<Array<{ date: string; revenue: number }>>(revenueDailyUrl).catch(() => []),
    fetchWithTenant<StatusDatum[]>(statusUrl).catch(() => []),
    fetchWithTenant<Array<{ customerId: number; totalSpent: number; firstName?: string; lastName?: string }>>(topCustomersUrl).catch(() => []),
    fetchWithTenant<Array<Record<string, unknown>>>(stockoutUrl).catch(() => []),
    fetchWithTenant<{ aov: number; orders: number; revenue: number; discounts: number }>(aovUrl).catch(() => ({ aov: 0, orders: 0, revenue: 0, discounts: 0 })),
    fetchWithTenant<{ upt: number; units: number; orders: number }>(uptUrl).catch(() => ({ upt: 0, units: 0, orders: 0 })),
    fetchWithTenant<{ cancelled: number; total: number; rate: number }>(cancellationUrl).catch(() => ({ cancelled: 0, total: 0, rate: 0 })),
    fetchWithTenant<Array<{ productId?: number; title?: string; revenue?: number; qty?: number }>>(productsTopUrl).catch(() => []),
    fetchWithTenant<{ new: number; returning: number }>(newVsReturningUrl).catch(() => ({ new: 0, returning: 0 })),
  ]);
  const revenueDaily = revenueDailyRaw.map((d) => ({ date: d.date, total: Number(d.revenue) || 0 }));
  const topCustomers = topCustomersRaw.map((c) => ({
    name: [c.firstName, c.lastName].filter(Boolean).join(" ") || `#${c.customerId}`,
    total: Number(c.totalSpent) || 0,
  }));
  const deriveStock = (r: Record<string, unknown>) => {
    const str = (v: unknown) => (typeof v === "string" ? v : undefined);
    const num = (v: unknown) => (typeof v === "number" ? v : undefined);
    const id = str(r.productId) || str(r.id) || "";
    const title = str(r.title) || str(r.name) || `Product ${id}`;
    const sku = str(r.sku) || str(r.variantSku) || str(r.skuCode) || undefined;
    const qty = num(r.available) ?? num(r.quantity) ?? num(r.stock) ?? num(r.inventory) ?? 0;
    return { id: id || title, title, sku, qty };
  };
  const stockoutItems = stockoutRaw.map((r) => deriveStock(r));
  const topProducts = (productsTopRaw || []).map((p: { title?: string; productId?: number; revenue?: number; qty?: number }) => ({
    name: (p.title ?? (p.productId ? `#${p.productId}` : "Product")) as string,
    revenue: Number(p.revenue ?? 0),
    qty: Number(p.qty ?? 0),
  }));
  const topProductsChart = prodBy === "revenue" ? topProducts.map((p: { name: string; revenue: number; qty: number }) => ({ name: p.name, total: p.revenue })) : [];
  const newVsReturningData = [
    { name: "New", value: Number(nvrResp.new || 0) },
    { name: "Returning", value: Number(nvrResp.returning || 0) },
  ];
  console.log("Fetched analytics data:", { revenueTotal, revenueDaily, statusBreakdown, topCustomers });

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-4">
        <Link href="/tenants" className="text-sm text-blue-600 hover:underline">← Back to tenants</Link>
      </div>
      <h1 className="text-2xl font-semibold mb-2">{access.shopName || access.shopDomain}</h1>
      <p className="text-sm text-zinc-500 mb-6">Domain: {access.shopDomain} • Role: {access.role} • Active: {access.isActive ? "Yes" : "No"}</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="text-xs text-zinc-500">Total Revenue</div>
          <div className="mt-1 text-xl font-semibold">{(revenueTotal.totalRevenue ?? stats.totalRevenue ?? 0).toLocaleString()}</div>
        </div>
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="text-xs text-zinc-500">Total Orders</div>
          <div className="mt-1 text-xl font-semibold">{stats.totalOrders ?? "—"}</div>
        </div>
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="text-xs text-zinc-500">Total Customers</div>
          <div className="mt-1 text-xl font-semibold">{stats.totalCustomers ?? "—"}</div>
        </div>
      </div>

      {/* KPI row: AOV, UPT, Cancellation Rate */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="text-xs text-zinc-500">Average Order Value</div>
          <div className="mt-1 text-xl font-semibold">${Number(aovResp.aov || 0).toLocaleString()}</div>
        </div>
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="text-xs text-zinc-500">Units per Transaction</div>
          <div className="mt-1 text-xl font-semibold">{Number(uptResp.upt || 0).toFixed(2)}</div>
        </div>
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="text-xs text-zinc-500">Cancellation Rate</div>
          <div className="mt-1 text-xl font-semibold">{(Number(cancelResp.rate || 0) * 100).toFixed(1)}%</div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueAreaChart data={revenueDaily} title="Revenue (Daily)" />
        </div>
        <div className="lg:col-span-1">
          <StatusBreakdownChart data={statusBreakdown} />
        </div>
      </div>

      {/* New vs Returning customers */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <DonutChart data={newVsReturningData} title="New vs Returning" valueLabel="Customers" />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TopCustomersChart data={topCustomers} title="Top Customers (by spend)" />
        </div>
        <div className="lg:col-span-1">
          <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium">Top Customers (list)</h3>
            </div>
            {topCustomers.length === 0 ? (
              <p className="text-sm text-zinc-500">No customers found.</p>
            ) : (
              <ol className="mt-2 space-y-3">
                {topCustomers.map((c, i) => (
                  <li key={`${c.name}-${i}`} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-xs font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                        {i + 1}
                      </span>
                      <span className="truncate">{c.name}</span>
                    </div>
                    <span className="ml-3 shrink-0 font-medium">${c.total.toLocaleString()}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>

      {/* Top Products section */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium">Top Products ({prodBy === "revenue" ? "by revenue" : "by quantity"})</h3>
            <form method="get" className="flex items-center gap-2">
              <label htmlFor="prodBy" className="text-xs text-zinc-600 dark:text-zinc-400">By</label>
              <select id="prodBy" name="prodBy" defaultValue={prodBy} className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900">
                <option value="revenue">Revenue</option>
                <option value="quantity">Quantity</option>
              </select>
              <label htmlFor="prodLimit" className="text-xs text-zinc-600 dark:text-zinc-400">Limit</label>
              <select id="prodLimit" name="prodLimit" defaultValue={String(prodLimit)} className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900">
                {[5,10,20,50].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <button type="submit" className="rounded-md border px-2 py-1 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-900">Apply</button>
            </form>
          </div>
          {prodBy === "revenue" && topProductsChart.length > 0 ? (
            <TopCustomersChart data={topProductsChart} title="Top Products (Revenue)" />
          ) : (
            <div className="rounded-lg border border-zinc-200 p-4 text-sm text-zinc-500 dark:border-zinc-800">Select &quot;Revenue&quot; to see chart. Quantity view shows list only.</div>
          )}
        </div>
        <div className="lg:col-span-1">
          <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            {topProducts.length === 0 ? (
              <p className="text-sm text-zinc-500">No products found.</p>
            ) : (
              <div className="h-64 overflow-y-auto rounded-md border border-zinc-200 dark:border-zinc-800">
                <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {topProducts.map((p: { name: string; revenue: number; qty: number }, i: number) => (
                    <li key={`${p.name}-${i}`} className="flex items-center justify-between px-3 py-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{i + 1}. {p.name}</div>
                        <div className="truncate text-xs text-zinc-500">Qty: {p.qty.toLocaleString()} • Rev: ${p.revenue.toLocaleString()}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium">Stockout products</h3>
              <form method="get" className="flex items-center gap-2">
                <label htmlFor="stockLimit" className="text-xs text-zinc-600 dark:text-zinc-400">Limit</label>
                <select id="stockLimit" name="stockLimit" defaultValue={String(stockLimit)} className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900">
                  {[5,10,20,50].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <button type="submit" className="rounded-md border px-2 py-1 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-900">Apply</button>
              </form>
            </div>
            {stockoutItems.length === 0 ? (
              <p className="text-sm text-zinc-500">No stockout items.</p>
            ) : (
              <div className="h-64 overflow-y-auto rounded-md border border-zinc-200 dark:border-zinc-800">
                <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {stockoutItems.map((it) => (
                    <li key={String(it.id)} className="flex items-center justify-between px-3 py-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{it.title}</div>
                        <div className="truncate text-xs text-zinc-500">{it.sku ? `SKU: ${it.sku}` : "No SKU"}</div>
                      </div>
                      <span className="ml-3 shrink-0 text-sm font-medium text-red-600">{it.qty}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
