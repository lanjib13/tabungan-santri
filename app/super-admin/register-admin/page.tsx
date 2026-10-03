import { redirect } from "next/navigation";

export default function RegisterAdminPage() {
  redirect("/super-admin/admins?create=1");
}
