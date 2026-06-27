import Link from "next/link";
import { ArrowRight, Building2, Users } from "lucide-react";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { countActiveClients, countClients } from "@/repositories/client.repo";
import { countActiveEmployees, countEmployees } from "@/repositories/employee.repo";

export default async function AdminPage() {
  const [clientCount, activeClientCount, employeeCount, activeEmployeeCount] = await Promise.all([
    countClients(),
    countActiveClients(),
    countEmployees(),
    countActiveEmployees(),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of clients and employees in TIA.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="size-4 text-muted-foreground" />
              Clients
            </CardTitle>
            <CardDescription>
              {activeClientCount} active of {clientCount} total
            </CardDescription>
            <CardAction>
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/clients">
                  View
                  <ArrowRight />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{clientCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" />
              Employees
            </CardTitle>
            <CardDescription>
              {activeEmployeeCount} active of {employeeCount} total
            </CardDescription>
            <CardAction>
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/employees">
                  View
                  <ArrowRight />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{employeeCount}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
