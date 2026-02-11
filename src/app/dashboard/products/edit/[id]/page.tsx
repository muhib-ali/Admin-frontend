"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";

import { getAllBrandsDropdown, getAllCategoriesDropdown, getAllTaxesDropdown, getAllSuppliersDropdown, getAllWarehousesDropdown, getAllCustomerVisibilityGroupsDropdown } from "@/services/dropdowns";
import { listTaxes } from "@/services/taxes";
import * as productsService from "@/services/products/index";
import { useHasPermission } from "@/hooks/use-permission";
import { useCurrency, Country } from "@/contexts/currency-context";
import { ENTITY_PERMS } from "@/rbac/permissions-map";
import { notifyError, notifySuccess, notifyInfo } from "@/utils/notify";
import { Upload, X, Video, Loader2, SearchX } from "lucide-react";
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
import { DateRangePicker } from "@/components/ui/date-range-picker";
import type { DateRange } from "react-day-picker";

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
  const { selectedCountry, convertAmount, getCurrencyCode } = useCurrency();

  const canUpdate = useHasPermission(ENTITY_PERMS.products.update);

  const [loading, setLoading] = React.useState(true);
  const [product, setProduct] = React.useState<any | null>(null);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [uploadErrors, setUploadErrors] = React.useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = React.useState({ images: 0, video: 0 });

  // Ref to track previous country to prevent infinite loops
  const previousCountryRef = React.useRef<Country | null>(null);

  const [categories, setCategories] = React.useState<Option[]>([]);
  const [brands, setBrands] = React.useState<Option[]>([]);
  const [taxes, setTaxes] = React.useState<Option[]>([]);
  const [taxRows, setTaxRows] = React.useState<{ id: string; title: string; rate: number }[]>([]);
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
    currency: getCurrencyCode(),
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
    is_active: true,
  }));

  const [bulkPricing, setBulkPricing] = React.useState<BulkPricingRow[]>([]);
  const [variantsOpen, setVariantsOpen] = React.useState(false);
  const [variantOptions, setVariantOptions] = React.useState<string[]>([]);
  const [variantSelected, setVariantSelected] = React.useState<Record<string, boolean>>({});
  const [variantValues, setVariantValues] = React.useState<Record<string, string>>({});
  const [newVariantName, setNewVariantName] = React.useState("");
  const [recentlyAddedVariantTypes, setRecentlyAddedVariantTypes] = React.useState<Set<string>>(new Set());
  const [featuredImage, setFeaturedImage] = React.useState<StoredMediaItem | null>(null); // Featured image (product_img_url)
  const [galleryImages, setGalleryImages] = React.useState<StoredMediaItem[]>([]); // Gallery images
  const [existingVideo, setExistingVideo] = React.useState<StoredMediaItem | null>(null); // Existing video
  const [pendingFeaturedImage, setPendingFeaturedImage] = React.useState<MediaUpload | null>(null);
  
  // Date range state for discount dates
  const [discountDateRange, setDiscountDateRange] = React.useState<DateRange>();
  
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
  
  const [pendingGalleryImages, setPendingGalleryImages] = React.useState<MediaUpload[]>([]); // Pending gallery images
  const [pendingVideo, setPendingVideo] = React.useState<MediaUpload | null>(null); // Pending video

  const featuredImageInputRef = React.useRef<HTMLInputElement | null>(null);
  const galleryImagesInputRef = React.useRef<HTMLInputElement | null>(null);
  const videoInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    const ac = new AbortController();

    (async () => {
      try {
        const [
          cats,
          brs,
          tax,
          sup,
          wh,
          cvg,
          defaultVTypes,
          taxData,
        ] = await Promise.all([
          getAllCategoriesDropdown({ signal: ac.signal }),
          getAllBrandsDropdown({ signal: ac.signal }),
          getAllTaxesDropdown({ signal: ac.signal }),
          getAllSuppliersDropdown({ signal: ac.signal }),
          getAllWarehousesDropdown({ signal: ac.signal }),
          getAllCustomerVisibilityGroupsDropdown({ signal: ac.signal }),
          productsService.getDefaultVariantTypes(),
          listTaxes(1, 100, undefined, { signal: ac.signal }),
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
        // Load default variant types from API (size, model, year)
        const defaultVariantTypesData = (defaultVTypes as any)?.data ?? [];
        setVariantTypes(
          (defaultVariantTypesData as any[]).map((vt: any) => ({
            id: vt.id,
            name: vt.name,
          }))
        );
        setCustomerVisibilityGroups((cvg ?? []).map((c: any) => ({ id: c.value, name: c.label })));
        
        // Set tax rows using the unified map
        setTaxRows(Array.from(unifiedTaxMap.values()));
      } catch (error: any) {
        // Only log if it's not a canceled error (AbortController)
        if (error?.name !== 'CanceledError' && error?.message !== 'canceled') {
          console.error('Error loading dropdown data:', error);
        }
        // ignore UI-only page for now
      }
    })();

    return () => ac.abort();
  }, []);

  React.useEffect(() => {
    const ac = new AbortController();

    (async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [productData, defaultVTypesResp] = await Promise.all([
          productsService.getProductById(id),
          productsService.getDefaultVariantTypes(),
        ]);
        setProduct(productData);

        const defaultVariantTypesFromApi: Array<{ id: string; name: string }> =
          (defaultVTypesResp as any)?.data?.map((vt: any) => ({
            id: String(vt?.id ?? ""),
            name: String(vt?.name ?? ""),
          })) ?? [];

        // Extract featured image from product_img_url
        // Handle both product_img_url and product_img_url (in case of different naming)
        const productImgUrl = productData?.product_img_url || (productData as any)?.product_img_url || null;
        
        const featuredImageItem: StoredMediaItem | null = productImgUrl && String(productImgUrl).trim() !== "" && String(productImgUrl).trim() !== "null" ? {
          id: crypto.randomUUID(),
          kind: "image" as const,
          name: "Featured Image",
          type: "image/jpeg",
          url: String(productImgUrl).trim(),
        } : null;
        

        // Extract gallery images from images array
        const productImages = productData?.images || [];
        const galleryImagesItems: StoredMediaItem[] = productImages.map((img: any) => ({
          id: img.id || crypto.randomUUID(),
          kind: "image" as const,
          name: img.file_name || "",
          type: "image/jpeg",
          url: img.url || "",
        }));

        // Extract video from product
        const videoUrl = productData?.product_video_url || (productData as any)?.product_video_url || null;
        const videoItem: StoredMediaItem | null = videoUrl && String(videoUrl).trim() !== "" && String(videoUrl).trim() !== "null" ? {
          id: crypto.randomUUID(),
          kind: "video" as const,
          name: "Product Video",
          type: "video/mp4",
          url: String(videoUrl).trim(),
        } : null;

        // Format dates for date inputs (YYYY-MM-DD)
        const formatDateForInput = (date: any): string => {
          if (!date) return "";
          if (typeof date === "string") {
            // If it's already a string, try to parse it
            const d = new Date(date);
            if (!isNaN(d.getTime())) {
              return d.toISOString().split("T")[0];
            }
            return date.split("T")[0]; // If already in ISO format, just take date part
          }
          if (date instanceof Date) {
            return date.toISOString().split("T")[0];
          }
          return "";
        };

        // Extract customer visibility group IDs from cvgProducts array
        const cvgIds: string[] = [];
        if (productData?.cvgProducts && Array.isArray(productData.cvgProducts)) {
          productData.cvgProducts.forEach((cvg: any) => {
            if (cvg?.customerVisibilityGroup?.id) {
              cvgIds.push(cvg.customerVisibilityGroup.id);
            }
          });
        }
        // Fallback to customer_groups.cvg_ids if available (for backward compatibility)
        const customerGroupIds = cvgIds.length > 0 
          ? cvgIds 
          : (productData?.customer_groups?.cvg_ids ?? []);
        

        // Load bulk pricing
        // Backend entity uses bulkPrices (camelCase), DTO uses bulk_prices (snake_case)
        const bulkPrices = productData?.bulk_prices || productData?.bulkPrices || [];

        // Convert prices from NOK (storage currency) to selected currency for display
        const convertPriceForDisplay = async (price: number): Promise<string> => {
          if (!selectedCountry || price === 0) return String(price);
          
          try {
            const targetCurrency = Object.keys(selectedCountry.currencies)[0];
            if (targetCurrency === 'NOK') return String(price);
            
            const converted = await convertAmount(price, 'NOK', targetCurrency);
            return String(converted);
          } catch (error) {
            return String(price);
          }
        };

        // Convert prices for display
        const displaySellingPrice = await convertPriceForDisplay(Number(productData?.price ?? 0));
        const displayCost = await convertPriceForDisplay(Number(productData?.cost ?? 0));
        const displayFreight = await convertPriceForDisplay(Number(productData?.freight ?? 0));
        const displayTotalPrice = await convertPriceForDisplay(Number(productData?.total_price ?? 0));

        // Convert bulk pricing for display
        const convertedBulkPricing = bulkPrices.length > 0 ? 
          await Promise.all(
            bulkPrices.map(async (bp: any) => ({
              id: crypto.randomUUID(),
              quantity: String(bp.quantity ?? ""),
              price: await convertPriceForDisplay(Number(bp.price_per_product ?? 0)),
            }))
          ) : [];

        setValues({
          title: productData?.title ?? "",
          description: productData?.description ?? "",
          category_id: productData?.category_id ?? "",
          brand_id: productData?.brand_id ?? "",
          supplier_id: productData?.supplier_id ?? "",
          tax_id: productData?.tax_id ?? "",
          warehouse_id: productData?.warehouse_id ?? "",
          customer_groups: customerGroupIds,
          currency: getCurrencyCode(),
          selling_price: displaySellingPrice,
          cost: displayCost,
          freight: displayFreight,
          discount: productData?.discount ? String(productData.discount) : "",
          start_discount_date: formatDateForInput(productData?.start_discount_date),
          end_discount_date: formatDateForInput(productData?.end_discount_date),
          total_price: displayTotalPrice,
          stock_quantity: String(productData?.stock_quantity ?? ""),
          weight: productData?.weight ? String(productData.weight) : "",
          length: productData?.length ? String(productData.length) : "",
          width: productData?.width ? String(productData.width) : "",
          height: productData?.height ? String(productData.height) : "",
          visibility_wholesale: productData?.visibility_wholesale ?? true,
          visibility_retail: productData?.visibility_retail ?? true,
          is_active: productData?.is_active ?? true,
        });

        // Sync date range with values
        const dateRange = stringsToDateRange(
          formatDateForInput(productData?.start_discount_date),
          formatDateForInput(productData?.end_discount_date)
        );
        setDiscountDateRange(dateRange);

        // Load bulk pricing
        if (convertedBulkPricing.length > 0) {
          setBulkPricing(convertedBulkPricing);
        } else {
          setBulkPricing([]);
        }

        // Load variants - always include default variant types (size, model, year) + product-specific
        const variants = productData?.variants || [];
      
        // Default variant types that should always be available
        const defaultVariantNames = ["size", "model", "year"];
      
        // Merge default variant types from API + product-specific variant types
        const allVariantTypesMap = new Map<string, { id: string; name: string }>();

        // First, add default variant types from API so we always have correct IDs.
        defaultVariantTypesFromApi.forEach((vt) => {
          const idVal = String(vt.id ?? "").trim();
          const nameVal = String(vt.name ?? "").trim();
          if (!idVal || !nameVal) return;
          const key = nameVal.toLowerCase();
          if (!allVariantTypesMap.has(key)) {
            allVariantTypesMap.set(key, { id: idVal, name: nameVal });
          }
        });
      
        // Add product-specific variant types (if not already in the map)
        variants.forEach((v: any) => {
          const variantType = v.variantType || v.variant_type;
          if (variantType?.id && variantType?.name) {
            const key = String(variantType.name).trim().toLowerCase();
            if (!allVariantTypesMap.has(key)) {
              allVariantTypesMap.set(key, {
                id: variantType.id,
                name: String(variantType.name).trim(),
              });
            }
          }
        });
        
        // Update variant types state with merged list (includes defaults from API)
        const mergedVariantTypes = Array.from(allVariantTypesMap.values());
        setVariantTypes(mergedVariantTypes);
        
        // Set variant options (all variant type names) - ensure defaults are ALWAYS included
        const defaultNamesLower = defaultVariantNames.map(n => n.toLowerCase());
        
        // Start with default variant names (ALWAYS include them in the options list)
        const variantOptionsSet = new Set<string>();
        defaultVariantNames.forEach(name => {
          variantOptionsSet.add(name);
        });
        
        // Add all variant type names from merged list
        mergedVariantTypes.forEach(vt => {
          variantOptionsSet.add(vt.name);
        });
        
        // Convert to array and sort (defaults first, then alphabetically)
        const allVariantTypeNames = Array.from(variantOptionsSet).sort((a, b) => {
          const aLower = a.toLowerCase();
          const bLower = b.toLowerCase();
          const aIsDefault = defaultNamesLower.includes(aLower);
          const bIsDefault = defaultNamesLower.includes(bLower);
          if (aIsDefault && !bIsDefault) return -1;
          if (!aIsDefault && bIsDefault) return 1;
          return a.localeCompare(b);
        });
        
        setVariantOptions(allVariantTypeNames);
        
        // Set selected variants (only those that have values for this product)
        const selected: Record<string, boolean> = {};
        const variantValuesMap: Record<string, string> = {};
        
        // Track custom variant IDs (non-default variants) for deletion option
        const customVariantIds = new Set<string>();
        const defaultVariantNamesLower = defaultVariantNames.map(n => n.toLowerCase());
        
        allVariantTypeNames.forEach((name: string) => {
          // Find variant by matching name (case-insensitive)
          const variant = variants.find((v: any) => {
            const variantName = v.variantType?.name || v.variant_type?.name || "";
            return String(variantName).trim().toLowerCase() === name.toLowerCase();
          });
          
          if (variant) {
            // This variant exists for this product, mark as selected
            selected[name] = true;
            variantValuesMap[name] = variant.value || "";
            
            // Track custom variants (not default ones) for deletion option
            const variantType = variant.variantType || variant.variant_type;
            if (variantType?.id && !defaultVariantNamesLower.includes(name.toLowerCase())) {
              customVariantIds.add(variantType.id);
            }
          } else {
            // This variant doesn't exist for this product, mark as unselected
            selected[name] = false;
            variantValuesMap[name] = "";
          }
        });
        
        // Set custom variant IDs so they can be deleted
        setRecentlyAddedVariantTypes(customVariantIds);
        
        setVariantSelected(selected);
        setVariantValues(variantValuesMap);
        setFeaturedImage(featuredImageItem);
        setGalleryImages(galleryImagesItems);
        setExistingVideo(videoItem);
        setPendingFeaturedImage(null);
        setPendingGalleryImages([]);
        setPendingVideo(null);
      } catch (error: any) {
        notifyError(error?.message || "Failed to load product");
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [id]);

  // Update form values when selected country changes
  React.useEffect(() => {
    if (!product || !selectedCountry) {
      return;
    }

    const targetCurrency = Object.keys(selectedCountry.currencies)[0];
    const sourceCurrency = values.currency;
    
    // Only update if currency is different from current
    if (sourceCurrency === targetCurrency) {
      return;
    }

    const convertField = async (value: string): Promise<string> => {
      const numValue = Number(value) || 0;
      if (numValue === 0) return value;
      
      try {
        const converted = await convertAmount(numValue, sourceCurrency, targetCurrency);
        return String(converted);
      } catch (error) {
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
  }, [selectedCountry?.cca2, product]);

  // Sync date range changes to values state
  React.useEffect(() => {
    const dateString = dateRangeToStrings(discountDateRange);
    setValues(prev => ({
      ...prev,
      start_discount_date: dateString.start,
      end_discount_date: dateString.end
    }));
  }, [discountDateRange]);

  // Create memoized blob URLs for pending media
  const pendingFeaturedImageUrl = React.useMemo(() => {
    return pendingFeaturedImage ? URL.createObjectURL(pendingFeaturedImage.file) : null;
  }, [pendingFeaturedImage]);

  const pendingGalleryImageUrls = React.useMemo(() => {
    const urls: Record<string, string> = {};
    pendingGalleryImages.forEach((m) => {
      urls[m.id] = URL.createObjectURL(m.file);
    });
    return urls;
  }, [pendingGalleryImages]);

  const pendingVideoUrl = React.useMemo(() => {
    return pendingVideo ? URL.createObjectURL(pendingVideo.file) : null;
  }, [pendingVideo]);

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
    
    if (!id) {
      notifyError("Product ID is required to create custom variant types");
      return;
    }
    
    try {
      // Create product-scoped custom variant type via new API
      const response = await productsService.createCustomVariantType(id, raw);
      if (response.status && response.data) {
        const newVariantId = (response.data as any).id;
        const newVariantName = (response.data as any).name;
        
        // Add to local state
        setVariantOptions((p) => [...p, key]);
        setVariantSelected((p) => ({ ...p, [key]: true }));
        setVariantValues((p) => ({ ...p, [key]: "" }));
        
        // Add to recently added list for deletion option
        setRecentlyAddedVariantTypes((prev) => new Set([...prev, newVariantId]));
        
        // Add to variant types dropdown
        setVariantTypes((p) => [...p, { id: newVariantId, name: newVariantName }]);
        
        setVariantsOpen(true);
        setNewVariantName("");
        notifySuccess(`Variant type "${raw}" created successfully`);
      } else {
        notifyError(response.message || "Failed to create variant type");
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to create variant type";
      notifyError(errorMessage);
    }
  };

  const deleteVariantOption = async (variantId: string, variantKey: string) => {
    if (!id) {
      notifyError("Product ID is required to delete custom variant types");
      return;
    }
    
    try {
      // Use the new product-scoped unlink endpoint
      const response = await productsService.unlinkCustomVariantType(id, variantId);
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
        
        notifySuccess("Variant type unlinked successfully");
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to unlink variant type";
      notifyError(errorMessage);
    }
  };

  const selectedVariantKeys = React.useMemo(() => {
    return variantOptions.filter((k) => Boolean(variantSelected[k]));
  }, [variantOptions, variantSelected]);

  const selectedTaxRate = React.useMemo(() => {
    const tax = taxRows.find((t) => t.id === values.tax_id);
    return tax?.rate ?? 0;
  }, [taxRows, values.tax_id]);

  const pricing = React.useMemo(() => {
    const selling = Number(values.selling_price) || 0;
    const freight = Number(values.freight) || 0;
    const cost = Number(values.cost) || 0;
    const discountPercent = Number(values.discount) || 0;

    console.log("=== EDIT PAGE PRICING CALCULATION ===");
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

  // Cleanup blob URLs
  React.useEffect(() => {
    return () => {
      if (pendingFeaturedImageUrl) URL.revokeObjectURL(pendingFeaturedImageUrl);
      Object.values(pendingGalleryImageUrls).forEach((url) => URL.revokeObjectURL(url));
      if (pendingVideoUrl) URL.revokeObjectURL(pendingVideoUrl);
    };
  }, [pendingFeaturedImageUrl, pendingGalleryImageUrls, pendingVideoUrl]);

  const addBulkRow = () => {
    setBulkPricing((prev) => [
      ...prev,
      { id: crypto.randomUUID(), quantity: "", price: "" },
    ]);
  };

  const removeBulkRow = (rowId: string) => {
    setBulkPricing((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== rowId)));
  };

  // Handle featured image (single)
  const handleFeaturedImage = (files: FileList | null) => {
    if (!files?.length) return;
    const file = files[0];

    const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
    const maxImageSize = 5 * 1024 * 1024; // 5MB

    if (!allowedImageTypes.includes(file.type)) {
      notifyError(`Invalid image type: ${file.name}. Only JPEG, PNG, and WebP are allowed`);
      return;
    }
    if (file.size > maxImageSize) {
      notifyError(`Image ${file.name} is too large. Maximum size is 5MB`);
      return;
    }

    // Cleanup previous pending featured image
    if (pendingFeaturedImageUrl) {
      URL.revokeObjectURL(pendingFeaturedImageUrl);
    }

    setPendingFeaturedImage({
      id: crypto.randomUUID(),
      kind: "image",
      file,
    });
  };

  const removeFeaturedImage = async () => {
    if (!featuredImage || !id || !product) return;
    
    try {
      // Use existing product state which already has all required fields
      const basePrice = Number(product.price || values.selling_price || 0);
      const cost = Number(values.cost || 0);
      const freight = Number(values.freight || 0);
      const discountPercent = Number(values.discount || 0);
      
      const totalCost = basePrice + cost + freight;
      const priceAfterDiscount = discountPercent > 0 
        ? totalCost - (totalCost * discountPercent) / 100 
        : totalCost;

      const updatePayload: any = {
        id: id,
        title: product.title || values.title || "",
        price: basePrice,
        stock_quantity: product.stock_quantity || values.stock_quantity || 0,
        category_id: product.category_id || values.category_id || "",
        brand_id: product.brand_id || values.brand_id || "",
        currency: product.currency || values.currency || "NOK",
        total_price: priceAfterDiscount,
      };
      
      // Explicitly set product_img_url to empty string (backend will convert to null)
      updatePayload.product_img_url = "";
      
      await productsService.updateProduct(updatePayload);
      
      // Extract fileName from URL and delete from files backend
      const url = featuredImage.url;
      if (url) {
        try {
          // Extract fileName from URL (e.g., http://localhost:3003/public/products/filename.png)
          const urlObj = new URL(url);
          const pathParts = urlObj.pathname.split("/");
          const fileName = pathParts[pathParts.length - 1];
          if (fileName) {
            await productsService.deleteProductImage(fileName);
          }
        } catch (error) {
          // Continue even if file deletion fails
        }
      }
      
      setFeaturedImage(null);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || "Unknown error";
      notifyError(`Failed to remove featured image: ${errorMessage}`);
    }
  };

  const removePendingFeaturedImage = () => {
    if (pendingFeaturedImageUrl) {
      URL.revokeObjectURL(pendingFeaturedImageUrl);
    }
    setPendingFeaturedImage(null);
  };

  // Handle gallery images (multiple, max 10)
  const handleGalleryImages = (files: FileList | null) => {
    if (!files?.length) return;

    const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
    const maxImageSize = 5 * 1024 * 1024; // 5MB
    const maxGalleryImages = 10;

    const next: MediaUpload[] = [];
    const errors: string[] = [];

    for (const file of Array.from(files)) {
      if (galleryImages.length + pendingGalleryImages.length + next.length >= maxGalleryImages) {
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

      next.push({ id: crypto.randomUUID(), kind: "image", file } as MediaUpload);
    }

    if (errors.length > 0) {
      notifyError(errors.join(", "));
    }

    if (next.length > 0) {
      setPendingGalleryImages((p) => [...p, ...next]);
    }
  };

  const removeGalleryImage = async (mediaId: string) => {
    if (!id) return;
    
    const imageToRemove = galleryImages.find((m) => m.id === mediaId);
    if (!imageToRemove) return;
    
    try {
      // Check if this is an existing image (has backend ID) or just a local state item
      // Existing images from backend have UUIDs, newly added pending ones might not
      const isExistingImage = imageToRemove.id && imageToRemove.id.length === 36; // UUID length check
      
      if (isExistingImage) {
        // Delete from backend using image ID
        await productsService.deleteProductImageById(id, imageToRemove.id);
      }
      
      // Remove from state
      setGalleryImages((p) => p.filter((m) => m.id !== mediaId));
    } catch (error: any) {
      console.error("Failed to remove gallery image:", error);
      notifyError(`Failed to remove image: ${error.message}`);
    }
  };

  const removePendingGalleryImage = (mediaId: string) => {
    setPendingGalleryImages((p) => {
      const item = p.find(m => m.id === mediaId);
      if (item && pendingGalleryImageUrls[item.id]) {
        URL.revokeObjectURL(pendingGalleryImageUrls[item.id]);
      }
      return p.filter((m) => m.id !== mediaId);
    });
  };

  // Handle video (single)
  const handleVideo = (files: FileList | null) => {
    if (!files?.length) return;
    const file = files[0];

    const allowedVideoTypes = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"];
    const maxVideoSize = 50 * 1024 * 1024; // 50MB

    if (pendingVideo) {
      notifyError("Only one video is allowed per product");
      return;
    }
    if (!allowedVideoTypes.includes(file.type)) {
      notifyError(`Invalid video type: ${file.name}. Only MP4, WebM, OGG, and QuickTime are allowed`);
      return;
    }
    if (file.size > maxVideoSize) {
      notifyError(`Video ${file.name} is too large. Maximum size is 50MB`);
      return;
    }

    setPendingVideo({
      id: crypto.randomUUID(),
      kind: "video",
      file,
    });
  };

  const removeVideo = () => {
    // Video removal will be handled by backend when updating
    setPendingVideo(null);
  };

  const save = async () => {
    if (!product || !canUpdate || isUpdating) return; // Prevent double submission

    setIsUpdating(true);
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

      // Convert prices to NOK for backend storage (standard currency)
      const sourceCurrency = getCurrencyCode();
      const targetCurrency = 'NOK';
      
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

      // Prepare product update data (prices and currency stored in NOK)
      const productUpdateData: any = {
        id: id,
        title: values.title.trim(),
        description: values.description.trim(),
        price: convertedPrice,
        stock_quantity: Number(values.stock_quantity) || 0,
        category_id: values.category_id,
        brand_id: values.brand_id,
        currency: targetCurrency,
        is_active: (product as any)?.is_active ?? true,
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
        customer_groups: values.customer_groups && values.customer_groups.length > 0 ? { cvg_ids: values.customer_groups } : undefined,
        variants: selectedVariantKeys
          .map((key: string) => {
            // Find variant type ID by matching name (case-insensitive)
            const variantType = variantTypes.find(
              (vt) => vt.name.toLowerCase().trim() === key.toLowerCase().trim()
            );
            
            if (!variantType || !variantType.id || variantType.id.trim() === "") {
              console.warn(`Variant type not found or has invalid ID for key: ${key}`, variantType);
              return null;
            }
            
            return {
              vtype_id: variantType.id,
              value: (variantValues[key] ?? "").trim(),
            };
          })
          .filter((v): v is { vtype_id: string; value: string } => {
            return v !== null && typeof v.vtype_id === "string" && v.vtype_id.trim() !== "";
          }),
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

      // Preserve existing video URL if no new video is being uploaded
      // This prevents the video from being cleared when saving the form without video changes
      if (!pendingVideo && existingVideo && existingVideo.url) {
        const existingVideoUrl = String(existingVideo.url).trim();
        if (existingVideoUrl && existingVideoUrl !== "" && existingVideoUrl !== "null") {
          productUpdateData.product_video_url = existingVideoUrl;
          console.log("Preserving existing video URL in update:", existingVideoUrl);
        }
      }

      // Preserve existing featured image URL if no new featured image is being uploaded
      // This prevents the featured image from being cleared when saving the form without image changes
      if (!pendingFeaturedImage && featuredImage && featuredImage.url) {
        const existingImageUrl = String(featuredImage.url).trim();
        if (existingImageUrl && existingImageUrl !== "" && existingImageUrl !== "null") {
          productUpdateData.product_img_url = existingImageUrl;
          console.log("Preserving existing featured image URL in update:", existingImageUrl);
        }
      }

      // Handle featured image FIRST before updating other product data
      let uploadedFeaturedImageUrl: string | null = null;
      if (pendingFeaturedImage) {
        // New featured image is being uploaded
        try {
          setUploadProgress(prev => ({ ...prev, featured: 1 }));
          const featuredResponse = await productsService.uploadFeaturedImage(id, pendingFeaturedImage.file);
          setUploadProgress(prev => ({ ...prev, featured: 100 }));
          // Backend already updates product_img_url automatically
          uploadedFeaturedImageUrl = featuredResponse.url || null;
          console.log("Featured image uploaded successfully:", featuredResponse);
          console.log("Uploaded featured image URL:", uploadedFeaturedImageUrl);
          
          // IMPORTANT: Include the uploaded image URL in the update payload
          // This ensures the URL is preserved when the form is saved
          if (uploadedFeaturedImageUrl) {
            const imageUrl = String(uploadedFeaturedImageUrl).trim();
            productUpdateData.product_img_url = imageUrl;
            console.log("Including uploaded featured image URL in update payload:", imageUrl);
            
            // Update local state immediately to reflect the change (will be verified on reload)
            setFeaturedImage({
              id: crypto.randomUUID(),
              kind: "image" as const,
              name: "Featured Image",
              type: "image/jpeg",
              url: imageUrl,
            });
            setPendingFeaturedImage(null);
          } else {
            console.warn("No URL returned from featured image upload response");
          }
        } catch (error: any) {
          console.error("Featured image upload error:", error);
          setUploadErrors(prev => [...prev, `Featured image upload failed: ${error.message}`]);
        }
      } else if (!featuredImage && product?.product_img_url) {
        // Featured image was removed (user clicked remove button)
        // Only update if there was an existing featured image
        try {
          // Include all required fields when removing featured image
          const basePrice = Number(product.price || values.selling_price || 0);
          const cost = Number(values.cost || 0);
          const freight = Number(values.freight || 0);
          const discountPercent = Number(values.discount || 0);
          
          const totalCost = basePrice + cost + freight;
          const priceAfterDiscount = discountPercent > 0 
            ? totalCost - (totalCost * discountPercent) / 100 
            : totalCost;

          const updatePayload: any = {
            id: id,
            title: product.title || values.title || "",
            price: basePrice,
            stock_quantity: product.stock_quantity || values.stock_quantity || 0,
            category_id: product.category_id || values.category_id || "",
            brand_id: product.brand_id || values.brand_id || "",
            currency: product.currency || values.currency || "NOK",
            total_price: priceAfterDiscount,
          };
          
          // Explicitly set product_img_url to empty string (backend will convert to null)
          updatePayload.product_img_url = "";
          
          await productsService.updateProduct(updatePayload);
        } catch (error: any) {
          console.error("Failed to remove featured image:", error);
          setUploadErrors(prev => [...prev, `Failed to remove featured image: ${error.message}`]);
        }
      }

      // Update product data (excluding featured image which is handled above)
      await productsService.updateProduct(productUpdateData);

      // Upload gallery images if any
      if (pendingGalleryImages.length > 0) {
        try {
          setUploadProgress(prev => ({ ...prev, gallery: 1 }));
          const galleryFiles = pendingGalleryImages.map(m => m.file);
          await productsService.uploadProductImages(id, galleryFiles);
          setUploadProgress(prev => ({ ...prev, gallery: 100 }));
        } catch (error: any) {
          setUploadErrors(prev => [...prev, `Gallery images upload failed: ${error.message}`]);
        }
      }

      // Upload video if any
      let uploadedVideoUrl: string | null = null;
      if (pendingVideo) {
        try {
          setUploadProgress(prev => ({ ...prev, video: 1 }));
          const videoResponse = await productsService.uploadProductVideo(id, pendingVideo.file);
          // Backend already updates product_video_url in database
          setUploadProgress(prev => ({ ...prev, video: 100 }));
          
          // Extract video URL from response (uploadProductVideo now returns { url, fileName } directly)
          uploadedVideoUrl = videoResponse?.url || null;
          console.log("Video uploaded successfully:", videoResponse);
          console.log("Uploaded video URL:", uploadedVideoUrl);
          
          // IMPORTANT: Include the uploaded video URL in the update payload
          // This ensures the URL is preserved when the form is saved
          if (uploadedVideoUrl) {
            const videoUrl = String(uploadedVideoUrl).trim();
            productUpdateData.product_video_url = videoUrl;
            console.log("Including uploaded video URL in update payload:", videoUrl);
            
            // Update local state immediately
            setExistingVideo({
              id: crypto.randomUUID(),
              kind: "video" as const,
              name: "Product Video",
              type: "video/mp4",
              url: videoUrl,
            });
            setPendingVideo(null);
          } else {
            console.warn("No URL returned from video upload response");
          }
        } catch (error: any) {
          console.error("Video upload error:", error);
          setUploadErrors(prev => [...prev, `Video upload failed: ${error.message}`]);
        }
      }

      // Don't write to localStorage - product is already updated in backend
      // The products page should fetch from backend API, not localStorage
      
      // Reload product data to reflect changes (especially featured image)
      if (uploadErrors.length === 0) {
        // Reload product to get latest data from database
        try {
          // Add a small delay to ensure database update is complete
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const updatedProduct: any = await productsService.getProductById(id);
          if (updatedProduct) {
            setProduct(updatedProduct);
            
            // Always update featured image state from reloaded product to ensure consistency
            const updatedImgUrl = updatedProduct.product_img_url || (updatedProduct as any)?.product_img_url;
            console.log("Reloaded product - product_img_url:", updatedImgUrl);
            
            if (updatedImgUrl && String(updatedImgUrl).trim() !== "" && String(updatedImgUrl).trim() !== "null") {
              // Update featured image state with the URL from database
              const currentImgUrl = featuredImage?.url || "";
              const newImgUrl = String(updatedImgUrl).trim();
              
              if (newImgUrl !== currentImgUrl) {
                console.log("Updating featured image state from:", currentImgUrl, "to:", newImgUrl);
                setFeaturedImage({
                  id: crypto.randomUUID(),
                  kind: "image" as const,
                  name: "Featured Image",
                  type: "image/jpeg",
                  url: newImgUrl,
                });
              }
            } else if (!updatedImgUrl && featuredImage) {
              // Featured image was removed
              console.log("Featured image removed from product");
              setFeaturedImage(null);
            }
            
            // Update video state if it was uploaded or exists in updated product
            const updatedVideoUrl = updatedProduct.product_video_url || (updatedProduct as any)?.product_video_url;
            if (uploadedVideoUrl) {
              // Video was uploaded, state already updated above
            } else if (updatedVideoUrl && String(updatedVideoUrl).trim() !== "" && String(updatedVideoUrl).trim() !== "null") {
              // Video exists in product, ensure it's in state
              const currentVideoUrl = existingVideo?.url || "";
              if (String(updatedVideoUrl).trim() !== currentVideoUrl) {
                setExistingVideo({
                  id: crypto.randomUUID(),
                  kind: "video" as const,
                  name: "Product Video",
                  type: "video/mp4",
                  url: String(updatedVideoUrl).trim(),
                });
              }
            } else if (!updatedVideoUrl && existingVideo) {
              // Video was removed
              setExistingVideo(null);
            }
            
            // Reload variants from updated product
            const updatedVariants = updatedProduct?.variants || [];
            console.log("Reloading variants from updated product:", updatedVariants);
            
            // Default variant types that should always be available
            const defaultVariantNames = ["size", "model", "year"];
            
            // Get all variant types from current state
            const allVariantTypesMap = new Map<string, { id: string; name: string }>();
            
            // First, add default variant types
            defaultVariantNames.forEach((defaultName) => {
              const defaultVariant = variantTypes.find(
                (vt) => vt.name.toLowerCase().trim() === defaultName.toLowerCase()
              );
              if (defaultVariant && defaultVariant.id) {
                const key = defaultName.toLowerCase();
                allVariantTypesMap.set(key, { id: defaultVariant.id, name: defaultVariant.name });
              }
            });
            
            // Add all variant types from current state
            variantTypes.forEach((vt) => {
              const key = vt.name.toLowerCase().trim();
              if (!allVariantTypesMap.has(key)) {
                allVariantTypesMap.set(key, { id: vt.id, name: vt.name });
              }
            });
            
            // Add product-specific variant types from updated product
            updatedVariants.forEach((v: any) => {
              const variantType = v.variantType || v.variant_type;
              if (variantType?.id && variantType?.name) {
                const key = String(variantType.name).trim().toLowerCase();
                if (!allVariantTypesMap.has(key)) {
                  allVariantTypesMap.set(key, {
                    id: variantType.id,
                    name: String(variantType.name).trim(),
                  });
                }
              }
            });
            
            // Update variant types state
            const mergedVariantTypes = Array.from(allVariantTypesMap.values());
            setVariantTypes(mergedVariantTypes);
            
            // Set variant options - ensure defaults are always included
            const defaultNamesLower = defaultVariantNames.map(n => n.toLowerCase());
            const variantOptionsSet = new Set<string>();
            defaultVariantNames.forEach(name => {
              variantOptionsSet.add(name);
            });
            mergedVariantTypes.forEach(vt => {
              variantOptionsSet.add(vt.name);
            });
            
            const allVariantTypeNames = Array.from(variantOptionsSet).sort((a, b) => {
              const aLower = a.toLowerCase();
              const bLower = b.toLowerCase();
              const aIsDefault = defaultNamesLower.includes(aLower);
              const bIsDefault = defaultNamesLower.includes(bLower);
              if (aIsDefault && !bIsDefault) return -1;
              if (!aIsDefault && bIsDefault) return 1;
              return a.localeCompare(b);
            });
            
            setVariantOptions(allVariantTypeNames);
            
            // Set selected variants and values from updated product
            const selected: Record<string, boolean> = {};
            const variantValuesMap: Record<string, string> = {};
            
            allVariantTypeNames.forEach((name: string) => {
              const variant = updatedVariants.find((v: any) => {
                const variantName = v.variantType?.name || v.variant_type?.name || "";
                return String(variantName).trim().toLowerCase() === name.toLowerCase();
              });
              
              if (variant) {
                selected[name] = true;
                variantValuesMap[name] = variant.value || "";
              } else {
                selected[name] = false;
                variantValuesMap[name] = "";
              }
            });
            
            console.log("Updated variant selected:", selected);
            console.log("Updated variant values:", variantValuesMap);
            setVariantSelected(selected);
            setVariantValues(variantValuesMap);
          }
        } catch (error) {
          console.error("Failed to reload product:", error);
        }
        
        notifySuccess("Product updated successfully!");
        // Redirect to products list after successful update
        setTimeout(() => {
          router.push("/dashboard/products");
        }, 1000);
      } else {
        notifyInfo(`Product updated but some uploads failed. Check errors.`);
      }
    } catch (error: any) {
      console.error("Failed to update product:", error);
      notifyError(error?.message || "Failed to update product");
      setUploadErrors(prev => [...prev, `Product update failed: ${error.message}`]);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <PermissionBoundary screen="/dashboard/products/edit/[id]" mode="block">
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
            <Button onClick={save} disabled={!product || !values.title.trim() || isUpdating || !canUpdate} className="bg-neutral-900 text-white hover:bg-neutral-800">
              {isUpdating ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        {loading ? (
          <Card className="shadow-sm">
            <CardContent className="p-10 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
              <div className="text-sm font-medium text-foreground">Loading…</div>
            </CardContent>
          </Card>
        ) : !product ? (
          <Card className="shadow-sm">
            <CardContent className="p-10 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <SearchX className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="text-sm font-semibold text-foreground">Product not found</div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card className="shadow-sm bg-gray-100">
              <CardHeader className="bg-gray-100">
                <CardTitle className="text-lg">Product details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 bg-gray-100">
                <div className="grid gap-2">
                  <Label htmlFor="title" className="font-semibold">Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="title"
                    value={values.title}
                    onChange={(e) => setValues((p) => ({ ...p, title: e.target.value }))}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description" className="font-semibold">Description <span className="text-red-500">*</span></Label>
                  <Textarea
                    id="description"
                    value={values.description}
                    onChange={(e) => setValues((p) => ({ ...p, description: e.target.value }))}
                    rows={3}
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
                                  className="data-[state=checked]:bg-neutral-700 data-[state=checked]:border-neutral-700"
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
                          onCheckedChange={(checked) => {
                            setValues((p) => {
                              const currentGroups = p.customer_groups || [];
                              const groups = checked
                                ? [...currentGroups, group.id]
                                : currentGroups.filter((id) => id !== group.id);
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
                    onCheckedChange={(checked) => setValues((p) => ({ ...p, is_active: checked }))}
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
                    />
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
                          setValues((p) => ({ ...p, discount: v }));
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

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-base font-semibold">Bulk pricing</div>
                    <Button type="button" variant="outline" onClick={addBulkRow} className="text-sm">
                      + Add Bulk Pricing
                    </Button>
                  </div>
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

                <div className="flex justify-end">
                  <div className="px-4 py-3 text-right">
                    <div className="text-xs text-emerald-700">Total cost</div>
                    <div className="text-xl font-bold text-neutral-900">
                      {values.currency} {pricing.totalPriceWithTax.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <div className="px-4 py-3 text-right">
                    <div className="text-xs text-emerald-700">Price after discount</div>
                    <div className="text-xl font-bold text-neutral-900">
                      {values.currency} {pricing.priceAfterDiscount.toFixed(2)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm bg-gray-100">
              <CardHeader className="bg-gray-100">
                <CardTitle className="text-lg">Media</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 bg-gray-100">
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
                        {featuredImage || pendingFeaturedImage ? "Change" : "Add Featured Image"}
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
                      {!featuredImage && !pendingFeaturedImage ? (
                        <div className="p-8 text-center text-sm text-muted-foreground">
                          No featured image uploaded yet. This will be used as the primary product image.
                        </div>
                      ) : (
                        <div className="relative h-48 w-full max-w-md overflow-hidden rounded-lg border bg-muted">
                          <Image
                            src={pendingFeaturedImageUrl || (featuredImage?.url || "")}
                            alt={pendingFeaturedImage?.file.name || featuredImage?.name || "Featured Image"}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 50vw"
                          />
                          <button
                            type="button"
                            onClick={pendingFeaturedImage ? removePendingFeaturedImage : removeFeaturedImage}
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
                          Additional images for product detail page (max 10 images - JPEG, PNG, WebP)
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => galleryImagesInputRef.current?.click()}
                        disabled={galleryImages.length + pendingGalleryImages.length >= 10}
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
                      {galleryImages.length === 0 && pendingGalleryImages.length === 0 ? (
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
                                alt={m.name}
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
                          {pendingGalleryImages.map((m) => {
                            const blobUrl = pendingGalleryImageUrls[m.id];
                            if (!blobUrl) return null;
                            return (
                              <div
                                key={m.id}
                                className="relative h-24 w-32 shrink-0 overflow-hidden rounded-lg border bg-muted"
                              >
                                <Image
                                  src={blobUrl}
                                  alt={m.file.name}
                                  fill
                                  className="object-cover"
                                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                />
                                <button
                                  type="button"
                                  onClick={() => removePendingGalleryImage(m.id)}
                                  className="absolute right-1 top-1 rounded-full bg-red-600 p-1 text-white hover:bg-red-700"
                                  aria-label="Remove gallery image"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            );
                          })}
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
                      {!existingVideo && !pendingVideo ? (
                        <div className="p-8 text-center text-sm text-muted-foreground">
                          No video uploaded yet. Add one video (MP4, WebM, OGG, QuickTime - max 50MB).
                        </div>
                      ) : (
                        <div className="relative h-48 w-full max-w-md overflow-hidden rounded-lg border bg-muted">
                          <video
                            src={pendingVideoUrl || (existingVideo?.url || "")}
                            className="h-full w-full object-cover"
                            controls
                            muted
                            preload="metadata"
                            key={pendingVideoUrl || existingVideo?.url || "video"}
                          />
                          <button
                            type="button"
                            onClick={pendingVideo ? removeVideo : async () => {
                              // Remove video from backend
                              if (existingVideo && id && product) {
                                try {
                                  // Use existing product state which already has all required fields
                                  const basePrice = Number(product.price || values.selling_price || 0);
                                  const cost = Number(values.cost || 0);
                                  const freight = Number(values.freight || 0);
                                  const discountPercent = Number(values.discount || 0);
                                  
                                  const totalCost = basePrice + cost + freight;
                                  const priceAfterDiscount = discountPercent > 0 
                                    ? totalCost - (totalCost * discountPercent) / 100 
                                    : totalCost;

                                  const updatePayload: any = {
                                    id: id,
                                    title: product.title || values.title || "",
                                    price: basePrice,
                                    stock_quantity: product.stock_quantity || values.stock_quantity || 0,
                                    category_id: product.category_id || values.category_id || "",
                                    brand_id: product.brand_id || values.brand_id || "",
                                    currency: product.currency || values.currency || "NOK",
                                    total_price: priceAfterDiscount,
                                  };
                                  
                                  // Explicitly set product_video_url to empty string (backend will convert to null)
                                  updatePayload.product_video_url = "";
                                  
                                  await productsService.updateProduct(updatePayload);
                                  setExistingVideo(null);
                                } catch (error: any) {
                                  console.error("Failed to remove video:", error);
                                  const errorMessage = error?.response?.data?.message || error?.message || "Unknown error";
                                  notifyError(`Failed to remove video: ${errorMessage}`);
                                }
                              } else {
                                setExistingVideo(null);
                              }
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
              </CardContent>
            </Card>

            <Card className="shadow-sm bg-gray-100">
              <CardHeader className="bg-gray-100">
                <CardTitle className="text-lg">Inventory and shipping</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 bg-gray-100">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="stock" className="font-semibold">Stock quantity <span className="text-red-500">*</span></Label>
                    <Input
                      id="stock"
                      inputMode="numeric"
                      value={values.stock_quantity}
                      onChange={(e) => setValues((p) => ({ ...p, stock_quantity: e.target.value }))}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="weight">Weight</Label>
                    <Input
                      id="weight"
                      value={values.weight}
                      onChange={(e) => setValues((p) => ({ ...p, weight: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
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
