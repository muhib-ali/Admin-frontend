"use client";

import * as React from "react";
import { Search, ChevronLeft, ChevronRight, Star, Trash2, CheckCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import PermissionBoundary from "@/components/permission-boundary";
import { toast } from "sonner";
import { reviewsApi, Review, Pagination } from "@/services/reviews";
import { ReviewForm } from "@/components/reviews/review-form";

import { useHasPermission } from "@/hooks/use-permission";

type ReviewStatus = "pending" | "approved" | "rejected";

type ReviewRow = {
  id: string;
  productName: string;
  productSku: string;
  customerName: string;
  customerEmail: string;
  rating: number;
  comment: string;
  status: ReviewStatus;
  isVerified: boolean;
  createdAt: string;
  reviewedBy: string | null;
};

function StatusBadge({ status }: { status: ReviewStatus }) {
  const map: Record<ReviewStatus, string> = {
    pending: "bg-amber-500/10 text-amber-700",
    approved: "bg-emerald-500/10 text-emerald-700",
    rejected: "bg-rose-500/10 text-rose-700",
  };
  return (
    <Badge variant="secondary" className={map[status]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className="text-yellow-500 text-lg">
          {i < rating ? "★" : "☆"}
        </span>
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const canApprove = useHasPermission("reviews/approve");
  const canDelete = useHasPermission("reviews/delete");

  const [reviews, setReviews] = React.useState<ReviewRow[]>([]);
  const [pagination, setPagination] = React.useState<Pagination | null>(null);
  const [loading, setLoading] = React.useState(false);

  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"All" | ReviewStatus>("All");
  const [page, setPage] = React.useState(1);
  const limit = 10;

  const [selectedReview, setSelectedReview] = React.useState<Review | null>(null);
  const [reviewFormOpen, setReviewFormOpen] = React.useState(false);

  // Check if user has any access to reviews page
  const canAccessReviews = useHasPermission("reviews/getAll");

  React.useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 400);
    return () => clearTimeout(t);
  }, [query]);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedQuery, statusFilter]);

  const fetchReviews = React.useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit, sortBy: "created_at", sortOrder: "DESC" };
      if (statusFilter !== "All") {
        params.status = statusFilter;
      }
      if (debouncedQuery) {
        params.search = debouncedQuery;
      }
      const response = await reviewsApi.getAll(params);
      if (response.status && response.data?.reviews) {
        const transformedReviews: ReviewRow[] = response.data.reviews.map((review: Review) => ({
          id: review.id,
          productName: review.product.title,
          productSku: review.product.sku,
          customerName: review.customer.fullname,
          customerEmail: review.customer.email,
          rating: review.rating,
          comment: review.comment,
          status: review.status,
          isVerified: review.is_verified_purchase,
          createdAt: new Date(review.created_at).toLocaleDateString(),
          reviewedBy: review.reviewed_by,
        }));
        setReviews(transformedReviews);
        setPagination(response.data.pagination);
      }
    } catch (error: any) {
      console.error("Failed to fetch reviews:", error);
      toast.error(error?.response?.data?.message || "Failed to fetch reviews");
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, debouncedQuery]);

  React.useEffect(() => {
    if (mounted) {
      fetchReviews();
    }
  }, [mounted, fetchReviews]);

  const handleApproveClick = async (reviewId: string) => {
    try {
      const response = await reviewsApi.getById(reviewId);
      if (response.status && response.data) {
        setSelectedReview(response.data);
        setReviewFormOpen(true);
      }
    } catch (error: any) {
      console.error("Failed to fetch review:", error);
      toast.error(error?.response?.data?.message || "Failed to fetch review details");
    }
  };

  const handleApproveSubmit = async (data: { status: "approved" | "rejected"; rejection_reason?: string }) => {
    if (!selectedReview) return;

    try {
      const response = await reviewsApi.approve(selectedReview.id, data);
      if (response.status) {
        toast.success(response.message || `Review ${data.status} successfully`);
        fetchReviews();
      }
    } catch (error: any) {
      console.error("Failed to update review:", error);
      toast.error(error?.response?.data?.message || "Failed to update review");
      throw error;
    }
  };

  const handleDeleteClick = async (reviewId: string) => {
    if (window.confirm("Are you sure you want to delete this review? This action cannot be undone.")) {
      try {
        const response = await reviewsApi.delete(reviewId);
        if (response.status) {
          toast.success(response.message || "Review deleted successfully");
          fetchReviews();
        }
      } catch (error: any) {
        console.error("Failed to delete review:", error);
        toast.error(error?.response?.data?.message || "Failed to delete review");
      }
    }
  };

  const handlePrevPage = () => {
    if (pagination?.hasPrev) {
      setPage((p) => p - 1);
    }
  };

  const handleNextPage = () => {
    if (pagination?.hasNext) {
      setPage((p) => p + 1);
    }
  };

  if (!mounted) {
    return null;
  }

  // Redirect or show unauthorized if no access
  if (!canAccessReviews) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900">Access Denied</h2>
          <p className="mt-2 text-gray-600">You don't have permission to access reviews.</p>
        </div>
      </div>
    );
  }

  return (
    <PermissionBoundary screen="/dashboard/reviews">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reviews</h1>
            <p className="text-muted-foreground">
              Manage customer reviews and ratings
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search reviews..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select
                  value={statusFilter}
                  onValueChange={(val) => setStatusFilter(val as "All" | ReviewStatus)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Comment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          Loading reviews...
                        </TableCell>
                      </TableRow>
                    ) : reviews.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          No reviews found
                        </TableCell>
                      </TableRow>
                    ) : (
                      reviews.map((review) => (
                        <TableRow key={review.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{review.productName}</div>
                              <div className="text-sm text-muted-foreground">
                                {review.productSku}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{review.customerName}</div>
                              <div className="text-sm text-muted-foreground">
                                {review.customerEmail}
                              </div>
                              {review.isVerified && (
                                <Badge variant="outline" className="mt-1 text-xs">
                                  Verified Purchase
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <StarRating rating={review.rating} />
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <p className="truncate text-sm">{review.comment}</p>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={review.status} />
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {review.createdAt}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {review.status === "pending" && canApprove && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleApproveClick(review.id)}
                                  disabled={!canApprove}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Review
                                </Button>
                              )}
                              {canDelete && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteClick(review.id)}
                                  disabled={!canDelete}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {pagination && pagination.total > 0 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                    {pagination.total} reviews
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrevPage}
                      disabled={!pagination.hasPrev || loading}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      <span className="text-sm">
                        Page {pagination.page} of {pagination.totalPages}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextPage}
                      disabled={!pagination.hasNext || loading}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <ReviewForm
        review={selectedReview}
        open={reviewFormOpen}
        onOpenChange={setReviewFormOpen}
        onSubmit={handleApproveSubmit}
      />
    </PermissionBoundary>
  );
}
