import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { prisma } from "../lib/prisma";

// ── Load .env ────────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const m = line.match(/^([^#=]+)=["']?([^"'\n]*)["']?/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}

async function main() {
  console.log("\n──────────────────────────────────────────────────────");
  console.log("  TIA — Latest Pipeline Jobs");
  console.log("──────────────────────────────────────────────────────");

  try {
    const jobs = await prisma.pipelineJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { client: true },
    });

    if (jobs.length === 0) {
      console.log("No jobs found in the database.");
      return;
    }

    for (const job of jobs) {
      const time = job.createdAt.toLocaleTimeString();
      const date = job.createdAt.toLocaleDateString();
      console.log(`[${date} ${time}] ID: ${job.id}`);
      console.log(`  Client:   ${job.client.name} (${job.client.code})`);
      console.log(`  Channel:  ${job.sourceChannel}`);
      console.log(`  File:     ${job.originalFileName ?? "—"}`);
      console.log(`  Format:   ${job.format}`);
      console.log(`  Status:   ${job.status}`);
      if (job.failureReason) {
        console.log(`  Error:    ${job.failureReason}`);
      }
      console.log("──────────────────────────────────────────────────────");
    }
  } catch (err) {
    console.error("❌  Error checking jobs:", err instanceof Error ? err.message : err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
