import { prisma } from "@/lib/prisma";

export function getUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}
