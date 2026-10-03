"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, LoaderCircle, Pencil, Plus, Search, UserRoundX, X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppShell } from "@/components/layout/app-shell";
import { ApiError, apiRequest } from "@/lib/api";

const userSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  username: z.string(),
  email: z.string().nullable(),
  status: z.enum(["active", "inactive"]),
  user_details: z.object({ nomor_identitas: z.string(), no_hp: z.string(), alamat: z.string(), tanggal_lahir: z.string().nullable() }).nullable(),
  savings: z.object({ id: z.string().uuid(), nomor_rekening: z.string(), saldo: z.union([z.string(), z.number()]), status: z.string() }).nullable(),
});
const usersResponseSchema = z.object({
  items: z.array(userSchema),
  pagination: z.object({ page: z.number(), pageSize: z.number(), total: z.number() }),
});
const userFormSchema = z.object({
  name: z.string().trim().min(2).max(120),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9._-]{2,31}$/),
  password: z.string().min(10).max(128).optional(),
  email: z.union([z.string().trim().email().max(254), z.literal("")]).optional(),
  nomor_identitas: z.string().trim().min(3).max(64),
  no_hp: z.string().trim().min(5).max(30),
  alamat: z.string().trim().min(3).max(500),
  tanggal_lahir: z.string().optional(),
});
const resetSchema = z.object({ password: z.string().min(10).max(128) });
const createdSchema = z.object({ id: z.string().uuid(), username: z.string(), initialPassword: z.string(), nomorRekening: z.string() });
type UserFormValues = z.infer<typeof userFormSchema>;
type ManagedUser = z.infer<typeof userSchema>;

function rupiah(value: string | number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value));
}

function UserDialog({ user, onClose, onCreated }: { user: ManagedUser | null; onClose: () => void; onCreated: (value: z.infer<typeof createdSchema>) => void }) {
  const [error, setError] = useState("");
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: user?.name ?? "",
      username: user?.username ?? "",
      password: "",
      email: user?.email ?? "",
      nomor_identitas: user?.user_details?.nomor_identitas ?? "",
      no_hp: user?.user_details?.no_hp ?? "",
      alamat: user?.user_details?.alamat ?? "",
      tanggal_lahir: user?.user_details?.tanggal_lahir ?? "",
    },
  });

  const submit = form.handleSubmit(async (values) => {
    setError("");
    try {
      if (user) {
        await apiRequest(`/admin/users/${user.id}`, z.unknown(), {
          method: "PUT",
          body: JSON.stringify({ ...values, email: values.email || null, tanggal_lahir: values.tanggal_lahir || null }),
        });
      } else {
        const payload = userFormSchema.extend({ password: z.string().min(10).max(128) }).parse(values);
        const result = await apiRequest("/admin/users", createdSchema, {
          method: "POST",
          body: JSON.stringify({ ...payload, email: payload.email || undefined, tanggal_lahir: payload.tanggal_lahir || null }),
        });
        onCreated(result);
      }
      onClose();
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : "Data pengguna gagal disimpan.");
    }
  });

  const fieldClass = "mt-1.5 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15";
  const fields: Array<{ name: keyof UserFormValues; label: string; type: "text" | "email" | "tel" | "password" | "date" }> = [
    { name: "name", label: "Nama lengkap", type: "text" },
    { name: "nomor_identitas", label: "Nomor identitas", type: "text" },
    { name: "no_hp", label: "Nomor HP", type: "tel" },
    { name: "email", label: "Email (opsional)", type: "email" },
    { name: "username", label: "Username", type: "text" },
    ...(!user ? [{ name: "password" as const, label: "Password awal", type: "password" as const }] : []),
    { name: "tanggal_lahir", label: "Tanggal lahir", type: "date" },
  ];

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/40 p-4" role="presentation">
      <section aria-labelledby="user-dialog-title" aria-modal="true" className="my-auto max-h-[min(90vh,900px)] w-full max-w-2xl overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl" role="dialog">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
          <h2 className="text-base font-semibold" id="user-dialog-title">{user ? "Edit pengguna" : "Tambah pengguna"}</h2>
          <button aria-label="Tutup" className="inline-flex size-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100" onClick={onClose} type="button"><X size={18} /></button>
        </div>
        <form className="space-y-4 p-5 sm:p-6" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((field) => (
              <label className="text-sm font-medium text-slate-700" key={field.name}>
                {field.label}
                <input className={fieldClass} type={field.type} {...form.register(field.name)} />
                {form.formState.errors[field.name] && <span className="mt-1 block text-xs text-red-700">Data tidak valid.</span>}
              </label>
            ))}
            <label className="text-sm font-medium text-slate-700 sm:col-span-2">
              Alamat
              <textarea className="mt-1.5 min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15" {...form.register("alamat")} />
              {form.formState.errors.alamat && <span className="mt-1 block text-xs text-red-700">Alamat wajib diisi.</span>}
            </label>
          </div>
          {error && <p aria-live="polite" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button className="h-10 rounded-md border border-slate-300 px-4 text-sm font-medium hover:bg-slate-50" onClick={onClose} type="button">Batal</button>
            <button className="inline-flex h-10 items-center gap-2 rounded-md bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-60" disabled={form.formState.isSubmitting} type="submit">
              {form.formState.isSubmitting && <LoaderCircle className="animate-spin" size={16} />}{user ? "Simpan perubahan" : "Buat pengguna"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [dialogUser, setDialogUser] = useState<ManagedUser | null | "create">(null);
  const [resetUser, setResetUser] = useState<ManagedUser | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<z.infer<typeof createdSchema> | null>(null);
  const [notice, setNotice] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [actionError, setActionError] = useState("");
  const params = new URLSearchParams({ page: String(page), pageSize: "20" });
  if (search.trim()) params.set("search", search.trim());
  const usersQuery = useQuery({
    queryKey: ["managed-users", page, search],
    queryFn: () => apiRequest(`/admin/users?${params.toString()}`, usersResponseSchema),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "inactive" }) =>
      apiRequest(`/admin/users/${id}/status`, z.unknown(), { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["managed-users"] }),
    onError: (error) => setActionError(error instanceof ApiError ? error.message : "Status gagal diubah."),
  });
  const resetMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      apiRequest(`/admin/users/${id}/reset-password`, z.unknown(), { method: "POST", body: JSON.stringify({ password }) }),
    onSuccess: () => {
      setResetUser(null);
      setResetPassword("");
      setNotice("Password berhasil direset.");
    },
    onError: (error) => setActionError(error instanceof ApiError ? error.message : "Password gagal direset."),
  });

  return (
    <AppShell>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.13em] text-emerald-800">Operasional</p><h1 className="text-2xl font-semibold tracking-tight text-slate-950">Pengguna</h1><p className="mt-1 text-sm text-slate-600">Kelola akun, rekening, dan status pengguna.</p></div>
        <button className="inline-flex h-10 items-center gap-2 rounded-md bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-900" onClick={() => setDialogUser("create")} type="button"><Plus size={17} />Tambah pengguna</button>
      </div>

      {createdCredentials && (
        <section className="mb-5 border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-950" role="status">
          <div className="flex items-start justify-between gap-4"><div><p className="font-semibold">Pengguna berhasil dibuat</p><p className="mt-2">Username: <strong>{createdCredentials.username}</strong> · Password awal: <strong>{createdCredentials.initialPassword}</strong></p><p className="mt-1">Nomor rekening: <strong>{createdCredentials.nomorRekening}</strong>. Simpan kredensial sekarang; password tidak ditampilkan lagi.</p></div><button aria-label="Tutup" className="text-emerald-900" onClick={() => setCreatedCredentials(null)} type="button"><X size={17} /></button></div>
        </section>
      )}
      {notice && <p className="mb-4 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">{notice}</p>}
      {actionError && <p className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{actionError}</p>}

      <section className="border-y border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
          <label className="relative block w-full max-w-sm"><span className="sr-only">Cari pengguna</span><Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input className="h-10 w-full rounded-md border border-slate-300 pl-9 pr-3 text-sm outline-none focus:border-emerald-700" onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Cari nama atau username" value={search} /></label>
          <span className="text-xs text-slate-500">{usersQuery.data?.pagination.total ?? 0} pengguna</span>
        </div>
        {usersQuery.isError ? <p className="px-5 py-8 text-sm text-red-700">{usersQuery.error.message}</p> : usersQuery.isPending ? <p className="px-5 py-8 text-sm text-slate-500">Memuat pengguna...</p> : usersQuery.data.items.length === 0 ? <p className="px-5 py-10 text-center text-sm text-slate-500">Tidak ada pengguna yang cocok.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-medium text-slate-500"><tr><th className="px-4 py-3">Nama</th><th className="px-4 py-3">Username</th><th className="px-4 py-3">No. rekening</th><th className="px-4 py-3">No. HP</th><th className="px-4 py-3 text-right">Saldo</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Aksi</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {usersQuery.data.items.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3.5 font-medium text-slate-900">{user.name}</td><td className="px-4 py-3.5 text-slate-600">{user.username}</td><td className="px-4 py-3.5 font-mono text-xs text-slate-600">{user.savings?.nomor_rekening ?? "—"}</td><td className="px-4 py-3.5 text-slate-600">{user.user_details?.no_hp ?? "—"}</td><td className="px-4 py-3.5 text-right tabular-nums text-slate-900">{user.savings ? rupiah(user.savings.saldo) : "—"}</td>
                    <td className="px-4 py-3.5"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${user.status === "active" ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{user.status === "active" ? "Aktif" : "Nonaktif"}</span></td>
                    <td className="px-4 py-3.5"><div className="flex justify-end gap-1">
                      <button aria-label={`Edit ${user.name}`} className="inline-flex size-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100" onClick={() => setDialogUser(user)} title="Edit pengguna" type="button"><Pencil size={16} /></button>
                      <button aria-label={`Reset password ${user.name}`} className="inline-flex size-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100" onClick={() => { setActionError(""); setResetUser(user); }} title="Reset password" type="button"><KeyRound size={16} /></button>
                      <button aria-label={`${user.status === "active" ? "Nonaktifkan" : "Aktifkan"} ${user.name}`} className="inline-flex size-8 items-center justify-center rounded-md text-slate-600 hover:bg-red-50 hover:text-red-700" onClick={() => { setActionError(""); statusMutation.mutate({ id: user.id, status: user.status === "active" ? "inactive" : "active" }); }} title={user.status === "active" ? "Nonaktifkan pengguna" : "Aktifkan pengguna"} type="button"><UserRoundX size={16} /></button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 sm:px-5"><span className="text-xs text-slate-500">Halaman {page}</span><div className="flex gap-2"><button className="h-8 rounded-md border border-slate-300 px-3 text-xs disabled:opacity-40" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} type="button">Sebelumnya</button><button className="h-8 rounded-md border border-slate-300 px-3 text-xs disabled:opacity-40" disabled={!usersQuery.data || page * usersQuery.data.pagination.pageSize >= usersQuery.data.pagination.total} onClick={() => setPage((current) => current + 1)} type="button">Berikutnya</button></div></div>
      </section>

      {dialogUser !== null && <UserDialog user={dialogUser === "create" ? null : dialogUser} onClose={() => setDialogUser(null)} onCreated={(value) => { setCreatedCredentials(value); void queryClient.invalidateQueries({ queryKey: ["managed-users"] }); }} />}
      {resetUser && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" role="presentation">
          <form aria-labelledby="reset-title" aria-modal="true" className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl" onSubmit={(event) => { event.preventDefault(); const parsed = resetSchema.safeParse({ password: resetPassword }); if (parsed.success) resetMutation.mutate({ id: resetUser.id, password: parsed.data.password }); }} role="dialog">
            <div className="flex items-center justify-between"><h2 className="text-base font-semibold" id="reset-title">Reset password</h2><button aria-label="Tutup" onClick={() => setResetUser(null)} type="button"><X size={18} /></button></div>
            <p className="mt-2 text-sm text-slate-600">Atur password baru untuk {resetUser.name}.</p>
            <input autoComplete="new-password" className="mt-4 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" minLength={10} onChange={(event) => setResetPassword(event.target.value)} placeholder="Password baru (min. 10 karakter)" type="password" value={resetPassword} />
            {actionError && <p className="mt-2 text-sm text-red-700">{actionError}</p>}
            <div className="mt-5 flex justify-end gap-2"><button className="h-9 rounded-md border border-slate-300 px-3 text-sm" onClick={() => setResetUser(null)} type="button">Batal</button><button className="h-9 rounded-md bg-emerald-800 px-3 text-sm font-medium text-white disabled:opacity-50" disabled={resetMutation.isPending || resetPassword.length < 10} type="submit">Reset password</button></div>
          </form>
        </div>
      )}
    </AppShell>
  );
}
