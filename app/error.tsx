"use client";

import { useEffect } from "react";
import { CircleAlert } from "lucide-react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Tabungan Santri route error", { digest: error.digest });
  }, [error.digest]);

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--page)] px-6 text-center">
      <section className="max-w-md"><span className="mx-auto mb-5 flex size-12 items-center justify-center rounded-full bg-red-50 text-red-700"><CircleAlert size={23} /></span><p className="text-xs font-semibold uppercase tracking-[0.14em] text-red-700">500 · Gangguan layanan</p><h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Halaman gagal dimuat</h1><p className="mt-3 text-sm leading-6 text-slate-600">Terjadi kesalahan. Coba muat ulang halaman.</p><button className="mt-7 h-10 rounded-md bg-emerald-800 px-4 text-sm font-medium text-white hover:bg-emerald-900" onClick={() => reset()} type="button">Coba lagi</button></section>
    </main>
  );
}
