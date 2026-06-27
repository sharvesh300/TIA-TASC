/**
 * POST /api/timesheets/poll
 *
 * Triggers a Gmail inbox poll. Call this:
 *   - From a cron job / scheduled task (e.g. Vercel Cron, setInterval)
 *   - Manually from the FinOps dashboard "Sync Inbox" button
 *
 * Secured to ADMIN and FINOPS roles only.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pollGmailTimesheets } from "@/services/gmail.service";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles = ["ADMIN", "FINOPS"];
  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const results = await pollGmailTimesheets(20);

    const processed = results.filter(r => !r.skipped);
    const skipped = results.filter(r => r.skipped);
    const totalJobs = processed.reduce((sum, r) => sum + r.jobsCreated.length, 0);

    return NextResponse.json({
      success: true,
      summary: {
        emailsFound: results.length,
        emailsProcessed: processed.length,
        emailsSkipped: skipped.length,
        jobsCreated: totalJobs,
      },
      details: results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Poll failed";
    console.error("[Gmail Poll]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
