import { redirect } from "next/navigation";
import DashboardFrame from "./_components/dashboard-frame";
import { auth } from "@/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return <DashboardFrame>{children}</DashboardFrame>;
}
