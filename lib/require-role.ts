import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function requireRole(allowed: string[]) {
  const session = await auth();
  if (!session?.user || !allowed.includes(session.user.role)) {
    redirect("/login");
  }
  return session;
}
