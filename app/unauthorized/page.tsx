import Link from "next/link";
import { ShieldX } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--page)] px-6 py-16">
      <section className="max-w-md text-center">
        <span className="mx-auto mb-6 flex size-14 items-center justify-center rounded-full bg-red-50 text-red-700">
          <ShieldX aria-hidden="true" size={26} />
        </span>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red-700">403 · Akses ditolak</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Anda tidak memiliki izin</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Halaman ini tidak tersedia untuk role akun Anda.</p>
        <Link className="mt-7 inline-flex h-10 items-center justify-center rounded-md bg-emerald-800 px-4 text-sm font-medium text-white hover:bg-emerald-900" href="/dashboard">
          Kembali ke dashboard
        </Link>
      </section>
    </main>
  );
}
