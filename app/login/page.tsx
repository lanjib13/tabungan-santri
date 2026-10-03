import Image from "next/image";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="relative min-h-screen w-full overflow-hidden flex items-center justify-center">
      {/* Background Image: Foto Gerbang Ponpes Ihyaul Ulum */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/pesantren-bg.jpg"
          alt="Pondok Pesantren Ihyaul Ulum Dukun Gresik"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        {/* Ijo Transparan Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/90 via-emerald-900/80 to-emerald-950/88 backdrop-blur-[1.5px]" />
        {/* Subtle patterned glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.2),transparent_65%)]" />
      </div>

      {/* Content Container */}
      <div className="relative z-10 grid min-h-screen w-full lg:grid-cols-[1.15fr_0.85fr] items-center px-4 py-8 sm:px-8 lg:px-16 max-w-7xl mx-auto gap-8">
        {/* Left Side: Brand and Pesantren Info */}
        <div className="hidden lg:flex flex-col justify-between text-white py-12 pr-6">
          <div className="flex items-center gap-3.5">
            <div className="relative flex size-14 items-center justify-center overflow-hidden rounded-full border-2 border-emerald-400/50 bg-white p-1.5 shadow-xl">
              <Image
                src="/logo1.jpeg"
                alt="Logo Ponpes Ihyaul Ulum"
                width={56}
                height={56}
                className="size-full object-contain"
                priority
              />
            </div>
            <div>
              <span className="block text-sm font-bold tracking-[0.14em] text-white uppercase drop-shadow-sm">
                Tabungan Santri
              </span>
              <span className="text-xs font-medium text-emerald-300">
                Pondok Pesantren Ihyaul Ulum Dukun Gresik
              </span>
            </div>
          </div>

          <div className="max-w-xl my-auto py-10">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-800/40 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200 backdrop-blur-md">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              Sistem Informasi Keuangan Santri
            </div>
            <h1 className="text-4xl font-extrabold leading-[1.2] tracking-tight xl:text-5xl text-white drop-shadow-sm">
              Amanah Mengelola Tabungan Santri Ponpes Ihyaul Ulum
            </h1>
            <p className="mt-5 text-base leading-relaxed text-emerald-100/90 drop-shadow-xs">
              Mewujudkan tata kelola keuangan tabungan santri yang tertib, amanah, akuntabel, dan transparan bagi seluruh santri dan pengurus pondok pesantren.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-4 max-w-md pt-4 border-t border-emerald-500/20 text-xs">
              <div>
                <p className="font-semibold text-white">Alamat Pesantren:</p>
                <p className="text-emerald-200/80 mt-0.5">Dukun, Kab. Gresik, Jawa Timur</p>
              </div>
              <div>
                <p className="font-semibold text-white">Layanan Sistem:</p>
                <p className="text-emerald-200/80 mt-0.5">Setoran, Penarikan, & Mutasi Digital</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-emerald-200/70">
            Pondok Pesantren Ihyaul Ulum · Dukun, Gresik, Jawa Timur
          </p>
        </div>

        {/* Right Side: Login Card with Frosted Glass Effect */}
        <div className="flex justify-center lg:justify-end w-full">
          <div className="w-full max-w-md rounded-2xl border border-white/40 bg-white/95 p-7 sm:p-9 shadow-2xl backdrop-blur-xl transition">
            <div className="mb-6 flex items-center gap-3.5 border-b border-slate-100 pb-5">
              <div className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-emerald-600/30 bg-white p-1.5 shadow-sm">
                <Image
                  src="/logo1.jpeg"
                  alt="Logo Ponpes Ihyaul Ulum"
                  width={56}
                  height={56}
                  className="size-full object-contain"
                  priority
                />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-800">
                  Ponpes Ihyaul Ulum
                </p>
                <h2 className="text-lg font-bold tracking-tight text-slate-950">
                  Tabungan Santri
                </h2>
                <p className="text-xs text-slate-500">Dukun - Gresik</p>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-2xl font-bold tracking-tight text-slate-900">Masuk ke Akun</h3>
              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                Silakan masukkan username dan kata sandi yang telah didaftarkan oleh pengurus.
              </p>
            </div>

            <LoginForm />
          </div>
        </div>
      </div>
    </main>
  );
}
