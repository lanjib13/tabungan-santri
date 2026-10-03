"use client";

import { useQuery } from "@tanstack/react-query";
import { Landmark, Search } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { AppShell } from "@/components/layout/app-shell";
import { apiRequest } from "@/lib/api";

const savingsSchema = z.object({
  id: z.string().uuid(), user_id: z.string().uuid(), nomor_rekening: z.string(), saldo: z.union([z.number(), z.string()]),
  status: z.enum(["active", "inactive"]), created_at: z.string(), owner: z.object({ id: z.string(), name: z.string(), username: z.string(), status: z.string() }).nullable(),
});
const responseSchema = z.object({ items: z.array(savingsSchema) });

function rupiah(value: string | number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value));
}

export default function SavingsPage() {
  const [search, setSearch] = useState("");
  const savingsQuery = useQuery({ queryKey: ["savings"], queryFn: () => apiRequest("/savings", responseSchema) });
  const rows = (savingsQuery.data?.items ?? []).filter((account) => {
    const term = search.toLowerCase();
    return account.nomor_rekening.toLowerCase().includes(term)
      || account.owner?.name.toLowerCase().includes(term)
      || account.owner?.username.toLowerCase().includes(term);
  });
  const totalBalance = rows.reduce((total, account) => total + Number(account.saldo), 0);

  return (
    <AppShell>
      <div className="mb-7"><p className="mb-2 text-xs font-semibold uppercase tracking-[0.13em] text-emerald-800">Rekening</p><h1 className="text-2xl font-semibold tracking-tight text-slate-950">Tabungan</h1><p className="mt-1 text-sm text-slate-600">Informasi saldo dan status rekening.</p></div>
      <section aria-label="Ringkasan rekening" className="mb-7 grid gap-0 divide-y divide-slate-200 border-y border-slate-200 bg-white sm:grid-cols-2 sm:divide-x sm:divide-y-0"><div className="px-5 py-5 sm:px-6"><p className="text-sm text-slate-600">Jumlah rekening</p><p className="mt-3 text-2xl font-semibold tabular-nums">{savingsQuery.data?.items.length ?? "—"}</p></div><div className="px-5 py-5 sm:px-6"><p className="text-sm text-slate-600">Total saldo pada hasil</p><p className="mt-3 text-2xl font-semibold tabular-nums">{savingsQuery.data ? rupiah(totalBalance) : "—"}</p></div></section>
      <section className="border-y border-slate-200 bg-white"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5"><label className="relative block w-full max-w-sm"><span className="sr-only">Cari rekening</span><Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input className="h-10 w-full rounded-md border border-slate-300 pl-9 pr-3 text-sm" onChange={(event) => setSearch(event.target.value)} placeholder="Cari pengguna atau nomor rekening" value={search} /></label><Landmark aria-hidden="true" className="text-slate-400" size={18} /></div>
        {savingsQuery.isError ? <p className="px-5 py-8 text-sm text-red-700">{savingsQuery.error.message}</p> : savingsQuery.isPending ? <p className="px-5 py-8 text-sm text-slate-500">Memuat rekening...</p> : rows.length === 0 ? <p className="px-5 py-10 text-center text-sm text-slate-500">Tidak ada rekening yang cocok.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-5 py-3">Nomor rekening</th><th className="px-4 py-3">Nama</th><th className="px-4 py-3">Username</th><th className="px-4 py-3 text-right">Saldo</th><th className="px-5 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((account) => <tr key={account.id}><td className="px-5 py-3.5 font-mono text-xs text-slate-700">{account.nomor_rekening}</td><td className="px-4 py-3.5 font-medium text-slate-900">{account.owner?.name ?? "—"}</td><td className="px-4 py-3.5 text-slate-600">{account.owner?.username ?? "—"}</td><td className="px-4 py-3.5 text-right tabular-nums">{rupiah(account.saldo)}</td><td className="px-5 py-3.5"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${account.status === "active" ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{account.status === "active" ? "Aktif" : "Nonaktif"}</span></td></tr>)}</tbody></table></div>}
      </section>
    </AppShell>
  );
}
