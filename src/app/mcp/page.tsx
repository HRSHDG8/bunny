import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Bot, KeyRound, Link2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui";

export const metadata: Metadata = { title: "Connect bunny to Claude" };

export const dynamic = "force-dynamic";

export default async function McpGuidePage() {
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "";
  const mcpUrl = base ? `${base.replace(/\/$/, "")}/api/mcp` : "/api/mcp";

  return (
    <>
      <SiteHeader showNewTrip={false} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10 sm:px-6">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to settings
        </Link>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight">
          Connect bunny to Claude
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted">
          Use bunny&apos;s MCP server to create trips, add flights and rentals,
          build itineraries and plan whole trips - all while you stay signed in
          to your own account.
        </p>

        <div className="mt-8 space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-sea-deep" />
              <p className="text-sm font-semibold text-ink">
                1) Add the connector in Claude
              </p>
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
              In Claude (claude.ai), go to Settings → Connectors → Add custom
              connector. Give it a name like <span className="font-semibold text-ink">bunny</span>,
              and paste the server URL below.
            </p>
            <div className="mt-3 rounded-xl border border-line-strong bg-cream px-3 py-2.5 font-mono text-[12px] text-ink">
              {mcpUrl}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-amber" />
              <p className="text-sm font-semibold text-ink">
                2) Sign in and approve
              </p>
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
              Claude will open a browser window to bunny. Sign in with your bunny
              account and approve the connection. bunny uses OAuth 2.1 with PKCE,
              and the connector only ever sees the trips you can access.
            </p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-rust" />
              <p className="text-sm font-semibold text-ink">
                3) Start planning
              </p>
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
              Ask Claude things like &quot;plan a long weekend in Porto, add my
              flights and build a two-day itinerary&quot; or &quot;show me my
              upcoming trips&quot;. When it needs to change anything, it will use
              tools that write to your bunny account.
            </p>
          </Card>
        </div>
      </main>
    </>
  );
}
