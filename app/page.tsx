import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LandingPage } from "@/components/landing/landing-page";

const ROLE_HOME: Record<string, string> = {
  ADMIN: "/admin",
  FINOPS: "/finops",
  REVIEWER: "/reviewer",
  CLIENT: "/portal",
};

export default async function Home() {
  const session = await auth();
  if (session?.user) {
    redirect(ROLE_HOME[session.user.role] ?? "/login");
  }
  return <LandingPage />;
}
