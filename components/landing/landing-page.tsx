"use client";

import Link from "next/link";
import { ArrowRight, FileSpreadsheet, ShieldCheck, Send, ScanLine } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";

const FEATURES = [
  {
    icon: ScanLine,
    title: "Upload",
    description: "Clients drop timesheets in any format — Excel, PDF, or scanned image.",
  },
  {
    icon: FileSpreadsheet,
    title: "Extract",
    description: "Structured data is pulled automatically, with confidence scoring on every field.",
  },
  {
    icon: ShieldCheck,
    title: "Validate",
    description: "Built-in rules catch anomalies before an invoice ever reaches a reviewer.",
  },
  {
    icon: Send,
    title: "Dispatch",
    description: "Approved invoices are generated and sent — no manual data entry, ever.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

export function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(40rem 24rem at 15% -10%, color-mix(in oklch, var(--primary), transparent 80%), transparent), radial-gradient(36rem 24rem at 100% 10%, color-mix(in oklch, var(--accent), transparent 75%), transparent)",
        }}
      />

      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            T
          </span>
          <span className="font-heading text-lg font-semibold">TIA</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="outline">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-20 px-6 py-16 sm:px-10">
        <motion.section
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.08 } } }}
          className="flex max-w-2xl flex-col items-center gap-6 text-center"
        >
          <motion.div variants={fadeUp} transition={{ duration: 0.5 }}>
            <Badge variant="secondary" className="bg-accent text-accent-foreground">
              Built for HackerArena 2.0
            </Badge>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl"
          >
            Touchless timesheet-to-invoice{" "}
            <span className="bg-gradient-to-r from-primary to-[color-mix(in_oklch,var(--primary),var(--accent-foreground)_55%)] bg-clip-text text-transparent">
              automation
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="text-lg text-muted-foreground"
          >
            TIA turns raw timesheets into validated, dispatched invoices — without anyone
            re-typing a single number.
          </motion.p>

          <motion.div variants={fadeUp} transition={{ duration: 0.5 }}>
            <Button asChild size="lg" className="group">
              <Link href="/login">
                Get started
                <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
          </motion.div>
        </motion.section>

        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={{ show: { transition: { staggerChildren: 0.08 } } }}
          className="grid w-full max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {FEATURES.map(({ icon: Icon, title, description }, i) => (
            <motion.div
              key={title}
              variants={fadeUp}
              transition={{ duration: 0.4 }}
              whileHover={{ y: -4 }}
            >
              <Card className="h-full transition-shadow hover:shadow-lg hover:shadow-primary/5">
                <CardHeader>
                  <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-4.5" />
                  </div>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      0{i + 1}
                    </span>
                    {title}
                  </CardTitle>
                  <CardDescription>{description}</CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </motion.section>
      </main>

      <footer className="px-6 py-6 text-center text-sm text-muted-foreground sm:px-10">
        TIA — built for HackerArena 2.0
      </footer>
    </div>
  );
}
