"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";

import Image from "next/image";
import PermissionBoundary from "@/components/permission-boundary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STORAGE_KEY = "admin_portal_static_products_v1";

type BulkPricingRow = { id: string; quantity: string; price: string };

type StoredMediaItem = {
  id: string;
  kind: "image" | "video";
  name: string;
  type: string;
  url: string;
};

type StoredProduct = {
  id: string;
  title: string;
  description: string;
  price: number;
  stock_quantity: number;
  category_id: string;
  brand_id: string;
  currency: string;
  product_img_url?: string | null;
  sku?: string | null;
  is_active: boolean;
  supplier_id?: string;
  tax_id?: string;
  warehouse_id?: string;
  visibility_wholesale?: boolean;
  visibility_retail?: boolean;

  selling_price?: string;
  cost?: string;
  freight?: string;
  discount?: string;
  start_discount_date?: string;
  end_discount_date?: string;
  total_price?: string;
  bulk_pricing?: BulkPricingRow[];

  weight?: string;
  length?: string;
  width?: string;
  height?: string;

  customer_groups?: { cvg_ids: string[] };
  variants?: {
    options: string[];
    selected: Record<string, boolean>;
    values: Record<string, string>;
  };

  media?: StoredMediaItem[];
  created_at: string;
  category?: { id: string; name: string };
  brand?: { id: string; name: string };
};

function safeNumber(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function readProducts(): StoredProduct[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as StoredProduct[]) : [];
  } catch {
    return [];
  }
}

export default function ProductViewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = String(params?.id ?? "");

  const [product, setProduct] = React.useState<StoredProduct | null>(null);

  React.useEffect(() => {
    const p = readProducts().find((x) => x.id === id) ?? null;
    setProduct(p);
  }, [id]);

  const selectedVariantKeys = React.useMemo(() => {
    if (!product?.variants) return [];
    return (product.variants.options ?? []).filter((k) => Boolean(product.variants?.selected?.[k]));
  }, [product]);

  const pricing = React.useMemo(() => {
    const selling = safeNumber(product?.selling_price ?? product?.price ?? 0);
    const cost = safeNumber(product?.cost);
    const freight = safeNumber(product?.freight);
    const discountPercent = safeNumber(product?.discount);

    const totalCost = selling + cost + freight;
    const priceAfterDiscount = totalCost - (totalCost * discountPercent) / 100;

    return {
      totalCost,
      priceAfterDiscount,
    };
  }, [product]);

  return (
    <PermissionBoundary screen="/dashboard/products" mode="block">
      <div className="space-y-6 scrollbar-stable">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold truncate">View Product</h1>
            <p className="mt-1 text-sm text-muted-foreground">Product details</p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push("/dashboard/products")}>Back</Button>
            <Button onClick={() => router.push(`/dashboard/products/edit/${id}`)} disabled={!id || !product}>
              Edit
            </Button>
          </div>
        </div>

        {!product ? (
          <Card className="shadow-sm">
            <CardContent className="p-10 text-center text-muted-foreground">
              Product not found.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Product details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">ID</div>
                    <div className="font-medium break-all">{product.id}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Status</div>
                    <div className="font-medium">{product.is_active ? "Active" : "Inactive"}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Name</div>
                    <div className="font-medium">{product.title}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">SKU</div>
                    <div className="font-medium">{product.sku ?? "—"}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Category</div>
                    <div className="font-medium">{product.category?.name ?? "—"}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Brand</div>
                    <div className="font-medium">{product.brand?.name ?? "—"}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Supplier</div>
                    <div className="font-medium">{product.supplier_id || "—"}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Tax</div>
                    <div className="font-medium">{product.tax_id || "—"}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Warehouse</div>
                    <div className="font-medium">{product.warehouse_id || "—"}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Stock</div>
                    <div className="font-medium">{product.stock_quantity}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Created</div>
                    <div className="font-medium">{product.created_at ? new Date(product.created_at).toLocaleString() : "—"}</div>
                  </div>
                </div>

                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Description</div>
                  <div className="mt-1 text-sm whitespace-pre-wrap">{product.description || "—"}</div>
                </div>

                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Customer visibility</div>
                  <div className="mt-1 text-sm">
                    {(product.visibility_wholesale ?? true) ? "Wholesale" : null}
                    {(product.visibility_wholesale ?? true) && (product.visibility_retail ?? true) ? ", " : null}
                    {(product.visibility_retail ?? true) ? "Retail" : null}
                    {!(product.visibility_wholesale ?? true) && !(product.visibility_retail ?? true) ? "—" : null}
                  </div>
                </div>

                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Variants</div>
                  {selectedVariantKeys.length === 0 ? (
                    <div className="mt-1 text-sm">—</div>
                  ) : (
                    <div className="mt-1 grid gap-3 sm:grid-cols-2">
                      {selectedVariantKeys.map((k) => (
                        <div key={k} className="rounded-lg border p-3">
                          <div className="text-xs text-muted-foreground">{k}</div>
                          <div className="font-medium">{product.variants?.values?.[k] || "—"}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Pricing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Selling price</div>
                    <div className="font-medium">
                      {product.currency} {safeNumber(product.selling_price ?? product.price).toFixed(2)}
                    </div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Currency</div>
                    <div className="font-medium">{product.currency}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Cost</div>
                    <div className="font-medium">{safeNumber(product.cost).toFixed(2)}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Freight</div>
                    <div className="font-medium">{safeNumber(product.freight).toFixed(2)}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Tax ID</div>
                    <div className="font-medium">{product.tax_id || "—"}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Discount (%)</div>
                    <div className="font-medium">{product.discount || "0"}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Start Date</div>
                    <div className="font-medium">{product.start_discount_date || "—"}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">End Date</div>
                    <div className="font-medium">{product.end_discount_date || "—"}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Total Price</div>
                    <div className="font-medium">{product.total_price || "—"}</div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <div className="rounded-lg border bg-emerald-50 px-4 py-3 text-right">
                    <div className="text-xs text-emerald-700">Total cost</div>
                    <div className="text-lg font-bold text-emerald-800">
                      {product.currency} {pricing.totalCost.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <div className="rounded-lg border bg-emerald-50 px-4 py-3 text-right">
                    <div className="text-xs text-emerald-700">Price after discount</div>
                    <div className="text-lg font-bold text-emerald-800">
                      {product.currency} {pricing.priceAfterDiscount.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border p-3">
                  <div className="text-sm font-medium">Bulk pricing</div>
                  {!product.bulk_pricing?.length ? (
                    <div className="mt-2 text-sm text-muted-foreground">—</div>
                  ) : (
                    <div className="mt-3 grid gap-2">
                      {product.bulk_pricing.map((row) => (
                        <div key={row.id} className="grid gap-2 sm:grid-cols-2">
                          <div className="rounded-lg border p-3">
                            <div className="text-xs text-muted-foreground">Quantity</div>
                            <div className="font-medium">{row.quantity || "—"}</div>
                          </div>
                          <div className="rounded-lg border p-3">
                            <div className="text-xs text-muted-foreground">Price per product</div>
                            <div className="font-medium">{row.price || "—"}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Media</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!product.media?.length ? (
                  <div className="rounded-xl border p-10 text-center text-sm text-muted-foreground">
                    No media uploaded yet.
                  </div>
                ) : (
                  <div className="rounded-xl border p-3">
                    <div className="flex gap-3 overflow-x-auto scrollbar-stable">
                      {product.media.map((m) => (
                        <div
                          key={m.id}
                          className="relative h-24 w-32 shrink-0 overflow-hidden rounded-lg border bg-muted"
                        >
                          {m.kind === "image" ? (
                            <Image
                              src={m.url}
                              alt={m.name}
                              className="h-full w-full object-cover"
                              width={128}
                              height={96}
                            />
                          ) : (
                            <video
                              src={m.url}
                              className="h-full w-full object-cover"
                              controls
                              muted
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Inventory and shipping</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Warehouse</div>
                    <div className="font-medium">{product.warehouse_id || "—"}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Stock quantity</div>
                    <div className="font-medium">{product.stock_quantity}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Weight</div>
                    <div className="font-medium">{product.weight || "—"}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Length</div>
                    <div className="font-medium">{product.length || "—"}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Width</div>
                    <div className="font-medium">{product.width || "—"}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Height</div>
                    <div className="font-medium">{product.height || "—"}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </PermissionBoundary>
  );
}
