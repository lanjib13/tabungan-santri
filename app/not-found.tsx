import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--page)] px-6 text-center">
      <section className="max-w-md"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800">404 · Tidak ditemukan</p><h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Halaman tidak tersedia</h1><p className="mt-3 text-sm leading-6 text-slate-600">Alamat yang dibuka mungkin sudah berubah.</p><Link className="mt-7 inline-flex h-10 items-center rounded-md bg-emerald-800 px-4 text-sm font-medium text-white hover:bg-emerald-900" href="/dashboard">Kembali</Link></section>
    </main>
  );
}
