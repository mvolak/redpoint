import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Administrace – Redpoint Booking",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
