"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";

import Image from "next/image";
import PermissionBoundary from "@/components/permission-boundary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import * as productsService from "@/services/products";
import { notifyError } from "@/utils/notify";
import { Loader2, SearchX } from "lucide-react";
import {
  getAllWarehousesDropdown,
  getAllSuppliersDropdown,
  getAllVariantTypesDropdown,
  getAllTaxesDropdown,
} from "@/services/dropdowns";
import { listTaxes } from "@/services/taxes";
import { useCurrency } from "@/contexts/currency-context";

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
  bulk_pricing?: { id: string; quantity: string; price: string }[];

  weight?: string;
  length?: string;
  width?: string;
  height?: string;

  customer_groups?: { cvg_ids: string[] };
  variants?: any;

  created_at: string;
  category?: { id: string; name: string };
  brand?: { id: string; name: string };
  supplier?: { id: string; supplier_name: string; email: string; phone: string };
  tax?: { id: string; title: string; rate: number };
  warehouse?: { id: string; name: string; code: string };
  images?: { id: string; url: string; file_name: string; sort_order: number }[];
  product_video_url?: string;
  bulkPrices?: { id: string; quantity: number; price_per_product: number }[];
};

function safeNumber(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Small helper UI pieces (keeps markup tidy) */
function Field({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-neutral-900 break-words">
        {value}
      </div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-base sm:text-lg font-semibold text-neutral-900">
        {title}
      </h2>
      <div className="h-px flex-1 bg-neutral-200" />
    </div>
  );
}

export default function ProductViewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = String(params?.id ?? "");
  const { selectedCountry, convertAmount } = useCurrency();

  const [product, setProduct] = React.useState<StoredProduct | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [warehouses, setWarehouses] = React.useState<
    Array<{ value: string; label: string }>
  >([]);
  const [suppliers, setSuppliers] = React.useState<
    Array<{ value: string; label: string }>
  >([]);
  const [variantTypes, setVariantTypes] = React.useState<
    Array<{ value: string; label: string }>
  >([]);
  const [taxes, setTaxes] = React.useState<
    Array<{ value: string; label: string }>
  >([]);
  const [taxRows, setTaxRows] = React.useState<{ id: string; title: string; rate: number }[]>([]);

  const displayPrice = React.useCallback(
    async (price: number, fromCurrency: string = "NOK") => {
      if (!selectedCountry) return { amount: price, symbol: "kr" };

      const targetCurrency = Object.keys(selectedCountry.currencies)[0];
      const targetSymbol =
        Object.values(selectedCountry.currencies)[0]?.symbol || "kr";

      if (fromCurrency === targetCurrency) {
        return { amount: price, symbol: targetSymbol };
      }

      try {
        const convertedAmount = await convertAmount(
          price,
          fromCurrency,
          targetCurrency
        );
        return { amount: convertedAmount, symbol: targetSymbol };
      } catch (error) {
        console.error("Error converting price:", error);
        return { amount: price, symbol: "kr" };
      }
    },
    [selectedCountry, convertAmount]
  );

  const [convertedPrices, setConvertedPrices] = React.useState<{
    sellingPrice: { amount: number; symbol: string };
    cost: { amount: number; symbol: string };
    freight: { amount: number; symbol: string };
    totalCost: { amount: number; symbol: string };
    priceAfterDiscount: { amount: number; symbol: string };
  } | null>(null);

  React.useEffect(() => {
    if (!product) return;

    const convertAllPrices = async () => {
      try {
        const selling = safeNumber(product?.selling_price ?? product?.price ?? 0);
        const cost = safeNumber(product?.cost);
        const freight = safeNumber(product?.freight);
        const discountPercent = safeNumber(product?.discount);
        let taxRate = safeNumber(product?.tax?.rate ?? 0);

        console.log("=== CONVERT ALL PRICES DEBUG ===");
        console.log("Initial tax rate from product.tax?.rate:", taxRate);

        // If product tax rate is 0, try to get it from taxRows using tax_id
        if (taxRate === 0 && product?.tax_id) {
          const taxFromRows = taxRows.find((t) => t.id === product.tax_id);
          if (taxFromRows?.rate) {
            taxRate = taxFromRows.rate;
            console.log("Tax Rate found from taxRows:", taxRate);
          }
        }

        console.log("Final tax rate being used:", taxRate);

        // Base price includes selling price + cost + freight
        const basePrice = selling + cost + freight;
        
        // Calculate tax on base price
        const taxAmount = basePrice * (taxRate / 100);
        
        // Total price with tax included
        const totalPriceWithTax = basePrice + taxAmount;
        
        // Apply discount on total price (including tax)
        const priceAfterDiscount = discountPercent > 0
          ? totalPriceWithTax - (totalPriceWithTax * discountPercent) / 100
          : totalPriceWithTax;

        console.log("Converted prices calculation:");
        console.log("Base Price:", basePrice);
        console.log("Tax Amount:", taxAmount);
        console.log("Total Price with Tax:", totalPriceWithTax);
        console.log("Price After Discount:", priceAfterDiscount);

        const [sellingPrice, costPrice, freightPrice, totalCostPrice, priceAfterDiscountPrice] =
          await Promise.all([
            displayPrice(selling, product.currency || "NOK"),
            displayPrice(cost, product.currency || "NOK"),
            displayPrice(freight, product.currency || "NOK"),
            displayPrice(totalPriceWithTax, product.currency || "NOK"), // Updated to include tax
            displayPrice(priceAfterDiscount, product.currency || "NOK"),
          ]);

        setConvertedPrices({
          sellingPrice,
          cost: costPrice,
          freight: freightPrice,
          totalCost: totalCostPrice, // This now includes tax
          priceAfterDiscount: priceAfterDiscountPrice,
        });
      } catch (error) {
        console.error("Error converting prices:", error);
      }
    };

    convertAllPrices();
  }, [product, selectedCountry, displayPrice]);

  React.useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [warehousesList, suppliersList, variantTypesList, taxesList, taxData] =
          await Promise.all([
            getAllWarehousesDropdown(),
            getAllSuppliersDropdown(),
            getAllVariantTypesDropdown(),
            getAllTaxesDropdown(),
            listTaxes(1, 100, undefined),
          ]);
        setWarehouses(warehousesList);
        setSuppliers(suppliersList);
        setVariantTypes(variantTypesList);
        
        // Create a unified tax mapping that works for both dropdown and calculations
        const unifiedTaxMap = new Map<string, { id: string; title: string; rate: number }>();
        
        // Map dropdown taxes (for the select dropdown)
        setTaxes((taxesList ?? []).map((t: any) => {
          const taxInfo = { value: t.value, label: t.label };
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
        
        // Set tax rows using the unified map
        setTaxRows(Array.from(unifiedTaxMap.values()));
        
        console.log("=== VIEW PAGE TAX DEBUG ===");
        console.log("Product tax_id:", product?.tax_id);
        console.log("Available taxes after loading:", taxesList.map(t => ({ value: t.value, label: t.label })));
        console.log("Tax rows with rates:", Array.from(unifiedTaxMap.values()));
      } catch (error) {
        console.error("Failed to fetch dropdowns:", error);
      }
    };
    fetchDropdowns();
  }, []);

  React.useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const fetchProduct = async () => {
      try {
        setLoading(true);
        const productData = await productsService.getProductById(id);
        setProduct(productData);
      } catch (error: any) {
        console.error("Failed to load product:", error);
        notifyError(error?.message || "Failed to load product");
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const getWarehouseName = React.useCallback(
    (warehouseId: string) => {
      if (product?.warehouse?.name) return product.warehouse.name;
      const warehouse = warehouses.find((w) => w.value === warehouseId);
      return warehouse?.label || warehouseId;
    },
    [product, warehouses]
  );

  const getSupplierName = React.useCallback(
    (supplierId: string) => {
      if (product?.supplier?.supplier_name) return product.supplier.supplier_name;
      const supplier = suppliers.find((s) => s.value === supplierId);
      return supplier?.label || supplierId;
    },
    [product, suppliers]
  );

  const getVariantName = React.useCallback(
    (variantId: string) => {
      const variant = variantTypes.find((v) => v.value === variantId);
      return variant?.label || variantId;
    },
    [variantTypes]
  );

  const getTaxName = React.useCallback(
    (taxId: string) => {
      if (product?.tax?.title) return product.tax.title;
      const tax = taxes.find((t) => t.value === taxId);
      return tax?.label || taxId;
    },
    [product, taxes]
  );

  const getTaxRate = React.useCallback(
    (taxId: string) => {
      // First try to get from product tax object
      if (product?.tax?.rate) return product.tax.rate;
      
      // Then try to get from taxRows (with proper rate data)
      const tax = taxRows.find((t) => t.id === taxId);
      if (tax?.rate) return tax.rate;
      
      // Fallback to old logic if needed
      const fallbackTax = taxes.find((t) => t.value === taxId);
      if (fallbackTax?.label) {
        const rateMatch = fallbackTax.label.match(/(\d+(?:\.\d+)?)%?/);
        return rateMatch ? parseFloat(rateMatch[1]) : 0;
      }
      
      return 0;
    },
    [product, taxRows, taxes]
  );

  const pricing = React.useMemo(() => {
    const selling = safeNumber(product?.selling_price ?? product?.price ?? 0);
    const cost = safeNumber(product?.cost);
    const freight = safeNumber(product?.freight);
    const discountPercent = safeNumber(product?.discount);
    const taxRate = safeNumber(product?.tax?.rate ?? 0);

    console.log("=== VIEW PAGE PRICING CALCULATION ===");
    console.log("Product data:", {
      selling_price: product?.selling_price,
      price: product?.price,
      cost: product?.cost,
      freight: product?.freight,
      discount: product?.discount,
      tax: product?.tax
    });
    console.log("Parsed values:");
    console.log("Selling Price:", selling);
    console.log("Cost:", cost);
    console.log("Freight:", freight);
    console.log("Discount %:", discountPercent);
    console.log("Tax Rate from product.tax?.rate:", taxRate);

    // If product tax rate is 0, try to get it from taxRows using tax_id
    let finalTaxRate = taxRate;
    if (finalTaxRate === 0 && product?.tax_id) {
      const taxFromRows = taxRows.find((t) => t.id === product.tax_id);
      if (taxFromRows?.rate) {
        finalTaxRate = taxFromRows.rate;
        console.log("Tax Rate found from taxRows:", finalTaxRate);
      }
    }

    console.log("Final Tax Rate being used:", finalTaxRate);

    // Base price includes selling price + cost + freight
    const basePrice = selling + cost + freight;
    console.log("Base Price (Selling + Cost + Freight):", basePrice);
    
    // Calculate tax on base price
    const taxAmount = basePrice * (finalTaxRate / 100);
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
      totalCost: totalPriceWithTax, // Updated to include tax
      priceAfterDiscount,
      taxAmount,
      basePrice,
    };
  }, [product, taxRows]);

  return (
    <PermissionBoundary screen="/dashboard/products/view[id]" mode="block">
      <div className="space-y-6 scrollbar-stable bg-neutral-50/40 p-4 sm:p-6">
        {/* Top Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold text-neutral-900 truncate">
              Product Details
            </h1>
            <p className="mt-1 text-sm text-neutral-600">
              View product information, pricing, media, and inventory.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard/products")}
              className="border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-900"
            >
              Back
            </Button>
            <Button
              onClick={() => router.push(`/dashboard/products/edit/${id}`)}
              disabled={!id || !product}
              className="bg-neutral-900 text-white hover:bg-neutral-800"
            >
              Edit
            </Button>
          </div>
        </div>

        {/* Loading / Not Found */}
        {loading ? (
          <Card className="border-neutral-200 shadow-sm">
            <CardContent className="p-10 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
                <Loader2 className="h-6 w-6 animate-spin text-neutral-600" />
              </div>
              <div className="text-sm font-medium text-neutral-900">Loading product details…</div>
              <div className="mt-1 text-xs text-neutral-500">Fetching latest data</div>
            </CardContent>
          </Card>
        ) : !product ? (
          <Card className="border-neutral-200 shadow-sm">
            <CardContent className="p-10 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
                <SearchX className="h-6 w-6 text-neutral-600" />
              </div>
              <div className="text-sm font-semibold text-neutral-900">Product not found</div>
              <div className="mt-1 text-xs text-neutral-500">
                This product may have been removed or the ID is invalid.
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Product Overview */}
            <Card className="border-neutral-200 shadow-sm bg-gray-100">
              <CardHeader className="border-b border-neutral-200 bg-gray-100">
                <CardTitle className="text-base font-semibold text-neutral-900">
                  Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5 bg-gray-100">
                {/* Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={[
                        "h-2.5 w-2.5 rounded-full",
                        product.is_active ? "bg-green-500" : "bg-neutral-400",
                      ].join(" ")}
                    />
                    <span className="text-sm font-medium text-neutral-800">
                      {product.is_active ? "Active" : "Inactive"}
                    </span>
                    {product.is_active && (
                      <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 border border-green-200">
                        Live
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Product Name" value={product.title} />
                  <Field label="SKU" value={product.sku ?? "—"} />
                  <Field label="Category" value={product.category?.name ?? "—"} />
                  <Field label="Brand" value={product.brand?.name ?? "—"} />
                  <Field
                    label="Supplier"
                    value={getSupplierName(product.supplier_id || "") || "—"}
                  />
                  <Field label="Tax" value={getTaxName(product.tax_id || "") || "—"} />
                  <Field
                    label="Warehouse"
                    value={getWarehouseName(product.warehouse_id || "") || "—"}
                  />
                  <Field label="Stock" value={product.stock_quantity} />
                  <Field
                    label="Created"
                    value={
                      product.created_at
                        ? new Date(product.created_at).toLocaleDateString()
                        : "—"
                    }
                  />
                </div>

                <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                    Description
                  </div>
                  <div className="mt-2 text-sm text-neutral-800 whitespace-pre-wrap leading-relaxed">
                    {product.description || "—"}
                  </div>
                </div>

                <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                    Customer Visibility
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(product.visibility_wholesale ?? true) && (
                      <span className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-800">
                        Wholesale
                      </span>
                    )}
                    {(product.visibility_retail ?? true) && (
                      <span className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-800">
                        Retail
                      </span>
                    )}
                    {!(product.visibility_wholesale ?? true) &&
                      !(product.visibility_retail ?? true) && (
                        <span className="text-xs text-neutral-500">
                          No visibility settings
                        </span>
                      )}
                  </div>
                </div>

                <div className="space-y-3">
                  <SectionHeader title="Variants" />
                  {!product.variants ||
                  !Array.isArray(product.variants) ||
                  product.variants.length === 0 ? (
                    <div className="text-sm text-neutral-500">
                      No variants configured
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {product.variants.map((variant: any, index: number) => {
                        const variantTypeId =
                          variant.variantType?.id ||
                          variant.variant_type?.id ||
                          variant.vtype_id;
                        const variantValue = variant.value;
                        return (
                          <div
                            key={index}
                            className="rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-sm"
                          >
                            <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                              {getVariantName(variantTypeId)}
                            </div>
                            <div className="mt-1 text-sm font-semibold text-neutral-900">
                              {variantValue || "—"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Pricing */}
            <Card className="border-neutral-200 shadow-sm bg-gray-100">
              <CardHeader className="border-b border-neutral-200 bg-gray-100">
                <CardTitle className="text-base font-semibold text-neutral-900">
                  Pricing
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5 bg-gray-100">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Field
                    label="Selling Price"
                    value={
                      convertedPrices
                        ? `${convertedPrices.sellingPrice.symbol} ${convertedPrices.sellingPrice.amount.toFixed(
                            2
                          )}`
                        : `${product.currency} ${safeNumber(
                            product.selling_price ?? product.price
                          ).toFixed(2)}`
                    }
                  />
                  <Field label="Currency" value={product.currency} />
                  <Field
                    label="Cost"
                    value={
                      convertedPrices
                        ? `${convertedPrices.cost.symbol} ${convertedPrices.cost.amount.toFixed(
                            2
                          )}`
                        : safeNumber(product.cost).toFixed(2)
                    }
                  />
                  <Field
                    label="Freight"
                    value={
                      convertedPrices
                        ? `${convertedPrices.freight.symbol} ${convertedPrices.freight.amount.toFixed(
                            2
                          )}`
                        : safeNumber(product.freight).toFixed(2)
                    }
                  />
                  <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
                    <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                      Tax Information
                    </div>
                    <div className="mt-2 space-y-1">
                      <div className="text-sm font-semibold text-neutral-900">
                        {getTaxName(product.tax_id || "") || "—"}
                      </div>
                      <div className="text-xs text-neutral-600">
                        Rate: {getTaxRate(product.tax_id || "")}%
                      </div>
                    </div>
                  </div>
                  <Field label="Discount" value={`${product.discount || "0"}%`} />
                  <Field label="Start Date" value={product.start_discount_date || "—"} />
                  <Field label="End Date" value={product.end_discount_date || "—"} />
                  <Field 
                    label="Total Price" 
                    value={
                      convertedPrices
                        ? `${convertedPrices.totalCost.symbol} ${convertedPrices.totalCost.amount.toFixed(2)}`
                        : `${product.currency} ${pricing.totalCost.toFixed(2)}`
                    } 
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
                    <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                      Total Cost
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-neutral-900">
                      {convertedPrices
                        ? `${convertedPrices.totalCost.symbol} ${convertedPrices.totalCost.amount.toFixed(
                            2
                          )}`
                        : `${product.currency} ${pricing.totalCost.toFixed(2)}`}
                    </div>
                  </div>

                  <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
                    <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                      Price After Discount
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-neutral-900">
                      {convertedPrices
                        ? `${convertedPrices.priceAfterDiscount.symbol} ${convertedPrices.priceAfterDiscount.amount.toFixed(
                            2
                          )}`
                        : `${product.currency} ${pricing.priceAfterDiscount.toFixed(2)}`}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <SectionHeader title="Bulk Pricing" />
                  {!product.bulkPrices?.length ? (
                    <div className="text-sm text-neutral-500">
                      No bulk pricing configured
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
                      <div className="grid grid-cols-2 bg-neutral-50 px-4 py-3 text-xs font-semibold text-neutral-700">
                        <div>Quantity</div>
                        <div className="text-right">Price / Unit</div>
                      </div>
                      <div className="divide-y divide-neutral-200">
                        {product.bulkPrices.map((row: any) => (
                          <div
                            key={row.id}
                            className="grid grid-cols-2 px-4 py-3 text-sm"
                          >
                            <div className="font-medium text-neutral-900">
                              {row.quantity || "—"}
                            </div>
                            <div className="text-right font-semibold text-neutral-900">
                              ${row.price_per_product || "—"}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Media */}
            <Card className="border-neutral-200 shadow-sm bg-gray-100">
              <CardHeader className="border-b border-neutral-200 bg-gray-100">
                <CardTitle className="text-base font-semibold text-neutral-900">
                  Media
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5 bg-gray-100">
                <div className="space-y-3">
                  <SectionHeader title="Images" />
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {product.product_img_url && (
                      <div className="flex-shrink-0">
                        <div className="relative h-44 w-44 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 shadow-sm">
                          <Image
                            src={product.product_img_url}
                            alt={product.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="mt-2 text-xs font-medium text-neutral-700">
                          Featured
                        </div>
                      </div>
                    )}

                    {(product.images ?? [])
                      .filter((image) => image.url !== product.product_img_url)
                      .map((image, index) => (
                        <div key={image.id} className="flex-shrink-0">
                          <div className="relative h-44 w-44 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 shadow-sm">
                            <Image
                              src={image.url}
                              alt={`Image ${index + 1}`}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="mt-2 text-xs text-neutral-500 truncate w-44">
                            Image {index + 1}
                          </div>
                        </div>
                      ))}

                    {!product.product_img_url &&
                      (!product.images || product.images.length === 0) && (
                        <div className="h-44 w-44 rounded-xl border border-neutral-200 bg-white flex items-center justify-center text-xs text-neutral-500">
                          No images
                        </div>
                      )}
                  </div>
                </div>

                <div className="space-y-3">
                  <SectionHeader title="Video" />
                  {product.product_video_url ? (
                    <div className="aspect-video overflow-hidden rounded-xl border border-neutral-200 bg-black shadow-sm">
                      <video
                        src={product.product_video_url}
                        controls
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="aspect-video rounded-xl border border-neutral-200 bg-white flex items-center justify-center text-sm text-neutral-500">
                      No video
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Inventory & Shipping */}
            <Card className="border-neutral-200 shadow-sm bg-gray-100">
              <CardHeader className="border-b border-neutral-200 bg-gray-100">
                <CardTitle className="text-base font-semibold text-neutral-900">
                  Inventory & Shipping
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 bg-gray-100">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Stock Quantity" value={product.stock_quantity} />
                  <Field label="Weight" value={product.weight || "—"} />
                  <Field label="Length" value={product.length || "—"} />
                  <Field label="Width" value={product.width || "—"} />
                  <Field label="Height" value={product.height || "—"} />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </PermissionBoundary>
  );
}
