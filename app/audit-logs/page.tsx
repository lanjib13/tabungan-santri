"use client";

import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { AppShell } from "@/components/layout/app-shell";
import { apiRequest } from "@/lib/api";

const actions = ["CREATE_USER", "UPDATE_USER", "CREATE_DEPOSIT", "CREATE_WITHDRAWAL", "RESET_PASSWORD", "LOGIN", "LOGOUT", "DISABLE_USER", "CREATE_ADMIN", "UPDATE_ADMIN"] as const;
const logSchema = z.object({ id: z.string().uuid(), user_id: z.string().uuid().nullable(), action: z.enum(actions), description: z.string(), ip_address: z.string().nullable(), user_agent: z.string().nullable(), created_at: z.string(), actor: z.object({ name: z.string(), username: z.string(), role: z.string() }).nullable() });
const responseSchema = z.object({ items: z.array(logSchema), pagination: z.object({ page: z.number(), pageSize: z.number(), total: z.number() }) });

export default function AuditLogsPage() {
  const params = new URLSearchParams({ page: "1", pageSize: "100" });
  const logsQuery = useQuery({ queryKey: ["audit-logs"], queryFn: () => apiRequest(`/audit-logs?${params}`, responseSchema) });

  return (
    <AppShell>
      <div className="mb-7"><p className="mb-2 text-xs font-semibold uppercase tracking-[0.13em] text-emerald-800">Keamanan</p><h1 className="text-2xl font-semibold tracking-tight text-slate-950">Audit log</h1><p className="mt-1 text-sm text-slate-600">Riwayat aktivitas penting dalam sistem.</p></div>
      <section className="border-y border-slate-200 bg-white"><div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><h2 className="text-sm font-semibold">Aktivitas terbaru</h2><span className="text-xs text-slate-500">{logsQuery.data?.pagination.total ?? 0} catatan</span></div>
        {logsQuery.isError ? <p className="px-5 py-8 text-sm text-red-700">{logsQuery.error.message}</p> : logsQuery.isPending ? <p className="px-5 py-8 text-sm text-slate-500">Memuat audit log...</p> : logsQuery.data.items.length === 0 ? <p className="px-5 py-10 text-center text-sm text-slate-500">Belum ada aktivitas tercatat.</p> : <div className="divide-y divide-slate-100">{logsQuery.data.items.map((log) => <article className="px-5 py-4 sm:px-6" key={log.id}><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{log.action.replaceAll("_", " ")}</span><span className="text-sm font-medium text-slate-900">{log.actor?.name ?? "Sistem"}</span><span className="text-xs text-slate-500">{log.actor?.username ?? ""}</span></div><time className="text-xs text-slate-500">{new Date(log.created_at).toLocaleString("id-ID")}</time></div><p className="mt-2 text-sm leading-6 text-slate-700">{log.description}</p>{log.ip_address && <p className="mt-2 font-mono text-[11px] text-slate-400">{log.ip_address}</p>}</article>)}</div>}
      </section>
    </AppShell>
  );
}
