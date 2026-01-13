"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Review } from "@/services/reviews";

interface ReviewFormProps {
  review: Review | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { status: "approved" | "rejected"; rejection_reason?: string }) => Promise<void>;
}

export function ReviewForm({ review, open, onOpenChange, onSubmit }: ReviewFormProps) {
  const [status, setStatus] = React.useState<"approved" | "rejected">("approved");
  const [rejectionReason, setRejectionReason] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open && review) {
      setStatus("approved");
      setRejectionReason("");
    }
  }, [open, review]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (status === "rejected" && !rejectionReason.trim()) {
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        status,
        rejection_reason: status === "rejected" ? rejectionReason : undefined,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to submit review:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!review) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Review Action</DialogTitle>
            <DialogDescription>
              Approve or reject this review from {review.customer.fullname}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Product</Label>
              <p className="text-sm text-muted-foreground">
                {review.product.title} ({review.product.sku})
              </p>
            </div>

            <div className="space-y-2">
              <Label>Customer</Label>
              <p className="text-sm text-muted-foreground">
                {review.customer.fullname} ({review.customer.email})
              </p>
            </div>

            <div className="space-y-2">
              <Label>Rating</Label>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className="text-yellow-500">
                    {i < review.rating ? "★" : "☆"}
                  </span>
                ))}
                <span className="ml-2 text-sm text-muted-foreground">
                  ({review.rating}/5)
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Comment</Label>
              <p className="text-sm text-muted-foreground border rounded-md p-3 bg-muted/50">
                {review.comment}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Action *</Label>
              <Select value={status} onValueChange={(val) => setStatus(val as "approved" | "rejected")}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Approve</SelectItem>
                  <SelectItem value="rejected">Reject</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {status === "rejected" && (
              <div className="space-y-2">
                <Label htmlFor="rejection_reason">Rejection Reason *</Label>
                <Textarea
                  id="rejection_reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please provide a reason for rejecting this review..."
                  rows={3}
                  required
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
