"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Filter,
  Layers,
  Printer,
  RotateCcw,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";
import { AppShell } from "@/components/layout/app-shell";
import { apiRequest } from "@/lib/api";
import { getCurrentProfile } from "@/lib/auth";

const reportItemSchema = z.object({
  id: z.string().uuid(),
  transaction_code: z.string(),
  user_id: z.string().uuid(),
  admin_id: z.string().uuid(),
  type: z.enum(["deposit", "withdrawal"]),
  amount: z.union([z.number(), z.string()]),
  balance_before: z.union([z.number(), z.string()]),
  balance_after: z.union([z.number(), z.string()]),
  description: z.string(),
  transaction_date: z.string(),
  user: z.object({ name: z.string(), username: z.string() }).nullable(),
  admin: z.object({ name: z.string(), username: z.string() }).nullable(),
});

const reportSchema = z.object({
  summary: z.object({
    totalDeposits: z.union([z.number(), z.string()]),
    totalWithdrawals: z.union([z.number(), z.string()]),
    totalTransactions: z.union([z.number(), z.string()]),
  }),
  items: z.array(reportItemSchema),
  pagination: z.object({ page: z.number(), pageSize: z.number(), total: z.number() }),
});

const monthlyBreakdownSchema = z.object({
  totalCurrentSavings: z.number(),
  months: z.array(
    z.object({
      year: z.number(),
      monthNumber: z.number(),
      monthName: z.string(),
      label: z.string(),
      totalDeposits: z.number(),
      totalWithdrawals: z.number(),
      netFlow: z.number(),
      transactionCount: z.number(),
    })
  ),
});

const userOptionsSchema = z.object({
  items: z.array(z.object({ id: z.string().uuid(), name: z.string(), username: z.string() })),
});

type ReportItem = z.infer<typeof reportItemSchema>;

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function rupiah(value: string | number | undefined) {
  const num = typeof value === "number" ? value : Number(value ?? 0);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(num);
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const profileQuery = useQuery({ queryKey: ["current-profile"], queryFn: getCurrentProfile, retry: false });
  const profile = profileQuery.data;
  const role = profile?.role;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12

  // Month range state: "Pilih bulan apa sampai bulan apa"
  const [filterMode, setFilterMode] = useState<"month" | "date">("month");
  const [startMonth, setStartMonth] = useState(1);
  const [startYear, setStartYear] = useState(currentYear);
  const [endMonth, setEndMonth] = useState(currentMonth);
  const [endYear, setEndYear] = useState(currentYear);

  // Date range state (computed or custom)
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Other filters
  const [userId, setUserId] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<"breakdown" | "transactions">("breakdown");
  const [exportError, setExportError] = useState("");

  // Sync date range when month dropdowns change in month mode
  useEffect(() => {
    if (filterMode === "month") {
      const fromStr = `${startYear}-${String(startMonth).padStart(2, "0")}-01`;
      const lastDay = new Date(endYear, endMonth, 0).getDate();
      const toStr = `${endYear}-${String(endMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      setFrom(fromStr);
      setTo(toStr);
      setPage(1);
    }
  }, [filterMode, startMonth, startYear, endMonth, endYear]);

  // Quick Preset Handlers
  function applyPreset(preset: "this-month" | "last-month" | "last-3-months" | "this-year" | "all") {
    setFilterMode("month");
    if (preset === "this-month") {
      setStartMonth(currentMonth);
      setStartYear(currentYear);
      setEndMonth(currentMonth);
      setEndYear(currentYear);
    } else if (preset === "last-month") {
      const lastM = currentMonth === 1 ? 12 : currentMonth - 1;
      const lastY = currentMonth === 1 ? currentYear - 1 : currentYear;
      setStartMonth(lastM);
      setStartYear(lastY);
      setEndMonth(lastM);
      setEndYear(lastY);
    } else if (preset === "last-3-months") {
      const m3 = currentMonth - 2 <= 0 ? currentMonth - 2 + 12 : currentMonth - 2;
      const y3 = currentMonth - 2 <= 0 ? currentYear - 1 : currentYear;
      setStartMonth(m3);
      setStartYear(y3);
      setEndMonth(currentMonth);
      setEndYear(currentYear);
    } else if (preset === "this-year") {
      setStartMonth(1);
      setStartYear(currentYear);
      setEndMonth(12);
      setEndYear(currentYear);
    } else if (preset === "all") {
      setStartMonth(1);
      setStartYear(currentYear - 2);
      setEndMonth(12);
      setEndYear(currentYear);
    }
  }

  // Queries
  const params = new URLSearchParams({ page: String(page), pageSize: "50" });
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (userId) params.set("userId", userId);
  if (type) params.set("type", type);

  const breakdownParams = new URLSearchParams();
  if (from) breakdownParams.set("from", from);
  if (to) breakdownParams.set("to", to);
  if (userId) breakdownParams.set("userId", userId);

  const reportQuery = useQuery({
    queryKey: ["transaction-report", page, from, to, userId, type],
    queryFn: () => apiRequest(`/reports/transactions?${params}`, reportSchema),
  });

  const breakdownQuery = useQuery({
    queryKey: ["monthly-breakdown", from, to, userId],
    queryFn: () => apiRequest(`/reports/monthly-breakdown?${breakdownParams}`, monthlyBreakdownSchema),
  });

  const usersQuery = useQuery({
    queryKey: ["report-user-options"],
    queryFn: () => apiRequest("/admin/users?page=1&pageSize=100", userOptionsSchema),
    enabled: role === "admin" || role === "super_admin",
  });

  const report = reportQuery.data;
  const breakdown = breakdownQuery.data;

  // Selected period human-readable label
  const periodLabel =
    filterMode === "month"
      ? startYear === endYear && startMonth === endMonth
        ? `Bulan ${MONTH_NAMES[startMonth - 1]} ${startYear}`
        : `${MONTH_NAMES[startMonth - 1]} ${startYear} s/d ${MONTH_NAMES[endMonth - 1]} ${endYear}`
      : from && to
        ? `${from} s/d ${to}`
        : "Seluruh Periode";

  // Drill down from monthly breakdown table to transactions
  function handleSelectMonthFromTable(year: number, monthNum: number) {
    setFilterMode("month");
    setStartMonth(monthNum);
    setStartYear(year);
    setEndMonth(monthNum);
    setEndYear(year);
    setActiveTab("transactions");
    setPage(1);
  }

  // Export handlers
  async function fetchAllItems(): Promise<ReportItem[]> {
    if (!report) return [];
    const pageSize = report.pagination.pageSize;
    const totalPages = Math.ceil(report.pagination.total / pageSize);
    const results = await Promise.all(
      Array.from({ length: Math.max(0, totalPages - 1) }, async (_, index) => {
        const exportParams = new URLSearchParams({ page: String(index + 2), pageSize: String(pageSize) });
        if (from) exportParams.set("from", from);
        if (to) exportParams.set("to", to);
        if (userId) exportParams.set("userId", userId);
        if (type) exportParams.set("type", type);
        const result = await apiRequest(`/reports/transactions?${exportParams}`, reportSchema);
        return result.items;
      })
    );
    return [...report.items, ...results.flat()];
  }

  async function exportExcel() {
    if (!report) return;
    setExportError("");
    try {
      const { default: writeExcelFile } = await import("write-excel-file/browser");
      const items = await fetchAllItems();
      const rows: Array<Array<string | number | Date>> = [
        [
          "Kode Transaksi",
          "Santri / Pengguna",
          "Username",
          "Jenis Mutasi",
          "Nominal",
          "Saldo Sebelum",
          "Saldo Sesudah",
          "Admin / Petugas",
          "Tanggal & Waktu",
          "Keterangan",
        ],
        ...items.map((item) => [
          item.transaction_code,
          item.user?.name ?? "",
          item.user?.username ?? "",
          item.type === "deposit" ? "Setoran (+)" : "Penarikan (-)",
          Number(item.amount),
          Number(item.balance_before),
          Number(item.balance_after),
          item.admin?.name ?? "",
          new Date(item.transaction_date),
          item.description,
        ]),
      ];
      const blob = await writeExcelFile(rows).toBlob();
      downloadBlob(blob, `laporan-tabungan-${periodLabel.replace(/\s+/g, "_")}.xlsx`);
    } catch {
      setExportError("Gagal menghasilkan file Excel.");
    }
  }

  async function exportPdf() {
    if (!report) return;
    setExportError("");
    try {
      const [{ jsPDF }, { autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
      const items = await fetchAllItems();
      const document = new jsPDF({ orientation: "landscape" });
      document.setFontSize(13);
      document.text("LAPORAN TABUNGAN SANTRI PONPES IHYAUL ULUM DUKUN GRESIK", 14, 15);
      document.setFontSize(9);
      document.text(
        `Periode Laporan: ${periodLabel} · Total Setoran: ${rupiah(report.summary.totalDeposits)} · Total Penarikan: ${rupiah(report.summary.totalWithdrawals)} · ${report.summary.totalTransactions} Transaksi`,
        14,
        22
      );

      autoTable(document, {
        startY: 27,
        head: [["Kode Trx", "Santri", "Jenis", "Nominal", "Saldo Sebelum", "Saldo Sesudah", "Petugas", "Tanggal", "Keterangan"]],
        body: items.map((item) => [
          item.transaction_code,
          item.user?.name ?? "—",
          item.type === "deposit" ? "Setoran (+)" : "Penarikan (-)",
          rupiah(item.amount),
          rupiah(item.balance_before),
          rupiah(item.balance_after),
          item.admin?.name ?? "—",
          new Date(item.transaction_date).toLocaleDateString("id-ID"),
          item.description || "—",
        ]),
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [6, 78, 59] },
      });
      document.save(`laporan-tabungan-${periodLabel.replace(/\s+/g, "_")}.pdf`);
    } catch {
      setExportError("Gagal menghasilkan file PDF.");
    }
  }

  const totalDeposits = Number(report?.summary.totalDeposits ?? 0);
  const totalWithdrawals = Number(report?.summary.totalWithdrawals ?? 0);
  const netFlow = totalDeposits - totalWithdrawals;
  const totalTxCount = Number(report?.summary.totalTransactions ?? 0);

  const availableYears = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  return (
    <AppShell>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.13em] text-emerald-800">
            Laporan Keuangan
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
            Laporan & Rekapitulasi Tabungan
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Pilih rentang bulan apa sampai bulan apa untuk melihat rekapitulasi mutasi dan ekspor data tabungan santri.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            disabled={!report || reportQuery.isPending}
            onClick={() => void exportExcel()}
            type="button"
          >
            <FileSpreadsheet className="text-emerald-700" size={15} />
            Ekspor Excel
          </button>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            disabled={!report || reportQuery.isPending}
            onClick={() => void exportPdf()}
            type="button"
          >
            <FileText className="text-rose-600" size={15} />
            Ekspor PDF
          </button>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md bg-emerald-800 px-3.5 text-xs font-medium text-white shadow-sm hover:bg-emerald-900"
            onClick={() => window.print()}
            type="button"
          >
            <Printer size={15} />
            Cetak
          </button>
        </div>
      </div>

      {exportError && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {exportError}
        </div>
      )}

      {/* Filter Card: "Pilih Bulan Apa Sampai Bulan Apa" */}
      <section className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Filter className="text-emerald-800" size={16} />
            <span>Pilihan Periode Laporan</span>
            <span className="ml-2 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
              {periodLabel}
            </span>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="mr-1 text-slate-500 font-medium">Pilihan Cepat:</span>
            <button
              className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-900 transition"
              onClick={() => applyPreset("this-month")}
              type="button"
            >
              Bulan Ini
            </button>
            <button
              className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-900 transition"
              onClick={() => applyPreset("last-month")}
              type="button"
            >
              Bulan Lalu
            </button>
            <button
              className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-900 transition"
              onClick={() => applyPreset("last-3-months")}
              type="button"
            >
              3 Bulan Terakhir
            </button>
            <button
              className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-900 transition"
              onClick={() => applyPreset("this-year")}
              type="button"
            >
              Tahun {currentYear}
            </button>
            <button
              className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-900 transition"
              onClick={() => applyPreset("all")}
              type="button"
            >
              Semua Waktu
            </button>
          </div>
        </div>

        {/* Primary Month Range Selectors */}
        {filterMode === "month" ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Dari Bulan:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  aria-label="Pilih bulan mulai"
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 text-sm font-medium text-slate-800 focus:border-emerald-700 focus:outline-none"
                  onChange={(e) => setStartMonth(Number(e.target.value))}
                  value={startMonth}
                >
                  {MONTH_NAMES.map((name, index) => (
                    <option key={name} value={index + 1}>
                      {name}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Pilih tahun mulai"
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 text-sm font-medium text-slate-800 focus:border-emerald-700 focus:outline-none"
                  onChange={(e) => setStartYear(Number(e.target.value))}
                  value={startYear}
                >
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Sampai Bulan:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  aria-label="Pilih bulan selesai"
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 text-sm font-medium text-slate-800 focus:border-emerald-700 focus:outline-none"
                  onChange={(e) => setEndMonth(Number(e.target.value))}
                  value={endMonth}
                >
                  {MONTH_NAMES.map((name, index) => (
                    <option key={name} value={index + 1}>
                      {name}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Pilih tahun selesai"
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 text-sm font-medium text-slate-800 focus:border-emerald-700 focus:outline-none"
                  onChange={(e) => setEndYear(Number(e.target.value))}
                  value={endYear}
                >
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Filter Santri (For Admin) */}
            {(role === "admin" || role === "super_admin") && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Santri / Pemilik Rekening:
                </label>
                <select
                  aria-label="Pilih santri"
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 text-sm text-slate-800 focus:border-emerald-700 focus:outline-none"
                  onChange={(e) => {
                    setUserId(e.target.value);
                    setPage(1);
                  }}
                  value={userId}
                >
                  <option value="">Semua Santri</option>
                  {usersQuery.data?.items.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.username})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Filter Jenis Transaksi */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Jenis Transaksi:
              </label>
              <select
                aria-label="Pilih jenis transaksi"
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 text-sm text-slate-800 focus:border-emerald-700 focus:outline-none"
                onChange={(e) => {
                  setType(e.target.value);
                  setPage(1);
                }}
                value={type}
              >
                <option value="">Semua Mutasi (Setoran & Penarikan)</option>
                <option value="deposit">Khusus Setoran Saja</option>
                <option value="withdrawal">Khusus Penarikan Saja</option>
              </select>
            </div>
          </div>
        ) : (
          /* Date Mode Fallback */
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tanggal Mulai:
              </label>
              <input
                className="h-9 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-800 focus:border-emerald-700 focus:outline-none"
                onChange={(e) => {
                  setFrom(e.target.value);
                  setPage(1);
                }}
                type="date"
                value={from}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tanggal Selesai:
              </label>
              <input
                className="h-9 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-800 focus:border-emerald-700 focus:outline-none"
                onChange={(e) => {
                  setTo(e.target.value);
                  setPage(1);
                }}
                type="date"
                value={to}
              />
            </div>
            {(role === "admin" || role === "super_admin") && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Santri:
                </label>
                <select
                  aria-label="Pilih santri"
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 text-sm text-slate-800 focus:border-emerald-700 focus:outline-none"
                  onChange={(e) => {
                    setUserId(e.target.value);
                    setPage(1);
                  }}
                  value={userId}
                >
                  <option value="">Semua Santri</option>
                  {usersQuery.data?.items.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.username})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Jenis Transaksi:
              </label>
              <select
                aria-label="Pilih jenis transaksi"
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 text-sm text-slate-800 focus:border-emerald-700 focus:outline-none"
                onChange={(e) => {
                  setType(e.target.value);
                  setPage(1);
                }}
                value={type}
              >
                <option value="">Semua Mutasi</option>
                <option value="deposit">Khusus Setoran Saja</option>
                <option value="withdrawal">Khusus Penarikan Saja</option>
              </select>
            </div>
          </div>
        )}

        {/* Toggle between Month Mode and Specific Date Mode */}
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
          <button
            className="text-emerald-800 hover:text-emerald-950 font-medium underline"
            onClick={() => setFilterMode(filterMode === "month" ? "date" : "month")}
            type="button"
          >
            {filterMode === "month"
              ? "Ingin pilih rentang tanggal harian spesifik? Klik di sini"
              : "Kembali ke pilihan bulan apa s/d bulan apa"}
          </button>

          {(from || to || userId || type) && (
            <button
              className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800"
              onClick={() => {
                applyPreset("this-year");
                setUserId("");
                setType("");
              }}
              type="button"
            >
              <RotateCcw size={13} />
              Reset Semua Filter
            </button>
          )}
        </div>
      </section>

      {/* Summary Cards for Selected Period */}
      <section
        aria-label="Ringkasan periode terpilih"
        className="mb-7 grid gap-0 divide-y divide-slate-200 border-y border-slate-200 bg-white sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4 shadow-sm"
      >
        <div className="px-5 py-5 sm:px-6">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Setoran
            </p>
            <ArrowDownLeft className="text-emerald-700" size={18} />
          </div>
          <p className="mt-3 text-2xl font-bold tabular-nums text-emerald-700">
            {reportQuery.isPending ? "..." : rupiah(totalDeposits)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Dana masuk ({periodLabel})</p>
        </div>

        <div className="px-5 py-5 sm:px-6">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Penarikan
            </p>
            <ArrowUpRight className="text-rose-600" size={18} />
          </div>
          <p className="mt-3 text-2xl font-bold tabular-nums text-rose-600">
            {reportQuery.isPending ? "..." : rupiah(totalWithdrawals)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Dana keluar ({periodLabel})</p>
        </div>

        <div className="px-5 py-5 sm:px-6">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Arus Kas Bersih (Net)
            </p>
            <Wallet className={netFlow >= 0 ? "text-emerald-800" : "text-rose-700"} size={18} />
          </div>
          <p
            className={`mt-3 text-2xl font-bold tabular-nums ${
              netFlow >= 0 ? "text-slate-900" : "text-rose-700"
            }`}
          >
            {reportQuery.isPending ? "..." : rupiah(netFlow)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Selisih setoran & penarikan</p>
        </div>

        <div className="px-5 py-5 sm:px-6">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Jumlah Transaksi
            </p>
            <Calendar className="text-slate-400" size={18} />
          </div>
          <p className="mt-3 text-2xl font-bold tabular-nums text-slate-900">
            {reportQuery.isPending ? "..." : totalTxCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">Total mutasi dalam periode</p>
        </div>
      </section>

      {/* Navigation Tabs */}
      <div className="mb-6 flex border-b border-slate-200">
        <button
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === "breakdown"
              ? "border-emerald-800 text-emerald-900"
              : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
          }`}
          onClick={() => setActiveTab("breakdown")}
          type="button"
        >
          <Calendar size={17} />
          Rekap Per Bulan ({breakdown?.months.length ?? 0} Bulan)
        </button>
        <button
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === "transactions"
              ? "border-emerald-800 text-emerald-900"
              : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
          }`}
          onClick={() => setActiveTab("transactions")}
          type="button"
        >
          <Layers size={17} />
          Rincian Transaksi ({report?.pagination.total ?? 0})
        </button>
      </div>

      {/* Tab 1: Monthly Breakdown Table */}
      {activeTab === "breakdown" ? (
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Tabel Rekapitulasi Tiap Bulan ({periodLabel})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Ringkasan akumulasi setoran, penarikan, dan perputaran kas bulanan santri.
              </p>
            </div>
            {breakdown?.totalCurrentSavings !== undefined && (role === "admin" || role === "super_admin") && (
              <div className="rounded-md bg-emerald-50 px-3 py-1.5 border border-emerald-200 text-xs">
                <span className="text-slate-600 font-medium">Total Saldo Simpanan Santri Saat Ini: </span>
                <strong className="text-emerald-900">{rupiah(breakdown.totalCurrentSavings)}</strong>
              </div>
            )}
          </div>

          {breakdownQuery.isPending ? (
            <p className="px-5 py-8 text-sm text-slate-500">Memuat rekapitulasi data bulanan...</p>
          ) : breakdownQuery.isError ? (
            <p className="px-5 py-8 text-sm text-red-700">{breakdownQuery.error.message}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5">Bulan & Tahun</th>
                    <th className="px-4 py-3.5 text-right text-emerald-800">Setoran (+ Masuk)</th>
                    <th className="px-4 py-3.5 text-right text-rose-700">Penarikan (- Keluar)</th>
                    <th className="px-4 py-3.5 text-right">Arus Kas Bersih</th>
                    <th className="px-4 py-3.5 text-center">Jumlah Trx</th>
                    <th className="px-5 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {breakdown?.months.map((item) => (
                    <tr className="hover:bg-slate-50 transition" key={item.label}>
                      <td className="px-5 py-3.5 font-semibold text-slate-900 flex items-center gap-2">
                        <Calendar className="text-slate-400" size={15} />
                        {item.label}
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums font-medium text-emerald-700">
                        {item.totalDeposits > 0 ? `+${rupiah(item.totalDeposits)}` : "Rp 0"}
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums font-medium text-rose-600">
                        {item.totalWithdrawals > 0 ? `-${rupiah(item.totalWithdrawals)}` : "Rp 0"}
                      </td>
                      <td
                        className={`px-4 py-3.5 text-right tabular-nums font-bold ${
                          item.netFlow >= 0 ? "text-slate-900" : "text-rose-700"
                        }`}
                      >
                        {rupiah(item.netFlow)}
                      </td>
                      <td className="px-4 py-3.5 text-center tabular-nums text-slate-700">
                        {item.transactionCount}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:border-emerald-600 hover:text-emerald-900 transition"
                          onClick={() => handleSelectMonthFromTable(item.year, item.monthNumber)}
                          type="button"
                        >
                          <span>Rincian</span>
                          <ChevronRight size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(!breakdown?.months || breakdown.months.length === 0) && (
                    <tr>
                      <td className="px-5 py-8 text-center text-sm text-slate-500" colSpan={6}>
                        Tidak ada data pada periode bulan ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : (
        /* Tab 2: Detailed Transactions Table */
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Rincian Transaksi Tabungan Santri ({periodLabel})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Daftar mutasi rekening lengkap sesuai format buku tabungan.
              </p>
            </div>
            <p className="text-xs font-medium text-slate-600">
              Total {report?.pagination.total ?? 0} data ditemukan
            </p>
          </div>

          {reportQuery.isPending ? (
            <p className="px-5 py-8 text-sm text-slate-500">Memuat rincian transaksi...</p>
          ) : reportQuery.isError ? (
            <p className="px-5 py-8 text-sm text-red-700">{reportQuery.error.message}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5">Tanggal & Waktu</th>
                    <th className="px-4 py-3.5">Kode Transaksi</th>
                    <th className="px-4 py-3.5">Santri / Akun</th>
                    <th className="px-4 py-3.5">Keterangan</th>
                    <th className="px-4 py-3.5 text-right text-emerald-800">Setoran (+ Kredit)</th>
                    <th className="px-4 py-3.5 text-right text-rose-700">Penarikan (- Debet)</th>
                    <th className="px-4 py-3.5 text-right">Saldo Akhir</th>
                    <th className="px-5 py-3.5">Petugas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-xs">
                  {report?.items.map((item) => (
                    <tr className="hover:bg-slate-50 transition" key={item.id}>
                      <td className="whitespace-nowrap px-5 py-3.5 font-sans text-xs text-slate-700">
                        {new Date(item.transaction_date).toLocaleString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs font-semibold text-emerald-950">
                        {item.transaction_code}
                      </td>
                      <td className="px-4 py-3.5 font-sans">
                        <p className="font-semibold text-slate-900">{item.user?.name ?? profile?.name ?? "—"}</p>
                        <p className="text-[11px] text-slate-500">@{item.user?.username ?? profile?.username ?? "—"}</p>
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-3.5 font-sans text-xs text-slate-600" title={item.description}>
                        {item.description || "—"}
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums font-semibold text-emerald-700">
                        {item.type === "deposit" ? `+${rupiah(item.amount)}` : "—"}
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums font-semibold text-rose-600">
                        {item.type === "withdrawal" ? `-${rupiah(item.amount)}` : "—"}
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums font-bold text-slate-900 font-sans">
                        {rupiah(item.balance_after)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 font-sans text-xs text-slate-600">
                        {item.admin?.name ?? "Sistem"}
                      </td>
                    </tr>
                  ))}
                  {(!report?.items || report.items.length === 0) && (
                    <tr>
                      <td className="px-5 py-8 text-center text-sm font-sans text-slate-500" colSpan={8}>
                        Tidak ada transaksi ditemukan pada rentang bulan yang dipilih.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {report && report.pagination.total > report.pagination.pageSize && (
            <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 text-xs text-slate-600">
              <span>
                Halaman {report.pagination.page} dari {Math.ceil(report.pagination.total / report.pagination.pageSize)}
              </span>
              <div className="flex gap-2">
                <button
                  className="rounded border border-slate-300 px-3 py-1 font-medium hover:bg-slate-50 disabled:opacity-50"
                  disabled={page <= 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  type="button"
                >
                  Sebelumnya
                </button>
                <button
                  className="rounded border border-slate-300 px-3 py-1 font-medium hover:bg-slate-50 disabled:opacity-50"
                  disabled={page * report.pagination.pageSize >= report.pagination.total}
                  onClick={() => setPage((prev) => prev + 1)}
                  type="button"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </AppShell>
  );
}
