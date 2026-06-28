/**
 * Seeds test clients matching the Gmail test emails.
 * Run: bun run scripts/seed-test-clients.ts
 */

import "dotenv/config";
import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const TEST_CLIENTS = [
  { code: "CL001", name: "Emirates Steel Industries", city: "Abu Dhabi", industry: "Steel Manufacturing", contactEmail: "hr@emiratessteel.com" },
  { code: "CL002", name: "Emaar Properties",          city: "Dubai",     industry: "Real Estate",         contactEmail: "payroll@emaar.com" },
  { code: "CL003", name: "ADNOC",                     city: "Abu Dhabi", industry: "Oil & Gas",           contactEmail: "workforce@adnoc.ae" },
  { code: "CL004", name: "Al Marwan Facilities",      city: "Dubai",     industry: "Facilities Management", contactEmail: "accounts@almarwan.com" },
  { code: "CL005", name: "Gulf Star Logistics",       city: "Abu Dhabi", industry: "Logistics",           contactEmail: "accounts@gulfstar.com" },
];

console.log("🌱 Seeding test clients...\n");

for (const c of TEST_CLIENTS) {
  const client = await prisma.client.upsert({
    where: { code: c.code },
    update: { name: c.name, contactEmail: c.contactEmail },
    create: {
      code: c.code,
      name: c.name,
      city: c.city,
      industry: c.industry,
      contactEmail: c.contactEmail,
      status: "ACTIVE",
      dispatchConfig: { channel: "EMAIL", format: "PDF", sendCopyTo: [], sortOrder: "FIFO", inputChannels: { portal: true, email: true, webhook: false } },
    },
  });
  console.log(`✅ ${client.code} — ${client.name}`);
}

console.log("\n✅ Done. Run poll-gmail to pick up emails.\n");
await prisma.$disconnect();
