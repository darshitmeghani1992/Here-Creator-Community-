import { isSupabaseConfigured } from "@/lib/env";
import { AppShell } from "@/components/AppShell";
import { SetupNotice } from "@/components/SetupNotice";
import { StudioClient } from "./studio-client";

export const dynamic = "force-dynamic";

export default function StudioPage() {
  if (!isSupabaseConfigured()) return <SetupNotice />;
  return (
    <AppShell>
      <StudioClient />
    </AppShell>
  );
}
