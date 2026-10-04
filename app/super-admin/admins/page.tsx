"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, LoaderCircle, Pencil, Plus, Search, ShieldCheck, X, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppShell } from "@/components/layout/app-shell";
import { ApiError, apiRequest } from "@/lib/api";

const adminSchema = z.object({ id: z.string().uuid(), name: z.string(), username: z.string(), email: z.string().nullable(), status: z.enum(["active", "inactive"]), created_at: z.string() });
const listSchema = z.object({ items: z.array(adminSchema), pagination: z.object({ page: z.number(), pageSize: z.number(), total: z.number() }) });
const adminFormSchema = z.object({
  name: z.string().trim().min(2).max(120),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9._-]{2,31}$/),
  email: z.union([z.string().trim().email().max(254), z.literal("")]).optional(),
  password: z.string().min(10).max(128).optional(),
});
const createdSchema = z.object({ id: z.string().uuid(), username: z.string(), initialPassword: z.string() });
const resetSchema = z.object({ password: z.string().min(10).max(128) });
type ManagedAdmin = z.infer<typeof adminSchema>;
type AdminFormValues = z.infer<typeof adminFormSchema>;

function AdminDialog({ admin, close, onCreated }: { admin: ManagedAdmin | null; close: () => void; onCreated: (item: z.infer<typeof createdSchema>) => void }) {
  const [error, setError] = useState("");
  const form = useForm<AdminFormValues>({ resolver: zodResolver(adminFormSchema), defaultValues: { name: admin?.name ?? "", username: admin?.username ?? "", email: admin?.email ?? "", password: "" } });

  const submit = form.handleSubmit(async (values) => {
    setError("");
    try {
      if (admin) {
        await apiRequest(`/super-admin/admins/${admin.id}`, z.unknown(), { method: "PUT", body: JSON.stringify({ name: values.name, username: values.username, email: values.email || null }) });
      } else {
        const payload = adminFormSchema.extend({ password: z.string().min(10).max(128) }).parse(values);
        const result = await apiRequest("/super-admin/admins", createdSchema, { method: "POST", body: JSON.stringify({ ...payload, email: payload.email || undefined }) });
        onCreated(result);
      }
      close();
    } catch (errorValue) {
      setError(errorValue instanceof ApiError ? errorValue.message : "Data Admin gagal disimpan.");
    }
  });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" role="presentation">
      <form aria-labelledby="admin-dialog-title" aria-modal="true" className="w-full max-w-lg rounded-lg border border-slate-200 bg-white shadow-xl" onSubmit={submit} role="dialog">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><h2 className="text-base font-semibold" id="admin-dialog-title">{admin ? "Edit Admin" : "Tambah Admin"}</h2><button aria-label="Tutup" onClick={close} type="button"><X size={18} /></button></div>
        <div className="space-y-4 p-5">
          {([ ["name", "Nama lengkap", "text"], ["username", "Username", "text"], ["email", "Email (opsional)", "email"], ...(!admin ? [["password", "Password awal", "password"]] : []) ] as Array<[keyof AdminFormValues, string, string]>).map(([name, label, type]) => (
            <label className="block text-sm font-medium text-slate-700" key={name}>{label}<input autoComplete={name === "password" ? "new-password" : undefined} className="mt-1.5 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-emerald-700" type={type} {...form.register(name)} />{form.formState.errors[name] && <span className="mt-1 block text-xs text-red-700">Data tidak valid.</span>}</label>
          ))}
          {error && <p aria-live="polite" className="text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button className="h-9 rounded-md border border-slate-300 px-3 text-sm" onClick={close} type="button">Batal</button><button className="inline-flex h-9 items-center gap-2 rounded-md bg-emerald-800 px-3 text-sm font-medium text-white disabled:opacity-50" disabled={form.formState.isSubmitting} type="submit">{form.formState.isSubmitting && <LoaderCircle className="animate-spin" size={15} />}{admin ? "Simpan" : "Buat Admin"}</button></div>
        </div>
      </form>
    </div>
  );
}

export default function AdminsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<ManagedAdmin | null | "create">(null);
  const [resetAdmin, setResetAdmin] = useState<ManagedAdmin | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [created, setCreated] = useState<z.infer<typeof createdSchema> | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("create") === "1") {
      const timeout = window.setTimeout(() => setDialog("create"), 0);
      return () => window.clearTimeout(timeout);
    }
  }, []);
  const params = new URLSearchParams({ page: String(page), pageSize: "20" });
  if (search.trim()) params.set("search", search.trim());
  const adminsQuery = useQuery({ queryKey: ["managed-admins", page, search], queryFn: () => apiRequest(`/super-admin/admins?${params}`, listSchema) });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["managed-admins"] });
  const statusMutation = useMutation({ mutationFn: ({ id, status }: { id: string; status: "active" | "inactive" }) => apiRequest(`/super-admin/admins/${id}/status`, z.unknown(), { method: "PATCH", body: JSON.stringify({ status }) }), onSuccess: invalidate, onError: () => setError("Status Admin gagal diubah.") });
  const resetMutation = useMutation({ mutationFn: ({ id, password }: { id: string; password: string }) => apiRequest(`/super-admin/admins/${id}/reset-password`, z.unknown(), { method: "POST", body: JSON.stringify({ password }) }), onSuccess: () => { setResetAdmin(null); setNewPassword(""); setError("Password Admin berhasil direset."); }, onError: () => setError("Password Admin gagal direset.") });
  const deleteMutation = useMutation({ mutationFn: (id: string) => apiRequest(`/super-admin/admins/${id}`, z.unknown(), { method: "DELETE" }), onSuccess: () => { invalidate(); setError("Admin berhasil dihapus permanen."); }, onError: () => setError("Admin gagal dihapus.") });

  return (
    <AppShell>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.13em] text-emerald-800">Administrasi</p><h1 className="text-2xl font-semibold tracking-tight text-slate-950">Admin</h1><p className="mt-1 text-sm text-slate-600">Kelola akun dan akses Admin.</p></div><button className="inline-flex h-10 items-center gap-2 rounded-md bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-900" onClick={() => setDialog("create")} type="button"><Plus size={17} />Tambah Admin</button></div>
      {created && <section className="mb-5 border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-950"><div className="flex justify-between gap-4"><div><p className="font-semibold">Admin berhasil dibuat</p><p className="mt-1">Username: <strong>{created.username}</strong> · Password awal: <strong>{created.initialPassword}</strong>. Simpan sekarang, password tidak akan ditampilkan lagi.</p></div><button aria-label="Tutup" onClick={() => setCreated(null)} type="button"><X size={17} /></button></div></section>}
      {error && <p className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="status">{error}</p>}
      <section className="border-y border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3"><label className="relative block w-full max-w-sm"><span className="sr-only">Cari Admin</span><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input className="h-10 w-full rounded-md border border-slate-300 pl-9 pr-3 text-sm" onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Cari nama atau username" value={search} /></label><span className="text-xs text-slate-500">{adminsQuery.data?.pagination.total ?? 0} Admin</span></div>
        {adminsQuery.isError ? <p className="px-5 py-8 text-sm text-red-700">{adminsQuery.error.message}</p> : adminsQuery.isPending ? <p className="px-5 py-8 text-sm text-slate-500">Memuat Admin...</p> : adminsQuery.data.items.length === 0 ? <p className="px-5 py-10 text-center text-sm text-slate-500">Belum ada Admin.</p> : (
          <div className="overflow-x-auto"><table className="w-full min-w-175 text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-5 py-3">Nama</th><th className="px-4 py-3">Username</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Status</th><th className="px-5 py-3 text-right">Aksi</th></tr></thead><tbody className="divide-y divide-slate-100">{adminsQuery.data.items.map((admin) => <tr key={admin.id}><td className="px-5 py-3.5 font-medium text-slate-900">{admin.name}</td><td className="px-4 py-3.5 text-slate-600">{admin.username}</td><td className="px-4 py-3.5 text-slate-600">{admin.email || "—"}</td><td className="px-4 py-3.5"><span className={`rounded-full px-2.5 py-1 text-xs ${admin.status === "active" ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{admin.status === "active" ? "Aktif" : "Nonaktif"}</span></td><td className="px-5 py-3.5"><div className="flex justify-end gap-1"><button aria-label={`Edit ${admin.name}`} className="inline-flex size-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100" onClick={() => setDialog(admin)} title="Edit Admin" type="button"><Pencil size={16} /></button><button aria-label={`Reset password ${admin.name}`} className="inline-flex size-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100" onClick={() => setResetAdmin(admin)} title="Reset password" type="button"><KeyRound size={16} /></button><button aria-label={`${admin.status === "active" ? "Nonaktifkan" : "Aktifkan"} ${admin.name}`} className="inline-flex size-8 items-center justify-center rounded-md text-slate-600 hover:bg-amber-50 hover:text-amber-800" onClick={() => statusMutation.mutate({ id: admin.id, status: admin.status === "active" ? "inactive" : "active" })} title={admin.status === "active" ? "Nonaktifkan Admin" : "Aktifkan Admin"} type="button"><ShieldCheck size={16} /></button><button aria-label={`Hapus permanen ${admin.name}`} className="inline-flex size-8 items-center justify-center rounded-md text-slate-600 hover:bg-red-50 hover:text-red-700" onClick={() => { if (confirm(`Apakah Anda yakin ingin menghapus permanen admin ${admin.name}?`)) { setError(""); deleteMutation.mutate(admin.id); } }} title="Hapus permanen Admin" type="button"><Trash2 size={16} /></button></div></td></tr>)}</tbody></table></div>
        )}
        <div className="flex justify-between border-t border-slate-200 px-4 py-3"><span className="text-xs text-slate-500">Halaman {page}</span><div className="flex gap-2"><button className="h-8 rounded-md border border-slate-300 px-3 text-xs disabled:opacity-40" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} type="button">Sebelumnya</button><button className="h-8 rounded-md border border-slate-300 px-3 text-xs disabled:opacity-40" disabled={!adminsQuery.data || page * adminsQuery.data.pagination.pageSize >= adminsQuery.data.pagination.total} onClick={() => setPage((current) => current + 1)} type="button">Berikutnya</button></div></div>
      </section>
      {dialog !== null && <AdminDialog admin={dialog === "create" ? null : dialog} close={() => setDialog(null)} onCreated={(item) => { setCreated(item); void invalidate(); }} />}
      {resetAdmin && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" role="presentation"><form aria-labelledby="reset-admin-title" aria-modal="true" className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl" onSubmit={(event) => { event.preventDefault(); const parsed = resetSchema.safeParse({ password: newPassword }); if (parsed.success) resetMutation.mutate({ id: resetAdmin.id, password: parsed.data.password }); }} role="dialog"><div className="flex items-center justify-between"><h2 className="text-base font-semibold" id="reset-admin-title">Reset password Admin</h2><button aria-label="Tutup" onClick={() => setResetAdmin(null)} type="button"><X size={18} /></button></div><p className="mt-2 text-sm text-slate-600">Admin: {resetAdmin.name}</p><input autoComplete="new-password" className="mt-4 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" onChange={(event) => setNewPassword(event.target.value)} placeholder="Password baru (min. 10 karakter)" type="password" value={newPassword} /><div className="mt-5 flex justify-end gap-2"><button className="h-9 rounded-md border border-slate-300 px-3 text-sm" onClick={() => setResetAdmin(null)} type="button">Batal</button><button className="h-9 rounded-md bg-emerald-800 px-3 text-sm font-medium text-white disabled:opacity-50" disabled={newPassword.length < 10 || resetMutation.isPending} type="submit">Reset password</button></div></form></div>}
    </AppShell>
  );
}
