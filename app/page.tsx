import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

const ROLE_HOME: Record<string, string> = {
  ADMIN: "/admin",
  FINOPS: "/finops",
  REVIEWER: "/reviewer",
  CLIENT: "/portal",
};

export default async function Home() {
  const session = await auth();
  redirect(ROLE_HOME[session?.user.role ?? ""] ?? "/login");
}
