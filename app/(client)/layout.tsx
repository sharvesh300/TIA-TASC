import { requireRole } from "@/lib/require-role";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["CLIENT", "ADMIN"]);
  return <>{children}</>;
}
