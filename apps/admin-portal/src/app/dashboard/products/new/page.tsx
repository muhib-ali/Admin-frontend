"use client";

import * as React from "react";
import { Upload, X, Video } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { ENTITY_PERMS } from "@/rbac/permissions-map";
import { getAllBrandsDropdown, getAllCategoriesDropdown, getAllTaxesDropdown, getAllSuppliersDropdown, getAllWarehousesDropdown, getAllVariantTypesDropdown, getAllCustomerVisibilityGroupsDropdown } from "@/services/dropdowns";
import { createVariantType, deleteVariantType } from "@/services/variant-types";
import * as productsService from "@/services/products/index";
import { useHasPermission } from "@/hooks/use-permission";
import { useCurrency, Country } from "@/contexts/currency-context";

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
  const { selectedCountry, convertAmount, getCurrencyCode } = useCurrency();

  // Ref to track previous country to prevent infinite loops
  const previousCountryRef = React.useRef<Country | null>(null);

  const [categories, setCategories] = React.useState<Option[]>([]);
  const [brands, setBrands] = React.useState<Option[]>([]);
  const [taxes, setTaxes] = React.useState<Option[]>([]);
  const [suppliers, setSuppliers] = React.useState<Option[]>([]);
  const [warehouses, setWarehouses] = React.useState<Option[]>([]);
  const [variantTypes, setVariantTypes] = React.useState<Option[]>([]);
  const [customerVisibilityGroups, setCustomerVisibilityGroups] = React.useState<Option[]>([]);
  const [recentlyAddedVariantTypes, setRecentlyAddedVariantTypes] = React.useState<Set<string>>(new Set());

  const [values, setValues] = React.useState(() => ({
    title: "",
    description: "",
    category_id: "",
    brand_id: "",
    supplier_id: "",
    tax_id: "",
    warehouse_id: "",
    customer_groups: [] as string[],
    visibility_wholesale: true,
    visibility_retail: true,
    is_active: true,

    selling_price: "",
    currency: getCurrencyCode(),
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

    product_img_url: "",
    product_video_url: "",
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

  const [featuredImage, setFeaturedImage] = React.useState<MediaItem | null>(null); // Single featured image
  const [galleryImages, setGalleryImages] = React.useState<MediaItem[]>([]); // Gallery images (max 4)
  const [bulkPricing, setBulkPricing] = React.useState<BulkPricingRow[]>([
    { id: crypto.randomUUID(), quantity: "", price: "" },
  ]);
  const [uploadProgress, setUploadProgress] = React.useState<{ featured: number; gallery: number; video: number }>({ featured: 0, gallery: 0, video: 0 });
  const imageProgress = Math.max(uploadProgress.featured, uploadProgress.gallery);
  const [uploadErrors, setUploadErrors] = React.useState<string[]>([]);
  const [isUploading, setIsUploading] = React.useState(false);
  const [createdProductId, setCreatedProductId] = React.useState<string | null>(null);
  const featuredImageInputRef = React.useRef<HTMLInputElement | null>(null);
  const galleryImagesInputRef = React.useRef<HTMLInputElement | null>(null);
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
        // For create form: Only show default variant types (size, model, year) - custom variants are created per product
        const defaultVariantTypes = ["size", "model", "year"];
        const allVariantTypes = (vt ?? []).map((v: any) => ({ id: v.value, name: v.label }));
        // Filter to only show default variant types
        const filteredVariantTypes = allVariantTypes.filter((vt: any) => 
          defaultVariantTypes.includes(vt.name.toLowerCase())
        );
        setVariantTypes(filteredVariantTypes);
        setCustomerVisibilityGroups((cvg ?? []).map((c: any) => ({ id: c.value, name: c.label })));
      } catch {
        // ignore UI-only page for now
      }
    })();

    return () => ac.abort();
  }, []);

  // Update form values when selected country changes
  React.useEffect(() => {
    if (!selectedCountry) return;

    const targetCurrency = Object.keys(selectedCountry.currencies)[0];
    const sourceCurrency = values.currency;
    
    // Only update if currency is different from current
    if (sourceCurrency === targetCurrency) return;

    console.log('🔄 Converting prices from', sourceCurrency, 'to', targetCurrency);

    const convertField = async (value: string): Promise<string> => {
      const numValue = Number(value) || 0;
      if (numValue === 0) return value;
      
      try {
        const converted = await convertAmount(numValue, sourceCurrency, targetCurrency);
        return String(converted);
      } catch (error) {
        console.error('Error converting field value:', error);
        return value;
      }
    };

    const updatePrices = async () => {
      const updatedValues = {
        ...values,
        currency: targetCurrency,
        selling_price: await convertField(values.selling_price),
        cost: await convertField(values.cost),
        freight: await convertField(values.freight),
        total_price: await convertField(values.total_price),
      };

      setValues(updatedValues);

      // Update bulk pricing
      const updatedBulkPricing = await Promise.all(
        bulkPricing.map(async (row) => ({
          ...row,
          price: await convertField(row.price),
        }))
      );
      setBulkPricing(updatedBulkPricing);
    };

    updatePrices();
  }, [selectedCountry?.cca2]);

  // Cleanup blob URLs
  React.useEffect(() => {
    return () => {
      if (featuredImage?.url.startsWith("blob:")) {
        URL.revokeObjectURL(featuredImage.url);
      }
      galleryImages.forEach((m) => {
        if (m.url.startsWith("blob:")) URL.revokeObjectURL(m.url);
      });
    };
  }, [featuredImage, galleryImages]);

  // Handle featured image (single)
  const handleFeaturedImage = (files: FileList | null) => {
    if (!files?.length) return;
    const file = files[0]; // Only take first file

    const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
    const maxImageSize = 5 * 1024 * 1024; // 5MB

    if (!allowedImageTypes.includes(file.type)) {
      setUploadErrors([`Invalid image type: ${file.name}. Only JPEG, PNG, and WebP are allowed`]);
      return;
    }
    if (file.size > maxImageSize) {
      setUploadErrors([`Image ${file.name} is too large. Maximum size is 5MB`]);
      return;
    }

    // Cleanup previous featured image
    if (featuredImage?.url.startsWith("blob:")) {
      URL.revokeObjectURL(featuredImage.url);
    }

    setFeaturedImage({
      id: crypto.randomUUID(),
      kind: "image",
      file,
      url: URL.createObjectURL(file),
    });
    setUploadErrors([]);
  };

  const removeFeaturedImage = () => {
    if (featuredImage?.url.startsWith("blob:")) {
      URL.revokeObjectURL(featuredImage.url);
    }
    setFeaturedImage(null);
  };

  // Handle gallery images (multiple, max 4)
  const handleGalleryImages = (files: FileList | null) => {
    if (!files?.length) return;

    const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
    const maxImageSize = 5 * 1024 * 1024; // 5MB
    const maxGalleryImages = 4;

    const next: MediaItem[] = [];
    const errors: string[] = [];

    for (const file of Array.from(files)) {
      if (galleryImages.length + next.length >= maxGalleryImages) {
        errors.push(`Maximum ${maxGalleryImages} gallery images allowed`);
        break;
      }
      if (!allowedImageTypes.includes(file.type)) {
        errors.push(`Invalid image type: ${file.name}. Only JPEG, PNG, and WebP are allowed`);
        continue;
      }
      if (file.size > maxImageSize) {
        errors.push(`Image ${file.name} is too large. Maximum size is 5MB`);
        continue;
      }

      next.push({
        id: crypto.randomUUID(),
        kind: "image",
        file,
        url: URL.createObjectURL(file),
      } as MediaItem);
    }

    if (errors.length > 0) {
      setUploadErrors(errors);
    }

    if (next.length > 0) {
      setGalleryImages((p) => [...p, ...next]);
      setUploadErrors([]);
    }
  };

  const removeGalleryImage = (id: string) => {
    setGalleryImages((p) => {
      const target = p.find((x) => x.id === id);
      if (target?.url.startsWith("blob:")) {
        URL.revokeObjectURL(target.url);
      }
      return p.filter((x) => x.id !== id);
    });
  };

  // Handle video (single)
  const [videoFile, setVideoFile] = React.useState<MediaItem | null>(null);

  const handleVideo = (files: FileList | null) => {
    if (!files?.length) return;
    const file = files[0]; // Only take first file

    const allowedVideoTypes = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"];
    const maxVideoSize = 50 * 1024 * 1024; // 50MB

    if (videoFile) {
      setUploadErrors(["Only one video is allowed per product"]);
      return;
    }
    if (!allowedVideoTypes.includes(file.type)) {
      setUploadErrors([`Invalid video type: ${file.name}. Only MP4, WebM, OGG, and QuickTime are allowed`]);
      return;
    }
    if (file.size > maxVideoSize) {
      setUploadErrors([`Video ${file.name} is too large. Maximum size is 50MB`]);
      return;
    }

    setVideoFile({
      id: crypto.randomUUID(),
      kind: "video",
      file,
      url: URL.createObjectURL(file),
    });
    setUploadErrors([]);
  };

  const removeVideo = () => {
    if (videoFile?.url.startsWith("blob:")) {
      URL.revokeObjectURL(videoFile.url);
    }
    setVideoFile(null);
  };

  const deleteVariantOption = async (variantId: string, variantKey: string) => {
    try {
      const response = await deleteVariantType(variantId);
      if (response.status) {
        // Remove from recently added list
        setRecentlyAddedVariantTypes((prev) => {
          const newSet = new Set(prev);
          newSet.delete(variantId);
          return newSet;
        });
        
        // Remove from variant types dropdown
        setVariantTypes((p) => p.filter((v) => v.id !== variantId));
        
        // Remove from local state
        setVariantOptions((p) => p.filter((k) => k !== variantKey));
        setVariantSelected((p) => {
          const newSelected = { ...p };
          delete newSelected[variantKey];
          return newSelected;
        });
        setVariantValues((p) => {
          const newValues = { ...p };
          delete newValues[variantKey];
          return newValues;
        });
      }
    } catch (error) {
      console.error("Failed to delete variant type:", error);
      // Could show toast notification here
    }
  };

  const selectedVariantKeys = React.useMemo(() => {
    return variantOptions.filter((k) => Boolean(variantSelected[k]));
  }, [variantOptions, variantSelected]);

  const addVariantOption = async () => {
    const raw = newVariantName.trim();
    if (!raw) return;
    const key = raw.toLowerCase().replace(/\s+/g, " ");
    if (!key) return;
    
    // Check if variant type already exists in the list
    if (variantOptions.includes(key)) {
      setVariantSelected((p) => ({ ...p, [key]: true }));
      setVariantsOpen(true);
      setNewVariantName("");
      return;
    }
    
    try {
      // Create new variant type via API
      const response = await createVariantType(raw);
      if (response.status) {
        const newVariantId = response.data.id;
        
        // Add to local state
        setVariantOptions((p) => [...p, key]);
        setVariantSelected((p) => ({ ...p, [key]: true }));
        setVariantValues((p) => ({ ...p, [key]: "" }));
        
        // Add to recently added list for deletion option
        setRecentlyAddedVariantTypes((prev) => new Set([...prev, newVariantId]));
        
        // Add to variant types dropdown
        setVariantTypes((p) => [...p, { id: newVariantId, name: raw }]);
        
        setVariantsOpen(true);
        setNewVariantName("");
      }
    } catch (error) {
      console.error("Failed to create variant type:", error);
      // Could show toast notification here
    }
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
    const discountPercent = Number(values.discount);

    const sellingN = Number.isFinite(selling) ? selling : 0;
    const costN = Number.isFinite(cost) ? cost : 0;
    const freightN = Number.isFinite(freight) ? freight : 0;
    const discountPercentN = Number.isFinite(discountPercent) ? discountPercent : 0;

    const totalCost = sellingN + costN + freightN;
    const priceAfterDiscount = totalCost - (totalCost * discountPercentN) / 100;

    return {
      totalCost,
      priceAfterDiscount,
    };
  }, [values.selling_price, values.cost, values.freight, values.discount]);

  const addBulkRow = () => {
    setBulkPricing((p) => [...p, { id: crypto.randomUUID(), quantity: "", price: "" }]);
  };

  const removeBulkRow = (id: string) => {
    setBulkPricing((p) => (p.length <= 1 ? p : p.filter((r) => r.id !== id)));
  };

  const canSave = canCreate && productDetailsComplete;

  const saveProduct = async () => {
    if (!canSave || isUploading) return; // Prevent double submission

    setIsUploading(true);
    setUploadErrors([]);

    try {
      // Calculate total_price as price after discount
      const basePrice = Number(values.selling_price) || 0;
      const cost = Number(values.cost) || 0;
      const freight = Number(values.freight) || 0;
      const discountPercent = Number(values.discount) || 0;
      
      const totalCost = basePrice + cost + freight;
      const priceAfterDiscount = discountPercent > 0 
        ? totalCost - (totalCost * discountPercent) / 100 
        : totalCost;

      // Convert prices to USD for backend storage
      const sourceCurrency = getCurrencyCode();
      const targetCurrency = 'USD';
      
      let convertedPrice = basePrice;
      let convertedCost = cost;
      let convertedFreight = freight;
      let convertedTotalPrice = priceAfterDiscount;

      if (sourceCurrency !== targetCurrency) {
        try {
          [convertedPrice, convertedCost, convertedFreight, convertedTotalPrice] = await Promise.all([
            convertAmount(basePrice, sourceCurrency, targetCurrency),
            convertAmount(cost, sourceCurrency, targetCurrency),
            convertAmount(freight, sourceCurrency, targetCurrency),
            convertAmount(priceAfterDiscount, sourceCurrency, targetCurrency),
          ]);
        } catch (error) {
          console.error('Currency conversion failed:', error);
          setUploadErrors(prev => [...prev, 'Currency conversion failed. Please try again.']);
          return;
        }
      }

      // Prepare variants data
      const variantsData = selectedVariantKeys
        .filter(key => variantValues[key]?.trim()) // Only include variants with values
        .map(key => {
          // Find variant type ID by matching name (case-insensitive)
          const variantType = variantTypes.find(
            vt => vt.name.toLowerCase().trim() === key.toLowerCase().trim()
          );
          
          if (!variantType) {
            console.warn(`Variant type not found for key: ${key}`);
            return null;
          }
          
          return {
            vtype_id: variantType.id,
            value: variantValues[key].trim(),
          };
        })
        .filter((v): v is { vtype_id: string; value: string } => v !== null);

      // Prepare product data
      const productData = {
        title: values.title.trim(),
        description: values.description.trim(),
        price: convertedPrice,
        stock_quantity: Number(values.stock_quantity) || 0,
        category_id: values.category_id,
        brand_id: values.brand_id,
        currency: targetCurrency, // Always store as USD
        is_active: Boolean(values.is_active),
        supplier_id: values.supplier_id || undefined,
        tax_id: values.tax_id || undefined,
        warehouse_id: values.warehouse_id || undefined,
        discount: discountPercent > 0 ? discountPercent : undefined,
        start_discount_date: values.start_discount_date || undefined,
        end_discount_date: values.end_discount_date || undefined,
        total_price: convertedTotalPrice,
        weight: values.weight ? Number(values.weight) : undefined,
        length: values.length ? Number(values.length) : undefined,
        width: values.width ? Number(values.width) : undefined,
        height: values.height ? Number(values.height) : undefined,
        cost: convertedCost > 0 ? convertedCost : undefined,
        freight: convertedFreight > 0 ? convertedFreight : undefined,
        customer_groups: values.customer_groups.length > 0 ? { cvg_ids: values.customer_groups } : undefined,
        variants: variantsData.length > 0 ? variantsData : undefined,
        bulk_prices: await Promise.all(
          bulkPricing
            .filter(row => row.quantity && row.price)
            .map(async (row) => {
              const bulkPrice = Number(row.price);
              const convertedBulkPrice = sourceCurrency !== targetCurrency 
                ? await convertAmount(bulkPrice, sourceCurrency, targetCurrency)
                : bulkPrice;
              
              return {
                quantity: Number(row.quantity),
                price_per_product: convertedBulkPrice,
              };
            })
          ),
      };

      // Create product first
      const createdProduct = await productsService.createProduct(productData);
      const productId = typeof createdProduct === 'string' ? createdProduct : createdProduct.id || String(createdProduct);
      setCreatedProductId(productId);

      // Upload featured image if any
      if (featuredImage) {
        try {
          setUploadProgress(prev => ({ ...prev, featured: 1 }));
          const featuredResponse = await productsService.uploadFeaturedImage(productId, featuredImage.file);
          setUploadProgress(prev => ({ ...prev, featured: 100 }));
          // Backend already updates product_img_url automatically, no need for extra update
          console.log("Featured image uploaded successfully:", featuredResponse);
        } catch (error: any) {
          console.error("Featured image upload error:", error);
          setUploadErrors(prev => [...prev, `Featured image upload failed: ${error.message}`]);
        }
      }

      // Upload gallery images if any
      if (galleryImages.length > 0) {
        try {
          setUploadProgress(prev => ({ ...prev, gallery: 1 }));
          const galleryFiles = galleryImages.map(m => m.file);
          await productsService.uploadProductImages(productId, galleryFiles);
          setUploadProgress(prev => ({ ...prev, gallery: 100 }));
        } catch (error: any) {
          setUploadErrors(prev => [...prev, `Gallery images upload failed: ${error.message}`]);
        }
      }

      // Upload video if any
      if (videoFile) {
        try {
          setUploadProgress(prev => ({ ...prev, video: 1 }));
          await productsService.uploadProductVideo(productId, videoFile.file);
          // Backend already updates product_video_url in database
          setUploadProgress(prev => ({ ...prev, video: 100 }));
        } catch (error: any) {
          setUploadErrors(prev => [...prev, `Video upload failed: ${error.message}`]);
        }
      }

      // Don't write to localStorage - product is already in backend
      // The products page should fetch from backend API, not localStorage
      // Writing to localStorage causes duplicate products in the UI
      
      // Show success message and redirect
      // Note: uploadErrors state will be checked after the function completes
      // Errors are already added to state during the upload process
      router.push("/dashboard/products");
    } catch (error: any) {
      setUploadErrors(prev => [...prev, `Product creation failed: ${error.message}`]);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <PermissionBoundary screen="/dashboard/products/new" mode="block">
      <div className="space-y-6 scrollbar-stable">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold truncate">Add Product</h1>
            <p className="mt-1 text-sm text-muted-foreground">Create a new product</p>
          </div>

          <Button disabled={!canSave || isUploading} onClick={saveProduct}>
            {isUploading ? "Saving..." : "Save Product"}
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
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Tax</Label>
                <Select
                  value={values.tax_id}
                  onValueChange={(v) => setValues((p) => ({ ...p, tax_id: v }))}
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Select tax" />
                  </SelectTrigger>
                  <SelectContent>
                    {taxes.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Warehouse</Label>
                <Select
                  value={values.warehouse_id}
                  onValueChange={(v) => setValues((p) => ({ ...p, warehouse_id: v }))}
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Select warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
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
                      const variantType = variantTypes.find(v => v.name.toLowerCase() === k);
                      const isRecentlyAdded = variantType ? recentlyAddedVariantTypes.has(variantType.id) : false;
                      
                      return (
                        <div key={k} className="flex items-center justify-between">
                          <label className="flex items-center gap-2 text-sm flex-1">
                            <Checkbox
                              checked={Boolean(variantSelected[k])}
                              onCheckedChange={() =>
                                setVariantSelected((p) => ({ ...p, [k]: !p[k] }))
                              }
                            />
                            <span>{label}</span>
                          </label>
                          {isRecentlyAdded && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                              onClick={() => deleteVariantOption(variantType!.id, k)}
                            >
                              ×
                            </Button>
                          )}
                        </div>
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
              <Label>Customer visibility groups</Label>
              <div className="space-y-2">
                {customerVisibilityGroups.map((group) => (
                  <label key={group.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={values.customer_groups.includes(group.id)}
                      onCheckedChange={() => {
                        setValues((p) => {
                          const groups = p.customer_groups.includes(group.id)
                            ? p.customer_groups.filter((id) => id !== group.id)
                            : [...p.customer_groups, group.id];
                          return { ...p, customer_groups: groups };
                        });
                      }}
                    />
                    <span>{group.name}</span>
                  </label>
                ))}
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

                  <div className="space-y-2">
                    <Label htmlFor="currency" className="text-sm font-medium text-gray-700">
                      Currency
                    </Label>
                    <Input
                      id="currency"
                      name="currency"
                      value={getCurrencyCode()}
                      readOnly
                      className="bg-gray-100 cursor-not-allowed"
                      placeholder="Currency will be set based on your selection"
                    />
                    <p className="text-xs text-gray-500">
                      Currency is automatically set based on your global selection
                    </p>
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
                  <Label>Tax Rate</Label>
                  <Select
                    value={values.tax_id}
                    onValueChange={(v) => setValues((p) => ({ ...p, tax_id: v }))}
                  >
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue placeholder="Select tax" />
                    </SelectTrigger>
                    <SelectContent>
                      {taxes.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
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
                      value={values.discount}
                      onChange={(e) =>
                        setValues((p) => ({
                          ...p,
                          discount: e.target.value,
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
                        value={values.start_discount_date}
                        onChange={(e) =>
                          setValues((p) => ({
                            ...p,
                            start_discount_date: e.target.value,
                          }))
                        }
                      />
                      <Input
                        type="date"
                        value={values.end_discount_date}
                        onChange={(e) =>
                          setValues((p) => ({
                            ...p,
                            end_discount_date: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Total Price - Auto Calculated */}
                <div className="grid gap-2">
                  <Label>Final Price (After Discount)</Label>
                  <div className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    {pricing.priceAfterDiscount.toFixed(2)} {values.currency}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Automatically calculated: (Selling Price + Cost + Freight) - Discount
                  </p>
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
                <div className="space-y-6">
                  {/* Featured Image Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium">Featured Image</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Primary image for product listing (JPEG, PNG, WebP - max 5MB)
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => featuredImageInputRef.current?.click()}
                      >
                        <Upload className="h-4 w-4" />
                        {featuredImage ? "Change" : "Add Featured Image"}
                      </Button>
                    </div>
                    
                    <input
                      ref={featuredImageInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        handleFeaturedImage(e.target.files);
                        if (featuredImageInputRef.current) featuredImageInputRef.current.value = "";
                      }}
                    />
                    
                    <div className="rounded-xl border p-3">
                      {!featuredImage ? (
                        <div className="p-8 text-center text-sm text-muted-foreground">
                          No featured image uploaded yet. This will be used as the primary product image.
                        </div>
                      ) : (
                        <div className="relative h-48 w-full max-w-md overflow-hidden rounded-lg border bg-muted">
                          <Image
                            src={featuredImage.url}
                            alt={featuredImage.file.name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 50vw"
                          />
                          <button
                            type="button"
                            onClick={removeFeaturedImage}
                            className="absolute right-2 top-2 rounded-full bg-red-600 p-2 text-white hover:bg-red-700"
                            aria-label="Remove featured image"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Gallery Images Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium">Gallery Images</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Additional images for product detail page (max 4 images - JPEG, PNG, WebP)
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => galleryImagesInputRef.current?.click()}
                        disabled={galleryImages.length >= 4}
                      >
                        <Upload className="h-4 w-4" />
                        Add Gallery Images
                      </Button>
                    </div>
                    
                    <input
                      ref={galleryImagesInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        handleGalleryImages(e.target.files);
                        if (galleryImagesInputRef.current) galleryImagesInputRef.current.value = "";
                      }}
                    />
                    
                    <div className="rounded-xl border p-3">
                      {galleryImages.length === 0 ? (
                        <div className="p-8 text-center text-sm text-muted-foreground">
                          No gallery images uploaded yet. Add up to 4 additional images.
                        </div>
                      ) : (
                        <div className="flex gap-3 overflow-x-auto scrollbar-stable">
                          {galleryImages.map((m) => (
                            <div
                              key={m.id}
                              className="relative h-24 w-32 shrink-0 overflow-hidden rounded-lg border bg-muted"
                            >
                              <Image
                                src={m.url}
                                alt={m.file.name}
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                              />
                              <button
                                type="button"
                                onClick={() => removeGalleryImage(m.id)}
                                className="absolute right-1 top-1 rounded-full bg-red-600 p-1 text-white hover:bg-red-700"
                                aria-label="Remove gallery image"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                {/* Video Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Product Video</h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => videoInputRef.current?.click()}
                    >
                      <Video className="h-4 w-4" />
                      Add Video
                    </Button>
                  </div>
                  
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/ogg,video/quicktime"
                    className="hidden"
                    onChange={(e) => {
                      handleVideo(e.target.files);
                      if (videoInputRef.current) videoInputRef.current.value = "";
                    }}
                  />
                  
                  <div className="rounded-xl border p-3">
                    {!videoFile ? (
                      <div className="p-8 text-center text-sm text-muted-foreground">
                        No video uploaded yet. Add one video (MP4, WebM, OGG, QuickTime - max 50MB).
                      </div>
                    ) : (
                      <div className="relative h-48 w-full max-w-md overflow-hidden rounded-lg border bg-muted">
                        <video
                          src={videoFile.url}
                          className="h-full w-full object-cover"
                          controls
                          muted
                          preload="metadata"
                        />
                        <button
                          type="button"
                          onClick={removeVideo}
                          className="absolute right-2 top-2 rounded-full bg-red-600 p-2 text-white hover:bg-red-700"
                          aria-label="Remove video"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Upload Progress */}
              {isUploading && (
                <div className="mt-4 space-y-2">
                  {uploadProgress.gallery > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Uploading images...</span>
                        <span>{uploadProgress.gallery}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress.gallery}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {uploadProgress.video > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Uploading video...</span>
                        <span>{uploadProgress.video}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress.video}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Upload Errors */}
              {uploadErrors.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="text-sm font-medium text-red-600">Upload Errors:</div>
                  {uploadErrors.map((error, index) => (
                    <div key={index} className="text-xs text-red-600 bg-red-50 p-2 rounded">
                      {error}
                    </div>
                  ))}
                  {createdProductId && (
                    <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                      Product was created but some media failed to upload. You can try uploading the media again from the product edit page.
                    </div>
                  )}
                </div>
              )}
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Inventory and shipping</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
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
