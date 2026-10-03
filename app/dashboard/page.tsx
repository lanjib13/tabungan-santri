"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, CircleAlert, LoaderCircle, Wallet } from "lucide-react";
import Link from "next/link";
import { z } from "zod";
import { AppShell } from "@/components/layout/app-shell";
import { apiRequest } from "@/lib/api";
import { getCurrentProfile } from "@/lib/auth";

const transactionSchema = z.object({
  id: z.string().uuid(),
  transaction_code: z.string(),
  type: z.enum(["deposit", "withdrawal"]),
  amount: z.union([z.string(), z.number()]),
  balance_after: z.union([z.string(), z.number()]).optional(),
  transaction_date: z.string(),
  user: z.object({ name: z.string() }).nullable().optional(),
  admin: z.object({ name: z.string() }).nullable().optional(),
});
const dashboardSchema = z.object({
  role: z.enum(["super_admin", "admin", "user"]),
  profile: z.object({ name: z.string(), username: z.string() }).optional(),
  userDetails: z.unknown().nullable().optional(),
  savings: z.object({ nomor_rekening: z.string(), saldo: z.union([z.string(), z.number()]), status: z.string() }).nullable().optional(),
  summary: z.record(z.string(), z.union([z.string(), z.number()])),
  recentTransactions: z.array(transactionSchema),
  recentAuditLogs: z.array(z.object({ id: z.string(), action: z.string(), description: z.string(), created_at: z.string() })).optional(),
});
type DashboardData = z.infer<typeof dashboardSchema>;

function getDashboard() {
  return apiRequest("/dashboard", dashboardSchema);
}

function formatRupiah(value: string | number | undefined) {
  const number = typeof value === "number" ? value : Number(value ?? 0);
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(number);
}

function summaryValue(summary: DashboardData["summary"], key: string) {
  const value = summary[key];
  return typeof value === "string" || typeof value === "number" ? value : 0;
}

export default function DashboardPage() {
  const profileQuery = useQuery({ queryKey: ["current-profile"], queryFn: getCurrentProfile, retry: false });
  const dashboardQuery = useQuery({ queryKey: ["dashboard"], queryFn: getDashboard, retry: false });
  const profile = profileQuery.data;
  const dashboard = dashboardQuery.data;

  const cards = profile?.role === "user"
    ? [
      { label: "Saldo saat ini", value: formatRupiah(summaryValue(dashboard?.summary ?? {}, "totalSavings")), icon: Wallet, note: "Saldo tabungan aktif" },
      { label: "Total setoran", value: formatRupiah(summaryValue(dashboard?.summary ?? {}, "totalDeposits")), icon: ArrowDownLeft, note: "Akumulasi seluruh setoran" },
      { label: "Total penarikan", value: formatRupiah(summaryValue(dashboard?.summary ?? {}, "totalWithdrawals")), icon: ArrowUpRight, note: "Akumulasi seluruh penarikan" },
      { label: "Total transaksi", value: String(summaryValue(dashboard?.summary ?? {}, "transactionCount")), icon: CircleAlert, note: "Riwayat mutasi tabungan" },
    ]
    : profile?.role === "super_admin"
      ? [
        { label: "Total Admin", value: String(summaryValue(dashboard?.summary ?? {}, "totalAdmins")), icon: CircleAlert, note: "Pengelola tabungan" },
        { label: "Total Santri", value: String(summaryValue(dashboard?.summary ?? {}, "totalUsers")), icon: CircleAlert, note: "Santri terdaftar" },
        { label: "Total Saldo Simpanan", value: formatRupiah(summaryValue(dashboard?.summary ?? {}, "totalSavings")), icon: Wallet, note: "Total saldo seluruh santri" },
        { label: "Total setoran", value: formatRupiah(summaryValue(dashboard?.summary ?? {}, "totalDeposits")), icon: ArrowDownLeft, note: "Akumulasi seluruh setoran" },
        { label: "Total penarikan", value: formatRupiah(summaryValue(dashboard?.summary ?? {}, "totalWithdrawals")), icon: ArrowUpRight, note: "Akumulasi seluruh penarikan" },
        { label: "Total transaksi", value: String(summaryValue(dashboard?.summary ?? {}, "totalTransactions")), icon: CircleAlert, note: "Jumlah riwayat transaksi" },
      ]
      : [
        { label: "Total Santri", value: String(summaryValue(dashboard?.summary ?? {}, "totalUsers")), icon: CircleAlert, note: "Santri terdaftar" },
        { label: "Total Saldo Simpanan", value: formatRupiah(summaryValue(dashboard?.summary ?? {}, "totalSavings")), icon: Wallet, note: "Total saldo seluruh santri" },
        { label: "Total setoran", value: formatRupiah(summaryValue(dashboard?.summary ?? {}, "totalDeposits")), icon: ArrowDownLeft, note: "Akumulasi seluruh setoran" },
        { label: "Total penarikan", value: formatRupiah(summaryValue(dashboard?.summary ?? {}, "totalWithdrawals")), icon: ArrowUpRight, note: "Akumulasi seluruh penarikan" },
        { label: "Transaksi hari ini", value: String(summaryValue(dashboard?.summary ?? {}, "transactionsToday")), icon: ArrowUpRight, note: "Aktivitas transaksi hari ini" },
      ];

  return (
    <AppShell>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.13em] text-emerald-800">Ringkasan</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">{profile ? `Selamat datang, ${profile.name}` : "Ringkasan Tabungan Santri"}</p>
        </div>
        {dashboardQuery.isFetching && <LoaderCircle aria-label="Memuat" className="animate-spin text-emerald-800" size={18} />}
      </div>

      {dashboardQuery.isError && (
        <p className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {dashboardQuery.error.message}
        </p>
      )}

      {profile?.role === "admin" && (
        <div className="mb-5 flex flex-wrap gap-2">
          <Link className="inline-flex h-9 items-center gap-2 rounded-md bg-emerald-800 px-3 text-sm font-semibold text-white hover:bg-emerald-900" href="/admin/users">Tambah pengguna</Link>
          <Link className="inline-flex h-9 items-center gap-2 rounded-md border border-emerald-800 px-3 text-sm font-medium text-emerald-900 hover:bg-emerald-50" href="/transactions?action=deposit"><ArrowDownLeft size={16} />Setoran</Link>
          <Link className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium hover:bg-slate-50" href="/transactions?action=withdrawal"><ArrowUpRight size={16} />Penarikan</Link>
          <Link className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50" href="/reports">Laporan Keuangan</Link>
        </div>
      )}

      <section aria-label="Ringkasan saldo dan aktivitas" className="grid gap-0 divide-y divide-slate-200 border-y border-slate-200 bg-white sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <article className="min-w-0 px-5 py-5 sm:px-6" key={card.label}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-600">{card.label}</p>
                <Icon aria-hidden="true" className="shrink-0 text-emerald-800" size={18} />
              </div>
              <p className="mt-3 break-words text-2xl font-semibold tabular-nums text-slate-950">{dashboard ? card.value : "—"}</p>
              {card.note && <p className="mt-1 text-xs text-slate-500">{card.note}</p>}
            </article>
          );
        })}
      </section>

      {profile?.role === "user" && dashboard?.savings && (
        <section className="mt-8 border-y border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div><p className="text-xs text-slate-500">Nama</p><p className="mt-1 text-sm font-medium text-slate-900">{profile?.name ?? "—"}</p></div>
              <div><p className="text-xs text-slate-500">Username</p><p className="mt-1 text-sm font-medium text-slate-900">{profile?.username ?? "—"}</p></div>
              <div>
              <p className="text-xs text-slate-500">Nomor rekening</p>
              <p className="mt-1 font-mono text-sm font-medium text-slate-900">{dashboard.savings.nomor_rekening}</p>
              </div>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${dashboard.savings.status === "active" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
              {dashboard.savings.status === "active" ? "Aktif" : "Nonaktif"}
            </span>
          </div>
        </section>
      )}

      <section className="mt-8 border-y border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
          <h2 className="text-sm font-semibold text-slate-900">Transaksi terbaru</h2>
          <span className="text-xs text-slate-500">10 terakhir</span>
        </div>
        {dashboardQuery.isPending ? (
          <div className="space-y-3 px-5 py-6 sm:px-6"><div className="h-4 w-2/5 animate-pulse rounded bg-slate-100" /><div className="h-4 w-full animate-pulse rounded bg-slate-100" /><div className="h-4 w-4/5 animate-pulse rounded bg-slate-100" /></div>
        ) : dashboard?.recentTransactions.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-medium text-slate-500">
                <tr><th className="px-5 py-3 sm:px-6">Kode</th><th className="px-4 py-3">Pengguna</th><th className="px-4 py-3">Jenis</th><th className="px-4 py-3 text-right">Nominal</th><th className="px-4 py-3">Admin</th><th className="px-5 py-3 sm:px-6">Tanggal</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dashboard.recentTransactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td className="whitespace-nowrap px-5 py-3.5 font-mono text-xs text-slate-700 sm:px-6">{transaction.transaction_code}</td>
                    <td className="px-4 py-3.5 text-slate-800">{transaction.user?.name ?? profile?.name ?? "—"}</td>
                    <td className="px-4 py-3.5 capitalize text-slate-600">{transaction.type === "deposit" ? "Setoran" : "Penarikan"}</td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-right tabular-nums text-slate-900">{formatRupiah(transaction.amount)}</td>
                    <td className="px-4 py-3.5 text-slate-600">{transaction.admin?.name ?? "—"}</td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-slate-600 sm:px-6">{new Date(transaction.transaction_date).toLocaleString("id-ID")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 py-10 text-center text-sm text-slate-500 sm:px-6">Belum ada transaksi.</p>
        )}
      </section>

      {profile?.role === "super_admin" && dashboard?.recentAuditLogs && (
        <section className="mt-8 border-y border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4 sm:px-6"><h2 className="text-sm font-semibold text-slate-900">Aktivitas terbaru</h2></div>
          {dashboard.recentAuditLogs.length ? dashboard.recentAuditLogs.map((log) => (
            <article className="border-b border-slate-100 px-5 py-4 last:border-b-0 sm:px-6" key={log.id}>
              <div className="flex flex-wrap justify-between gap-2"><p className="text-sm font-medium text-slate-800">{log.action.replaceAll("_", " ")}</p><time className="text-xs text-slate-500">{new Date(log.created_at).toLocaleString("id-ID")}</time></div>
              <p className="mt-1 text-sm text-slate-600">{log.description}</p>
            </article>
          )) : <p className="px-5 py-8 text-center text-sm text-slate-500">Belum ada aktivitas.</p>}
        </section>
      )}
    </AppShell>
  );
}
