"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Loader2, Lock, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { appBaseUrl, isConfigured } from "@/lib/supabase/config";
import { Button, Field, Input } from "@/components/ui";

export function LoginForm({ next }: { next: string }) {
  const [mode, setMode] = React.useState<"signin" | "signup">("signin");
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const router = useRouter();

  const configured = isConfigured();
  const base = appBaseUrl() || window.location.origin;

  function withPending(fn: () => Promise<void>) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        await fn();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  function handleGoogle() {
    withPending(async () => {
      if (!configured) {
        setError("Supabase isn't configured yet - add your keys to .env.local.");
        return;
      }
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${base}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) throw error;
    });
  }

  async function handleEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");

    withPending(async () => {
      if (!configured) {
        setError("Supabase isn't configured yet - add your keys to .env.local.");
        return;
      }
      const supabase = createClient();
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(next);
        router.refresh();
      } else {
        const { error, data: res } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${base}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });
        if (error) throw error;
        if (!res.session) {
          setNotice("Check your inbox - we sent you a link to confirm your email.");
        } else {
          router.push(next);
          router.refresh();
        }
      }
    });
  }

  const isGoogleEnabled = configured;

  return (
    <div className="w-full max-w-sm">
      {!configured ? (
        <div className="mb-5 rounded-xl border border-amber/30 bg-amber-soft px-4 py-3 text-[13px] font-medium text-amber">
          Supabase isn&apos;t configured yet. Add{" "}
          <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code className="font-mono">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> to
          your <code className="font-mono">.env.local</code> to enable sign-in.
        </div>
      ) : null}
      <div className="mb-7 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 rotate-[-6deg] items-center justify-center overflow-hidden rounded-2xl bg-white shadow-[0_14px_30px_-12px_rgba(195,85,42,0.5)] ring-1 ring-line/60">
          <Image
            src="/bunny logo white.jpeg"
            alt=""
            width={56}
            height={56}
            className="h-full w-full object-cover"
          />
        </div>
        <h2 className="font-display text-3xl font-semibold tracking-tight text-ink">
          {mode === "signin" ? "Welcome back" : "Start your journey"}
        </h2>
        <p className="mt-1.5 text-sm text-muted">
          {mode === "signin"
            ? "Sign in to pick up where you left off."
            : "Create an account and plan your next escape."}
        </p>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-rust/25 bg-rust-soft px-4 py-3 text-sm font-medium text-rust-deep">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="mb-4 rounded-xl border border-sea/25 bg-sea-soft px-4 py-3 text-sm font-medium text-sea-deep">
          {notice}
        </div>
      ) : null}

      {isGoogleEnabled ? (
        <>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            disabled={pending}
            onClick={handleGoogle}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52Z"
              />
            </svg>
            Continue with Google
          </Button>

          <div className="my-5 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            <span className="h-px flex-1 bg-line" />
            or
            <span className="h-px flex-1 bg-line" />
          </div>
        </>
      ) : null}

      <form onSubmit={handleEmail} className="space-y-4">
        <Field label="Email">
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="pl-10"
            />
          </div>
        </Field>
        <Field label="Password">
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              placeholder="••••••••"
              className="pl-10"
            />
          </div>
        </Field>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={pending}
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
          {mode === "signin" ? "Sign in" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        {mode === "signin" ? "New to bunny?" : "Already have an account?"}{" "}
        <button
          type="button"
          onClick={() => {
            setMode((m) => (m === "signin" ? "signup" : "signin"));
            setError(null);
          }}
          className="font-semibold text-rust hover:text-rust-deep"
        >
          {mode === "signin" ? "Create an account" : "Sign in"}
        </button>
      </p>

      <p className="mt-8 text-center text-xs text-muted">
        <Link href="/" className="hover:text-ink">
          ← Back to home
        </Link>
      </p>
    </div>
  );
}