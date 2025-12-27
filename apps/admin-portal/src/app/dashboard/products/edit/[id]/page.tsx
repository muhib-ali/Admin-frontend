"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";

import { getAllBrandsDropdown, getAllCategoriesDropdown, getAllTaxesDropdown, getAllSuppliersDropdown, getAllWarehousesDropdown, getAllVariantTypesDropdown, getAllCustomerVisibilityGroupsDropdown } from "@/services/dropdowns";
import Image from "next/image";
import PermissionBoundary from "@/components/permission-boundary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const STORAGE_KEY = "admin_portal_static_products_v1";

type Option = { id: string; name: string };

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

type MediaUpload =
  | { id: string; kind: "image"; file: File }
  | { id: string; kind: "video"; file: File };

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
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

function writeProducts(next: StoredProduct[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export default function ProductEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = String(params?.id ?? "");

  const [loading, setLoading] = React.useState(true);
  const [product, setProduct] = React.useState<StoredProduct | null>(null);

  const [categories, setCategories] = React.useState<Option[]>([]);
  const [brands, setBrands] = React.useState<Option[]>([]);
  const [taxes, setTaxes] = React.useState<Option[]>([]);
  const [suppliers, setSuppliers] = React.useState<Option[]>([]);
  const [warehouses, setWarehouses] = React.useState<Option[]>([]);
  const [variantTypes, setVariantTypes] = React.useState<Option[]>([]);
  const [customerVisibilityGroups, setCustomerVisibilityGroups] = React.useState<Option[]>([]);

  const [values, setValues] = React.useState(() => ({
    title: "",
    description: "",
    category_id: "",
    brand_id: "",
    supplier_id: "",
    tax_id: "",
    warehouse_id: "",
    customer_groups: [] as string[],
    currency: "USD",
    selling_price: "",
    cost: "",
    freight: "",
    discount: "",
    start_discount_date: "",
    end_discount_date: "",
    total_price: "",
    stock_quantity: "",
    weight: "",
    length: "",
    width: "",
    height: "",
    visibility_wholesale: true,
    visibility_retail: true,
  }));

  const [bulkPricing, setBulkPricing] = React.useState<BulkPricingRow[]>([]);
  const [variantOptions, setVariantOptions] = React.useState<string[]>([]);
  const [variantSelected, setVariantSelected] = React.useState<Record<string, boolean>>({});
  const [variantValues, setVariantValues] = React.useState<Record<string, string>>({});
  const [media, setMedia] = React.useState<StoredMediaItem[]>([]);
  const [pendingMedia, setPendingMedia] = React.useState<MediaUpload[]>([]);

  const imageInputRef = React.useRef<HTMLInputElement | null>(null);
  const videoInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    const ac = new AbortController();

    (async () => {
      try {
        const [cats, brs, tax, sup, wh, vt, cvg] = await Promise.all([
          getAllCategoriesDropdown({ signal: ac.signal }),
          getAllBrandsDropdown({ signal: ac.signal }),
          getAllTaxesDropdown({ signal: ac.signal }),
          getAllSuppliersDropdown({ signal: ac.signal }),
          getAllWarehousesDropdown({ signal: ac.signal }),
          getAllVariantTypesDropdown({ signal: ac.signal }),
          getAllCustomerVisibilityGroupsDropdown({ signal: ac.signal }),
        ]);

        setCategories((cats ?? []).map((c: any) => ({ id: c.value, name: c.label })));
        setBrands((brs ?? []).map((b: any) => ({ id: b.value, name: b.label })));
        setTaxes((tax ?? []).map((t: any) => ({ id: t.value, name: t.label })));
        setSuppliers((sup ?? []).map((s: any) => ({ id: s.value, name: s.label })));
        setWarehouses((wh ?? []).map((w: any) => ({ id: w.value, name: w.label })));
        setVariantTypes((vt ?? []).map((v: any) => ({ id: v.value, name: v.label })));
        setCustomerVisibilityGroups((cvg ?? []).map((c: any) => ({ id: c.value, name: c.label })));
      } catch {
        // ignore UI-only page for now
      }
    })();

    return () => ac.abort();
  }, []);

  React.useEffect(() => {
    const p = readProducts().find((x) => x.id === id) ?? null;
    setProduct(p);

    setValues({
      title: p?.title ?? "",
      description: p?.description ?? "",
      category_id: p?.category_id ?? "",
      brand_id: p?.brand_id ?? "",
      supplier_id: p?.supplier_id ?? "",
      tax_id: p?.tax_id ?? "",
      warehouse_id: p?.warehouse_id ?? "",
      customer_groups: p?.customer_groups?.cvg_ids ?? [],
      currency: p?.currency ?? "USD",
      selling_price: p?.selling_price ?? String(p?.price ?? ""),
      cost: p?.cost ?? "",
      freight: p?.freight ?? "",
      discount: p?.discount ?? "",
      start_discount_date: p?.start_discount_date ?? "",
      end_discount_date: p?.end_discount_date ?? "",
      total_price: p?.total_price ?? "",
      stock_quantity: String(p?.stock_quantity ?? ""),
      weight: p?.weight ?? "",
      length: p?.length ?? "",
      width: p?.width ?? "",
      height: p?.height ?? "",
      visibility_wholesale: p?.visibility_wholesale ?? true,
      visibility_retail: p?.visibility_retail ?? true,
    });

    setBulkPricing(p?.bulk_pricing ?? []);
    setVariantOptions(p?.variants?.options ?? []);
    setVariantSelected(p?.variants?.selected ?? {});
    setVariantValues(p?.variants?.values ?? {});
    setMedia(p?.media ?? []);
    setPendingMedia([]);
    setLoading(false);
  }, [id]);

  const addBulkRow = () => {
    setBulkPricing((prev) => [
      ...prev,
      { id: crypto.randomUUID(), quantity: "", price: "" },
    ]);
  };

  const removeBulkRow = (rowId: string) => {
    setBulkPricing((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== rowId)));
  };

  const addPendingMedia = (files: FileList | null, kind: MediaUpload["kind"]) => {
    if (!files?.length) return;
    const next: MediaUpload[] = [];
    for (const file of Array.from(files)) {
      next.push({ id: crypto.randomUUID(), kind, file } as MediaUpload);
    }
    setPendingMedia((p) => [...p, ...next]);
  };

  const removeMedia = (mediaId: string) => {
    setMedia((p) => p.filter((m) => m.id !== mediaId));
  };

  const removePendingMedia = (mediaId: string) => {
    setPendingMedia((p) => p.filter((m) => m.id !== mediaId));
  };

  const selectedVariantKeys = React.useMemo(() => {
    return variantOptions.filter((k) => Boolean(variantSelected[k]));
  }, [variantOptions, variantSelected]);

  const save = async () => {
    if (!product) return;

    const uploaded: StoredMediaItem[] = [];
    for (const pm of pendingMedia) {
      const url = await fileToDataUrl(pm.file);
      uploaded.push({
        id: pm.id,
        kind: pm.kind,
        name: pm.file.name,
        type: pm.file.type,
        url,
      });
    }

    const nextMedia = [...media, ...uploaded];

    const next = readProducts().map((x) => {
      if (x.id !== id) return x;
      return {
        ...x,
        title: values.title,
        description: values.description,
        category_id: values.category_id,
        brand_id: values.brand_id,
        supplier_id: values.supplier_id,
        tax_id: values.tax_id,
        warehouse_id: values.warehouse_id,
        currency: values.currency,
        height: values.height,
        visibility_wholesale: values.visibility_wholesale,
        visibility_retail: values.visibility_retail,
        variants: {
          options: variantOptions,
          selected: variantSelected,
          values: variantValues,
        },
        media: nextMedia,
        is_active: x.is_active,
      };
    });
    writeProducts(next);
    router.push(`/dashboard/products/view/${id}`);
  };

  return (
    <PermissionBoundary screen="/dashboard/products" mode="block">
      <div className="space-y-6 scrollbar-stable">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold truncate">Edit Product</h1>
            <p className="mt-1 text-sm text-muted-foreground">Update basic details</p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push(`/dashboard/products/view/${id}`)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={!product || !values.title.trim()}>
              Save
            </Button>
          </div>
        </div>

        {loading ? (
          <Card className="shadow-sm">
            <CardContent className="p-10 text-center text-muted-foreground">
              Loading…
            </CardContent>
          </Card>
        ) : !product ? (
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
                <div className="grid gap-2">
                  <Label htmlFor="title">Name</Label>
                  <Input
                    id="title"
                    value={values.title}
                    onChange={(e) => setValues((p) => ({ ...p, title: e.target.value }))}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={values.description}
                    onChange={(e) => setValues((p) => ({ ...p, description: e.target.value }))}
                    rows={3}
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Customer visibility</Label>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={values.visibility_wholesale}
                        onCheckedChange={() =>
                          setValues((p) => ({
                            ...p,
                            visibility_wholesale: !p.visibility_wholesale,
                          }))
                        }
                      />
                      <span>Wholesale</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={values.visibility_retail}
                        onCheckedChange={() =>
                          setValues((p) => ({
                            ...p,
                            visibility_retail: !p.visibility_retail,
                          }))
                        }
                      />
                      <span>Retail</span>
                    </label>
                  </div>
                </div>

                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Variants</div>
                  {selectedVariantKeys.length === 0 ? (
                    <div className="mt-1 text-sm text-muted-foreground">—</div>
                  ) : (
                    <div className="mt-3 grid gap-4 sm:grid-cols-2">
                      {selectedVariantKeys.map((k) => (
                        <div key={k} className="grid gap-2">
                          <Label htmlFor={`variant-${k}`}>{k}</Label>
                          <Input
                            id={`variant-${k}`}
                            value={variantValues[k] ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              setVariantValues((p) => ({ ...p, [k]: v }));
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between rounded-lg border px-3 bg-muted/30 h-10">
                  <p className="text-xs text-muted-foreground">
                    {product.is_active ? "Active" : "Inactive"}
                  </p>
                  <Switch checked={product.is_active} disabled className="data-[state=checked]:bg-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Pricing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="sellingPrice">Selling price</Label>
                    <Input
                      id="sellingPrice"
                      inputMode="decimal"
                      value={values.selling_price}
                      onChange={(e) => setValues((p) => ({ ...p, selling_price: e.target.value }))}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Input
                      id="currency"
                      value={values.currency}
                      onChange={(e) => setValues((p) => ({ ...p, currency: e.target.value }))}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="cost">Cost</Label>
                    <Input
                      id="cost"
                      inputMode="decimal"
                      value={values.cost}
                      onChange={(e) => setValues((p) => ({ ...p, cost: e.target.value }))}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="freight">Freight</Label>
                    <Input
                      id="freight"
                      inputMode="decimal"
                      value={values.freight}
                      onChange={(e) => setValues((p) => ({ ...p, freight: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="tax_id">Tax ID</Label>
                    <Input
                      id="tax_id"
                      inputMode="decimal"
                      value={values.tax_id}
                      onChange={(e) => setValues((p) => ({ ...p, tax_id: e.target.value }))}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="discount">Discount (%)</Label>
                    <Input
                      id="discount"
                      inputMode="decimal"
                      value={values.discount}
                      onChange={(e) => setValues((p) => ({ ...p, discount: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Start & end date</Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input
                      type="date"
                      value={values.start_discount_date}
                      onChange={(e) => setValues((p) => ({ ...p, start_discount_date: e.target.value }))}
                    />
                    <Input
                      type="date"
                      value={values.end_discount_date}
                      onChange={(e) => setValues((p) => ({ ...p, end_discount_date: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-sm font-medium">Bulk pricing</div>
                  {bulkPricing.length === 0 ? (
                    <Button type="button" variant="outline" onClick={addBulkRow}>
                      Add bulk row
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      {bulkPricing.map((row, idx) => (
                        <div key={row.id} className="grid gap-3 sm:grid-cols-5 sm:items-end">
                          <div className="grid gap-2 sm:col-span-2">
                            <Label htmlFor={`bulkQty-${row.id}`}>Quantity</Label>
                            <Input
                              id={`bulkQty-${row.id}`}
                              inputMode="numeric"
                              value={row.quantity}
                              onChange={(e) => {
                                const v = e.target.value;
                                setBulkPricing((p) =>
                                  p.map((r) => (r.id === row.id ? { ...r, quantity: v } : r))
                                );
                              }}
                            />
                          </div>

                          <div className="grid gap-2 sm:col-span-2">
                            <Label htmlFor={`bulkPrice-${row.id}`}>Price per product</Label>
                            <Input
                              id={`bulkPrice-${row.id}`}
                              inputMode="decimal"
                              value={row.price}
                              onChange={(e) => {
                                const v = e.target.value;
                                setBulkPricing((p) =>
                                  p.map((r) => (r.id === row.id ? { ...r, price: v } : r))
                                );
                              }}
                            />
                          </div>

                          <div className="flex gap-2">
                            <Button type="button" variant="outline" onClick={addBulkRow}>
                              +
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => removeBulkRow(row.id)}
                              disabled={bulkPricing.length <= 1 || idx === 0}
                            >
                              -
                            </Button>
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
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      addPendingMedia(e.target.files, "image");
                      if (imageInputRef.current) imageInputRef.current.value = "";
                    }}
                  />
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      addPendingMedia(e.target.files, "video");
                      if (videoInputRef.current) videoInputRef.current.value = "";
                    }}
                  />

                  <Button type="button" variant="outline" className="gap-2" onClick={() => imageInputRef.current?.click()}>
                    Upload image
                  </Button>
                  <Button type="button" variant="outline" className="gap-2" onClick={() => videoInputRef.current?.click()}>
                    Upload video
                  </Button>
                </div>

                <div className="rounded-xl border p-3">
                  {media.length === 0 && pendingMedia.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      No media uploaded yet.
                    </div>
                  ) : (
                    <div className="flex gap-3 overflow-x-auto scrollbar-stable">
                      {media.map((m) => (
                        <div key={m.id} className="relative h-24 w-32 shrink-0 overflow-hidden rounded-lg border bg-muted">
                          {m.kind === "image" ? (
                            <Image
                              src={m.url}
                              alt={m.name}
                              className="h-full w-full object-cover"
                              width={128}
                              height={96}
                            />
                          ) : (
                            <video src={m.url} className="h-full w-full object-cover" controls />
                          )}
                          <button
                            type="button"
                            onClick={() => removeMedia(m.id)}
                            className="absolute right-1 top-1 rounded-full bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      ))}

                      {pendingMedia.map((m) => (
                        <div key={m.id} className="relative h-24 w-32 shrink-0 overflow-hidden rounded-lg border bg-muted">
                          <div className="p-2 text-xs text-muted-foreground wrap-break-word">
                            {m.file.name}
                            <div className="mt-1">(will upload on save)</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removePendingMedia(m.id)}
                            className="absolute right-1 top-1 rounded-full bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Inventory and shipping</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="warehouse">Warehouse</Label>
                    <Input
                      id="warehouse"
                      value={values.warehouse_id}
                      onChange={(e) => setValues((p) => ({ ...p, warehouse_id: e.target.value }))}
                      placeholder="Coming soon"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="stock">Stock quantity</Label>
                    <Input
                      id="stock"
                      inputMode="numeric"
                      value={values.stock_quantity}
                      onChange={(e) => setValues((p) => ({ ...p, stock_quantity: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="weight">Weight</Label>
                    <Input
                      id="weight"
                      value={values.weight}
                      onChange={(e) => setValues((p) => ({ ...p, weight: e.target.value }))}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="length">Length</Label>
                    <Input
                      id="length"
                      value={values.length}
                      onChange={(e) => setValues((p) => ({ ...p, length: e.target.value }))}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="width">Width</Label>
                    <Input
                      id="width"
                      value={values.width}
                      onChange={(e) => setValues((p) => ({ ...p, width: e.target.value }))}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="height">Height</Label>
                    <Input
                      id="height"
                      value={values.height}
                      onChange={(e) => setValues((p) => ({ ...p, height: e.target.value }))}
                    />
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
