"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LoaderCircle, LockKeyhole, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { login } from "@/lib/auth";
import { ApiError } from "@/lib/api";

const loginFormSchema = z.object({
  username: z.string().trim().min(3, "Masukkan username Anda").max(32),
  password: z.string().min(1, "Masukkan password Anda").max(128),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginFormSchema) });

  const onSubmit = handleSubmit(async ({ username, password }) => {
    setFormError("");
    try {
      const profile = await login(username, password);
      const targetPath = profile.role === "super_admin" ? "/super-admin" : "/dashboard";
      window.location.href = targetPath;
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "Tidak dapat menghubungi server. Coba lagi.");
    }
  });

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-800" htmlFor="username">Username</label>
        <div className="relative">
          <UserRound aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input
            autoComplete="username"
            className="h-11 w-full rounded-md border border-slate-300 bg-white pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
            id="username"
            placeholder="Masukkan username"
            {...register("username")}
          />
        </div>
        {errors.username && <p className="mt-1.5 text-xs text-red-700">{errors.username.message}</p>}
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-800" htmlFor="password">Password</label>
        <div className="relative">
          <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input
            autoComplete="current-password"
            className="h-11 w-full rounded-md border border-slate-300 bg-white pl-10 pr-11 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
            id="password"
            placeholder="Masukkan password"
            type={showPassword ? "text" : "password"}
            {...register("password")}
          />
          <button
            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            className="absolute right-2 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded text-slate-500 hover:bg-slate-100"
            onClick={() => setShowPassword((visible) => !visible)}
            type="button"
          >
            {showPassword ? <EyeOff aria-hidden="true" size={17} /> : <Eye aria-hidden="true" size={17} />}
          </button>
        </div>
        {errors.password && <p className="mt-1.5 text-xs text-red-700">{errors.password.message}</p>}
      </div>

      {formError && <p aria-live="polite" className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">{formError}</p>}

      <button
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald-800 px-4 text-sm font-semibold text-white transition hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting && <LoaderCircle aria-hidden="true" className="animate-spin" size={17} />}
        {isSubmitting ? "Memeriksa akun..." : "Masuk"}
      </button>
      <p className="text-center text-xs leading-5 text-slate-500">Akun dibuat dan dikelola oleh Pengurus / Admin Tabungan Santri.</p>
    </form>
  );
}
