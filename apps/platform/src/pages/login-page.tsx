import { useState, type FormEvent } from "react";
import { ShieldCheck } from "lucide-react";
import { authLogin } from "@/lib/api-client";
import { useSuperAdminSession } from "@/hooks/use-superadmin-session";

export function LoginPage() {
  const setTokens = useSuperAdminSession((s) => s.setTokens);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setSubmitting(true);
    setError(null);
    try {
      const tokens = await authLogin(username.trim(), password);
      setTokens(tokens);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.03] p-8">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <ShieldCheck className="h-8 w-8 text-blue-400" />
          <h1 className="text-lg font-semibold">Fleetora Platform</h1>
          <p className="text-sm text-white/50">Super admin sign-in</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-white/60">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-11 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm outline-none focus:border-blue-400"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-white/60">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm outline-none focus:border-blue-400"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="mt-2 h-11 rounded-lg bg-blue-500 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:opacity-50"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
