"use client";

import * as React from "react";
import { ImageIcon, Play, Upload, Video, Star, X } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { DateRange } from "react-day-picker";

import galleryImageLogo from "../../../../../logos/gallery image logo.png";

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
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { ENTITY_PERMS } from "@/rbac/permissions-map";
import { getAllBrandsDropdown, getAllCategoriesDropdown, getAllTaxesDropdown, getAllSuppliersDropdown, getAllWarehousesDropdown, getAllCustomerVisibilityGroupsDropdown } from "@/services/dropdowns";
import * as productsService from "@/services/products/index";
import { listTaxes } from "@/services/taxes";
import { useHasPermission } from "@/hooks/use-permission";
import { useCurrency, Country } from "@/contexts/currency-context";

type Option = { id: string; name: string };
type TaxRecord = { id: string; title: string; rate: number };

type BulkPricingRow = { id: string; quantity: string; price: string };

type UrlImageItem = { id: string; url: string };

type UrlMediaBox = {
  imageUrlInput: string;
  images: UrlImageItem[];
  videoUrlInput: string;
  videoUrl: string;
};

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

  const normalizeVariantKey = React.useCallback((name: string) => {
    return String(name || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }, []);

  // Ref to track previous country to prevent infinite loops
  const previousCountryRef = React.useRef<Country | null>(null);

  const [categories, setCategories] = React.useState<Option[]>([]);
  const [brands, setBrands] = React.useState<Option[]>([]);
  const [taxes, setTaxes] = React.useState<Option[]>([]);
  const [taxRows, setTaxRows] = React.useState<TaxRecord[]>([]);
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

  const [featuredImage, setFeaturedImage] = React.useState<MediaItem | null>(null);
  const [featuredBoxImages, setFeaturedBoxImages] = React.useState<MediaItem[]>([]);
  const [featuredBoxCarouselIndex, setFeaturedBoxCarouselIndex] = React.useState(0);
  const featuredImageInputRef = React.useRef<HTMLInputElement | null>(null);

  const [videoFile, setVideoFile] = React.useState<MediaItem | null>(null);
  const videoInputRef = React.useRef<HTMLInputElement | null>(null);

  const urlImageInputRef = React.useRef<HTMLInputElement | null>(null);

  const [urlMediaBox, setUrlMediaBox] = React.useState<UrlMediaBox>(() => ({
    imageUrlInput: "",
    images: [],
    videoUrlInput: "",
    videoUrl: "",
  }));
  const [urlImageCarouselIndex, setUrlImageCarouselIndex] = React.useState(0);
  const [bulkPricing, setBulkPricing] = React.useState<BulkPricingRow[]>([
    { id: crypto.randomUUID(), quantity: "", price: "" },
  ]);
  const [uploadErrors, setUploadErrors] = React.useState<string[]>([]);
  const [isUploading, setIsUploading] = React.useState(false);
  const [createdProductId, setCreatedProductId] = React.useState<string | null>(null);

  // Date range state for discount dates
  const [discountDateRange, setDiscountDateRange] = React.useState<DateRange | undefined>();

  // Helper functions to convert between date range and string values
  const dateRangeToStrings = (range: DateRange | undefined) => {
    if (!range) return { start: "", end: "" };
    return {
      start: range.from ? range.from.toISOString().split('T')[0] : "",
      end: range.to ? range.to.toISOString().split('T')[0] : ""
    };
  };

  const stringsToDateRange = (start: string, end: string) => {
    if (!start && !end) return undefined;
    return {
      from: start ? new Date(start + 'T00:00:00') : undefined,
      to: end ? new Date(end + 'T00:00:00') : undefined
    };
  };

  React.useEffect(() => {
    const ac = new AbortController();

    (async () => {
      try {
        const [cats, brs, tax, sup, wh, cvg, taxData, defaultVTypes] = await Promise.all([
          getAllCategoriesDropdown({ signal: ac.signal }),
          getAllBrandsDropdown({ signal: ac.signal }),
          getAllTaxesDropdown({ signal: ac.signal }),
          getAllSuppliersDropdown({ signal: ac.signal }),
          getAllWarehousesDropdown({ signal: ac.signal }),
          getAllCustomerVisibilityGroupsDropdown({ signal: ac.signal }),
          listTaxes(1, 100, undefined, { signal: ac.signal }),
          productsService.getDefaultVariantTypes(),
        ]);

        setCategories((cats ?? []).map((c: any) => ({ id: c.value, name: c.label })));
        setBrands((brs ?? []).map((b: any) => ({ id: b.value, name: b.label })));
        setTaxes((tax ?? []).map((t: any) => ({ id: t.value, name: t.label })));
        setSuppliers((sup ?? []).map((s: any) => ({ id: s.value, name: s.label })));
        setWarehouses((wh ?? []).map((w: any) => ({ id: w.value, name: w.label })));
        setTaxRows(taxData?.rows ?? []);
        // Load default variant types from API (size, model, year)
        const defaultVariantTypesData = defaultVTypes?.data ?? [];
        setVariantTypes(defaultVariantTypesData.map((vt: any) => ({ id: vt.id, name: vt.name })));
        setCustomerVisibilityGroups((cvg ?? []).map((c: any) => ({ id: c.value, name: c.label })));
      } catch (error: any) {
        if (error?.code === "ERR_CANCELED" || error?.message === "canceled") return;
        console.error("Failed to load dropdowns or tax records:", error);
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

    console.log(' Converting prices from', sourceCurrency, 'to', targetCurrency);

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

  // Sync date range changes to values state
  React.useEffect(() => {
    const dateString = dateRangeToStrings(discountDateRange);
    setValues(prev => ({
      ...prev,
      start_discount_date: dateString.start,
      end_discount_date: dateString.end
    }));
  }, [discountDateRange]);

  // Cleanup blob URLs
  React.useEffect(() => {
    return () => {
      featuredBoxImages.forEach((m) => {
        if (m.url.startsWith("blob:")) URL.revokeObjectURL(m.url);
      });
      if (videoFile?.url?.startsWith("blob:")) {
        URL.revokeObjectURL(videoFile.url);
      }
    };
  }, [featuredBoxImages, videoFile]);

  React.useEffect(() => {
    setFeaturedBoxCarouselIndex((prev) => {
      if (featuredBoxImages.length === 0) return 0;
      return Math.min(prev, featuredBoxImages.length - 1);
    });
  }, [featuredBoxImages.length]);

  React.useEffect(() => {
    setUrlImageCarouselIndex((prev) => {
      if (urlMediaBox.images.length === 0) return 0;
      return Math.min(prev, urlMediaBox.images.length - 1);
    });
  }, [urlMediaBox.images.length]);

  const handleFeaturedImage = (files: FileList | null) => {
    if (!files?.length) return;

    const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
    const maxImageSize = 5 * 1024 * 1024;
    const maxFeaturedBoxImages = 9;

    const next: MediaItem[] = [];
    const errors: string[] = [];

    for (const file of Array.from(files)) {
      if (featuredBoxImages.length + next.length >= maxFeaturedBoxImages) {
        errors.push("You cannot add more images because your image limit has been reached.");
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
      });
    }

    if (errors.length > 0) setUploadErrors(errors);

    if (next.length > 0) {
      setFeaturedBoxImages((prev) => {
        const merged = [...prev, ...next];
        if (!featuredImage && merged.length > 0) {
          setFeaturedImage(merged[0]);
        }
        return merged;
      });
      setUploadErrors([]);
    }
  };

  const removeFeaturedImage = (id?: string) => {
    if (!id) {
      setFeaturedBoxImages((prev) => {
        prev.forEach((m) => {
          if (m.url.startsWith("blob:")) URL.revokeObjectURL(m.url);
        });
        return [];
      });
      setFeaturedImage(null);
      setFeaturedBoxCarouselIndex(0);
      return;
    }

    setFeaturedBoxImages((prev) => {
      const target = prev.find((x) => x.id === id);
      if (target?.url.startsWith("blob:")) URL.revokeObjectURL(target.url);
      const next = prev.filter((x) => x.id !== id);
      if (featuredImage?.id === id) {
        setFeaturedImage(next[0] ?? null);
      }
      return next;
    });
  };

  const setFeaturedBoxImageAsFeatured = (id: string) => {
    // Clear featured image from URL if setting gallery image as featured
    if (urlMediaBox.images.length > 0) {
      setUrlMediaBox((prev) => {
        const firstImage = prev.images[0];
        if (firstImage) {
          const remaining = prev.images.slice(1);
          return { ...prev, images: [...remaining, firstImage] };
        }
        return prev;
      });
    }
    
    const img = featuredBoxImages.find((x) => x.id === id) ?? null;
    if (!img) return;
    setFeaturedImage(img);
  };

  const handleVideo = (files: FileList | null) => {
    if (!files?.length) return;
    const file = files[0];

    const allowedVideoTypes = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"];
    const maxVideoSize = 50 * 1024 * 1024;

    if (!allowedVideoTypes.includes(file.type)) {
      setUploadErrors([`Invalid video type: ${file.name}. Only MP4, WebM, OGG, and QuickTime are allowed`]);
      return;
    }
    if (file.size > maxVideoSize) {
      setUploadErrors([`Video ${file.name} is too large. Maximum size is 50MB`]);
      return;
    }

    if (videoFile?.url?.startsWith("blob:")) URL.revokeObjectURL(videoFile.url);

    setVideoFile({
      id: crypto.randomUUID(),
      kind: "video",
      file,
      url: URL.createObjectURL(file),
    });
    setUploadErrors([]);
  };

  const removeVideo = () => {
    if (videoFile?.url?.startsWith("blob:")) URL.revokeObjectURL(videoFile.url);
    setVideoFile(null);
  };

  const totalGalleryUrlImages = featuredBoxImages.length + urlMediaBox.images.length;
  const remainingUrlImageSlots = Math.max(0, 9 - totalGalleryUrlImages);

  const setUrlBoxField = (patch: Partial<UrlMediaBox>) => {
    setUrlMediaBox((prev) => ({ ...prev, ...patch }));
  };

  const addImageUrlToBox = () => {
    const raw = urlMediaBox.imageUrlInput.trim();
    if (!raw) return;

    if (totalGalleryUrlImages >= 9) {
      setUploadErrors(["You cannot add more images because your image limit has been reached."]);
      return;
    }

    if (!/^https?:\/\//i.test(raw)) {
      setUploadErrors(["Please enter a valid image URL."]);
      return;
    }

    setUrlMediaBox((prev) => ({
      ...prev,
      images: [...prev.images, { id: crypto.randomUUID(), url: raw }],
      imageUrlInput: "",
    }));
    setUploadErrors([]);
  };

  const removeImageUrlFromBox = (id: string) => {
    setUrlMediaBox((prev) => ({ ...prev, images: prev.images.filter((x) => x.id !== id) }));
  };

  const setUrlImageAsFeatured = (id: string) => {
    // Clear featured image from gallery if setting URL image as featured
    if (featuredImage && featuredBoxImages.some(img => img.id === featuredImage.id)) {
      setFeaturedImage(null);
    }
    
    setUrlMediaBox((prev) => {
      const index = prev.images.findIndex((x) => x.id === id);
      if (index === -1) return prev;
      const selected = prev.images[index];
      const remaining = prev.images.filter((x) => x.id !== id);
      return { ...prev, images: [selected, ...remaining] };
    });
  };

  const addVideoUrlToBox = () => {
    const raw = urlMediaBox.videoUrlInput.trim();
    if (!raw) return;
    if (!/^https?:\/\//i.test(raw)) {
      setUploadErrors(["Please enter a valid video URL."]);
      return;
    }

    setUrlMediaBox((prev) => ({ ...prev, videoUrl: raw }));
    setUploadErrors([]);
  };

  const removeVideoFromBox = () => {
    setUrlMediaBox((prev) => ({ ...prev, videoUrl: "", videoUrlInput: "" }));
  };

  // Note: Custom variants cannot be deleted on new product page since product doesn't exist yet
  // Custom variants are only added after product creation in edit page
  const deleteVariantOption = async (variantId: string, variantKey: string) => {
    // Do nothing - custom variants can only be managed after product is created
    console.log("Custom variants can only be deleted after product is created");
  };

  const selectedVariantKeys = React.useMemo(() => {
    return variantOptions.filter((k) => Boolean(variantSelected[k]));
  }, [variantOptions, variantSelected]);

  // Note: Custom variants cannot be added on new product page since product doesn't exist yet
  // Custom variants are only added after product creation in edit page
  const addVariantOption = async () => {
    const raw = newVariantName.trim();
    if (!raw) return;
    const key = normalizeVariantKey(raw);
    if (!key) return;

    // Check if variant type already exists in the list
    if (variantOptions.includes(key)) {
      setVariantSelected((p) => ({ ...p, [key]: true }));
      setVariantsOpen(true);
      setNewVariantName("");
      return;
    }

    // For new product page, just add to local state (not persisted until product is saved)
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

  const selectedTaxRate = React.useMemo(() => {
    const tax = taxRows.find((t) => t.id === values.tax_id);
    return tax?.rate ?? 0;
  }, [taxRows, values.tax_id]);

  const pricing = React.useMemo(() => {
    const selling = Number(values.selling_price) || 0;
    const freight = Number(values.freight) || 0;
    const discountPercent = Number(values.discount) || 0;

    const baseForTax = selling + freight;
    const taxAmount = baseForTax * (selectedTaxRate / 100);
    const totalCost = baseForTax + taxAmount;
    const priceAfterDiscount = totalCost - (totalCost * discountPercent) / 100;

    return {
      taxAmount,
      totalCost,
      priceAfterDiscount,
    };
  }, [
    values.selling_price,
    values.freight,
    values.discount,
    selectedTaxRate,
  ]);

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
      const firstUrlImage = urlMediaBox.images.map((x) => x.url).find(Boolean);
      const videoUrl = urlMediaBox.videoUrl.trim();

      // Calculate total_price as price after discount
      const basePrice = Number(values.selling_price) || 0;
      const cost = Number(values.cost) || 0;
      const freight = Number(values.freight) || 0;
      const discountPercent = Number(values.discount) || 0;

      const subtotal = basePrice + cost + freight;
      const taxAmount = subtotal * (selectedTaxRate / 100);
      const totalCost = subtotal + taxAmount;
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

      // Separate default variants (have vtype_id) from custom variants (need to be created)
      const defaultVariants: { vtype_id: string; value: string }[] = [];
      const customVariantNames: string[] = [];

      selectedVariantKeys.forEach((key) => {
        const normalizedKey = normalizeVariantKey(key);
        const variantType = variantTypes.find(
          (vt) => normalizeVariantKey(vt.name) === normalizedKey
        );

        if (variantType) {
          // This is a default variant (size, model, year)
          defaultVariants.push({
            vtype_id: variantType.id,
            value: String(variantValues[normalizedKey] ?? "").trim(),
          });
        } else {
          // This is a custom variant that needs to be created
          customVariantNames.push(normalizedKey);
        }
      });

      // Prepare product data with only default variants initially
      const productData = {
        title: values.title.trim(),
        description: values.description.trim(),
        price: convertedPrice,
        stock_quantity: Number(values.stock_quantity) || 0,
        category_id: values.category_id,
        brand_id: values.brand_id,
        currency: targetCurrency,
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
        variants: defaultVariants.length > 0 ? defaultVariants : undefined,
        product_img_url: featuredImage ? undefined : (firstUrlImage ? String(firstUrlImage).trim() : undefined),
        product_video_url: videoFile ? undefined : (videoUrl ? String(videoUrl).trim() : undefined),
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

      // Create custom variant types and update product with all variants
      if (customVariantNames.length > 0) {
        try {
          const customVariantTypes: { id: string; name: string }[] = [];

          // Create each custom variant type via API
          for (const customName of customVariantNames) {
            const response = await productsService.createCustomVariantType(productId, customName);
            if (response?.data?.id && response?.data?.name) {
              customVariantTypes.push({ id: response.data.id, name: response.data.name });
            }
          }

          // Now update product with all variants (default + custom)
          const allVariants = [
            ...defaultVariants,
            ...customVariantTypes.map((cvt) => ({
              vtype_id: cvt.id,
              value: String(variantValues[normalizeVariantKey(cvt.name)] ?? "").trim(),
            })),
          ];

          if (allVariants.length > 0) {
            await productsService.updateProduct({
              id: productId,
              title: values.title.trim(),
              price: convertedPrice,
              stock_quantity: Number(values.stock_quantity) || 0,
              category_id: values.category_id,
              brand_id: values.brand_id,
              currency: targetCurrency,
              variants: allVariants,
            });
          }
        } catch (error: any) {
          console.error("Failed to create custom variants:", error);
          const msg =
            error?.response?.data?.message ||
            error?.message ||
            "Custom variants creation failed";
          setUploadErrors((prev) => [...prev, `Custom variants creation failed: ${msg}`]);
        }
      }

      if (featuredImage) {
        try {
          await productsService.uploadFeaturedImage(productId, featuredImage.file);
        } catch (error: any) {
          setUploadErrors(prev => [...prev, `Featured image upload failed: ${error.message}`]);
        }
      }

      if (videoFile) {
        try {
          await productsService.uploadProductVideo(productId, videoFile.file);
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

          <Button disabled={!canSave || isUploading} onClick={saveProduct} className="bg-neutral-900 text-white hover:bg-neutral-800">
            {isUploading ? "Saving..." : "Save Product"}
          </Button>
        </div>

        <Card className="shadow-sm bg-gray-100">
          <CardHeader className="bg-gray-100">
            <CardTitle className="text-lg">Product details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 bg-gray-100">
            <div className="grid gap-2">
              <Label htmlFor="productName" className="font-semibold">Name <span className="text-red-500">*</span></Label>
              <Input
                id="productName"
                value={values.title}
                onChange={(e) => setValues((p) => ({ ...p, title: e.target.value }))}
                placeholder="Product name"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="productDescription" className="font-semibold">Description <span className="text-red-500">*</span></Label>
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

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label className="font-semibold">Category <span className="text-red-500">*</span></Label>
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
                <Label className="font-semibold">Brand <span className="text-red-500">*</span></Label>
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
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label className="font-semibold">Supplier <span className="text-red-500">*</span></Label>
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

              <div className="grid gap-2">
                <Label className="font-semibold">Warehouse <span className="text-red-500">*</span></Label>
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
              <Label className="font-semibold">Variants</Label>
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
                        <div key={k} className="flex items-center justify-between">
                          <label className="flex items-center gap-2 text-sm flex-1">
                            <Checkbox
                              checked={Boolean(variantSelected[k])}
                              onCheckedChange={() =>
                                setVariantSelected((p) => ({ ...p, [k]: !p[k] }))
                              }
                              className="data-[state=checked]:bg-neutral-700 data-[state=checked]:border-neutral-700"
                            />
                            <span>{label}</span>
                          </label>
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
                      <Label htmlFor={`variant-${k}`} className="font-semibold">{label}</Label>
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
              <Label className="font-semibold">Customer visibility groups</Label>
              <div className="flex flex-wrap gap-6">
                {customerVisibilityGroups.map((group) => (
                  <label key={group.id} className="flex items-center gap-2 text-sm text-neutral-700">
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
                      className="data-[state=checked]:bg-neutral-700 data-[state=checked]:border-neutral-700"
                    />
                    <span>{group.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border px-3 bg-white h-10">
              <p className="text-xs text-muted-foreground">
                {values.is_active ? "Active" : "Inactive"}
              </p>
              <Switch
                checked={values.is_active}
                onCheckedChange={(v) => setValues((p) => ({ ...p, is_active: v }))}
                className="data-[state=checked]:bg-green-600"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm bg-gray-100">
          <CardHeader className="bg-gray-100">
            <CardTitle className="text-lg">Pricing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 bg-gray-100">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="sellingPrice" className="font-semibold">Selling price <span className="text-red-500">*</span></Label>
                <Input
                  id="sellingPrice"
                  inputMode="decimal"
                  value={values.selling_price}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "" || /^\d*\.?\d*$/.test(v)) {
                      setValues((p) => ({ ...p, selling_price: v }));
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.ctrlKey || e.metaKey || e.altKey) return;
                    const allowed = [
                      "Backspace",
                      "Delete",
                      "Tab",
                      "Enter",
                      "Escape",
                      "ArrowLeft",
                      "ArrowRight",
                      "ArrowUp",
                      "ArrowDown",
                      "Home",
                      "End",
                    ];
                    if (allowed.includes(e.key)) return;
                    if (/^[0-9.]$/.test(e.key)) return;
                    e.preventDefault();
                  }}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency" className="text-sm font-semibold text-gray-700">
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
              </div>

              <div className="grid gap-2">
                <Label htmlFor="cost" className="font-semibold">Cost <span className="text-red-500">*</span></Label>
                <Input
                  id="cost"
                  inputMode="decimal"
                  value={values.cost}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "" || /^\d*\.?\d*$/.test(v)) {
                      setValues((p) => ({ ...p, cost: v }));
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.ctrlKey || e.metaKey || e.altKey) return;
                    const allowed = [
                      "Backspace",
                      "Delete",
                      "Tab",
                      "Enter",
                      "Escape",
                      "ArrowLeft",
                      "ArrowRight",
                      "ArrowUp",
                      "ArrowDown",
                      "Home",
                      "End",
                    ];
                    if (allowed.includes(e.key)) return;
                    if (/^[0-9.]$/.test(e.key)) return;
                    e.preventDefault();
                  }}
                  placeholder="0"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="freight" className="font-semibold">Freight</Label>
                <Input
                  id="freight"
                  inputMode="decimal"
                  value={values.freight}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "" || /^\d*\.?\d*$/.test(v)) {
                      setValues((p) => ({ ...p, freight: v }));
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.ctrlKey || e.metaKey || e.altKey) return;
                    const allowed = [
                      "Backspace",
                      "Delete",
                      "Tab",
                      "Enter",
                      "Escape",
                      "ArrowLeft",
                      "ArrowRight",
                      "ArrowUp",
                      "ArrowDown",
                      "Home",
                      "End",
                    ];
                    if (allowed.includes(e.key)) return;
                    if (/^[0-9.]$/.test(e.key)) return;
                    e.preventDefault();
                  }}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label className="font-semibold">Tax</Label>
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
              <div className="px-4 py-3 text-right">
                <div className="text-xs text-emerald-700">Total cost</div>
                <div className="text-xl font-bold text-neutral-900">
                  {values.currency} {pricing.totalCost.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="discount" className="font-semibold">Discount (%)</Label>
                <Input
                  id="discount"
                  inputMode="decimal"
                  value={values.discount}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "" || /^\d*\.?\d*$/.test(v)) {
                      setValues((p) => ({
                        ...p,
                        discount: v,
                      }));
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.ctrlKey || e.metaKey || e.altKey) return;
                    const allowed = [
                      "Backspace",
                      "Delete",
                      "Tab",
                      "Enter",
                      "Escape",
                      "ArrowLeft",
                      "ArrowRight",
                      "ArrowUp",
                      "ArrowDown",
                      "Home",
                      "End",
                    ];
                    if (allowed.includes(e.key)) return;
                    if (/^[0-9.]$/.test(e.key)) return;
                    e.preventDefault();
                  }}
                  placeholder="0"
                />
              </div>

              <div className="grid gap-2">
                <Label className="font-semibold">Start & end date</Label>
                <DateRangePicker
                  value={discountDateRange}
                  onChange={setDiscountDateRange}
                  placeholder="Select discount date range"
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <div className=" px-4 py-3 text-right">
                <div className="text-xs text-emerald-700">Price after discount</div>
                <div className="text-xl font-bold text-neutral-900">
                  {values.currency} {pricing.priceAfterDiscount.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-base font-semibold">Bulk pricing</div>
              <div className="space-y-2">
                {bulkPricing.map((row, idx) => (
                  <div key={row.id} className="grid gap-3 sm:grid-cols-2 sm:items-end">
                    <div className="grid gap-2">
                      <Label htmlFor={`bulkQty-${row.id}`} className="font-semibold">Quantity</Label>
                      <Input
                        id={`bulkQty-${row.id}`}
                        inputMode="numeric"
                        value={row.quantity}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (!(v === "" || /^\d*$/.test(v))) return;
                          setBulkPricing((p) =>
                            p.map((r) => (r.id === row.id ? { ...r, quantity: v } : r))
                          );
                        }}
                        onKeyDown={(e) => {
                          if (e.ctrlKey || e.metaKey || e.altKey) return;
                          const allowed = [
                            "Backspace",
                            "Delete",
                            "Tab",
                            "Enter",
                            "Escape",
                            "ArrowLeft",
                            "ArrowRight",
                            "ArrowUp",
                            "ArrowDown",
                            "Home",
                            "End",
                          ];
                          if (allowed.includes(e.key)) return;
                          if (/^[0-9]$/.test(e.key)) return;
                          e.preventDefault();
                        }}
                        placeholder="0"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor={`bulkPrice-${row.id}`} className="font-semibold">Price per product</Label>
                      <div className="flex items-end gap-2">
                        <Input
                          id={`bulkPrice-${row.id}`}
                          className="flex-1 min-w-0"
                          inputMode="decimal"
                          value={row.price}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (!(v === "" || /^\d*\.?\d*$/.test(v))) return;
                            setBulkPricing((p) =>
                              p.map((r) => (r.id === row.id ? { ...r, price: v } : r))
                            );
                          }}
                          onKeyDown={(e) => {
                            if (e.ctrlKey || e.metaKey || e.altKey) return;
                            const allowed = [
                              "Backspace",
                              "Delete",
                              "Tab",
                              "Enter",
                              "Escape",
                              "ArrowLeft",
                              "ArrowRight",
                              "ArrowUp",
                              "ArrowDown",
                              "Home",
                              "End",
                            ];
                            if (allowed.includes(e.key)) return;
                            if (/^[0-9.]$/.test(e.key)) return;
                            e.preventDefault();
                          }}
                          placeholder="0"
                        />
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={addBulkRow}>
                            +
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeBulkRow(row.id)}
                            disabled={bulkPricing.length <= 1 || idx === 0}
                          >
                            -
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm bg-gray-100">
          <CardHeader className="bg-gray-100">
            <CardTitle className="text-lg">Media</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 bg-gray-100">
            <div className="grid gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              <div className="flex h-full flex-col rounded-2xl border bg-white p-4 shadow-sm">

                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-neutral-900">Gallery Images</div>
                    <div className="mt-1 text-xs text-muted-foreground">Select up to 9 images; the first becomes featured.</div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => featuredImageInputRef.current?.click()}
                    disabled={featuredBoxImages.length >= 9}
                  >
                    <Upload className="h-4 w-4" />
                    Upload
                  </Button>
                </div>

                <input
                  ref={featuredImageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    handleFeaturedImage(e.target.files);
                    if (featuredImageInputRef.current) featuredImageInputRef.current.value = "";
                  }}
                />

                <div
                  className="mt-4 cursor-pointer rounded-2xl border border-dashed bg-neutral-50 p-4 transition-colors hover:bg-neutral-100"
                  onClick={() => featuredImageInputRef.current?.click()}
                >
                  {featuredBoxImages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200">
                        <ImageIcon className="h-6 w-6 text-neutral-700" />
                      </div>
                      <div className="text-sm font-medium text-neutral-800">Click to upload images</div>
                      <div className="text-xs text-neutral-500">Recommended: square image, high quality</div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">{featuredBoxImages.length}/9 uploaded</div>
                        <button
                          type="button"
                          className="text-sm font-semibold text-red-600 hover:text-red-700 focus-visible:text-red-700 disabled:text-red-300"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFeaturedImage();
                          }}
                        >
                          Clear All
                        </button>
                      </div>

                      {(() => {
                        const current = featuredBoxImages[featuredBoxCarouselIndex];
                        const isFeatured = Boolean(current && featuredImage?.id === current.id);
                        const canGoPrev = featuredBoxImages.length > 1;
                        const canGoNext = featuredBoxImages.length > 1;

                        if (!current) return null;

                        return (
                          <div className="relative mx-auto h-72 w-full max-w-md overflow-hidden rounded-xl border bg-muted group">
                            <Image
                              src={current.url}
                              alt={current.file.name}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 100vw, 33vw"
                            />

                            <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100" />

                            {isFeatured ? (
                              <div className="absolute left-2 top-2 rounded-full bg-yellow-500 px-2 py-0.5 text-[10px] font-medium text-white flex items-center gap-1">
                                <Star className="h-3 w-3 fill-current" />
                                Featured
                              </div>
                            ) : null}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFeaturedBoxImageAsFeatured(current.id);
                              }}
                              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md bg-white/90 px-4 py-1 text-xs font-semibold text-neutral-900 shadow-[0_10px_20px_rgba(15,23,42,0.2)] opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:-translate-y-0.5 group-hover:shadow-[0_14px_32px_rgba(15,23,42,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-neutral-500"
                            >
                              Set as Featured
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFeaturedImage(current.id);
                              }}
                              className="absolute right-2 top-2 p-1.5 text-white shadow-sm ring-1 ring-white/40 opacity-0 transition-all group-hover:opacity-100 hover:text-red-500 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                              aria-label="Remove image"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFeaturedBoxCarouselIndex((prev) =>
                                  prev === 0 ? featuredBoxImages.length - 1 : prev - 1
                                );
                              }}
                              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-neutral-900 disabled:opacity-40"
                              disabled={!canGoPrev}
                              aria-label="Previous"
                            >
                              <span className="text-sm">‹</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFeaturedBoxCarouselIndex((prev) =>
                                  prev === featuredBoxImages.length - 1 ? 0 : prev + 1
                                );
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-neutral-900 disabled:opacity-40"
                              disabled={!canGoNext}
                              aria-label="Next"
                            >
                              <span className="text-sm">›</span>
                            </button>

                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-0.5 text-[10px] text-white">
                              {featuredBoxCarouselIndex + 1} / {featuredBoxImages.length}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-neutral-900">URL Images & Video</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Add URL links for images/videos; image links share the 9-image limit.
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => urlImageInputRef.current?.focus()}
                  >
                    <Upload className="h-4 w-4" />
                    Upload
                  </Button>
                </div>

                <div className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Images URLs (remaining {remainingUrlImageSlots})
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        ref={urlImageInputRef}
                        value={urlMediaBox.imageUrlInput}
                        onChange={(e) => setUrlBoxField({ imageUrlInput: e.target.value })}
                        placeholder="https://..."
                        disabled={remainingUrlImageSlots <= 0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addImageUrlToBox();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addImageUrlToBox}
                        disabled={remainingUrlImageSlots <= 0}
                      >
                        Add
                      </Button>
                    </div>

                    {urlMediaBox.images.length > 0 ? (
                      (() => {
                        const current = urlMediaBox.images[urlImageCarouselIndex];
                        const canGoPrev = urlMediaBox.images.length > 1;
                        const canGoNext = urlMediaBox.images.length > 1;
                        const isFeaturedUrlImage = urlMediaBox.images[0]?.id === current?.id;

                        if (!current) return null;

                        return (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="text-xs text-muted-foreground">{urlMediaBox.images.length}/9 uploaded</div>
                              <button
                                type="button"
                                className="text-sm font-semibold text-red-600 hover:text-red-700 focus-visible:text-red-700 disabled:text-red-300"
                                onClick={() => removeImageUrlFromBox(current.id)}
                              >
                                Clear All
                              </button>
                            </div>

                            <div className="relative mx-auto h-32 w-full overflow-hidden rounded-xl border bg-muted group">
                              <Image
                                src={current.url}
                                alt="URL image"
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 100vw, 33vw"
                              />

                              <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100" />

                              {isFeaturedUrlImage ? (
                                <div className="absolute left-2 top-2 rounded-full bg-yellow-500 px-2 py-0.5 text-[10px] font-medium text-white flex items-center gap-1">
                                  <Star className="h-3 w-3 fill-current" />
                                  Featured
                                </div>
                              ) : null}

                              <button
                                type="button"
                                onClick={() => removeImageUrlFromBox(current.id)}
                                className="absolute right-2 top-2 p-1.5 text-white shadow-sm ring-1 ring-white/40 opacity-0 transition-all group-hover:opacity-100 hover:text-red-500 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                                aria-label="Remove image"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setUrlImageAsFeatured(current.id);
                                }}
                                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-neutral-200 bg-white px-4 py-1 text-xs font-semibold text-neutral-900 shadow-[0_10px_20px_rgba(15,23,42,0.2)] opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:-translate-y-0.5 group-hover:shadow-[0_14px_32px_rgba(15,23,42,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-neutral-500"
                              >
                                Set as Featured
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setUrlImageCarouselIndex((prev) =>
                                    prev === 0 ? urlMediaBox.images.length - 1 : prev - 1
                                  )
                                }
                                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-1.5 text-neutral-900 disabled:opacity-40"
                                disabled={!canGoPrev}
                                aria-label="Previous"
                              >
                                <span className="text-sm">‹</span>
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setUrlImageCarouselIndex((prev) =>
                                    prev === urlMediaBox.images.length - 1 ? 0 : prev + 1
                                  )
                                }
                                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-1.5 text-neutral-900 disabled:opacity-40"
                                disabled={!canGoNext}
                                aria-label="Next"
                              >
                                <span className="text-sm">›</span>
                              </button>

                              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white">
                                {urlImageCarouselIndex + 1} / {urlMediaBox.images.length}
                              </div>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="rounded-xl border border-dashed bg-neutral-50 p-4 text-center">
                        <div className="text-xs text-neutral-500">
                          Paste image URLs above; they will appear here.
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Videos URL</Label>
                    <div className="flex gap-2">
                      <Input
                        value={urlMediaBox.videoUrlInput}
                        onChange={(e) => setUrlBoxField({ videoUrlInput: e.target.value })}
                        placeholder="https://..."
                        disabled={Boolean(urlMediaBox.videoUrl.trim()) || Boolean(videoFile)}
                        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addVideoUrlToBox();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addVideoUrlToBox}
                        disabled={Boolean(urlMediaBox.videoUrl.trim()) || Boolean(videoFile)}
                      >
                        Add
                      </Button>
                    </div>
                    {videoFile ? (
                      <p className="text-xs text-amber-600 mt-1">
                        A file upload already exists, so you cannot add a video URL.
                      </p>
                    ) : null}

                    {urlMediaBox.videoUrl.trim() ? (
                      <div className="flex items-center justify-between gap-3 rounded-xl border bg-neutral-50 px-3 py-2">
                        <div className="min-w-0">
                          <div className="text-[11px] text-neutral-500">Saved video URL</div>
                          <div className="truncate text-xs text-neutral-700">
                            {urlMediaBox.videoUrl}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={removeVideoFromBox}
                          className="shrink-0 p-1.5 text-white shadow-sm ring-1 ring-white/40 transition-all hover:text-red-500 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                          aria-label="Remove video"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed bg-neutral-50 p-4 text-center">
                        <div className="text-xs text-neutral-500">Paste a video URL above</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-neutral-900">Video</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Upload one MP4/WebM/OGG/QuickTime clip (max 50MB).
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => videoInputRef.current?.click()}
                  >
                    <Video className="h-4 w-4" />
                    {videoFile ? "Change" : "Upload"}
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

                <div
                  className="mt-4 cursor-pointer rounded-2xl border border-dashed bg-neutral-50 p-4 transition-colors hover:bg-neutral-100"
                  onClick={() => videoInputRef.current?.click()}
                >
                  {!videoFile ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200">
                        <Video className="h-6 w-6 text-neutral-700" />
                      </div>
                      <div className="text-sm font-medium text-neutral-800">Click to upload product video</div>
                      <div className="text-xs text-neutral-500">Keep it short and clear (recommended)</div>
                    </div>
                  ) : (
                    <div className="relative h-72 w-full overflow-hidden rounded-xl border bg-muted group">
                      <video
                        src={videoFile.url}
                        className="h-full w-full object-cover"
                        controls
                        muted
                        preload="metadata"
                        key={videoFile.url}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeVideo();
                        }}
                        className="absolute right-2 top-2 p-1.5 text-white shadow-sm ring-1 ring-white/40 opacity-0 transition-all group-hover:opacity-100 hover:text-red-500 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                        aria-label="Remove video"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-4 space-y-2">
                  <div className="text-sm font-medium text-red-600"></div>

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
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm bg-gray-100">
          <CardHeader>
            <CardTitle className="text-lg">Inventory and shipping</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 bg-gray-100">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="stockQty" className="font-semibold">
                  Stock quantity <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="stockQty"
                  inputMode="numeric"
                  value={values.stock_quantity}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "" || /^\d*$/.test(v)) {
                      setValues((p) => ({
                        ...p,
                        stock_quantity: v,
                      }));
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.ctrlKey || e.metaKey || e.altKey) return;
                    const allowed = [
                      "Backspace",
                      "Delete",
                      "Tab",
                      "Enter",
                      "Escape",
                      "ArrowLeft",
                      "ArrowRight",
                      "ArrowUp",
                      "ArrowDown",
                      "Home",
                      "End",
                    ];
                    if (allowed.includes(e.key)) return;
                    if (/^[0-9]$/.test(e.key)) return;
                    e.preventDefault();
                  }}
                  placeholder="0"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="length" className="font-semibold">Length</Label>
                <Input
                  id="length"
                  value={values.length}
                  onChange={(e) => setValues((p) => ({ ...p, length: e.target.value }))}
                  placeholder="e.g. 10"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="weight" className="font-semibold">Weight</Label>
                <Input
                  id="weight"
                  value={values.weight}
                  onChange={(e) => setValues((p) => ({ ...p, weight: e.target.value }))}
                  placeholder="e.g. 1.2"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="height" className="font-semibold">Height</Label>
                <Input
                  id="height"
                  value={values.height}
                  onChange={(e) => setValues((p) => ({ ...p, height: e.target.value }))}
                  placeholder="e.g. 3"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="width" className="font-semibold">Width</Label>
                <Input
                  id="width"
                  value={values.width}
                  onChange={(e) => setValues((p) => ({ ...p, width: e.target.value }))}
                  placeholder="e.g. 5"
                />
              </div>
            </div>
          </CardContent>
        </Card>

          </div>
        </PermissionBoundary>
      );
    }