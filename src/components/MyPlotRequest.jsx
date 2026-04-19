import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "./ui/dialog";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import { RefreshCw, MapPin, CalendarDays, X, Info } from "lucide-react";

const API_BASE =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) || "";

function readAuth() {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("auth");
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function getToken(auth) {
    return auth?.accessToken || auth?.token || auth?.jwt || auth?.access_token || "";
}

function formatDate(dateString) {
    if (!dateString) return "—";
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return dateString;
    return d.toISOString().split("T")[0];
}

function StatusBadge({ status }) {
    const s = String(status || "").toLowerCase();

    const map = {
        confirmed: "bg-emerald-100 text-emerald-800 border-emerald-200",
        pending: "bg-amber-100 text-amber-800 border-amber-200",
        approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
        rejected: "bg-rose-100 text-rose-800 border-rose-200",
        canceled: "bg-slate-100 text-slate-700 border-slate-200",
        cancelled: "bg-slate-100 text-slate-700 border-slate-200",
        reserved: "bg-amber-100 text-amber-800 border-amber-200",
    };

    const cls = map[s] || "bg-slate-100 text-slate-700 border-slate-200";

    return (
        <Badge variant="outline" className={`rounded-full ${cls}`}>
            {s ? s.toUpperCase() : "—"}
        </Badge>
    );
}

async function fetchJson(url, options) {
    const res = await fetch(url, options);
    const ct = res.headers.get("content-type") || "";
    const body = ct.includes("application/json")
        ? await res.json().catch(() => ({}))
        : await res.text().catch(() => "");

    if (!res.ok) {
        const msg =
            typeof body === "string"
                ? body
                : body?.message || body?.error || `HTTP ${res.status}`;
        throw new Error(msg);
    }
    return body;
}

export default function MyPlotRequest({ open, onOpenChange }) {
    const [loading, setLoading] = useState(false);
    const [plotRequest, setPlotRequest] = useState([]);
    const [msg, setMsg] = useState({ type: "", text: "" });

    const auth = useMemo(() => readAuth(), []);
    const token = useMemo(() => getToken(auth), [auth]);
    const user = auth?.user || {};
    const userId = user.id || user.userId || user.user_id;

    const headers = useMemo(() => {
        const h = {
            Accept: "application/json",
            "Content-Type": "application/json",
        };
        if (token) h.Authorization = `Bearer ${token}`;
        return h;
    }, [token]);


    const endpoint = `${API_BASE}/visitor/plot-request/list/${userId}`;

    const fetchPlotRequest = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        setMsg({ type: "", text: "" });
        try {
            const body = await
                fetchJson(endpoint, {
                    method: "GET",
                    headers,
                });

            const list = Array.isArray(body) ? body : body?.data || [];
            setPlotRequest(Array.isArray(list) ? list : []);
        } catch (err) {
            console.error("Error fetching reservations:", err);
            setMsg({ type: "error", text: err?.message || "Unable to fetch reservations." });
            setPlotRequest([]);
        } finally {
            setLoading(false);
        }
    }, [endpoint, headers, userId]);

    useEffect(() => {
        if (open && userId) {
            fetchPlotRequest();
        }
    }, [open, userId, fetchPlotRequest]);

    const handleCancel = async (id) => {
        if (!window.confirm("Are you sure you want to cancel this plot reservation?")) return;

        try {
            setMsg({ type: "", text: "" });
            const url = `${API_BASE}/visitor/plot-request/cancel/${id}`;
            await fetchJson(url, {
                method: "GET",
                headers,
            });


            setMsg({ type: "ok", text: "Reservation cancelled successfully." });
            fetchPlotRequest();
        } catch (err) {
            setMsg({ type: "error", text: err?.message || "Failed to cancel reservation." });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-white/90 backdrop-blur border-white/60 shadow-2xl">
                <DialogHeader>
                    <div className="flex items-center justify-between pr-6">
                        <div>
                            <DialogTitle className="text-2xl bg-gradient-to-r from-emerald-600 via-cyan-600 to-blue-600 bg-clip-text text-transparent">
                                My Plot Requests
                            </DialogTitle>
                            <DialogDescription className="text-slate-600">
                                View and manage your plot reservations and requests.
                            </DialogDescription>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                            onClick={fetchPlotRequest}
                            disabled={loading}
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                            Refresh
                        </Button>
                    </div>
                </DialogHeader>

                {msg.text && (
                    <Alert
                        variant={msg.type === "error" ? "destructive" : "default"}
                        className={
                            msg.type === "error"
                                ? "mb-4 bg-rose-50/90 border-rose-200"
                                : "mb-4 bg-emerald-50/90 border-emerald-200 text-emerald-700 shadow-sm"
                        }
                    >
                        <AlertDescription>{msg.text}</AlertDescription>
                    </Alert>
                )}

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-slate-500 font-medium">Fetching your requests...</p>
                    </div>
                ) : plotRequest.length === 0 ? (
                    <div className="text-center py-12 space-y-4">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 text-slate-300">
                            <MapPin className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-800">No Plot Requests Found</h3>
                        <p className="text-slate-500 max-w-xs mx-auto">
                            You haven't made any plot reservations yet. You can reserve a plot through the cemetery map.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                        {plotRequest.map((r) => {
                            const isClosed = ['cancelled', 'approved', 'confirmed', 'rejected'].includes(String(r.status || '').toLowerCase());
                            return (
                                <Card key={r.id} className="relative overflow-hidden border-white/60 bg-white/80 backdrop-blur shadow-md hover:shadow-lg transition-all">
                                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 via-cyan-400/5 to-blue-400/5 pointer-events-none"></div>
                                    <CardHeader className="pb-2">
                                        <div className="flex items-start justify-between">
                                            <CardTitle className="text-lg font-bold text-slate-800">
                                                Reservation #{r.id}
                                            </CardTitle>
                                            <StatusBadge status={r.status} />
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-1 gap-2">
                                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                                <MapPin className="h-4 w-4 text-emerald-500" />
                                                <span className="font-semibold text-slate-800">Plot: {r.plot_code || r.section_name || r.plot_id || "—"}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                                <CalendarDays className="h-4 w-4 text-emerald-500" />
                                                <span>Requested On: {formatDate(r.created_at)}</span>
                                            </div>
                                        </div>

                                        {r.notes && (
                                            <div className="p-2 rounded bg-slate-50/80 text-xs text-slate-600 italic border border-slate-100">
                                                <Info className="h-3 w-3 inline mr-1 text-emerald-500" />
                                                {r.notes}
                                            </div>
                                        )}

                                        <div className="flex justify-end pt-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-2 transition-colors"
                                                onClick={() => handleCancel(r.id)}
                                                disabled={isClosed}
                                            >
                                                <X className="h-4 w-4" />
                                                Cancel Request
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
