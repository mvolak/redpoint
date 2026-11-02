import { AdminShell } from "@redcord/booking/components/admin/AdminShell";

export default function AdminAppLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
