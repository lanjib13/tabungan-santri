"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, LoaderCircle, UserRound } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppShell } from "@/components/layout/app-shell";
import { ApiError, apiRequest } from "@/lib/api";
import { getCurrentProfile } from "@/lib/auth";

const detailsSchema = z.object({ nomor_identitas: z.string(), no_hp: z.string(), alamat: z.string(), tanggal_lahir: z.string().nullable() }).nullable();
const savingsSchema = z.object({ nomor_rekening: z.string(), saldo: z.union([z.string(), z.number()]), status: z.string() }).nullable();
const profileDataSchema = z.object({ profile: z.object({ id: z.string().uuid(), name: z.string(), email: z.string().nullable(), username: z.string(), role: z.string(), status: z.string() }), userDetails: detailsSchema, savings: savingsSchema });
const profileFormSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.union([z.string().trim().email().max(254), z.literal("")]),
  no_hp: z.string().trim().min(5).max(30).optional(),
  alamat: z.string().trim().min(3).max(500).optional(),
  tanggal_lahir: z.string().nullable().optional(),
});
const passwordFormSchema = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(10).max(128), confirmPassword: z.string().min(10).max(128) }).refine((values) => values.newPassword === values.confirmPassword, { path: ["confirmPassword"], message: "Konfirmasi password tidak sama" });
type ProfileFormValues = z.infer<typeof profileFormSchema>;
type PasswordValues = z.infer<typeof passwordFormSchema>;

function rupiah(value: string | number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value));
}

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const profileQuery = useQuery({ queryKey: ["profile-details"], queryFn: () => apiRequest("/profile", profileDataSchema) });
  const currentProfileQuery = useQuery({ queryKey: ["current-profile"], queryFn: getCurrentProfile });
  const profile = profileQuery.data;
  const isReadOnlyUser = currentProfileQuery.data?.role === "user";
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    values: profile ? {
      name: profile.profile.name,
      email: profile.profile.email ?? "",
      no_hp: profile.userDetails?.no_hp ?? "",
      alamat: profile.userDetails?.alamat ?? "",
      tanggal_lahir: profile.userDetails?.tanggal_lahir ?? "",
    } : undefined,
  });
  const passwordForm = useForm<PasswordValues>({ resolver: zodResolver(passwordFormSchema) });

  const saveProfile = useMutation({
    mutationFn: (values: ProfileFormValues) => apiRequest("/profile", z.unknown(), {
      method: "PATCH",
      body: JSON.stringify({
        name: values.name,
        email: values.email || null,
        ...(currentProfileQuery.data?.role === "user" ? {
          no_hp: values.no_hp,
          alamat: values.alamat,
          tanggal_lahir: values.tanggal_lahir || null,
        } : {}),
      }),
    }),
    onSuccess: async () => {
      setError("");
      setNotice("Profil berhasil diperbarui.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["profile-details"] }),
        queryClient.invalidateQueries({ queryKey: ["current-profile"] }),
      ]);
    },
    onError: (reason) => setError(reason instanceof ApiError ? reason.message : "Profil gagal diperbarui."),
  });
  const changePassword = useMutation({
    mutationFn: (values: PasswordValues) => apiRequest("/profile/password", z.object({}), {
      method: "POST",
      body: JSON.stringify({ currentPassword: values.currentPassword, newPassword: values.newPassword }),
    }),
    onSuccess: () => {
      setError("");
      setNotice("Password berhasil diperbarui.");
      passwordForm.reset();
    },
    onError: (reason) => setError(reason instanceof ApiError ? reason.message : "Password gagal diperbarui."),
  });
  const inputClass = "mt-1.5 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15";

  return (
    <AppShell>
      <div className="mb-7"><p className="mb-2 text-xs font-semibold uppercase tracking-[0.13em] text-emerald-800">Akun</p><h1 className="text-2xl font-semibold tracking-tight text-slate-950">Profil</h1><p className="mt-1 text-sm text-slate-600">{isReadOnlyUser ? "Informasi akun dan rekening tabungan santri Anda." : "Perbarui informasi akun dan keamanan password."}</p></div>
      {notice && <p className="mb-4 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">{notice}</p>}{error && <p className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</p>}
      {profileQuery.isError ? <p className="text-sm text-red-700">{profileQuery.error.message}</p> : profileQuery.isPending ? <p className="text-sm text-slate-500">Memuat profil...</p> : profile && <div className={isReadOnlyUser ? "max-w-3xl" : "grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.72fr)]"}>
        <section className="border-y border-slate-200 bg-white">
          <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4"><UserRound className="text-emerald-800" size={18} /><h2 className="text-sm font-semibold">Informasi profil</h2></div>
          <form className="space-y-4 p-5 sm:p-6" onSubmit={profileForm.handleSubmit((values) => saveProfile.mutate(values))}>
            <fieldset disabled={isReadOnlyUser}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">Nama lengkap<input className={inputClass} {...profileForm.register("name")} /></label>
              <label className="text-sm font-medium text-slate-700">Username<input className={`${inputClass} bg-slate-50`} readOnly value={profile.profile.username} /></label>
              <label className="text-sm font-medium text-slate-700 sm:col-span-2">Email<input className={inputClass} type="email" {...profileForm.register("email")} /></label>
              {currentProfileQuery.data?.role === "user" && <>
                <label className="text-sm font-medium text-slate-700">Nomor HP<input className={inputClass} type="tel" {...profileForm.register("no_hp")} /></label>
                <label className="text-sm font-medium text-slate-700">Tanggal lahir<input className={inputClass} type="date" {...profileForm.register("tanggal_lahir")} /></label>
                <label className="text-sm font-medium text-slate-700 sm:col-span-2">Alamat<textarea className="mt-1.5 min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-700" {...profileForm.register("alamat")} /></label>
                <div className="sm:col-span-2"><p className="text-xs text-slate-500">Nomor identitas</p><p className="mt-1 text-sm font-medium text-slate-800">{profile.userDetails?.nomor_identitas ?? "—"}</p></div>
              </>}
              {profile.savings && <div className="sm:col-span-2"><p className="text-xs text-slate-500">Rekening tabungan</p><p className="mt-1 text-sm font-medium text-slate-800">{profile.savings.nomor_rekening} · {rupiah(profile.savings.saldo)} · {profile.savings.status === "active" ? "Aktif" : "Nonaktif"}</p></div>}
            </div>
            </fieldset>
            {!isReadOnlyUser && <div className="flex justify-end border-t border-slate-100 pt-4"><button className="inline-flex h-10 items-center gap-2 rounded-md bg-emerald-800 px-4 text-sm font-semibold text-white disabled:opacity-50" disabled={saveProfile.isPending} type="submit">{saveProfile.isPending && <LoaderCircle className="animate-spin" size={16} />}Simpan profil</button></div>}
          </form>
        </section>
        {!isReadOnlyUser && (
          <section className="h-fit border-y border-slate-200 bg-white">
            <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4"><KeyRound className="text-emerald-800" size={18} /><h2 className="text-sm font-semibold">Ubah password</h2></div>
            <form className="space-y-4 p-5 sm:p-6" onSubmit={passwordForm.handleSubmit((values) => changePassword.mutate(values))}>
              <label className="block text-sm font-medium text-slate-700">Password saat ini<input autoComplete="current-password" className={inputClass} type="password" {...passwordForm.register("currentPassword")} /></label>
              <label className="block text-sm font-medium text-slate-700">Password baru<input autoComplete="new-password" className={inputClass} type="password" {...passwordForm.register("newPassword")} /><span className="mt-1 block text-xs font-normal text-slate-500">Minimal 10 karakter.</span></label>
              <label className="block text-sm font-medium text-slate-700">Ulangi password baru<input autoComplete="new-password" className={inputClass} type="password" {...passwordForm.register("confirmPassword")} />{passwordForm.formState.errors.confirmPassword && <span className="mt-1 block text-xs text-red-700">{passwordForm.formState.errors.confirmPassword.message}</span>}</label>
              <div className="flex justify-end border-t border-slate-100 pt-4"><button className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-medium hover:bg-slate-50 disabled:opacity-50" disabled={changePassword.isPending} type="submit">{changePassword.isPending && <LoaderCircle className="animate-spin" size={16} />}Ubah password</button></div>
            </form>
          </section>
        )}
      </div>}
    </AppShell>
  );
}
