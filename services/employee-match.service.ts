// Resolves an extracted row to a real Employee. empId is preferred when present,
// but is no longer required — rows without a usable empId are matched by full
// name within the client. Multiple same-name employees are AMBIGUOUS and must be
// resolved by a human (e.g. picking the right one by email) before invoicing.
import { getEmployeeByClientAndEmpId, findEmployeesByClientAndName } from "@/repositories/employee.repo";
import type { Employee } from "@/lib/generated/prisma/client";

export interface EmployeeMatchCandidate {
  id: string;
  empId: string;
  fullName: string;
  email: string | null;
}

export interface EmployeeMatchResult {
  status: "MATCHED" | "AMBIGUOUS" | "NOT_FOUND";
  employee: Employee | null;
  candidates: EmployeeMatchCandidate[];
}

function toCandidate(e: Employee): EmployeeMatchCandidate {
  return { id: e.id, empId: e.empId, fullName: e.fullName, email: e.email ?? null };
}

export async function resolveEmployeeMatch(
  clientId: string,
  row: { empId?: string | null; fullName: string }
): Promise<EmployeeMatchResult> {
  if (row.empId) {
    const byId = await getEmployeeByClientAndEmpId(clientId, row.empId);
    if (byId) return { status: "MATCHED", employee: byId, candidates: [] };
  }

  const byName = await findEmployeesByClientAndName(clientId, row.fullName);
  if (byName.length === 1) {
    return { status: "MATCHED", employee: byName[0], candidates: [] };
  }
  if (byName.length > 1) {
    return { status: "AMBIGUOUS", employee: null, candidates: byName.map(toCandidate) };
  }
  return { status: "NOT_FOUND", employee: null, candidates: [] };
}
