"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, FileBarChart2, Landmark, LayoutDashboard, LogOut, Menu, Shield, Users, Wallet, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { getCurrentProfile, logout } from "@/lib/auth";

const icons = {
  dashboard: LayoutDashboard,
  users: Users,
  admins: Shield,
  savings: Landmark,
  transactions: Activity,
  reports: FileBarChart2,
  profile: Wallet,
};

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const profileQuery = useQuery({ queryKey: ["current-profile"], queryFn: getCurrentProfile, retry: false });
  const profile = profileQuery.data;
  const navigation = [
    { label: "Dashboard", href: "/dashboard", icon: icons.dashboard, visible: true },
    { label: "Pengguna", href: "/admin/users", icon: icons.users, visible: profile?.role === "admin" || profile?.role === "super_admin" },
    { label: "Admin", href: "/super-admin/admins", icon: icons.admins, visible: profile?.role === "super_admin" },
    { label: "Registrasi Admin", href: "/super-admin/register-admin", icon: icons.admins, visible: profile?.role === "super_admin" },
    { label: "Tabungan", href: "/savings", icon: icons.savings, visible: true },
    { label: "Transaksi", href: "/transactions", icon: icons.transactions, visible: true },
    { label: "Laporan", href: "/reports", icon: icons.reports, visible: true },
    { label: "Profil", href: "/profile", icon: icons.profile, visible: true },
  ].filter((item) => item.visible);
  if (profile?.role === "super_admin") {
    navigation.push({ label: "Audit log", href: "/audit-logs", icon: icons.transactions, visible: true });
  }

  async function handleLogout() {
    setLogoutError("");
    try {
      await logout();
      router.replace("/login");
      router.refresh();
    } catch {
      setLogoutError("Logout gagal. Coba lagi.");
    }
  }

  const sidebar = (
    <>
      <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-4">
        <div className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-emerald-200/80 bg-white shadow-xs">
          <Image
            src="/logo1.jpeg"
            alt="Logo Ponpes Ihyaul Ulum"
            width={40}
            height={40}
            className="size-full object-contain p-0.5"
            priority
          />
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-xs font-bold uppercase tracking-wider text-emerald-950">
            Tabungan Santri
          </span>
          <span className="truncate text-[11px] font-medium text-slate-500">
            Ponpes Ihyaul Ulum
          </span>
        </div>
        <button aria-label="Tutup navigasi" className="ml-auto inline-flex size-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 lg:hidden" onClick={() => setMobileOpen(false)} type="button"><X size={18} /></button>
      </div>
      <nav aria-label="Navigasi utama" className="flex-1 space-y-1 px-3 py-5">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={`flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition ${active ? "bg-emerald-50 text-emerald-900" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}
              href={item.href}
              key={item.href}
              onClick={() => setMobileOpen(false)}
            >
              <Icon aria-hidden="true" size={17} />{item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 p-3">
        <button className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-800" onClick={handleLogout} type="button">
          <LogOut aria-hidden="true" size={17} /> Keluar
        </button>
        {logoutError && <p className="px-3 pt-2 text-xs text-red-700">{logoutError}</p>}
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-slate-200 bg-white lg:flex">{sidebar}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button aria-label="Tutup navigasi" className="absolute inset-0 bg-slate-950/35" onClick={() => setMobileOpen(false)} type="button" />
          <aside className="absolute inset-y-0 left-0 flex w-[min(84vw,300px)] flex-col border-r border-slate-200 bg-white shadow-xl">{sidebar}</aside>
        </div>
      )}
      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-7">
          <div className="flex items-center gap-3">
            <button aria-label="Buka navigasi" className="inline-flex size-9 items-center justify-center rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 lg:hidden" onClick={() => setMobileOpen(true)} type="button"><Menu size={18} /></button>
            <div className="flex items-center gap-2.5">
              <div className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-emerald-200/80 bg-white lg:hidden">
                <Image
                  src="/logo1.jpeg"
                  alt="Logo Ponpes Ihyaul Ulum"
                  width={30}
                  height={30}
                  className="size-full object-contain p-0.5"
                />
              </div>
              <span className="hidden text-sm font-semibold text-slate-800 sm:inline">
                Tabungan Santri Ponpes Ihyaul Ulum Dukun Gresik
              </span>
              <span className="text-sm font-semibold text-slate-800 sm:hidden">
                Tabungan Santri Ihyaul Ulum
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-slate-900">{profile?.name ?? "Memuat profil..."}</p>
            <p className="text-xs capitalize text-slate-500">{profile?.role?.replace("_", " ") ?? ""}</p>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-7 sm:px-7 sm:py-9">{children}</main>
      </div>
    </div>
  );
}
