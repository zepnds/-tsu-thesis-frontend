// src/views/visitor/components/ReservationDialog.jsx
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { toast } from "sonner";
import { Label } from "../../../components/ui/label";

// ✅ keep this import (as you requested)
import { reservePlot } from "../js/reservation";

/**
 * reserveFn (optional):
 * - if provided, it will be used instead of the default reservePlot()
 * - admin/staff pages should pass their own reserve function
 */
export default function ReservationDialog({
  open,
  onClose,
  plot,
  onSuccess,
  reserveFn, // ✅ new prop
}) {
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [applicantName, setApplicantName] = useState("");
  const [applicantContact, setApplicantContact] = useState("");
  const [applicantAddress, setApplicantAddress] = useState("");

  useEffect(() => {
    if (open) {
      setNotes("");
      setApplicantName("");
      setApplicantContact("");
      setApplicantAddress("");
    }
  }, [open]);

  const handleReserve = async () => {
    if (!plot?.id) {
      toast.error("Plot ID is missing.");
      return;
    }

    setLoading(true);
    try {
      const fn = typeof reserveFn === "function" ? reserveFn : reservePlot;

      await fn(plot.id, notes, {
        applicant_name: applicantName,
        applicant_contact: applicantContact,
        applicant_address: applicantAddress,
      });

      toast.success("Reservation submitted successfully!");
      onSuccess?.();
      onClose?.();
    } catch (error) {
      console.error("[ReservationDialog] reserve error:", error);
      toast.error(error?.message || "Failed to reserve plot.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Reserve Plot {plot?.plot_name}</DialogTitle>
          <DialogDescription>
            This will lock the plot pending approval. Add notes below (optional).
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="applicantName">Applicant Name</Label>
            <Input
              id="applicantName"
              placeholder="Full name of the person reserving"
              value={applicantName}
              onChange={(e) => setApplicantName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="applicantContact">Contact Number</Label>
              <Input
                id="applicantContact"
                placeholder="Phone or Mobile"
                value={applicantContact}
                onChange={(e) => setApplicantContact(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="applicantAddress">Address (Optional)</Label>
              <Input
                id="applicantAddress"
                placeholder="City/Municipality"
                value={applicantAddress}
                onChange={(e) => setApplicantAddress(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes / Purpose (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="e.g., Planning for family member..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleReserve}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Reservation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
