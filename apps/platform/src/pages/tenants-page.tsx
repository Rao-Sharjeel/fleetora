import { useEffect, useState, type FormEvent } from "react";
import { LogOut, Plus, ShieldCheck, X } from "lucide-react";
import { useSuperAdminSession } from "@/hooks/use-superadmin-session";
import { ApiError } from "@/lib/api-client";
import { createTenant, listTenants, type Tenant } from "@/lib/tenants.service";

const emptyForm = { schemaName: "", name: "", domain: "", adminEmail: "", adminPassword: "" };

export function TenantsPage() {
  const logout = useSuperAdminSession((s) => s.logout);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      setTenants(await listTenants());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createTenant(form);
      setOpen(false);
      setForm(emptyForm);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create tenant.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-4xl flex-col gap-6 px-6 py-10">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-blue-400" />
          <div>
            <h1 className="text-lg font-semibold">Tenants</h1>
            <p className="text-sm text-white/50">Every company using Fleetora.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOpen(true)}
            className="flex h-10 items-center gap-2 rounded-lg bg-blue-500 px-4 text-sm font-semibold text-white transition hover:bg-blue-400"
          >
            <Plus className="h-4 w-4" /> New Tenant
          </button>
          <button
            onClick={logout}
            aria-label="Sign out"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-white/60 transition hover:text-white"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="overflow-hidden rounded-xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-white/50">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Schema</th>
              <th className="px-4 py-3 font-medium">Domain</th>
              <th className="px-4 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-white/50">
                  Loading…
                </td>
              </tr>
            ) : tenants.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-white/50">
                  No tenants yet.
                </td>
              </tr>
            ) : (
              tenants.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-3 font-medium">{t.name}</td>
                  <td className="px-4 py-3 text-white/70">{t.schemaName}</td>
                  <td className="px-4 py-3 text-white/70">{t.domain ?? "—"}</td>
                  <td className="px-4 py-3 text-white/50">{new Date(t.createdAt).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0a1222] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">New Tenant</h2>
              <button onClick={() => setOpen(false)} aria-label="Close">
                <X className="h-4 w-4 text-white/50" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <Field label="Company Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Acme Corp" />
              <Field
                label="Schema Name"
                value={form.schemaName}
                onChange={(v) => setForm({ ...form, schemaName: v })}
                placeholder="acme"
              />
              <Field
                label="API Domain"
                value={form.domain}
                onChange={(v) => setForm({ ...form, domain: v })}
                placeholder="acme.api.fleetora.com"
              />
              <Field
                label="Admin Email"
                value={form.adminEmail}
                onChange={(v) => setForm({ ...form, adminEmail: v })}
                placeholder="owner@acme.com"
              />
              <Field
                label="Admin Password"
                type="password"
                value={form.adminPassword}
                onChange={(v) => setForm({ ...form, adminPassword: v })}
              />
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="mt-2 h-11 rounded-lg bg-blue-500 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:opacity-50"
              >
                {submitting ? "Creating…" : "Create Tenant"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-white/60">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        className="h-10 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm outline-none focus:border-blue-400"
      />
    </div>
  );
}
