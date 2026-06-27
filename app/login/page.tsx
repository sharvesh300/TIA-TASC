"use client";

import { useActionState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft, FileSpreadsheet, ScanLine, Send, ShieldCheck } from "lucide-react";
import { loginAction, type LoginState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

const initialState: LoginState = {};

const PIPELINE = [
  { icon: ScanLine, label: "Upload" },
  { icon: FileSpreadsheet, label: "Extract" },
  { icon: ShieldCheck, label: "Validate" },
  { icon: Send, label: "Dispatch" },
];

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <main className="grid min-h-screen flex-1 lg:grid-cols-2">
      <div
        className="relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex"
        style={{
          backgroundImage:
            "linear-gradient(135deg, oklch(0.42 0.19 264), oklch(0.5 0.19 280))",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(30rem 20rem at 100% 0%, oklch(1 0 0 / 12%), transparent), radial-gradient(24rem 18rem at 0% 100%, oklch(1 0 0 / 10%), transparent)",
          }}
        />
        <Link href="/" className="relative z-10 flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-md bg-white/15 text-sm font-bold">
            T
          </span>
          <span className="font-heading text-lg font-semibold">TIA</span>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 max-w-sm space-y-6"
        >
          <h2 className="font-heading text-3xl font-semibold tracking-tight">
            Touchless timesheet-to-invoice automation
          </h2>
          <div className="flex flex-wrap gap-3">
            {PIPELINE.map(({ icon: Icon, label }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.15 + i * 0.08 }}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm"
              >
                <Icon className="size-3.5" />
                {label}
              </motion.div>
            ))}
          </div>
        </motion.div>

        <p className="relative z-10 text-sm text-white/70">
          Built for HackerArena 2.0
        </p>
      </div>

      <div className="relative flex flex-col items-center justify-center gap-8 p-8">
        <div className="absolute top-5 right-6 left-6 flex items-center justify-between sm:left-auto">
          <Button asChild variant="ghost" size="sm" className="lg:hidden">
            <Link href="/">
              <ArrowLeft />
              Back
            </Link>
          </Button>
          <ThemeToggle />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-2xl">Welcome back</CardTitle>
              <CardDescription>Sign in to your TIA account</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={formAction} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="admin@tia.demo"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    placeholder="password123"
                  />
                </div>

                {state.error && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="text-sm text-destructive"
                  >
                    {state.error}
                  </motion.p>
                )}

                <Button type="submit" disabled={pending} className="w-full">
                  {pending ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </main>
  );
}
