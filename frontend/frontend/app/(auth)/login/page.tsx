"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { ArrowLeft, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("student@sitecraft.local");
  const [password, setPassword] = useState("sitecraft-demo");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/dashboard"
    });
    setLoading(false);
    if (result?.error) {
      setError("Login failed. Check your email and password.");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <main className="grid min-h-screen bg-paper text-ink md:grid-cols-[1fr_.8fr]">
      <section
        className="hidden bg-ink bg-cover bg-center md:block"
        style={{
          backgroundImage:
            "linear-gradient(0deg, rgba(17,19,21,.74), rgba(17,19,21,.32)), url(https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1600&q=80)"
        }}
      />
      <section className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-10 inline-flex items-center gap-2 text-sm font-semibold text-ink/68">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
          <h1 className="text-4xl font-black tracking-normal">Welcome back</h1>
          <p className="mt-3 text-sm leading-6 text-ink/68">
            Use the demo credentials or configure Google OAuth in `.env` for provider login. Admin access: admin@sitecraft.ai / admin@123.
          </p>
          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <label className="block text-sm font-semibold">
              Email
              <input
                className="mt-2 h-11 w-full rounded-md border border-line bg-white px-3 outline-none focus:border-accent"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                required
              />
            </label>
            <label className="block text-sm font-semibold">
              Password
              <input
                className="mt-2 h-11 w-full rounded-md border border-line bg-white px-3 outline-none focus:border-accent"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                required
              />
            </label>
            {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
            <Button type="submit" variant="accent" className="w-full" disabled={loading}>
              <LogIn className="h-4 w-4" /> {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <p className="mt-6 text-sm text-ink/68">
            New here?{" "}
            <Link href="/register" className="font-bold text-accent">
              Create an account
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
