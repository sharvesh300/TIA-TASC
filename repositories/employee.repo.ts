import { prisma } from "@/lib/prisma";
import type { Prisma, EmployeeStatus } from "@/lib/generated/prisma/client";

export function listEmployeesByClient(clientId: string) {
  return prisma.employee.findMany({ where: { clientId }, orderBy: { empId: "asc" } });
}

export function getEmployeeByClientAndEmpId(clientId: string, empId: string) {
  return prisma.employee.findUnique({ where: { clientId_empId: { clientId, empId } } });
}

export function findEmployeesByClientAndName(clientId: string, fullName: string) {
  return prisma.employee.findMany({
    where: {
      clientId,
      fullName: { equals: fullName, mode: "insensitive" },
    },
  });
}

export function getEmployeeById(id: string) {
  return prisma.employee.findUnique({ where: { id } });
}

export function countEmployees() {
  return prisma.employee.count();
}

export function countActiveEmployees() {
  return prisma.employee.count({ where: { status: "ACTIVE" } });
}

export function createEmployee(data: {
  clientId?: string | null;
  contractId?: string | null;
  empId: string;
  fullName: string;
  email?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  nationality?: string | null;
  dateOfJoining?: Date | null;
  iban?: string | null;
}) {
  return prisma.employee.create({ data });
}

export function updateEmployee(
  id: string,
  data: Partial<{
    clientId: string | null;
    contractId: string | null;
    empId: string;
    fullName: string;
    email: string | null;
    jobTitle: string | null;
    department: string | null;
    nationality: string | null;
    dateOfJoining: Date | null;
    iban: string | null;
    status: EmployeeStatus;
  }>
) {
  return prisma.employee.update({ where: { id }, data });
}

export function listUnassignedEmployees() {
  return prisma.employee.findMany({ where: { clientId: { equals: null } }, orderBy: { fullName: "asc" } });
}

export function assignEmployeeToClient(employeeId: string, clientId: string) {
  return updateEmployee(employeeId, { clientId });
}

export function unassignEmployeeFromClient(employeeId: string) {
  return updateEmployee(employeeId, { clientId: null, contractId: null });
}

export function assignEmployeeToContract(employeeId: string, contractId: string) {
  return updateEmployee(employeeId, { contractId });
}

export function unassignEmployeeFromContract(employeeId: string) {
  return updateEmployee(employeeId, { contractId: null });
}

export async function listEmployeesFiltered({
  clientId,
  q,
  sort = "fullName",
  dir = "asc",
  page = 1,
  pageSize = 10,
}: {
  clientId?: string;
  q?: string;
  sort?: "fullName" | "empId" | "department" | "createdAt";
  dir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}) {
  const where: Prisma.EmployeeWhereInput = {
    ...(clientId ? { clientId } : {}),
    ...(q
      ? {
          OR: [
            { fullName: { contains: q, mode: "insensitive" } },
            { empId: { contains: q, mode: "insensitive" } },
            { department: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      include: { client: true },
      orderBy: { [sort]: dir },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.employee.count({ where }),
  ]);

  return { rows, total };
}
