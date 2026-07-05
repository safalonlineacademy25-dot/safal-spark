import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getOrderTool from "./tools/get-order";
import getSalesSummaryTool from "./tools/get-sales-summary";
import listRecentOrdersTool from "./tools/list-recent-orders";

// Build the issuer from the project ref (import.meta.env is inlined by Vite
// at build time, so this stays import-safe — no runtime env read).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "safal-online-mcp",
  title: "Safal Online Academy MCP",
  version: "0.1.0",
  instructions:
    "Admin tools for the Safal Online Academy portal. Requires an authenticated Supabase admin bearer token. Available tools: get_order, list_recent_orders, get_sales_summary.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
    // Accept Supabase user session tokens (mobile app signs in via Supabase Auth).
    // We enforce admin-only access inside every tool via has_admin_access RPC.
    requireOAuthClientClaim: false,
  }),
  tools: [getOrderTool, listRecentOrdersTool, getSalesSummaryTool],
});
