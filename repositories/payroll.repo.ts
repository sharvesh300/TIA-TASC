import { prisma } from "@/lib/prisma";

export function getPayroll(employeeId: string, payPeriod: string) {
  return prisma.payroll.findFirst({ where: { employeeId, payPeriod } });
}
