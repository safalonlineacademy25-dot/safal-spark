import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const MCP_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mcp`;

const TOOL_PRESETS: Record<string, string> = {
  get_order: JSON.stringify({ order_number: "SOA20260704-1234" }, null, 2),
  list_recent_orders: JSON.stringify({ limit: 5 }, null, 2),
  get_sales_summary: JSON.stringify({ days: 7 }, null, 2),
  "tools/list": "{}",
};

export default function McpTestClient() {
  const { session, isAdmin, isLoading, isRoleCheckComplete } = useAuth();
  const navigate = useNavigate();
  const [tool, setTool] = useState<string>("tools/list");
  const [args, setArgs] = useState<string>(TOOL_PRESETS["tools/list"]);
  const [response, setResponse] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && isRoleCheckComplete && !isAdmin) navigate("/admin");
  }, [isLoading, isRoleCheckComplete, isAdmin, navigate]);

  const token = useMemo(() => session?.access_token ?? "", [session]);

  const onSelectTool = (value: string) => {
    setTool(value);
    setArgs(TOOL_PRESETS[value] ?? "{}");
  };

  const run = async () => {
    setLoading(true);
    setResponse("");
    setStatus("");
    try {
      let parsedArgs: unknown = {};
      if (args.trim()) {
        try {
          parsedArgs = JSON.parse(args);
        } catch (e: any) {
          toast.error("Arguments must be valid JSON");
          setLoading(false);
          return;
        }
      }

      const body =
        tool === "tools/list"
          ? { jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }
          : {
              jsonrpc: "2.0",
              id: 1,
              method: "tools/call",
              params: { name: tool, arguments: parsedArgs },
            };

      const { data: fresh } = await supabase.auth.getSession();
      const bearer = fresh.session?.access_token ?? token;

      const res = await fetch(MCP_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
          Authorization: `Bearer ${bearer}`,
        },
        body: JSON.stringify(body),
      });

      setStatus(`${res.status} ${res.statusText}`);
      const ct = res.headers.get("content-type") ?? "";
      const raw = await res.text();

      if (ct.includes("text/event-stream")) {
        // Parse SSE — collect data: lines
        const lines = raw
          .split("\n")
          .filter((l) => l.startsWith("data:"))
          .map((l) => l.slice(5).trim());
        const parsed = lines.map((l) => {
          try {
            return JSON.parse(l);
          } catch {
            return l;
          }
        });
        setResponse(JSON.stringify(parsed.length === 1 ? parsed[0] : parsed, null, 2));
      } else {
        try {
          setResponse(JSON.stringify(JSON.parse(raw), null, 2));
        } catch {
          setResponse(raw);
        }
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Request failed");
      setResponse(String(e));
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || !isRoleCheckComplete) {
    return <div className="p-8 text-center">Loading…</div>;
  }
  if (!isAdmin) return null;

  return (
    <div className="container mx-auto max-w-4xl p-6 space-y-6">
      <Helmet>
        <title>MCP Test Client | Admin</title>
        <meta name="description" content="Admin-only MCP test client for troubleshooting tool calls." />
      </Helmet>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">MCP Test Client</h1>
        <Button variant="outline" onClick={() => navigate("/admin/dashboard")}>Back</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Endpoint</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="break-all font-mono bg-muted p-2 rounded">{MCP_URL}</div>
          <div className="text-muted-foreground">
            Signed in as: <span className="font-mono">{session?.user?.email ?? "—"}</span>
          </div>
          <div className="text-muted-foreground text-xs">
            Bearer token: <span className="font-mono">{token ? `${token.slice(0, 12)}…${token.slice(-8)}` : "none"}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Request</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tool / Method</Label>
            <Select value={tool} onValueChange={onSelectTool}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tools/list">tools/list</SelectItem>
                <SelectItem value="get_order">get_order</SelectItem>
                <SelectItem value="list_recent_orders">list_recent_orders</SelectItem>
                <SelectItem value="get_sales_summary">get_sales_summary</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Custom tool name (optional, overrides selection)</Label>
            <Input
              placeholder="e.g. get_order"
              onChange={(e) => {
                const v = e.target.value.trim();
                if (v) setTool(v);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>Arguments (JSON)</Label>
            <Textarea
              value={args}
              onChange={(e) => setArgs(e.target.value)}
              rows={6}
              className="font-mono text-sm"
            />
          </div>

          <Button onClick={run} disabled={loading || !token}>
            {loading ? "Running…" : "Send request"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Response</span>
            {status && <span className="text-xs font-mono text-muted-foreground">{status}</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-[500px] whitespace-pre-wrap break-all">
{response || "— no response yet —"}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
