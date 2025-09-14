import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get?.("auth_token")?.value ?? null;

  if (token) {
    redirect("/tenants");
  } else {
    redirect("/login");
  }

  return null;
}
