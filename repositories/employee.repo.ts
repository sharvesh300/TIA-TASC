import { prisma } from "@/lib/prisma";

export function listEmployeesByClient(clientId: string) {
  return prisma.employee.findMany({ where: { clientId }, orderBy: { empId: "asc" } });
}

export function getEmployeeByClientAndEmpId(clientId: string, empId: string) {
  return prisma.employee.findUnique({ where: { clientId_empId: { clientId, empId } } });
}
