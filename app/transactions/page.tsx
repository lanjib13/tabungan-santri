"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, BookOpen, LoaderCircle, Receipt, Search, Wallet, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppShell } from "@/components/layout/app-shell";
import { ApiError, apiRequest } from "@/lib/api";
import { getCurrentProfile } from "@/lib/auth";

const transactionSchema = z.object({
  id: z.string().uuid(), savings_id: z.string().uuid(), user_id: z.string().uuid(), admin_id: z.string().uuid(),
  transaction_code: z.string(), type: z.enum(["deposit", "withdrawal"]), amount: z.union([z.string(), z.number()]),
  balance_before: z.union([z.string(), z.number()]), balance_after: z.union([z.string(), z.number()]),
  description: z.string(), transaction_date: z.string(),
  user: z.object({ id: z.string().uuid(), name: z.string(), username: z.string() }).nullable(),
  admin: z.object({ id: z.string().uuid(), name: z.string(), username: z.string() }).nullable(),
});
const transactionListSchema = z.object({ items: z.array(transactionSchema), pagination: z.object({ page: z.number(), pageSize: z.number(), total: z.number() }) });
const savingsSchema = z.object({ id: z.string().uuid(), user_id: z.string().uuid(), nomor_rekening: z.string(), saldo: z.union([z.string(), z.number()]), status: z.string(), owner: z.object({ id: z.string().uuid(), name: z.string(), username: z.string(), status: z.string() }).nullable() });
const savingsListSchema = z.object({ items: z.array(savingsSchema) });
const transactionResultSchema = z.object({ id: z.string().uuid(), transaction_code: z.string(), amount: z.union([z.string(), z.number()]), balance_after: z.union([z.string(), z.number()]) });
const createSchema = z.object({ savingsId: z.string().uuid(), amount: z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER), description: z.string().trim().max(500) });
type Transaction = z.infer<typeof transactionSchema>;
type Savings = z.infer<typeof savingsSchema>;
type CreateFormInput = z.input<typeof createSchema>;
type CreateValues = z.output<typeof createSchema>;

function formatRupiah(value: string | number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value));
}

function formatDate(dateString: string) {
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return dateString;
  }
}

function CreateTransactionDialog({ type, savings, close, onSaved }: { type: "deposit" | "withdrawal"; savings: Savings[]; close: () => void; onSaved: (result: z.infer<typeof transactionResultSchema>) => void }) {
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const form = useForm<CreateFormInput, unknown, CreateValues>({ resolver: zodResolver(createSchema), defaultValues: { savingsId: "", amount: "", description: "" } });
  const selectedSavingsId = useWatch({ control: form.control, name: "savingsId" });
  const amount = Number(useWatch({ control: form.control, name: "amount" }));
  const selected = savings.find((account) => account.id === selectedSavingsId);

  const submit = form.handleSubmit(async (values) => {
    if (!confirmed) {
      setConfirmed(true);
      return;
    }
    setError("");
    try {
      const result = await apiRequest(`/transactions/${type}`, transactionResultSchema, {
        method: "POST",
        body: JSON.stringify(values),
      });
      onSaved(result);
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : "Transaksi gagal disimpan.");
      setConfirmed(false);
    }
  });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/40 p-4" role="presentation">
      <form aria-labelledby="transaction-dialog-title" aria-modal="true" className="my-auto w-full max-w-lg rounded-lg border border-slate-200 bg-white shadow-xl" onSubmit={submit} role="dialog">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><h2 className="text-base font-semibold" id="transaction-dialog-title">{type === "deposit" ? "Setoran" : "Penarikan"}</h2><button aria-label="Tutup" onClick={close} type="button"><X size={18} /></button></div>
        <div className="space-y-4 p-5">
          <label className="block text-sm font-medium text-slate-700">Pengguna dan rekening<select className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" {...form.register("savingsId")}><option value="">Pilih pengguna</option>{savings.filter((account) => account.status === "active" && account.owner?.status === "active").map((account) => <option key={account.id} value={account.id}>{account.owner?.name} · {account.nomor_rekening} · saldo {formatRupiah(account.saldo)}</option>)}</select></label>
          <label className="block text-sm font-medium text-slate-700">Nominal<input className="mt-1.5 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" min="1" step="1" type="number" {...form.register("amount")} /><span className="mt-1 block text-xs font-normal text-slate-500">{amount > 0 ? formatRupiah(amount) : "Masukkan nominal rupiah"}</span></label>
          <label className="block text-sm font-medium text-slate-700">Keterangan<textarea className="mt-1.5 min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" maxLength={500} {...form.register("description")} /></label>
          {error && <p aria-live="polite" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
          {confirmed && selected && <p className="border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">Apakah Anda yakin ingin melakukan {type === "deposit" ? "setoran" : "penarikan"} <strong>{formatRupiah(amount)}</strong> kepada <strong>{selected.owner?.name}</strong>?</p>}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button className="h-9 rounded-md border border-slate-300 px-3 text-sm" onClick={confirmed ? () => setConfirmed(false) : close} type="button">{confirmed ? "Ubah" : "Batal"}</button><button className="inline-flex h-9 items-center gap-2 rounded-md bg-emerald-800 px-3 text-sm font-medium text-white disabled:opacity-50" disabled={form.formState.isSubmitting || savings.length === 0} type="submit">{form.formState.isSubmitting && <LoaderCircle className="animate-spin" size={15} />}{confirmed ? "Konfirmasi transaksi" : "Lanjutkan"}</button></div>
        </div>
      </form>
    </div>
  );
}

export default function TransactionsPage() {
  const queryClient = useQueryClient();
  const profileQuery = useQuery({ queryKey: ["current-profile"], queryFn: getCurrentProfile, retry: false });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [userId, setUserId] = useState("");
  const [type, setType] = useState<"" | "deposit" | "withdrawal">("");
  const [dialogType, setDialogType] = useState<"deposit" | "withdrawal" | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [notice, setNotice] = useState("");
  const params = new URLSearchParams({ page: String(page), pageSize: "20" });
  if (search.trim()) params.set("search", search.trim());
  if (userId) params.set("userId", userId);
  if (type) params.set("type", type);

  const hasFilter = Boolean(search.trim() || type || userId);
  const handleResetFilters = () => {
    setSearch("");
    setType("");
    setUserId("");
    setPage(1);
  };

  const transactionsQuery = useQuery({
    queryKey: ["transactions", page, search, userId, type],
    queryFn: () => apiRequest(`/transactions?${params}`, transactionListSchema),
  });
  const savingsQuery = useQuery({
    queryKey: ["savings-for-transaction"],
    queryFn: () => apiRequest("/savings", savingsListSchema),
    enabled: profileQuery.data?.role === "admin",
  });
  const savingsFilterQuery = useQuery({
    queryKey: ["savings-filter-options"],
    queryFn: () => apiRequest("/savings", savingsListSchema),
    enabled: profileQuery.data?.role === "admin" || profileQuery.data?.role === "super_admin",
  });
  const userSavingsQuery = useQuery({
    queryKey: ["user-savings-summary"],
    queryFn: () => apiRequest("/savings", savingsListSchema),
  });

  const userOptions = [...new Map((savingsFilterQuery.data?.items ?? []).flatMap((item) => item.owner ? [[item.owner.id, item.owner] as const] : [])).values()];
  const profile = profileQuery.data;
  const currentSavings = userSavingsQuery.data?.items[0];

  const items = transactionsQuery.data?.items ?? [];
  const totalDeposits = items
    .filter((t) => t.type === "deposit")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const totalWithdrawals = items
    .filter((t) => t.type === "withdrawal")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  useEffect(() => {
    if (profile?.role !== "admin") return;
    const action = new URLSearchParams(window.location.search).get("action");
    if (action === "deposit" || action === "withdrawal") {
      const timeout = window.setTimeout(() => setDialogType(action), 0);
      return () => window.clearTimeout(timeout);
    }
  }, [profile?.role]);

  return (
    <AppShell>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.13em] text-emerald-800">
            Aktivitas Rekening
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
            Buku Tabungan & Transaksi
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Catatan mutasi setoran, penarikan, dan histori saldo rekening tabungan santri.
          </p>
        </div>
        {profile?.role === "admin" && (
          <div className="flex gap-2">
            <button
              className="inline-flex h-10 items-center gap-2 rounded-md border border-emerald-800 px-3.5 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-50"
              onClick={() => setDialogType("deposit")}
              type="button"
            >
              <ArrowDownLeft size={16} />
              Setoran (+ Kredit)
            </button>
            <button
              className="inline-flex h-10 items-center gap-2 rounded-md bg-emerald-800 px-3.5 text-sm font-semibold text-white transition hover:bg-emerald-900"
              onClick={() => setDialogType("withdrawal")}
              type="button"
            >
              <ArrowUpRight size={16} />
              Penarikan (- Debet)
            </button>
          </div>
        )}
      </div>

      {notice && (
        <p className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900" role="status">
          {notice}
        </p>
      )}

      {profile?.role === "user" && currentSavings && (
        <div className="mb-7 overflow-hidden rounded-xl border border-emerald-700/30 bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950 p-6 text-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-800/80 text-emerald-200 shadow-inner">
                <BookOpen size={26} />
              </div>
              <div>
                <span className="inline-block rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-300 border border-emerald-400/30">
                  Buku Tabungan Santri
                </span>
                <h2 className="mt-1 text-xl font-bold text-white tracking-tight">
                  {profile.name}
                </h2>
                <p className="font-mono text-xs text-emerald-200/90 mt-0.5">
                  No. Rekening: <span className="font-bold text-white">{currentSavings.nomor_rekening}</span>
                </p>
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/10 px-5 py-3 text-right backdrop-blur-xs">
              <p className="text-xs font-medium text-emerald-200">Saldo Tabungan Saat Ini</p>
              <p className="mt-0.5 text-2xl font-bold tracking-tight text-white tabular-nums sm:text-3xl">
                {formatRupiah(currentSavings.saldo)}
              </p>
              <span className="inline-block mt-1 text-[10px] font-medium text-emerald-300">
                Status Rekening: {currentSavings.status === "active" ? "Aktif" : "Nonaktif"}
              </span>
            </div>
          </div>
        </div>
      )}

      <section
        aria-label="Ringkasan transaksi tabungan"
        className="mb-7 grid gap-0 divide-y divide-slate-200 border-y border-slate-200 bg-white sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4"
      >
        <div className="px-5 py-5 sm:px-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-600">Total Mutasi</p>
            <Receipt className="text-slate-400" size={17} />
          </div>
          <p className="mt-3 text-2xl font-semibold tabular-nums text-slate-900">
            {transactionsQuery.data?.pagination.total ?? "—"}
          </p>
          <p className="mt-1 text-xs text-slate-500">Transaksi tercatat</p>
        </div>
        <div className="px-5 py-5 sm:px-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-600">Setoran (Halaman ini)</p>
            <ArrowDownLeft className="text-emerald-700" size={17} />
          </div>
          <p className="mt-3 text-2xl font-semibold tabular-nums text-emerald-700">
            {transactionsQuery.data ? formatRupiah(totalDeposits) : "—"}
          </p>
          <p className="mt-1 text-xs font-medium text-emerald-800/80">Dana tabungan masuk (+)</p>
        </div>
        <div className="px-5 py-5 sm:px-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-600">Penarikan (Halaman ini)</p>
            <ArrowUpRight className="text-rose-600" size={17} />
          </div>
          <p className="mt-3 text-2xl font-semibold tabular-nums text-rose-600">
            {transactionsQuery.data ? formatRupiah(totalWithdrawals) : "—"}
          </p>
          <p className="mt-1 text-xs font-medium text-rose-700/80">Dana tabungan keluar (-)</p>
        </div>
        <div className="px-5 py-5 sm:px-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-600">
              {profile?.role === "user" ? "Saldo Tabungan Anda" : "Net Mutasi Halaman Ini"}
            </p>
            <Wallet className="text-slate-400" size={17} />
          </div>
          <p className="mt-3 text-2xl font-semibold tabular-nums text-slate-900">
            {profile?.role === "user" && currentSavings
              ? formatRupiah(currentSavings.saldo)
              : transactionsQuery.data
              ? formatRupiah(totalDeposits - totalWithdrawals)
              : "—"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {profile?.role === "user" ? "Saldo aktif santri" : "Setoran dikurangi penarikan"}
          </p>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        {userOptions.length > 0 && (
          <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
            <label className="text-xs font-medium text-slate-600">
              Santri / Pengguna:
              <select
                aria-label="Filter pengguna"
                className="ml-3 h-9 max-w-64 rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-emerald-700 focus:outline-none"
                onChange={(event) => {
                  setUserId(event.target.value);
                  setPage(1);
                }}
                value={userId}
              >
                <option value="">Semua santri / pengguna</option>
                {userOptions.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative min-w-56 flex-1 max-w-md">
              <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                className="h-10 w-full rounded-md border border-slate-300 pl-9 pr-8 text-sm placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none"
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Cari santri, kode transaksi, atau keterangan..."
                value={search}
              />
              {search && (
                <button
                  aria-label="Hapus kata kunci pencarian"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
                  onClick={() => {
                    setSearch("");
                    setPage(1);
                  }}
                  type="button"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <select
              aria-label="Jenis mutasi transaksi"
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:border-emerald-700 focus:outline-none"
              onChange={(event) => {
                setType(event.target.value as typeof type);
                setPage(1);
              }}
              value={type}
            >
              <option value="">Semua Mutasi</option>
              <option value="deposit">Setoran (+ Kredit)</option>
              <option value="withdrawal">Penarikan (- Debet)</option>
            </select>

            {hasFilter && (
              <button
                className="inline-flex h-10 items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                onClick={handleResetFilters}
                type="button"
              >
                <X size={14} />
                Reset Filter
              </button>
            )}
          </div>
        </div>

        {transactionsQuery.isError ? (
          <p className="px-5 py-8 text-sm text-red-700">{transactionsQuery.error.message}</p>
        ) : transactionsQuery.isPending ? (
          <p className="px-5 py-8 text-sm text-slate-500">Memuat catatan mutasi tabungan...</p>
        ) : items.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">Belum ada transaksi tabungan tercatat.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5">Tanggal & Waktu</th>
                  <th className="px-4 py-3.5">Kode Trx</th>
                  {profile?.role !== "user" && <th className="px-4 py-3.5">Santri / Akun</th>}
                  <th className="px-4 py-3.5">Keterangan / Uraian</th>
                  <th className="px-4 py-3.5 text-right text-emerald-800">Setoran (+ Kredit)</th>
                  <th className="px-4 py-3.5 text-right text-rose-700">Penarikan (- Debet)</th>
                  <th className="px-4 py-3.5 text-right font-bold text-slate-900 bg-slate-100/60">Saldo Akhir</th>
                  <th className="px-4 py-3.5 text-center">Petugas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((transaction) => {
                  const isDeposit = transaction.type === "deposit";
                  return (
                    <tr
                      className="cursor-pointer transition hover:bg-emerald-50/40"
                      key={transaction.id}
                      onClick={() => setSelectedTransaction(transaction)}
                      title="Klik untuk melihat slip transaksi"
                    >
                      <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-600 font-medium">
                        {formatDate(transaction.transaction_date)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <span className="font-mono text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {transaction.transaction_code}
                        </span>
                      </td>
                      {profile?.role !== "user" && (
                        <td className="px-4 py-3.5">
                          <p className="font-medium text-slate-900 leading-tight">
                            {transaction.user?.name ?? "—"}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            @{transaction.user?.username ?? "—"}
                          </p>
                        </td>
                      )}
                      <td className="px-4 py-3.5 text-xs text-slate-700 max-w-xs truncate">
                        {transaction.description || <span className="text-slate-400 italic">Tanpa keterangan</span>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right font-medium tabular-nums text-emerald-700">
                        {isDeposit ? `+${formatRupiah(transaction.amount)}` : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right font-medium tabular-nums text-rose-600">
                        {!isDeposit ? `-${formatRupiah(transaction.amount)}` : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right font-bold tabular-nums text-slate-900 bg-slate-50/50">
                        {formatRupiah(transaction.balance_after)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-center text-xs">
                        <span className="inline-block rounded-md bg-slate-100 px-2.5 py-0.5 text-slate-700 font-medium border border-slate-200/80">
                          {transaction.admin?.name ?? "Admin"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 sm:px-5">
          <span className="text-xs text-slate-500">
            {transactionsQuery.data?.pagination.total ?? 0} transaksi tercatat · Halaman {page}
          </span>
          <div className="flex gap-2">
            <button
              className="h-8 rounded-md border border-slate-300 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              type="button"
            >
              Sebelumnya
            </button>
            <button
              className="h-8 rounded-md border border-slate-300 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              disabled={!transactionsQuery.data || page * transactionsQuery.data.pagination.pageSize >= transactionsQuery.data.pagination.total}
              onClick={() => setPage((current) => current + 1)}
              type="button"
            >
              Berikutnya
            </button>
          </div>
        </div>
      </section>

      {dialogType && (
        <CreateTransactionDialog
          type={dialogType}
          savings={savingsQuery.data?.items ?? []}
          close={() => setDialogType(null)}
          onSaved={(result) => {
            setDialogType(null);
            setNotice(`Transaksi ${result.transaction_code} berhasil disimpan. Saldo baru ${formatRupiah(result.balance_after)}.`);
            void queryClient.invalidateQueries({ queryKey: ["transactions"] });
            void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
            void queryClient.invalidateQueries({ queryKey: ["savings-for-transaction"] });
            void queryClient.invalidateQueries({ queryKey: ["user-savings-summary"] });
          }}
        />
      )}

      {selectedTransaction && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" role="presentation">
          <section
            aria-labelledby="transaction-detail-title"
            aria-modal="true"
            className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-2xl"
            role="dialog"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`flex size-10 items-center justify-center rounded-lg ${
                    selectedTransaction.type === "deposit"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {selectedTransaction.type === "deposit" ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-950" id="transaction-detail-title">
                    Slip Bukti Transaksi
                  </h2>
                  <p className="text-xs text-slate-500">
                    Buku Tabungan Santri Ponpes Ihyaul Ulum Dukun Gresik
                  </p>
                </div>
              </div>
              <button
                aria-label="Tutup"
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                onClick={() => setSelectedTransaction(null)}
                type="button"
              >
                <X size={18} />
              </button>
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3.5 text-sm">
              <dt className="text-slate-500">Kode Transaksi</dt>
              <dd className="text-right font-mono text-xs font-semibold text-slate-900">
                {selectedTransaction.transaction_code}
              </dd>
              <dt className="text-slate-500">Tanggal & Waktu</dt>
              <dd className="text-right text-xs font-medium text-slate-700">
                {formatDate(selectedTransaction.transaction_date)}
              </dd>
              <dt className="text-slate-500">Nama Santri</dt>
              <dd className="text-right font-semibold text-slate-900">
                {selectedTransaction.user?.name ?? "—"}
              </dd>
              <dt className="text-slate-500">Jenis Mutasi</dt>
              <dd className="text-right">
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    selectedTransaction.type === "deposit"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-rose-50 text-rose-800 border border-rose-200"
                  }`}
                >
                  {selectedTransaction.type === "deposit" ? "Setoran (+ Kredit)" : "Penarikan (- Debet)"}
                </span>
              </dd>
              <dt className="text-slate-500">Nominal Transaksi</dt>
              <dd
                className={`text-right font-bold text-base tabular-nums ${
                  selectedTransaction.type === "deposit" ? "text-emerald-700" : "text-rose-600"
                }`}
              >
                {selectedTransaction.type === "deposit" ? "+" : "-"}
                {formatRupiah(selectedTransaction.amount)}
              </dd>
              <dt className="text-slate-500">Saldo Sebelum</dt>
              <dd className="text-right tabular-nums text-slate-600">
                {formatRupiah(selectedTransaction.balance_before)}
              </dd>
              <dt className="text-slate-500">Saldo Sesudah</dt>
              <dd className="text-right font-bold tabular-nums text-slate-950">
                {formatRupiah(selectedTransaction.balance_after)}
              </dd>
              <dt className="text-slate-500">Petugas / Admin</dt>
              <dd className="text-right text-slate-700">
                {selectedTransaction.admin?.name ?? "—"}
              </dd>
              <dt className="text-slate-500">Keterangan</dt>
              <dd className="text-right text-xs text-slate-700">
                {selectedTransaction.description || "—"}
              </dd>
            </dl>

            <div className="mt-6 border-t border-slate-100 pt-4 flex justify-end">
              <button
                className="h-9 rounded-md bg-emerald-800 px-4 text-xs font-medium text-white transition hover:bg-emerald-900"
                onClick={() => setSelectedTransaction(null)}
                type="button"
              >
                Tutup
              </button>
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}
