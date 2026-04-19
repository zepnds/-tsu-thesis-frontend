// frontend/src/views/admin/pages/Dashboard.jsx
import { useEffect, useMemo, useState } from "react";
import {
  Users,
  MapPin,
  Activity,
  CalendarClock,
  ArrowUpRight,
  AlertCircle,
  RefreshCcw,
  Search,
  Clock3,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";
import { format } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  SelectItem,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { getAuth } from "@/utils/auth";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) || "/api";

// Chart colors
const COLORS = {
  available: "#22c55e", // green-500
  occupied: "#ef4444", // red-500
  reserved: "#f59e0b", // amber-500
  maintenance: "#64748b", // slate-500
};

function safeDateLabel(v) {
  if (!v) return "TBD";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "TBD";
  return format(d, "MMM d, yyyy");
}

function safeShortDate(v) {
  if (!v) return "TBD";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "TBD";
  return format(d, "MMM d");
}

function normalizeStatus(s) {
  return String(s || "").trim().toLowerCase();
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

  // Upcoming filters
  const [upcomingQuery, setUpcomingQuery] = useState("");
  const [upcomingStatus, setUpcomingStatus] = useState("all");

  useEffect(() => {
    fetchMetrics({ initial: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchMetrics({ initial = false } = {}) {
    try {
      setError(null);
      if (initial) setLoading(true);
      else setRefreshing(true);

      const auth = getAuth();
      if (!auth?.token) throw new Error("Not authenticated");

      // Show all upcoming burials
      const res = await fetch(`${API_BASE}/admin/metrics?upcoming_limit=all`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });

      const ct = res.headers.get("content-type") || "";
      if (!res.ok) {
        const body = ct.includes("application/json") ? await res.json() : await res.text();
        const message = ct.includes("application/json")
          ? body.error || body.message || JSON.stringify(body)
          : String(body || "").slice(0, 200);
        throw new Error(message || `HTTP ${res.status}`);
      }

      if (!ct.includes("application/json")) {
        const text = await res.text();
        // eslint-disable-next-line no-console
        console.error("[Dashboard] Non-JSON response from /admin/metrics:", text);
        throw new Error("Server returned HTML instead of JSON for /admin/metrics");
      }

      const json = await res.json();
      setData(json);
      setLastUpdatedAt(new Date());
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[Dashboard] fetchMetrics error:", err);
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const counts = data?.counts || {};
  const plot_stats = data?.plot_stats || [];
  const upcoming_approved = data?.upcoming_approved || [];
  const upcoming_pending = data?.upcoming_pending || [];
  const recent_maintenance = data?.recent_maintenance || [];

  const chartData = useMemo(() => {
    return (plot_stats || []).map((item) => {
      const s = normalizeStatus(item.status);
      const name = s ? s.charAt(0).toUpperCase() + s.slice(1) : "Unknown";
      const value = Number.parseInt(item.count, 10) || 0;
      return {
        name,
        value,
        status: s || "unknown",
        color: COLORS[s] || "#cbd5e1",
      };
    });
  }, [plot_stats]);


  if (loading) {
    return (
      <div className="p-6 pb-20 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="h-8 w-48 rounded bg-slate-200 animate-pulse" />
            <div className="mt-2 h-4 w-96 rounded bg-slate-200 animate-pulse" />
          </div>
          <div className="h-9 w-28 rounded bg-slate-200 animate-pulse" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 w-40 rounded bg-slate-200 animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-24 rounded bg-slate-200 animate-pulse" />
                <div className="mt-2 h-3 w-44 rounded bg-slate-200 animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <div className="h-5 w-56 rounded bg-slate-200 animate-pulse" />
            <div className="mt-2 h-4 w-72 rounded bg-slate-200 animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="h-64 rounded bg-slate-200 animate-pulse" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 pb-20">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of cemetery operations, plots, burials, and maintenance.
          </p>
          {lastUpdatedAt ? (
            <div className="mt-2 inline-flex items-center gap-2 text-xs text-slate-500">
              <Clock3 className="h-3.5 w-3.5" />
              Updated {format(lastUpdatedAt, "MMM d, yyyy h:mm a")}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => fetchMetrics()}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCcw className={["h-4 w-4", refreshing ? "animate-spin" : ""].join(" ")} />
            Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive" className="border-rose-200">
          <AlertTitle className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Dashboard failed to load
          </AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <div className="break-words">{error}</div>
            <div>
              <Button variant="outline" onClick={() => fetchMetrics()}>
                Try again
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Deceased"
          value={counts.total_deceased}
          icon={MapPin}
          subtext="Recorded interments"
        />
        <StatCard
          title="Registered Visitors"
          value={counts.total_visitors}
          icon={Users}
          subtext="Active accounts"
        />
        <StatCard
          title="Pending Burials"
          value={counts.pending_burials}
          icon={CalendarClock}
          subtext="Awaiting approval"
        />
        <StatCard
          title="Active Maintenance"
          value={counts.active_maintenance}
          icon={Activity}
          subtext="Open tickets"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Plot Status Chart */}
        <Card className="col-span-3 overflow-hidden">
          <CardHeader>
            <CardTitle>Plot Availability</CardTitle>
            <CardDescription>Current status distribution of all plots</CardDescription>
          </CardHeader>

          <CardContent className="pl-2">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={86}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>

                  <RechartsTooltip
                    formatter={(value, name) => [value, name]}
                    contentStyle={{ borderRadius: 12 }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 text-center text-sm text-muted-foreground">
              <strong>{counts.available_plots ?? 0}</strong> plots available out of{" "}
              <strong>{counts.total_plots ?? 0}</strong> total.
            </div>
          </CardContent>
        </Card>

        {/* Burial Schedule & Ticketing */}
        <Card className="col-span-4 overflow-hidden flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Burial Schedule</CardTitle>
                <CardDescription>Manage upcoming services and tickets</CardDescription>
              </div>
              <CalendarClock className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>

          <CardContent className="flex-1">
            <Tabs defaultValue="approved" className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="approved">Approved</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>

              </TabsList>

              <TabsContent value="approved" className="mt-0">
                <ScheduleTable items={upcoming_approved} emptyText="No approved burials scheduled." />
              </TabsContent>

              <TabsContent value="pending" className="mt-0">
                <ScheduleTable items={upcoming_pending} emptyText="No pending burial requests." />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Recent Maintenance */}
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Recent Maintenance Tickets</CardTitle>
            <CardDescription>Latest reported issues</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 self-start sm:self-auto"
            onClick={() => {
              // Optional: wire to your route later, example:
              // navigate("/admin/maintenance");
            }}
          >
            View All <ArrowUpRight className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requester</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {recent_maintenance.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                      No open maintenance requests.
                    </TableCell>
                  </TableRow>
                ) : (
                  recent_maintenance.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-medium">
                        {ticket.requester_name || "Unknown"}
                      </TableCell>

                      <TableCell className="text-sm">
                        {ticket.request_type}
                        {ticket.category ? (
                          <span className="text-muted-foreground"> ({ticket.category})</span>
                        ) : null}
                      </TableCell>

                      <TableCell>
                        <PriorityBadge priority={ticket.priority} />
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {String(ticket.status || "").replace("_", " ") || "unknown"}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right text-muted-foreground">
                        {safeShortDate(ticket.created_at)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div >
  );
}

/* ---------------- Helper Components ---------------- */

function StatCard({ title, value, icon: Icon, subtext }) {
  const displayValue = value == null || value === "" ? "0" : String(value);

  return (
    <Card className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white via-white to-slate-50" />
      <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>

        <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center">
          <Icon className="h-4 w-4 text-slate-600" />
        </div>
      </CardHeader>

      <CardContent className="relative">
        <div className="text-2xl font-bold">{displayValue}</div>
        <p className="text-xs text-muted-foreground">{subtext}</p>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }) {
  const s = normalizeStatus(status);

  const styles = {
    pending: "bg-yellow-100 text-yellow-900 hover:bg-yellow-100",
    approved: "bg-blue-100 text-blue-900 hover:bg-blue-100",
    confirmed: "bg-indigo-100 text-indigo-900 hover:bg-indigo-100",
    completed: "bg-green-100 text-green-900 hover:bg-green-100",
    cancelled: "bg-red-100 text-red-900 hover:bg-red-100",
    canceled: "bg-red-100 text-red-900 hover:bg-red-100",
    rejected: "bg-red-100 text-red-900 hover:bg-red-100",
  };

  const label = s ? s.charAt(0).toUpperCase() + s.slice(1) : "Unknown";

  return <Badge className={styles[s] || "bg-slate-100 text-slate-900"}>{label}</Badge>;
}

function PriorityBadge({ priority }) {
  const p = normalizeStatus(priority);

  const styles = {
    low: "text-slate-500",
    medium: "text-blue-600",
    high: "text-orange-600",
    urgent: "text-red-600 font-semibold",
  };

  const label = p ? p.toUpperCase() : "N/A";

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${styles[p] || "text-slate-500"}`}>
      <AlertCircle className="h-3 w-3" />
      {label}
    </span>
  );
}

function ScheduleTable({ items, emptyText }) {
  if (!items?.length) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg bg-slate-50/50">
        <Clock3 className="h-8 w-8 text-slate-300 mb-2" />
        <p className="text-sm text-muted-foreground font-medium">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/50">
            <TableHead className="font-semibold">Deceased</TableHead>
            <TableHead className="font-semibold">Schedule</TableHead>
            <TableHead className="font-semibold">Plot</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id} className="hover:bg-slate-50/30 transition-colors">
              <TableCell className="font-medium text-sm">
                {item.deceased_name}
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-700">
                    {safeDateLabel(item.scheduled_date)}
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    {item.scheduled_time || "TBD"}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-xs text-slate-600 font-mono">
                {item.plot_code || "N/A"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

