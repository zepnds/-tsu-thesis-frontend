// frontend/src/views/admin/pages/BurialRecords.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getAuth } from "../../../utils/auth";
import { Toaster, toast } from "sonner";
import QrPanel from "../../../components/QrPanel";
import { CEMETERY_CENTER } from "../../../components/map/CemeteryMap";

import {
  RefreshCcw,
  Search,
  Loader2,
  XCircle,
  MapPin,
  Info,
  RotateCcw,
  QrCode,
  Pencil,
  Trash2,
  Download,
  Copy,
  Save,
  Plus,
} from "lucide-react";

// shadcn/ui
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { Badge } from "../../../components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../../../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../../components/ui/dialog";
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from "../../../components/ui/alert";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../../../components/ui/select";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) ||
  "/api";

/* ---------------- small debounce hook ---------------- */
function useDebouncedValue(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return debounced;
}

/* ---------------- utils ---------------- */
function formatDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function toDateInputValue(v) {
  if (!v) return "";
  const s = String(v).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function formatPrice(v) {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function extractList(body) {
  if (Array.isArray(body)) return body;

  const candidates = [
    body?.data,
    body?.data?.rows,
    body?.data?.records,
    body?.records,
    body?.rows,
    body?.result,
  ];

  for (const c of candidates) {
    if (Array.isArray(c)) return c;
  }
  return [];
}

const safeLower = (v) => String(v || "").toLowerCase();

function isTruthyStr(v) {
  return v != null && String(v).trim() !== "";
}

function statusBadgeProps(statusRaw) {

  const s = safeLower(statusRaw);
  console.log(s);
  switch (s) {
    case "occupied":
    case "active":
      return {
        label: "Occupied",
        className: "bg-emerald-600 hover:bg-emerald-600",
      };
    case "reserved":
      return {
        label: "Reserved",
        className: "bg-amber-500 hover:bg-amber-500",
      };
    case "available":
      return {
        label: "Available",
        className: "bg-sky-500 hover:bg-sky-500",
      };
    case "maintenance":
      return {
        label: "Maintenance",
        className: "bg-rose-500 hover:bg-rose-500",
      };
    default:
      // Handle legacy boolean activity
      if (statusRaw === true) {
        return {
          label: "Active",
          className: "bg-emerald-600 hover:bg-emerald-600",
        };
      }
      return {
        label: statusRaw || "—",
        className: "bg-slate-500 hover:bg-slate-500",
      };
  }
}

function normalizePlotRow(r) {
  if (!r) return null;

  // Handle nested structure { plot, grave } from admin/plot/:id
  const data = (r.plot || r.grave) ? { ...r, ...r.plot, ...r.grave } : r;

  const status = data?.status ?? data?.plot_status ?? data?.plotStatus ?? null;

  const person_full_name =
    data?.deceased_name ??
    data?.person_full_name ??
    data?.personFullName ??
    data?.deceasedName ??
    null;

  const date_of_birth =
    data?.date_of_birth ?? data?.dateOfBirth ?? data?.birth_date ?? data?.birthDate ?? null;

  const date_of_death =
    data?.date_of_death ?? data?.dateOfDeath ?? data?.death_date ?? data?.deathDate ?? null;

  // Ensure id refers to the plot ID for endpoint compatibility
  const id = data?.plot_id ?? data?.id ?? null;
  const uid = data?.uid ?? data?.plot_uid ?? data?.plotUid ?? null;

  const plot_name =
    data?.plot_name ??
    data?.plotName ??
    data?.plot_code ??
    data?.plotCode ??
    data?.name ??
    null;

  const plot_code = data?.plot_code ?? data?.plotCode ?? null;

  const qr_token =
    data?.qr_token ??
    data?.qrToken ??
    data?.qr ??
    data?.qr_value ??
    data?.qrValue ??
    null;

  return {
    ...data,
    id,
    plot_id: data?.plot_id ?? data?.id ?? null,
    uid,
    status,
    person_full_name,
    date_of_birth,
    date_of_death,
    plot_name,
    plot_code,
    qr_token,
  };
}

function extractPlotRows(body) {
  if (body?.type === "FeatureCollection" && Array.isArray(body?.features)) {
    return body.features.map((f) =>
      normalizePlotRow({
        ...(f?.properties || {}),
        geometry: f?.geometry || null,
      })
    );
  }

  if (Array.isArray(body)) return body.map(normalizePlotRow);

  const arr = extractList(body);
  if (Array.isArray(arr) && arr.length) return arr.map(normalizePlotRow);

  return [];
}

function parseNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function getCentroid(coordinates) {
  if (!coordinates) return null;
  try {
    const geo = typeof coordinates === "string" ? JSON.parse(coordinates) : coordinates;
    if (geo.type === "Polygon" && geo.coordinates?.[0]) {
      const pts = geo.coordinates[0];
      let latSum = 0,
        lngSum = 0;
      pts.forEach((p) => {
        lngSum += p[0];
        latSum += p[1];
      });
      return { lat: latSum / pts.length, lng: lngSum / pts.length };
    }
    if (geo.type === "Point" && geo.coordinates) {
      return { lat: geo.coordinates[1], lng: geo.coordinates[0] };
    }
  } catch (e) {
    console.warn("Failed to parse coordinates for centroid:", e);
  }
  return null;
}

function getLatLngFromRow(row) {
  if (!row) return null;

  // 1. Try direct properties
  let lat = row.lat ?? row.latitude;
  let lng = row.lng ?? row.longitude;

  // 2. Try nested plot object
  if (lat == null && row.plot) {
    lat = row.plot.lat ?? row.plot.latitude;
    lng = row.plot.lng ?? row.plot.longitude;
  }

  // 3. Try geometry or coordinates fields
  if (lat == null) {
    const geomSource = row.geometry ?? row.coordinates ?? row.plot?.geometry ?? row.plot?.coordinates;
    if (geomSource) {
      const centroid = getCentroid(geomSource);
      if (centroid) {
        lat = centroid.lat;
        lng = centroid.lng;
      }
    }
  }

  lat = parseNum(lat);
  lng = parseNum(lng);

  if (lat == null || lng == null) return null;
  return { lat, lng };
}

function buildAutoQrTokenFromRow(row) {
  if (!row) return "";
  const coords = getLatLngFromRow(row);

  const payload = {
    _type: "grave",
    id: row.id ?? null,
    uid: row.uid ?? null,
    plot_name: row.plot_name ?? null,
    plot_type: row.plot_type ?? null,
    status: row.status ?? null,
    price: row.price ?? null,
    person_full_name: row.person_full_name ?? null,
    date_of_birth: row.date_of_birth ?? null,
    date_of_death: row.date_of_death ?? null,
    photo_url: row.photo_url ?? null,
    lat: coords?.lat ?? CEMETERY_CENTER.lat,
    lng: coords?.lng ?? CEMETERY_CENTER.lng,
  };

  return JSON.stringify(payload);
}

function resolveQrText(row) {
  if (!row) return "";
  const direct =
    row.qr_token ??
    row.qr_value ??
    row.qr_data ??
    row.qr ??
    row.qrUrl ??
    row.qr_url ??
    row.qrText ??
    row.qr_text;

  if (direct && String(direct).trim()) return String(direct).trim();
  return buildAutoQrTokenFromRow(row);
}

async function makeQrDataUrl(text, opts = {}) {
  const mod = await import("qrcode");
  const toDataURL = mod.toDataURL || mod.default?.toDataURL;
  if (typeof toDataURL !== "function")
    throw new Error("qrcode.toDataURL not available");

  return await toDataURL(text, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 320,
    ...opts,
  });
}

function sanitizeFilename(s) {
  return String(s || "plot")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

export default function BurialRecords() {
  const auth = getAuth();
  const token = auth?.token;

  const authHeader = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : {}),
    [token]
  );

  const ENDPOINTS = useMemo(
    () => ({
      listPlots: `${API_BASE}/admin/graves`,
      plotDetails: (idOrUid) =>
        `${API_BASE}/admin/plot/${encodeURIComponent(idOrUid)}`,
      editPlot: `${API_BASE}/admin/edit-plot`,
      deletePlot: (idOrUid) =>
        `${API_BASE}/admin/delete-plot/${encodeURIComponent(idOrUid)}`,
      addBurialRecord: `${API_BASE}/admin/burial-records`,
      listAllPlots: `${API_BASE}/admin/plots`,
    }),
    []
  );

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [qInput, setQInput] = useState("");
  const q = useDebouncedValue(qInput, 180);

  const [deceasedOnly, setDeceasedOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [open, setOpen] = useState(false);
  const [detailsBusy, setDetailsBusy] = useState(false);
  const [detailsErr, setDetailsErr] = useState("");
  const [details, setDetails] = useState(null);

  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editDraft, setEditDraft] = useState(null);

  // --- Create Modal State ---
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [allPlots, setAllPlots] = useState([]);
  const [plotsLoading, setPlotsLoading] = useState(false);
  const [createDraft, setCreateDraft] = useState({
    plot_id: "",
    deceased_name: "",
    birth_date: "",
    death_date: "",
    burial_date: "",
    burial_time: "",
    family_contact: "",
    epitaph: "",
    headstone_type: "",
    memorial_text: "",
  });

  const fetchAny = useCallback(
    async (url, opts = {}) => {
      const res = await fetch(url, {
        ...opts,
        headers: {
          ...authHeader,
          Accept: "application/json",
          ...(opts.headers || {}),
        },
      });

      const ct = res.headers.get("content-type") || "";
      const body = ct.includes("application/json")
        ? await res.json().catch(() => ({}))
        : await res.text().catch(() => "");

      if (!res.ok) {
        const msg =
          typeof body === "string"
            ? body
            : body?.error || body?.message || JSON.stringify(body);
        throw new Error(msg || `HTTP ${res.status}`);
      }

      return body;
    },
    [authHeader]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const body = await fetchAny(ENDPOINTS.listPlots);
      const list = extractPlotRows(body);
      setRows(Array.isArray(list) ? list : []);
    } catch (e) {
      setRows([]);
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, [ENDPOINTS.listPlots, fetchAny]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase();

    return (rows || [])
      .filter((r) => {
        if (deceasedOnly && !isTruthyStr(r?.person_full_name)) return false;

        const s = safeLower(r?.status);
        if (statusFilter !== "all" && s !== safeLower(statusFilter)) return false;

        return true;
      })
      .filter((r) => {
        if (!text) return true;

        const bag = [
          r?.id,
          r?.uid,
          r?.plot_name,
          r?.plot_code,
          r?.plot_type,
          r?.status,
          r?.person_full_name,
          r?.date_of_birth,
          r?.date_of_death,
          r?.next_of_kin_name,
          r?.contact_phone,
          r?.contact_email,
          r?.notes,
          r?.qr_token,
        ]
          .filter((v) => v != null)
          .map((v) => String(v).toLowerCase())
          .join(" ");

        return bag.includes(text);
      });
  }, [rows, q, deceasedOnly, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [q, pageSize, deceasedOnly, statusFilter]);

  const totalPages = useMemo(() => {
    const n = Math.ceil((filtered?.length || 0) / pageSize);
    return n > 0 ? n : 1;
  }, [filtered, pageSize]);

  useEffect(() => {
    setPage((p) => {
      if (p < 1) return 1;
      if (p > totalPages) return totalPages;
      return p;
    });
  }, [totalPages]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return (filtered || []).slice(start, end);
  }, [filtered, page, pageSize]);

  const showingRange = useMemo(() => {
    const total = filtered.length;
    if (!total) return { from: 0, to: 0, total: 0 };
    const from = (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, total);
    return { from, to, total };
  }, [filtered.length, page, pageSize]);

  const openDetails = useCallback(
    async (row) => {

      const idOrUid = row?.plot_id
      if (!idOrUid) return;

      setOpen(true);
      setEditMode(false);
      setDetails(null);
      setEditDraft(null);
      setDetailsErr("");
      setDetailsBusy(true);

      try {
        const body = await fetchAny(ENDPOINTS.plotDetails(idOrUid));
        const normalized = normalizePlotRow(body);
        setDetails(normalized);
        setEditDraft({
          id: normalized?.id ?? "",
          uid: normalized?.uid ?? "",
          plot_name: normalized?.plot_name ?? "",
          status: normalized?.status ?? "",
          price:
            normalized?.price === null || normalized?.price === undefined
              ? ""
              : String(normalized.price),
          person_full_name: normalized?.person_full_name ?? "",
          date_of_birth: toDateInputValue(normalized?.date_of_birth),
          date_of_death: toDateInputValue(normalized?.date_of_death),
          burial_date: toDateInputValue(normalized?.burial_date),
          burial_time: normalized?.burial_time ?? "",
          next_of_kin_name: normalized?.next_of_kin_name ?? "",
          contact_phone: normalized?.contact_phone ?? "",
          contact_email: normalized?.contact_email ?? "",
          notes: normalized?.notes ?? "",
          qr_token: normalized?.qr_token ?? "",
          lat: normalized?.lat ?? null,
          lng: normalized?.lng ?? null,
          geometry: normalized?.geometry ?? null,
          coordinates: normalized?.coordinates ?? null,
        });
      } catch (e) {
        setDetailsErr(String(e?.message || e));
      } finally {
        setDetailsBusy(false);
      }
    },
    [ENDPOINTS, fetchAny]
  );

  const resetFilters = () => {
    setQInput("");
    setDeceasedOnly(false);
    setStatusFilter("all");
    setPageSize(25);
    setPage(1);
  };

  const detailsView = useMemo(() => (editMode ? editDraft : details), [
    details,
    editDraft,
    editMode,
  ]);

  const qrText = useMemo(() => resolveQrText(detailsView), [detailsView]);

  const [qrDataUrl, setQrDataUrl] = useState("");
  useEffect(() => {
    if (!qrText) {
      setQrDataUrl("");
      return;
    }
    makeQrDataUrl(qrText)
      .then(setQrDataUrl)
      .catch((e) => {
        console.warn("makeQrDataUrl failed:", e);
        setQrDataUrl("");
      });
  }, [qrText]);


  const handleDraftChange = (field, value) => {
    setEditDraft((prev) => ({ ...(prev || {}), [field]: value }));
  };

  const handleSave = async () => {
    if (!editDraft?.id) return;

    setSaving(true);
    try {
      const payload = {
        id: editDraft.id,
        plot_name: String(editDraft.plot_name || "").trim() || null,
        status: String(editDraft.status || "").trim() || null,
        price:
          String(editDraft.price || "").trim() === ""
            ? null
            : Number(editDraft.price),
        person_full_name: String(editDraft.person_full_name || "").trim() || null,
        date_of_birth: String(editDraft.date_of_birth || "").trim() || null,
        date_of_death: String(editDraft.date_of_death || "").trim() || null,
        burial_date: String(editDraft.burial_date || "").trim() || null,
        burial_time: String(editDraft.burial_time || "").trim() || null,
        next_of_kin_name: String(editDraft.next_of_kin_name || "").trim() || null,
        contact_phone: String(editDraft.contact_phone || "").trim() || null,
        contact_email: String(editDraft.contact_email || "").trim() || null,
        notes: String(editDraft.notes || ""),
        qr_token: String(editDraft.qr_token || "").trim() || null,
      };

      const body = await fetchAny(ENDPOINTS.editPlot, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const updated = normalizePlotRow(body);
      setDetails((prev) => normalizePlotRow({ ...(prev || {}), ...(updated || payload) }));
      setEditDraft((prev) => ({ ...(prev || {}), ...(updated || payload) }));
      setEditMode(false);
      toast.success("Burial record updated.");
      await load();
    } catch (e) {
      toast.error(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const idOrUid = details?.id ?? details?.uid;
    if (!idOrUid) return;

    const ok = window.confirm(
      "Are you sure you want to delete this plot record?\\n\\nThis uses the plot delete endpoint and may fail if the plot is referenced by graves or other records."
    );
    if (!ok) return;

    setDeleting(true);
    try {
      await fetchAny(ENDPOINTS.deletePlot(idOrUid), { method: "DELETE" });
      toast.success("Plot record deleted.");
      setOpen(false);
      setDetails(null);
      setEditDraft(null);
      setEditMode(false);
      await load();
    } catch (e) {
      toast.error(String(e?.message || e));
    } finally {
      setDeleting(false);
    }
  };

  const fetchPlots = async () => {
    setPlotsLoading(true);
    try {
      const body = await fetchAny(ENDPOINTS.listAllPlots);
      const list = extractPlotRows(body);
      setAllPlots(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error("Failed to fetch plots:", e);
      toast.error("Failed to load plots for selection.");
    } finally {
      setPlotsLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setCreateDraft({
      plot_id: "",
      deceased_name: "",
      birth_date: "",
      death_date: "",
      burial_date: "",
      family_contact: "",
      epitaph: "",
      headstone_type: "",
      memorial_text: "",
    });
    setCreateOpen(true);
    fetchPlots();
  };

  const handleCreateDraftChange = (field, value) => {
    setCreateDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    if (!createDraft.plot_id || !createDraft.deceased_name) {
      toast.error("Plot and Deceased Name are required.");
      return;
    }

    setCreating(true);
    try {
      await fetchAny(ENDPOINTS.addBurialRecord, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createDraft),
      });

      toast.success("Burial record created successfully.");
      setCreateOpen(false);
      load();
    } catch (e) {
      toast.error(String(e?.message || e));
    } finally {
      setCreating(false);
    }
  };

  const handleCopyQr = () => {
    // Handled by QrPanel
  };


  return (
    <div className="p-6 space-y-6">
      <Toaster richColors expand={false} />

      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Burial Records (from Plots)</h1>
          <p className="text-sm text-muted-foreground">
            This list is loaded from plots and shows deceased data, dates, and QR details.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={resetFilters} title="Reset filters">
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>

          <Button variant="outline" onClick={load} disabled={loading} title="Refresh">
            <RefreshCcw
              className={["mr-2 h-4 w-4", loading ? "animate-spin" : ""].join(" ")}
            />
            Refresh
          </Button>

          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleOpenCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Record
          </Button>
        </div>
      </div>

      {err ? (
        <Alert variant="destructive" className="border-rose-200">
          <AlertTitle className="flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            Failed to load plots
          </AlertTitle>
          <AlertDescription className="break-words">{err}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-end lg:justify-between">
            <div className="space-y-1">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  value={qInput}
                  onChange={(e) => setQInput(e.target.value)}
                  placeholder="Search by deceased name, plot name, id, uid, status…"
                  className="pl-9 w-[520px] max-w-full"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3 justify-between lg:justify-end">




              <div className="min-w-[160px]">
                <Label className="text-xs text-slate-500">Rows per page</Label>
                <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Rows" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="text-sm text-slate-600">
                {showingRange.total ? (
                  <>
                    Showing <span className="font-medium">{showingRange.from}</span>–
                    <span className="font-medium">{showingRange.to}</span> of{" "}
                    <span className="font-medium">{showingRange.total}</span>
                  </>
                ) : (
                  <>Showing 0 of 0</>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-slate-500">
              Page <span className="font-medium">{page}</span> of{" "}
              <span className="font-medium">{totalPages}</span>
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setPage(1)} disabled={page <= 1}>
                First
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Prev
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage(totalPages)}
                disabled={page >= totalPages}
              >
                Last
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/80 backdrop-blur border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Plots list</CardTitle>
          <CardDescription className="text-sm text-slate-600">
            Tip: Switch Show → Deceased only to focus on filled burial records.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : !filtered.length ? (
            <div className="text-sm text-slate-600 space-y-2">
              <div>No rows found.</div>
              <div className="text-xs text-slate-500">
                Current filters: Show = <b>{deceasedOnly ? "Deceased only" : "All plots"}</b>, Status ={" "}
                <b>{statusFilter}</b>, Search = <b>{q.trim() || "—"}</b>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={resetFilters}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset filters
                </Button>
                <Button size="sm" variant="outline" onClick={load}>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Reload
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plot ID</TableHead>
                    <TableHead>Plot</TableHead>

                    <TableHead>Deceased</TableHead>
                    <TableHead>DOB</TableHead>
                    <TableHead>DOD</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {paged.map((r) => {
                    const key = String(r?.id ?? r?.uid ?? Math.random());
                    const s = statusBadgeProps(r?.status);

                    return (
                      <TableRow key={key}>
                        <TableCell className="font-medium">
                          {r?.id ?? "—"}
                          {isTruthyStr(r?.uid) ? (
                            <div className="text-xs text-slate-500">uid: {String(r.uid)}</div>
                          ) : null}
                        </TableCell>

                        <TableCell>
                          <div className="text-sm font-medium text-slate-900">
                            {r?.plot_name ?? r?.plot_code ?? ""}
                          </div>
                          {isTruthyStr(r?.uid) ? (
                            <div className="text-xs text-slate-500 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              PLOT ID: {String(r.plot_id)}
                            </div>
                          ) : null}
                        </TableCell>



                        <TableCell>
                          <div className="text-sm font-medium text-slate-900">
                            {r?.deceased_name ?? "—"}
                          </div>
                        </TableCell>

                        <TableCell className="text-sm">
                          {formatDate(r?.date_of_birth)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(r?.date_of_death)}
                        </TableCell>

                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => openDetails(r)}>
                            <Info className="mr-2 h-4 w-4" />
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) {
            setDetails(null);
            setDetailsErr("");
            setDetailsBusy(false);
            setEditMode(false);
            setEditDraft(null);
            setSaving(false);
            setDeleting(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-[980px] max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{editMode ? "Edit Burial Record Details" : "Plot Details"}</DialogTitle>
            <DialogDescription>
              Loaded from the admin plot endpoints.
            </DialogDescription>
          </DialogHeader>

          {detailsErr ? (
            <Alert variant="destructive" className="border-rose-200">
              <AlertTitle className="flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Failed to load details
              </AlertTitle>
              <AlertDescription className="break-words">{detailsErr}</AlertDescription>
            </Alert>
          ) : null}

          {detailsBusy ? (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading details…
            </div>
          ) : detailsView ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 justify-end">
                {!editMode ? (
                  <Button type="button" variant="outline" onClick={() => setEditMode(true)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                ) : (
                  <Button type="button" variant="outline" onClick={() => {
                    setEditMode(false);
                    setEditDraft({
                      id: details?.id ?? "",
                      uid: details?.uid ?? "",
                      plot_name: details?.plot_name ?? "",
                      status: details?.status ?? "",
                      price:
                        details?.price === null || details?.price === undefined
                          ? ""
                          : String(details.price),
                      person_full_name: details?.person_full_name ?? "",
                      date_of_birth: toDateInputValue(details?.date_of_birth),
                      date_of_death: toDateInputValue(details?.date_of_death),
                      next_of_kin_name: details?.next_of_kin_name ?? "",
                      contact_phone: details?.contact_phone ?? "",
                      contact_email: details?.contact_email ?? "",
                      notes: details?.notes ?? "",
                      qr_token: details?.qr_token ?? "",
                    });
                  }}>
                    Cancel edit
                  </Button>
                )}

                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleting || saving}
                >
                  {deleting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Delete
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-md border p-3 bg-white">
                  <Label className="text-xs text-slate-500">Plot Name</Label>
                  {editMode ? (
                    <Input
                      className="mt-2"
                      value={editDraft?.plot_name ?? ""}
                      onChange={(e) => handleDraftChange("plot_name", e.target.value)}
                    />
                  ) : (
                    <div className="font-medium mt-1">{detailsView?.plot_name ?? "—"}</div>
                  )}
                </div>

                <div className="rounded-md border p-3 bg-white">
                  <Label className="text-xs text-slate-500">Status</Label>
                  {editMode ? (
                    <Select
                      value={String(editDraft?.status || "available")}
                      onValueChange={(v) => handleDraftChange("status", v)}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="reserved">Reserved</SelectItem>
                        <SelectItem value="occupied">Occupied</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="mt-2">
                      {(() => {
                        const s = statusBadgeProps(detailsView?.status);
                        return <Badge className={s.className}>{s.label}</Badge>;
                      })()}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-md border p-3 bg-white">
                <Label className="text-xs text-slate-500">Deceased Name</Label>
                {editMode ? (
                  <Input
                    className="mt-2"
                    value={editDraft?.person_full_name ?? ""}
                    onChange={(e) =>
                      handleDraftChange("person_full_name", e.target.value)
                    }
                  />
                ) : (
                  <div className="font-medium mt-1">
                    {detailsView?.person_full_name ?? "—"}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-md border p-3 bg-white">
                  <Label className="text-xs text-slate-500">Date of Birth</Label>
                  {editMode ? (
                    <Input
                      className="mt-2"
                      type="date"
                      value={editDraft?.date_of_birth ?? ""}
                      onChange={(e) => handleDraftChange("date_of_birth", e.target.value)}
                    />
                  ) : (
                    <div className="font-medium mt-1">
                      {formatDate(detailsView?.date_of_birth)}
                    </div>
                  )}
                </div>

                <div className="rounded-md border p-3 bg-white">
                  <Label className="text-xs text-slate-500">Date of Death</Label>
                  {editMode ? (
                    <Input
                      className="mt-2"
                      type="date"
                      value={editDraft?.date_of_death ?? ""}
                      onChange={(e) => handleDraftChange("date_of_death", e.target.value)}
                    />
                  ) : (
                    <div className="font-medium mt-1">
                      {formatDate(detailsView?.date_of_death)}
                    </div>
                  )}
                </div>

                <div className="rounded-md border p-3 bg-white">
                  <Label className="text-xs text-slate-500">Burial Date</Label>
                  {editMode ? (
                    <Input
                      className="mt-2"
                      type="date"
                      value={editDraft?.burial_date ?? ""}
                      onChange={(e) => handleDraftChange("burial_date", e.target.value)}
                    />
                  ) : (
                    <div className="font-medium mt-1">
                      {formatDate(detailsView?.burial_date)}
                    </div>
                  )}
                </div>

                <div className="rounded-md border p-3 bg-white">
                  <Label className="text-xs text-slate-500">Burial Time</Label>
                  {editMode ? (
                    <Input
                      className="mt-2"
                      placeholder="e.g. 10:00 AM"
                      value={editDraft?.burial_time ?? ""}
                      onChange={(e) => handleDraftChange("burial_time", e.target.value)}
                    />
                  ) : (
                    <div className="font-medium mt-1">
                      {detailsView?.burial_time || "—"}
                    </div>
                  )}
                </div>

                <div className="rounded-md border p-3 bg-white">
                  <Label className="text-xs text-slate-500">Price</Label>
                  {editMode ? (
                    <Input
                      className="mt-2"
                      inputMode="decimal"
                      value={editDraft?.price ?? ""}
                      onChange={(e) => handleDraftChange("price", e.target.value)}
                    />
                  ) : (
                    <div className="font-medium mt-1">
                      {formatPrice(detailsView?.price)}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-md border p-3 bg-white">
                  <Label className="text-xs text-slate-500">Next of Kin</Label>
                  {editMode ? (
                    <Input
                      className="mt-2"
                      value={editDraft?.next_of_kin_name ?? ""}
                      onChange={(e) =>
                        handleDraftChange("next_of_kin_name", e.target.value)
                      }
                    />
                  ) : (
                    <div className="font-medium mt-1">
                      {detailsView?.next_of_kin_name ?? "—"}
                    </div>
                  )}
                </div>

                <div className="rounded-md border p-3 bg-white">
                  <Label className="text-xs text-slate-500">Contact Phone</Label>
                  {editMode ? (
                    <Input
                      className="mt-2"
                      value={editDraft?.contact_phone ?? ""}
                      onChange={(e) =>
                        handleDraftChange("contact_phone", e.target.value)
                      }
                    />
                  ) : (
                    <div className="font-medium mt-1">
                      {detailsView?.contact_phone ?? "—"}
                    </div>
                  )}
                </div>

                <div className="rounded-md border p-3 bg-white">
                  <Label className="text-xs text-slate-500">Contact Email</Label>
                  {editMode ? (
                    <Input
                      className="mt-2"
                      value={editDraft?.contact_email ?? ""}
                      onChange={(e) =>
                        handleDraftChange("contact_email", e.target.value)
                      }
                    />
                  ) : (
                    <div className="font-medium mt-1">
                      {detailsView?.contact_email ?? "—"}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-md border p-3 bg-white">
                <Label className="text-xs text-slate-500">Notes</Label>
                {editMode ? (
                  <Textarea
                    className="mt-2 min-h-[100px]"
                    value={editDraft?.notes ?? ""}
                    onChange={(e) => handleDraftChange("notes", e.target.value)}
                  />
                ) : (
                  <div className="whitespace-pre-wrap mt-1">
                    {detailsView?.notes ?? "—"}
                  </div>
                )}
              </div>



              <div className="mt-4">
                <QrPanel
                  title="Grave QR Code"
                  hasToken={Boolean(qrText)}
                  dataUrl={qrDataUrl}
                  downloadName={`grave-qr-${sanitizeFilename(detailsView?.plot_name || detailsView?.id || "plot")}.png`}
                  hint="Print this QR and place it on the grave marker."
                // onEditToken could be added if needed, but for now we follow the simple version
                />
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-600">No details.</div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">


            {editMode ? (
              <Button
                type="button"
                onClick={handleSave}
                disabled={saving || deleting}
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save changes
              </Button>
            ) : (
              <Button type="button" onClick={load} disabled={loading}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Refresh list
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- Create Burial Record Modal --- */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Burial Record</DialogTitle>
            <DialogDescription>
              Add a new deceased record and link it to an available plot.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Select Plot *</Label>
                <Select
                  value={createDraft.plot_id}
                  onValueChange={(v) => handleCreateDraftChange("plot_id", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={plotsLoading ? "Loading plots..." : "Choose a plot"} />
                  </SelectTrigger>
                  <SelectContent>
                    {allPlots
                      .filter((p) => p.status === "available" || p.status === null)
                      .map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.plot_name || p.plot_code || `Plot ${p.id}`} ({p.status || "available"})
                        </SelectItem>
                      ))}
                    {allPlots.filter((p) => p.status === "available" || p.status === null).length === 0 && !plotsLoading && (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        No available plots found
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Deceased Name *</Label>
                <Input
                  placeholder="Full Name"
                  value={createDraft.deceased_name}
                  onChange={(e) => handleCreateDraftChange("deceased_name", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input
                  type="date"
                  value={createDraft.birth_date}
                  onChange={(e) => handleCreateDraftChange("birth_date", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Date of Death</Label>
                <Input
                  type="date"
                  value={createDraft.death_date}
                  onChange={(e) => handleCreateDraftChange("death_date", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Burial Date</Label>
                <Input
                  type="date"
                  value={createDraft.burial_date}
                  onChange={(e) => handleCreateDraftChange("burial_date", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Burial Time</Label>
                <Input
                  placeholder="e.g. 10:00 AM"
                  value={createDraft.burial_time}
                  onChange={(e) => handleCreateDraftChange("burial_time", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Family Contact / Next of Kin</Label>
              <Input
                placeholder="Name or Phone"
                value={createDraft.family_contact}
                onChange={(e) => handleCreateDraftChange("family_contact", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Headstone Type</Label>
                <Input
                  placeholder="e.g. Marble, Granite"
                  value={createDraft.headstone_type}
                  onChange={(e) => handleCreateDraftChange("headstone_type", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Epitaph</Label>
                <Input
                  placeholder="Short inscription"
                  value={createDraft.epitaph}
                  onChange={(e) => handleCreateDraftChange("epitaph", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Memorial Text / Notes</Label>
              <Textarea
                placeholder="Additional details..."
                className="min-h-[80px]"
                value={createDraft.memorial_text}
                onChange={(e) => handleCreateDraftChange("memorial_text", e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleCreate}
              disabled={creating}
            >
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Record"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
