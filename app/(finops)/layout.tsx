import { requireRole } from "@/lib/require-role";

export default async function FinOpsLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["FINOPS", "ADMIN"]);
  return <>{children}</>;
}
