"use client";

import * as React from "react";
import { Upload, X, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import featuredImageLogo from "../../../../../logos/featured image logo.png";
import galleryImageLogo from "../../../../../logos/gallery image logo.png";
import videoUploadLogo from "../../../../../logos/video upload logo.png";

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

  const [featuredImage, setFeaturedImage] = React.useState<MediaItem | null>(null); // Single featured image
  const [galleryImages, setGalleryImages] = React.useState<MediaItem[]>([]); // Gallery images (max 10)
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

  // Date range state for discount dates
  const [discountDateRange, setDiscountDateRange] = React.useState<{ from?: Date; to?: Date }>();

  // Helper functions to convert between date range and string values
  const dateRangeToStrings = (range: { from?: Date; to?: Date } | undefined) => {
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
        // Create a unified tax mapping that works for both dropdown and calculations
        const unifiedTaxMap = new Map<string, { id: string; title: string; rate: number }>();
        
        // Map dropdown taxes (for the select dropdown)
        setTaxes((tax ?? []).map((t: any) => {
          const taxInfo = { id: t.value, name: t.label };
          // Also map to tax rate data if available
          const matchingTaxRate = (taxData?.rows ?? []).find((tr: any) => tr.id === t.value);
          if (matchingTaxRate) {
            unifiedTaxMap.set(t.value, {
              id: matchingTaxRate.id,
              title: matchingTaxRate.title,
              rate: matchingTaxRate.rate
            });
          }
          return taxInfo;
        }));
        
        setSuppliers((sup ?? []).map((s: any) => ({ id: s.value, name: s.label })));
        setWarehouses((wh ?? []).map((w: any) => ({ id: w.value, name: w.label })));
        
        // Set tax rows using the unified map
        setTaxRows(Array.from(unifiedTaxMap.values()));
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

  // Handle gallery images (multiple, max 10)
  const handleGalleryImages = (files: FileList | null) => {
    if (!files?.length) return;

    const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
    const maxImageSize = 5 * 1024 * 1024; // 5MB
    const maxGalleryImages = 10;

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
    const cost = Number(values.cost) || 0;
    const discountPercent = Number(values.discount) || 0;

    // Base price includes selling price + cost + freight
    const basePrice = selling + cost + freight;
    
    // Calculate tax on base price
    const taxAmount = basePrice * (selectedTaxRate / 100);
    
    // Total price with tax included
    const totalPriceWithTax = basePrice + taxAmount;
    
    // Apply discount on total price (including tax)
    const priceAfterDiscount = discountPercent > 0
      ? totalPriceWithTax - (totalPriceWithTax * discountPercent) / 100
      : totalPriceWithTax;

    return {
      taxAmount,
      basePrice,
      totalPriceWithTax,
      priceAfterDiscount,
    };
  }, [
    values.selling_price,
    values.freight,
    values.cost,
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
      // Use the same pricing calculation as the UI
      const selling = Number(values.selling_price) || 0;
      const freight = Number(values.freight) || 0;
      const cost = Number(values.cost) || 0;
      const discountPercent = Number(values.discount) || 0;

      console.log("=== PRICE CALCULATION DEBUG ===");
      console.log("Selling Price:", selling);
      console.log("Cost:", cost);
      console.log("Freight:", freight);
      console.log("Discount %:", discountPercent);
      console.log("Selected Tax Rate:", selectedTaxRate);

      // Base price includes selling price + cost + freight
      const basePrice = selling + cost + freight;
      console.log("Base Price (Selling + Cost + Freight):", basePrice);
      
      // Calculate tax on base price
      const taxAmount = basePrice * (selectedTaxRate / 100);
      console.log("Tax Amount:", taxAmount);
      
      // Total price with tax included
      const totalPriceWithTax = basePrice + taxAmount;
      console.log("Total Price with Tax:", totalPriceWithTax);
      
      // Apply discount on total price (including tax)
      const priceAfterDiscount = discountPercent > 0
        ? totalPriceWithTax - (totalPriceWithTax * discountPercent) / 100
        : totalPriceWithTax;
      console.log("Final Price After Discount:", priceAfterDiscount);

      // Convert prices to USD for backend storage
      const sourceCurrency = getCurrencyCode();
      const targetCurrency = 'USD';

      let convertedPrice = selling;
      let convertedCost = cost;
      let convertedFreight = freight;
      let convertedTotalPrice = priceAfterDiscount;

      if (sourceCurrency !== targetCurrency) {
        try {
          [convertedPrice, convertedCost, convertedFreight, convertedTotalPrice] = await Promise.all([
            convertAmount(selling, sourceCurrency, targetCurrency),
            convertAmount(cost, sourceCurrency, targetCurrency),
            convertAmount(freight, sourceCurrency, targetCurrency),
            convertAmount(priceAfterDiscount, sourceCurrency, targetCurrency),
          ]);
          console.log("=== AFTER CURRENCY CONVERSION ===");
          console.log("Converted Price:", convertedPrice);
          console.log("Converted Cost:", convertedCost);
          console.log("Converted Freight:", convertedFreight);
          console.log("Converted Total Price:", convertedTotalPrice);
        } catch (error) {
          console.error('Currency conversion failed:', error);
          setUploadErrors(prev => [...prev, 'Currency conversion failed. Please try again.']);
          return;
        }
      } else {
        console.log("=== NO CURRENCY CONVERSION NEEDED ===");
        console.log("Total Price to be sent:", convertedTotalPrice);
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
          // Create each custom variant type via API and track the mapping
          const customVariantTypeMap = new Map<string, { id: string; name: string }>();

          for (const customName of customVariantNames) {
            const response = await productsService.createCustomVariantType(productId, customName);
            if (response?.data?.id && response?.data?.name) {
              // Map the original normalized key to the API response
              customVariantTypeMap.set(customName, { id: response.data.id, name: response.data.name });
            }
          }

          // Now update product with all variants (default + custom)
          console.log("Custom variant values before update:", variantValues);
          console.log("Custom variant type map:", Array.from(customVariantTypeMap.entries()));
          
          const allVariants = [
            ...defaultVariants,
            ...Array.from(customVariantTypeMap.entries()).map(([originalKey, cvt]) => {
              const variantValue = String(variantValues[originalKey] ?? "").trim();
              console.log(`Processing variant ${originalKey}: value="${variantValue}"`);
              return {
                vtype_id: cvt.id,
                value: variantValue,
              };
            }),
          ];
          
          console.log("Final allVariants array:", allVariants);

          // Only update if we have custom variants to add
          if (allVariants.length > defaultVariants.length) {
            console.log("Updating product with custom variants:", {
              id: productId,
              title: values.title.trim(),
              description: values.description.trim(),
              price: convertedPrice,
              stock_quantity: Number(values.stock_quantity) || 0,
              category_id: values.category_id,
              brand_id: values.brand_id,
              currency: targetCurrency,
              total_price: convertedTotalPrice,
              variants: allVariants,
            });
            
            try {
              await productsService.updateProduct({
                id: productId,
                title: values.title.trim(),
                description: values.description.trim(),
                price: convertedPrice,
                stock_quantity: Number(values.stock_quantity) || 0,
                category_id: values.category_id,
                brand_id: values.brand_id,
                currency: targetCurrency,
                total_price: convertedTotalPrice,
                variants: allVariants,
              });
            } catch (updateError: any) {
              console.error("Update product error:", updateError?.response?.data);
              throw updateError;
            }
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

      // Upload featured image if any
      if (featuredImage) {
        try {
          setUploadProgress(prev => ({ ...prev, featured: 1 }));
          const featuredResponse = await productsService.uploadFeaturedImage(productId, featuredImage.file);
          setUploadProgress(prev => ({ ...prev, featured: 100 }));
          // Backend already updates product_img_url automatically, no need for extra update
        } catch (error: any) {
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
                <p className="text-xs text-gray-500">
                  Currency is automatically set based on your global selection
                </p>
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
                  <div key={row.id} className="grid gap-3 sm:grid-cols-5 sm:items-end">
                    <div className="grid gap-2 sm:col-span-2">
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

                    <div className="grid gap-2 sm:col-span-2">
                      <Label htmlFor={`bulkPrice-${row.id}`} className="font-semibold">Price per product</Label>
                      <Input
                        id={`bulkPrice-${row.id}`}
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

        <Card className="shadow-sm bg-gray-100">
          <CardHeader className="bg-gray-100">
            <CardTitle className="text-lg">Media</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 bg-gray-100">
            <div className="grid gap-5 lg:grid-cols-3">
              <div className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-neutral-900">Featured Image</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Primary image for product listing (JPEG/PNG/WebP, max 5MB)
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => featuredImageInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" />
                    {featuredImage ? "Change" : "Upload"}
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

                <div
                  className="mt-4 cursor-pointer rounded-2xl border border-dashed bg-neutral-50 p-4 transition-colors hover:bg-neutral-100"
                  onClick={() => featuredImageInputRef.current?.click()}
                >
                  {!featuredImage ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                      <Image
                        src={featuredImageLogo}
                        alt="Featured upload"
                        width={90}
                        height={90}
                        className="opacity-90"
                      />
                      <div className="text-sm font-medium text-neutral-800">
                        Click to upload featured image
                      </div>
                      <div className="text-xs text-neutral-500">
                        Recommended: square image, high quality
                      </div>
                    </div>
                  ) : (
                    <div className="relative h-56 w-full overflow-hidden rounded-xl border bg-muted">
                      <Image
                        src={featuredImage.url}
                        alt={featuredImage.file.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFeaturedImage();
                        }}
                        className="absolute right-2 top-2 rounded-full bg-red-600 p-2 text-white hover:bg-red-700"
                        aria-label="Remove featured image"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-neutral-900">Gallery Images</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Up to 4 images for the product detail page
                    </div>
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
                    Add ({galleryImages.length}/4)
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

                <div
                  className="mt-4 cursor-pointer rounded-2xl border border-dashed bg-neutral-50 p-4 transition-colors hover:bg-neutral-100"
                  onClick={() => galleryImagesInputRef.current?.click()}
                >
                  {galleryImages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                      <Image
                        src={galleryImageLogo}
                        alt="Gallery upload"
                        width={90}
                        height={90}
                        className="opacity-90"
                      />
                      <div className="text-sm font-medium text-neutral-800">
                        Click to upload gallery images
                      </div>
                      <div className="text-xs text-neutral-500">
                        You can select multiple files at once
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {galleryImages.map((m) => (
                        <div
                          key={m.id}
                          className="relative h-28 overflow-hidden rounded-xl border bg-muted"
                        >
                          <Image
                            src={m.url}
                            alt={m.file.name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 50vw, 16vw"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeGalleryImage(m.id);
                            }}
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

              <div className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-neutral-900">Video</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      One video (MP4/WebM/OGG/QuickTime, max 50MB)
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
                    <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                      <Image
                        src={videoUploadLogo}
                        alt="Video upload"
                        width={120}
                        height={120}
                        className="opacity-90"
                      />
                      <div className="text-sm font-medium text-neutral-800">
                        Click to upload product video
                      </div>
                      <div className="text-xs text-neutral-500">
                        Keep it short and clear (recommended)
                      </div>
                    </div>
                  ) : (
                    <div className="relative h-56 w-full overflow-hidden rounded-xl border bg-muted">
                      <video
                        src={videoFile.url}
                        className="h-full w-full object-cover"
                        controls
                        muted
                        preload="metadata"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeVideo();
                        }}
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

        <Card className="shadow-sm bg-gray-100">
          <CardHeader>
            <CardTitle className="text-lg">Inventory and shipping</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 bg-gray-100">

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="stockQty" className="font-semibold">Stock quantity <span className="text-red-500">*</span></Label>
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
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="weight" className="font-semibold">Weight</Label>
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
                <Label htmlFor="length" className="font-semibold">Length</Label>
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
                <Label htmlFor="width" className="font-semibold">Width</Label>
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
                <Label htmlFor="height" className="font-semibold">Height</Label>
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
      </div>
    </PermissionBoundary>
  );
}