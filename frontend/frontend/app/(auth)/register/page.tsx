"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const result = await signIn("credentials", { email, password, redirect: false, callbackUrl: "/dashboard" });
    setLoading(false);
    if (result?.error) {
      setError("Registration failed. Check your email and password.");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-5 py-10 text-ink">
      <div className="w-full max-w-md">
        <Link href="/" className="text-sm font-semibold text-ink/68">
          SiteCraft AI
        </Link>
        <h1 className="mt-8 text-4xl font-black tracking-normal">Create your workspace</h1>
        <p className="mt-3 text-sm leading-6 text-ink/68">
          Local MVP registration uses Auth.js credentials for demo access. Add a real adapter when connecting production auth.
        </p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block text-sm font-semibold">
            Name
            <input className="mt-2 h-11 w-full rounded-md border border-line bg-white px-3 outline-none focus:border-accent" value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          <label className="block text-sm font-semibold">
            Email
            <input className="mt-2 h-11 w-full rounded-md border border-line bg-white px-3 outline-none focus:border-accent" value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
          </label>
          <label className="block text-sm font-semibold">
            Password
            <input className="mt-2 h-11 w-full rounded-md border border-line bg-white px-3 outline-none focus:border-accent" value={password} onChange={(event) => setPassword(event.target.value)} type="password" minLength={8} required />
          </label>
          {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          <Button type="submit" variant="accent" className="w-full" disabled={loading}>
            <UserPlus className="h-4 w-4" /> {loading ? "Registering..." : "Register"}
          </Button>
        </form>
      </div>
    </main>
  );
}
