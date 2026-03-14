import type { ReactNode } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getAuthContext } from "@/lib/authz";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { operator } = await getAuthContext();

  return <DashboardShell operator={operator}>{children}</DashboardShell>;
}
