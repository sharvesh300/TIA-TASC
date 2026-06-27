import { requireRole } from "@/lib/require-role";

export default async function ReviewerLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["REVIEWER", "ADMIN"]);
  return <>{children}</>;
}
