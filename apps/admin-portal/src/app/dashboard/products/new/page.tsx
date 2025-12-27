"use client";

import * as React from "react";
import { Upload, X, Video } from "lucide-react";
import { useRouter } from "next/navigation";

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
import { ENTITY_PERMS } from "@/rbac/permissions-map";
import { getAllBrandsDropdown, getAllCategoriesDropdown } from "@/services/dropdowns";
import { useHasPermission } from "@/hooks/use-permission";

type Option = { id: string; name: string };

type BulkPricingRow = { id: string; quantity: string; price: string };

type MediaItem =
  | { id: string; kind: "image"; file: File; url: string }
  | { id: string; kind: "video"; file: File; url: string };

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
  visibility_wholesale?: boolean;
  visibility_retail?: boolean;

  selling_price?: string;
  cost?: string;
  freight?: string;
  tax?: string;
  discount_percent?: string;
  discount_start?: string;
  discount_end?: string;
  bulk_pricing?: BulkPricingRow[];

  warehouse_id?: string;
  weight?: string;
  length?: string;
  width?: string;
  height?: string;

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

const STORAGE_KEY = "admin_portal_static_products_v1";

function readStoredProducts(): StoredProduct[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as StoredProduct[]) : [];
  } catch {
    return [];
  }
}

function writeStoredProducts(next: StoredProduct[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export default function NewProductPage() {
  const router = useRouter();
  const canCreate = useHasPermission(ENTITY_PERMS.products.create);

  const [categories, setCategories] = React.useState<Option[]>([]);
  const [brands, setBrands] = React.useState<Option[]>([]);

  const [values, setValues] = React.useState(() => ({
    title: "",
    description: "",
    category_id: "",
    brand_id: "",
    supplier_id: "",
    visibility_wholesale: true,
    visibility_retail: true,
    is_active: true,

    selling_price: "",
    currency: "USD",
    cost: "",
    freight: "",
    tax: "0",
    discount_percent: "",
    discount_start: "",
    discount_end: "",

    warehouse_id: "",
    stock_quantity: "",
    weight: "",
    length: "",
    width: "",
    height: "",
  }));

  const [variantsOpen, setVariantsOpen] = React.useState(false);
  const [variantOptions, setVariantOptions] = React.useState<string[]>([
    "size",
    "model",
    "year",
  ]);
  const [variantSelected, setVariantSelected] = React.useState<Record<string, boolean>>({
    size: false,
    model: false,
    year: false,
  });
  const [variantValues, setVariantValues] = React.useState<Record<string, string>>({
    size: "",
    model: "",
    year: "",
  });
  const [newVariantName, setNewVariantName] = React.useState("");

  const [media, setMedia] = React.useState<MediaItem[]>([]);
  const [bulkPricing, setBulkPricing] = React.useState<BulkPricingRow[]>([
    { id: crypto.randomUUID(), quantity: "", price: "" },
  ]);
  const imageInputRef = React.useRef<HTMLInputElement | null>(null);
  const videoInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    const ac = new AbortController();

    (async () => {
      try {
        const [cats, brs] = await Promise.all([
          getAllCategoriesDropdown({ signal: ac.signal }),
          getAllBrandsDropdown({ signal: ac.signal }),
        ]);

        setCategories((cats ?? []).map((c: any) => ({ id: c.value, name: c.label })));
        setBrands((brs ?? []).map((b: any) => ({ id: b.value, name: b.label })));
      } catch {
        // ignore UI-only page for now
      }
    })();

    return () => ac.abort();
  }, []);

  React.useEffect(() => {
    return () => {
      media.forEach((m) => {
        if (m.url.startsWith("blob:")) URL.revokeObjectURL(m.url);
      });
    };
  }, [media]);

  const addMedia = (files: FileList | null, kind: MediaItem["kind"]) => {
    if (!files?.length) return;

    const next: MediaItem[] = [];
    for (const file of Array.from(files)) {
      next.push({
        id: crypto.randomUUID(),
        kind,
        file,
        url: URL.createObjectURL(file),
      } as MediaItem);
    }

    setMedia((p) => [...p, ...next]);
  };

  const removeMedia = (id: string) => {
    setMedia((p) => {
      const target = p.find((x) => x.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return p.filter((x) => x.id !== id);
    });
  };

  const selectedVariantKeys = React.useMemo(() => {
    return variantOptions.filter((k) => Boolean(variantSelected[k]));
  }, [variantOptions, variantSelected]);

  const addVariantOption = () => {
    const raw = newVariantName.trim();
    if (!raw) return;
    const key = raw.toLowerCase().replace(/\s+/g, " ");
    if (!key) return;
    if (variantOptions.includes(key)) {
      setVariantSelected((p) => ({ ...p, [key]: true }));
      setVariantsOpen(true);
      setNewVariantName("");
      return;
    }
    setVariantOptions((p) => [...p, key]);
    setVariantSelected((p) => ({ ...p, [key]: true }));
    setVariantValues((p) => ({ ...p, [key]: "" }));
    setVariantsOpen(true);
    setNewVariantName("");
  };

  const productDetailsComplete = React.useMemo(() => {
    return Boolean(
      values.title.trim() &&
        values.description.trim() &&
        values.category_id &&
        values.brand_id
    );
  }, [values.title, values.description, values.category_id, values.brand_id]);

  const pricing = React.useMemo(() => {
    const selling = Number(values.selling_price);
    const cost = Number(values.cost);
    const freight = Number(values.freight);
    const taxPercent = Number(values.tax);
    const discountPercent = Number(values.discount_percent);

    const sellingN = Number.isFinite(selling) ? selling : 0;
    const costN = Number.isFinite(cost) ? cost : 0;
    const freightN = Number.isFinite(freight) ? freight : 0;
    const taxPercentN = Number.isFinite(taxPercent) ? taxPercent : 0;
    const discountPercentN = Number.isFinite(discountPercent) ? discountPercent : 0;

    const totalCost = sellingN + costN + freightN + (sellingN * taxPercentN) / 100;
    const priceAfterDiscount = totalCost - (totalCost * discountPercentN) / 100;

    return {
      totalCost,
      priceAfterDiscount,
    };
  }, [values.selling_price, values.cost, values.freight, values.tax, values.discount_percent]);

  const addBulkRow = () => {
    setBulkPricing((p) => [...p, { id: crypto.randomUUID(), quantity: "", price: "" }]);
  };

  const removeBulkRow = (id: string) => {
    setBulkPricing((p) => (p.length <= 1 ? p : p.filter((r) => r.id !== id)));
  };

  const canSave = canCreate && productDetailsComplete;

  const saveProduct = async () => {
    if (!canSave) return;

    const category = categories.find((c) => c.id === values.category_id);
    const brand = brands.find((b) => b.id === values.brand_id);

    const storedMedia: StoredMediaItem[] = [];
    for (const m of media) {
      const url = await fileToDataUrl(m.file);
      storedMedia.push({
        id: m.id,
        kind: m.kind,
        name: m.file.name,
        type: m.file.type,
        url,
      });
    }

    const product: StoredProduct = {
      id: crypto.randomUUID(),
      title: values.title.trim(),
      description: values.description.trim(),
      price: Number(values.selling_price) || 0,
      stock_quantity: Number(values.stock_quantity) || 0,
      category_id: values.category_id,
      brand_id: values.brand_id,
      currency: values.currency,
      product_img_url: null,
      is_active: Boolean(values.is_active),
      supplier_id: values.supplier_id,
      visibility_wholesale: Boolean(values.visibility_wholesale),
      visibility_retail: Boolean(values.visibility_retail),

      selling_price: values.selling_price,
      cost: values.cost,
      freight: values.freight,
      tax: values.tax,
      discount_percent: values.discount_percent,
      discount_start: values.discount_start,
      discount_end: values.discount_end,
      bulk_pricing: bulkPricing,

      warehouse_id: values.warehouse_id,
      weight: values.weight,
      length: values.length,
      width: values.width,
      height: values.height,

      variants: {
        options: variantOptions,
        selected: variantSelected,
        values: variantValues,
      },

      media: storedMedia,
      created_at: new Date().toISOString(),
      category: category ? { id: category.id, name: category.name } : undefined,
      brand: brand ? { id: brand.id, name: brand.name } : undefined,
    };

    const prev = readStoredProducts();
    writeStoredProducts([product, ...prev]);
    router.push("/dashboard/products");
  };

  return (
    <PermissionBoundary screen="/dashboard/products" mode="block">
      <div className="space-y-6 scrollbar-stable">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold truncate">Add Product</h1>
            <p className="mt-1 text-sm text-muted-foreground">Create a new product</p>
          </div>

          <Button disabled={!canSave} onClick={saveProduct}>
            Save Product
          </Button>
        </div>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Product details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="productName">Name</Label>
              <Input
                id="productName"
                value={values.title}
                onChange={(e) => setValues((p) => ({ ...p, title: e.target.value }))}
                placeholder="Product name"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="productDescription">Description</Label>
              <Textarea
                id="productDescription"
                value={values.description}
                onChange={(e) =>
                  setValues((p) => ({ ...p, description: e.target.value }))
                }
                rows={3}
                placeholder="Product description"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select
                  value={values.category_id}
                  onValueChange={(v) => setValues((p) => ({ ...p, category_id: v }))}
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Brand</Label>
                <Select
                  value={values.brand_id}
                  onValueChange={(v) => setValues((p) => ({ ...p, brand_id: v }))}
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Supplier</Label>
                <Select
                  value={values.supplier_id}
                  onValueChange={(v) => setValues((p) => ({ ...p, supplier_id: v }))}
                  disabled
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Coming soon" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_" disabled>
                      Coming soon
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Variants</Label>
              <button
                type="button"
                className="h-10 w-full rounded-md border bg-background px-3 text-left text-sm"
                onClick={() => setVariantsOpen((v) => !v)}
              >
                {selectedVariantKeys.length
                  ? selectedVariantKeys
                      .map((k) => k.charAt(0).toUpperCase() + k.slice(1))
                      .join(", ")
                  : "Select variants"}
              </button>

              {variantsOpen ? (
                <div className="rounded-lg border p-3 space-y-3">
                  <div className="grid gap-2">
                    {variantOptions.map((k) => {
                      const label = k.charAt(0).toUpperCase() + k.slice(1);
                      return (
                        <label key={k} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={Boolean(variantSelected[k])}
                            onCheckedChange={() =>
                              setVariantSelected((p) => ({ ...p, [k]: !p[k] }))
                            }
                          />
                          <span>{label}</span>
                        </label>
                      );
                    })}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      value={newVariantName}
                      onChange={(e) => setNewVariantName(e.target.value)}
                      placeholder="Add variant"
                    />
                    <Button type="button" variant="outline" onClick={addVariantOption}>
                      Add
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>

            {selectedVariantKeys.length ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {selectedVariantKeys.map((k) => {
                  const label = k.charAt(0).toUpperCase() + k.slice(1);
                  return (
                    <div key={k} className="grid gap-2">
                      <Label htmlFor={`variant-${k}`}>{label}</Label>
                      <Input
                        id={`variant-${k}`}
                        value={variantValues[k] ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          setVariantValues((p) => ({ ...p, [k]: v }));
                        }}
                        placeholder={label}
                      />
                    </div>
                  );
                })}
              </div>
            ) : null}

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
                      setValues((p) => ({ ...p, visibility_retail: !p.visibility_retail }))
                    }
                  />
                  <span>Retail</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border px-3 bg-muted/30 h-10">
              <p className="text-xs text-muted-foreground">
                {values.is_active ? "Active" : "Inactive"}
              </p>
              <Switch
                checked={values.is_active}
                onCheckedChange={(v) => setValues((p) => ({ ...p, is_active: v }))}
                className="data-[state=checked]:bg-green-600"
              />
            </div>

            {!productDetailsComplete ? (
              <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                Complete product details to continue.
              </div>
            ) : null}
          </CardContent>
        </Card>

        {productDetailsComplete ? (
          <>
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
                      onChange={(e) =>
                        setValues((p) => ({ ...p, selling_price: e.target.value }))
                      }
                      placeholder="0"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>Currency</Label>
                    <Select
                      value={values.currency}
                      onValueChange={(v) => setValues((p) => ({ ...p, currency: v }))}
                    >
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue placeholder="Choose currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="PKR">PKR</SelectItem>
                        <SelectItem value="AED">AED</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="cost">Cost</Label>
                    <Input
                      id="cost"
                      inputMode="decimal"
                      value={values.cost}
                      onChange={(e) => setValues((p) => ({ ...p, cost: e.target.value }))}
                      placeholder="0"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="freight">Freight</Label>
                    <Input
                      id="freight"
                      inputMode="decimal"
                      value={values.freight}
                      onChange={(e) =>
                        setValues((p) => ({ ...p, freight: e.target.value }))
                      }
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Tax</Label>
                  <Select
                    value={values.tax}
                    onValueChange={(v) => setValues((p) => ({ ...p, tax: v }))}
                  >
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue placeholder="Select tax" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0%</SelectItem>
                      <SelectItem value="5">5%</SelectItem>
                      <SelectItem value="10">10%</SelectItem>
                      <SelectItem value="15">15%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end">
                  <div className="rounded-lg border bg-emerald-50 px-4 py-3 text-right">
                    <div className="text-xs text-emerald-700">Total cost</div>
                    <div className="text-lg font-bold text-emerald-800">
                      {values.currency} {pricing.totalCost.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="discount">Discount (%)</Label>
                    <Input
                      id="discount"
                      inputMode="decimal"
                      value={values.discount_percent}
                      onChange={(e) =>
                        setValues((p) => ({
                          ...p,
                          discount_percent: e.target.value,
                        }))
                      }
                      placeholder="0"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>Start & end date</Label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input
                        type="date"
                        value={values.discount_start}
                        onChange={(e) =>
                          setValues((p) => ({
                            ...p,
                            discount_start: e.target.value,
                          }))
                        }
                      />
                      <Input
                        type="date"
                        value={values.discount_end}
                        onChange={(e) =>
                          setValues((p) => ({
                            ...p,
                            discount_end: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <div className="rounded-lg border bg-emerald-50 px-4 py-3 text-right">
                    <div className="text-xs text-emerald-700">Price after discount</div>
                    <div className="text-lg font-bold text-emerald-800">
                      {values.currency} {pricing.priceAfterDiscount.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-sm font-medium">Bulk pricing</div>
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
                            placeholder="0"
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
                            placeholder="0"
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
                      addMedia(e.target.files, "image");
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
                      addMedia(e.target.files, "video");
                      if (videoInputRef.current) videoInputRef.current.value = "";
                    }}
                  />

                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={() => imageInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" />
                    Upload image
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={() => videoInputRef.current?.click()}
                  >
                    <Video className="h-4 w-4" />
                    Upload video
                  </Button>
                </div>

                <div className="rounded-xl border p-3">
                  {media.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      No media uploaded yet.
                    </div>
                  ) : (
                    <div className="flex gap-3 overflow-x-auto scrollbar-stable">
                      {media.map((m) => (
                        <div
                          key={m.id}
                          className="relative h-24 w-32 shrink-0 overflow-hidden rounded-lg border bg-muted"
                        >
                          {m.kind === "image" ? (
                            <img
                              src={m.url}
                              alt={m.file.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <video
                              src={m.url}
                              className="h-full w-full object-cover"
                              muted
                            />
                          )}

                          <button
                            type="button"
                            onClick={() => removeMedia(m.id)}
                            className="absolute right-1 top-1 rounded-full bg-red-600 p-1 text-white hover:bg-red-700"
                            aria-label="Remove"
                          >
                            <X className="h-3.5 w-3.5" />
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
                    <Label>Warehouse</Label>
                    <Select
                      value={values.warehouse_id}
                      onValueChange={(v) =>
                        setValues((p) => ({ ...p, warehouse_id: v }))
                      }
                      disabled
                    >
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue placeholder="Coming soon" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_" disabled>
                          Coming soon
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="stockQty">Stock quantity</Label>
                    <Input
                      id="stockQty"
                      inputMode="numeric"
                      value={values.stock_quantity}
                      onChange={(e) =>
                        setValues((p) => ({
                          ...p,
                          stock_quantity: e.target.value,
                        }))
                      }
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="weight">Weight</Label>
                    <Input
                      id="weight"
                      value={values.weight}
                      onChange={(e) =>
                        setValues((p) => ({ ...p, weight: e.target.value }))
                      }
                      placeholder="e.g. 1.2"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="length">Length</Label>
                    <Input
                      id="length"
                      value={values.length}
                      onChange={(e) =>
                        setValues((p) => ({ ...p, length: e.target.value }))
                      }
                      placeholder="e.g. 10"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="width">Width</Label>
                    <Input
                      id="width"
                      value={values.width}
                      onChange={(e) =>
                        setValues((p) => ({ ...p, width: e.target.value }))
                      }
                      placeholder="e.g. 5"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="height">Height</Label>
                    <Input
                      id="height"
                      value={values.height}
                      onChange={(e) =>
                        setValues((p) => ({ ...p, height: e.target.value }))
                      }
                      placeholder="e.g. 3"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </PermissionBoundary>
  );
}
