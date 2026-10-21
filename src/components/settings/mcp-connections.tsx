"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Loader2, PlugZap, Unplug } from "lucide-react";
import { revokeMcpConnection, type McpConnection } from "@/lib/actions/mcp";
import { Badge, Button } from "@/components/ui";
import { cn } from "@/lib/utils";

function when(value: string | null) {
  if (!value) return "never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "never";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function stateOf(connection: McpConnection) {
  if (connection.revoked_at) return { label: "Disconnected", tone: "ink" as const };
  if (new Date(connection.expires_at).getTime() <= Date.now())
    return { label: "Expired", tone: "amber" as const };
  return { label: "Connected", tone: "sea" as const };
}

export function McpConnections({
  connections,
}: {
  connections: McpConnection[];
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  function disconnect(id: string) {
    setError(null);
    setPendingId(id);
    (async () => {
      try {
        await revokeMcpConnection(id);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't disconnect that client.");
      } finally {
        setPendingId(null);
      }
    })();
  }

  if (connections.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line-strong bg-card/50 px-6 py-10 text-center">
        <PlugZap className="mx-auto mb-3 h-7 w-7 text-muted" />
        <p className="font-display text-lg font-semibold text-ink">
          Nothing connected yet
        </p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
          Add bunny as a custom connector in Claude and sign in - it will show
          up here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {connections.map((connection) => {
        const state = stateOf(connection);
        const busy = pendingId === connection.id;
        return (
          <div
            key={connection.id}
            className="flex flex-col gap-3 rounded-2xl border border-line/70 bg-card p-4 shadow-card sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-semibold text-ink">
                  {connection.client_name ?? "MCP client"}
                </p>
                <Badge tone={state.tone}>{state.label}</Badge>
              </div>
              <p className="mt-1 text-[13px] text-muted">
                Connected {when(connection.created_at)} · Last used{" "}
                {when(connection.last_used_at)}
              </p>
              <p className="mt-0.5 truncate font-mono text-[11px] text-muted/80">
                {connection.client_id}
              </p>
            </div>
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={busy || Boolean(connection.revoked_at)}
              onClick={() => disconnect(connection.id)}
              className={cn("shrink-0 self-start sm:self-auto")}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Unplug className="h-4 w-4" />
              )}
              Disconnect
            </Button>
          </div>
        );
      })}
      {error ? (
        <p className="rounded-xl border border-rust/25 bg-rust-soft px-4 py-2.5 text-sm font-medium text-rust-deep">
          {error}
        </p>
      ) : null}
    </div>
  );
}
