import { redirect } from "next/navigation";
import { ExternalLink, KeyRound } from "lucide-react";
import { getCurrentUser } from "@/lib/data";
import { listMcpConnections } from "@/lib/actions/mcp";
import { McpConnections } from "@/components/settings/mcp-connections";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui";

export const metadata = { title: "Settings" };

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const connections = await listMcpConnections().catch(() => []);
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "";
  const mcpUrl = base ? `${base.replace(/\/$/, "")}/api/mcp` : "/api/mcp";

  return (
    <>
      <SiteHeader
        email={user.email ?? undefined}
        name={user.user_metadata?.full_name ?? undefined}
      />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10 sm:px-6">
        <p className="micro text-muted">Settings</p>
        <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight">
          Connections
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          Connect bunny to Claude so it can plan trips alongside you.
        </p>

        <section className="mt-8">
          <h2 className="font-display text-xl font-semibold text-ink">
            Connected apps
          </h2>
          <p className="mt-1 text-sm text-muted">
            Every app you connect acts as you - it can only see and change your
            own trips.
          </p>
          <div className="mt-4">
            <McpConnections connections={connections} />
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold text-ink">
            Add bunny to Claude
          </h2>
          <div className="mt-4 space-y-4">
            <Card className="p-5">
              <p className="text-sm font-semibold text-ink">1. Server address</p>
              <p className="mt-1 text-[13px] text-muted">
                Paste this into Claude when you add a custom connector.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-xl border border-line-strong bg-cream px-3 py-2.5 font-mono text-[12px] text-ink">
                  {mcpUrl}
                </code>
                <a
                  href="/mcp"
                  className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-line-strong bg-card px-3.5 text-[13px] font-semibold text-ink hover:bg-cream/50"
                >
                  <ExternalLink className="h-4 w-4" />
                  Guide
                </a>
              </div>
            </Card>

            <Card className="p-5">
              <p className="text-sm font-semibold text-ink">2. Sign in</p>
              <p className="mt-1 text-[13px] text-muted">
                Claude opens bunny&apos;s sign-in page, and you approve the
                connection with your bunny account. bunny never shares your
                password with Claude.
              </p>
              <p className="mt-3 flex items-center gap-2 text-[13px] text-muted">
                <KeyRound className="h-4 w-4" />
                Requests need the read scope; changes need write access.
              </p>
            </Card>
          </div>
        </section>
      </main>
    </>
  );
}
