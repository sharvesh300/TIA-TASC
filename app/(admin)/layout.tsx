import { requireRole } from "@/lib/require-role";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["ADMIN"]);
  return <>{children}</>;
}
