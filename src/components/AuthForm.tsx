"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";
import { appPath } from "@/lib/paths";
import { brandVoice } from "@/services/brandVoice";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isSignup = mode === "signup";
  const copy = brandVoice.messages.auth;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    const supabase = createClient();

    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo:
              typeof window === "undefined"
                ? undefined
                : `${window.location.origin}${appPath("/parent/dashboard/")}`,
          },
        });
        if (error) throw error;
        // If email confirmation is off, a session exists already.
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          window.location.href = appPath("/parent/dashboard/");
        } else {
          setInfo(copy.confirmEmail);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        window.location.href = appPath("/parent/dashboard/");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : copy.genericError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bg-grain flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex justify-center py-2" style={{ minHeight: 44 }}>
          <Logo />
        </Link>
        <div className="card p-5 sm:p-7">
          <h1 className="font-display text-2xl font-semibold">
            {isSignup ? copy.signupTitle : copy.loginTitle}
          </h1>
          <p className="mt-1 text-sm text-ink/60">
            {isSignup ? copy.signupSubtitle : copy.loginSubtitle}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {isSignup && (
              <div>
                <label className="label" htmlFor="name">{copy.nameLabel}</label>
                <input
                  id="name"
                  className="field"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jordan Rivera"
                  required
                />
              </div>
            )}
            <div>
              <label className="label" htmlFor="email">{copy.emailLabel}</label>
              <input
                id="email"
                type="email"
                className="field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="password">{copy.passwordLabel}</label>
              <input
                id="password"
                type="password"
                className="field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={copy.passwordPlaceholder}
                minLength={6}
                required
              />
            </div>

            {error && (
              <p className="rounded-lg bg-clay/10 px-3 py-2 text-sm text-clay">{error}</p>
            )}
            {info && (
              <p className="rounded-lg bg-sprout-50 px-3 py-2 text-sm text-sprout-700">{info}</p>
            )}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? copy.loading : isSignup ? copy.signupButton : copy.loginButton}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-ink/60">
            {isSignup ? `${copy.alreadyHaveAccount} ` : `${copy.newHere} `}
            <Link
              href={isSignup ? "/login" : "/signup"}
              className="inline-flex items-center px-2 font-semibold text-sprout-600 hover:underline"
              style={{ minHeight: 44 }}
            >
              {isSignup ? copy.loginButton : copy.createOne}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
