import { useState, memo } from "react";
import { QrCode, Expand, Download, Info } from "lucide-react";
import { Button } from "./ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";

/**
 * Helper to generate a QR data URL from text.
 * Requires the 'qrcode' library.
 */
export async function makeQrDataUrl(text, opts = {}) {
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

const QrPanel = memo(function QrPanel({
  title = "QR Code",
  hasToken,
  dataUrl,
  downloadName,
  hint,
  onEditToken,
}) {
  const [zoomOpen, setZoomOpen] = useState(false);

  if (!hasToken) {
    return (
      <Card className="border-slate-200 bg-white/80 backdrop-blur shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            {title}
          </CardTitle>
          <CardDescription>No QR token available.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200 bg-white/80 backdrop-blur shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            {title}
          </span>

          <div className="flex items-center gap-2">
            {onEditToken ? (
              <Button type="button" size="sm" variant="outline" onClick={onEditToken}>
                Edit QR
              </Button>
            ) : null}
          </div>
        </CardTitle>
        {hint ? <CardDescription>{hint}</CardDescription> : null}
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-3">
          <div className="relative">
            <div className="rounded-md border bg-white p-2">
              {dataUrl ? (
                <img
                  src={dataUrl}
                  alt="QR Code"
                  className="h-[140px] w-[140px] mx-auto object-contain cursor-zoom-in"
                  onClick={() => setZoomOpen(true)}
                  title="Click to enlarge"
                />
              ) : (
                <div className="h-[140px] w-[140px] mx-auto grid place-items-center text-sm text-slate-500">
                  Generating…
                </div>
              )}
            </div>

            {dataUrl ? (
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute -top-2 -right-2 h-8 w-8 shadow"
                onClick={() => setZoomOpen(true)}
                title="Enlarge"
              >
                <Expand className="h-4 w-4" />
              </Button>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {dataUrl ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const link = document.createElement("a");
                    link.href = dataUrl;
                    link.download = downloadName || "grave-qr.png";
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download QR
                </Button>
              ) : null}
            </div>

            <div className="rounded-md border bg-slate-50 p-3 text-xs text-slate-600 flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 text-slate-500" />
              <div>
                QR is generated from the current record details. Use “Edit QR” if you want a custom token.
              </div>
            </div>
          </div>
        </div>

        <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>QR Preview</DialogTitle>
              <DialogDescription>Ready to print (PNG)</DialogDescription>
            </DialogHeader>
            <div className="grid place-items-center">
              {dataUrl ? (
                <img
                  src={dataUrl}
                  alt="QR Code Large"
                  className="w-[420px] max-w-full rounded-md border bg-white p-3 object-contain"
                />
              ) : (
                <div className="w-[420px] max-w-full h-[420px] rounded-md border bg-slate-50 grid place-items-center text-sm text-slate-500">
                  Generating…
                </div>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setZoomOpen(false)}>
                Close
              </Button>
              {dataUrl ? (
                <Button
                  onClick={() => {
                    const link = document.createElement("a");
                    link.href = dataUrl;
                    link.download = downloadName || "grave-qr.png";
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              ) : null}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
});

export default QrPanel;
