"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { resetPassword } from "@/services/auth.service";
import { forgotPasswordSchema, type ForgotPasswordValues } from "@/schemas/auth";

export default function ForgotPasswordPage() {
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordValues) {
    setSubmitting(true);
    try {
      await resetPassword(values.email);
      setSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send reset email");
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <Card className="shadow-xl shadow-black/5">
        <CardContent className="flex flex-col items-center gap-4 pt-8 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
            <MailCheck className="size-7 text-primary" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Reset link sent</h2>
            <p className="text-sm text-muted-foreground">
              If an account exists for that email, you&apos;ll receive a password reset link shortly.
            </p>
          </div>
          <Button className="w-full" variant="outline" onClick={() => setSent(false)}>
            <ArrowLeft className="size-4" /> Try another email
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl shadow-black/5">
      <CardHeader>
        <CardTitle className="text-xl">Reset password</CardTitle>
        <CardDescription>
          Enter your email and we&apos;ll send you a reset link.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@pharmacy.com" autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
              {submitting ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        </Form>
        <p className="mt-6 text-center text-sm">
          <Link href="/login" className="inline-flex items-center gap-1.5 font-medium text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="size-3.5" /> Back to sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
