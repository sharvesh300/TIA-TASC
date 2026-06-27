import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const PAY_PERIOD = "2026-06";

const CLIENTS = [
  { code: "ALMARWAN", name: "Al Marwan Facilities", city: "Dubai", industry: "Facilities Management" },
  { code: "GULFSTAR", name: "Gulf Star Logistics", city: "Abu Dhabi", industry: "Logistics" },
  { code: "ZENITHRC", name: "Zenith Retail Co.", city: "Sharjah", industry: "Retail" },
];

const JOB_TITLES = ["Technician", "Driver", "Warehouse Associate", "Cashier", "Cleaner", "Security Guard", "Supervisor"];
const DEPARTMENTS = ["Operations", "Logistics", "Maintenance", "Retail Floor", "Security"];
const NATIONALITIES = ["Indian", "Pakistani", "Filipino", "Egyptian", "Nepali", "Bangladeshi"];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log("Seeding clients...");
  const clients = [];
  for (const c of CLIENTS) {
    const client = await prisma.client.upsert({
      where: { code: c.code },
      update: {},
      create: {
        code: c.code,
        name: c.name,
        city: c.city,
        industry: c.industry,
        contactEmail: `accounts@${c.code.toLowerCase()}.com`,
        dispatchConfig: { sendCopyTo: [`finops@${c.code.toLowerCase()}.com`] },
      },
    });
    clients.push(client);
  }

  console.log("Seeding employees + payroll...");
  let empCounter = 1;
  for (const client of clients) {
    const employeeCount = 10;
    for (let i = 0; i < employeeCount; i++) {
      const empId = `EMP${String(empCounter).padStart(4, "0")}`;
      empCounter++;

      const basic = 2500 + Math.round(Math.random() * 2000);
      const housing = Math.round(basic * 0.4);
      const transport = 300;
      const food = 250;
      const phone = 100;
      const gross = basic + housing + transport + food + phone;
      const workingDays = 26;
      const otHours = Math.round(Math.random() * 10);
      const otRate = (basic / 30 / 8) * 1.25;
      const otAmount = Math.round(otHours * otRate * 100) / 100;
      const deductions = 0;
      const netPay = gross + otAmount - deductions;

      const employee = await prisma.employee.upsert({
        where: { clientId_empId: { clientId: client.id, empId } },
        update: {},
        create: {
          empId,
          fullName: `Employee ${empId}`,
          email: `${empId.toLowerCase()}@${client.code.toLowerCase()}.com`,
          clientId: client.id,
          jobTitle: randomFrom(JOB_TITLES),
          department: randomFrom(DEPARTMENTS),
          nationality: randomFrom(NATIONALITIES),
          dateOfJoining: new Date(2023, Math.floor(Math.random() * 12), 1 + Math.floor(Math.random() * 28)),
          iban: `AE${String(100000000000000000 + empCounter).slice(0, 21)}`,
        },
      });

      const existingPayroll = await prisma.payroll.findFirst({
        where: { employeeId: employee.id, payPeriod: PAY_PERIOD },
      });
      if (!existingPayroll) {
        await prisma.payroll.create({
          data: {
            employeeId: employee.id,
            payPeriod: PAY_PERIOD,
            basic,
            housing,
            transport,
            food,
            phone,
            gross,
            otHours,
            otAmount,
            deductions,
            netPay,
            workingDays,
          },
        });
      }
    }
  }

  console.log("Seeding demo users...");
  const passwordHash = await bcrypt.hash("password123", 10);

  await prisma.user.upsert({
    where: { email: "admin@tia.demo" },
    update: {},
    create: { email: "admin@tia.demo", passwordHash, role: "ADMIN" },
  });

  await prisma.user.upsert({
    where: { email: "finops@tia.demo" },
    update: {},
    create: { email: "finops@tia.demo", passwordHash, role: "FINOPS" },
  });

  await prisma.user.upsert({
    where: { email: "reviewer@tia.demo" },
    update: {},
    create: { email: "reviewer@tia.demo", passwordHash, role: "REVIEWER" },
  });

  await prisma.user.upsert({
    where: { email: "client@tia.demo" },
    update: {},
    create: {
      email: "client@tia.demo",
      passwordHash,
      role: "CLIENT",
      clientId: clients[0].id,
    },
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
