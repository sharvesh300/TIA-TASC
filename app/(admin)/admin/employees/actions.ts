"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/require-role";
import { createEmployee, updateEmployee } from "@/repositories/employee.repo";

export type EmployeeFormState = { error?: string };

function parseDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

export async function createEmployeeAction(
  _prevState: EmployeeFormState,
  formData: FormData
): Promise<EmployeeFormState> {
  await requireRole(["ADMIN"]);

  const clientId = formData.get("clientId") as string;
  const empId = formData.get("empId") as string;
  const fullName = formData.get("fullName") as string;
  const email = (formData.get("email") as string) || null;
  const jobTitle = (formData.get("jobTitle") as string) || null;
  const department = (formData.get("department") as string) || null;
  const nationality = (formData.get("nationality") as string) || null;
  const dateOfJoining = parseDate(formData.get("dateOfJoining") as string);
  const iban = (formData.get("iban") as string) || null;

  if (!clientId || !empId?.trim() || !fullName?.trim()) {
    return { error: "Client, employee ID, and name are required." };
  }

  try {
    await createEmployee({
      clientId,
      empId,
      fullName,
      email,
      jobTitle,
      department,
      nationality,
      dateOfJoining,
      iban,
    });
  } catch {
    return { error: "Could not create employee. The employee ID may already be in use for this client." };
  }

  revalidatePath("/admin/employees");
  return {};
}

export async function updateEmployeeAction(
  _prevState: EmployeeFormState,
  formData: FormData
): Promise<EmployeeFormState> {
  await requireRole(["ADMIN"]);

  const id = formData.get("id") as string;
  const clientId = formData.get("clientId") as string;
  const empId = formData.get("empId") as string;
  const fullName = formData.get("fullName") as string;
  const email = (formData.get("email") as string) || null;
  const jobTitle = (formData.get("jobTitle") as string) || null;
  const department = (formData.get("department") as string) || null;
  const nationality = (formData.get("nationality") as string) || null;
  const dateOfJoining = parseDate(formData.get("dateOfJoining") as string);
  const iban = (formData.get("iban") as string) || null;

  if (!id || !clientId || !empId?.trim() || !fullName?.trim()) {
    return { error: "Client, employee ID, and name are required." };
  }

  try {
    await updateEmployee(id, {
      clientId,
      empId,
      fullName,
      email,
      jobTitle,
      department,
      nationality,
      dateOfJoining,
      iban,
    });
  } catch {
    return { error: "Could not update employee. The employee ID may already be in use for this client." };
  }

  revalidatePath("/admin/employees");
  return {};
}

export async function toggleEmployeeStatusAction(id: string, currentStatus: "ACTIVE" | "INACTIVE") {
  await requireRole(["ADMIN"]);
  await updateEmployee(id, { status: currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE" });
  revalidatePath("/admin/employees");
}
