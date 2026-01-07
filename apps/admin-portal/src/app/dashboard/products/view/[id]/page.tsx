"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";

import Image from "next/image";
import PermissionBoundary from "@/components/permission-boundary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import * as productsService from "@/services/products";
import { toast } from "react-toastify";
import { getAllWarehousesDropdown, getAllSuppliersDropdown, getAllVariantTypesDropdown, getAllTaxesDropdown } from "@/services/dropdowns";
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
  variants?: {
    options: string[];
    selected: Record<string, boolean>;
    values: Record<string, string>;
  };

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

export default function ProductViewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = String(params?.id ?? "");
  const { selectedCountry, convertAmount, getCurrencySymbol } = useCurrency();

  const [product, setProduct] = React.useState<StoredProduct | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [warehouses, setWarehouses] = React.useState<Array<{ value: string; label: string }>>([]);
  const [suppliers, setSuppliers] = React.useState<Array<{ value: string; label: string }>>([]);
  const [variantTypes, setVariantTypes] = React.useState<Array<{ value: string; label: string }>>([]);
  const [taxes, setTaxes] = React.useState<Array<{ value: string; label: string }>>([]);

  // Helper function to convert and display prices
  const displayPrice = React.useCallback(async (price: number, fromCurrency: string = 'USD') => {
    if (!selectedCountry) return { amount: price, symbol: '$' };
    
    const targetCurrency = Object.keys(selectedCountry.currencies)[0];
    const targetSymbol = Object.values(selectedCountry.currencies)[0]?.symbol || '$';
    
    if (fromCurrency === targetCurrency) {
      return { amount: price, symbol: targetSymbol };
    }
    
    try {
      const convertedAmount = await convertAmount(price, fromCurrency, targetCurrency);
      return { amount: convertedAmount, symbol: targetSymbol };
    } catch (error) {
      console.error('Error converting price:', error);
      return { amount: price, symbol: '$' };
    }
  }, [selectedCountry, convertAmount]);

  // State for converted prices
  const [convertedPrices, setConvertedPrices] = React.useState<{
    sellingPrice: { amount: number; symbol: string };
    cost: { amount: number; symbol: string };
    freight: { amount: number; symbol: string };
    totalCost: { amount: number; symbol: string };
    priceAfterDiscount: { amount: number; symbol: string };
  } | null>(null);

  // Convert prices when product or selected country changes
  React.useEffect(() => {
    if (!product) return;

    const convertAllPrices = async () => {
      try {
        const selling = safeNumber(product?.selling_price ?? product?.price ?? 0);
        const cost = safeNumber(product?.cost);
        const freight = safeNumber(product?.freight);
        const discountPercent = safeNumber(product?.discount);

        const totalCost = selling + cost + freight;
        const priceAfterDiscount = totalCost - (totalCost * discountPercent) / 100;

        const [sellingPrice, costPrice, freightPrice, totalCostPrice, priceAfterDiscountPrice] = await Promise.all([
          displayPrice(selling, product.currency || 'USD'),
          displayPrice(cost, product.currency || 'USD'),
          displayPrice(freight, product.currency || 'USD'),
          displayPrice(totalCost, product.currency || 'USD'),
          displayPrice(priceAfterDiscount, product.currency || 'USD'),
        ]);

        setConvertedPrices({
          sellingPrice,
          cost: costPrice,
          freight: freightPrice,
          totalCost: totalCostPrice,
          priceAfterDiscount: priceAfterDiscountPrice,
        });
      } catch (error) {
        console.error('Error converting prices:', error);
      }
    };

    convertAllPrices();
  }, [product, selectedCountry, displayPrice]);

  React.useEffect(() => {
    // Fetch warehouses, suppliers, variant types and taxes dropdowns
    const fetchDropdowns = async () => {
      try {
        const [warehousesList, suppliersList, variantTypesList, taxesList] = await Promise.all([
          getAllWarehousesDropdown(),
          getAllSuppliersDropdown(),
          getAllVariantTypesDropdown(),
          getAllTaxesDropdown()
        ]);
        setWarehouses(warehousesList);
        setSuppliers(suppliersList);
        setVariantTypes(variantTypesList);
        setTaxes(taxesList);
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
        toast.error(error?.message || "Failed to load product");
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  // Helper function to get warehouse name by ID
  const getWarehouseName = React.useCallback((warehouseId: string) => {
    if (product?.warehouse?.name) {
      return product.warehouse.name;
    }
    const warehouse = warehouses.find(w => w.value === warehouseId);
    return warehouse?.label || warehouseId;
  }, [product, warehouses]);

  // Helper function to get supplier name by ID
  const getSupplierName = React.useCallback((supplierId: string) => {
    if (product?.supplier?.supplier_name) {
      return product.supplier.supplier_name;
    }
    const supplier = suppliers.find(s => s.value === supplierId);
    return supplier?.label || supplierId;
  }, [product, suppliers]);

  // Helper function to get variant name by ID
  const getVariantName = React.useCallback((variantId: string) => {
    const variant = variantTypes.find(v => v.value === variantId);
    return variant?.label || variantId;
  }, [variantTypes]);

  // Helper function to get tax name by ID
  const getTaxName = React.useCallback((taxId: string) => {
    if (product?.tax?.title) {
      return product.tax.title;
    }
    const tax = taxes.find(t => t.value === taxId);
    return tax?.label || taxId;
  }, [product, taxes]);

  // Helper function to get tax rate by ID
  const getTaxRate = React.useCallback((taxId: string) => {
    if (product?.tax?.rate) {
      return product.tax.rate;
    }
    // Find tax in dropdown and extract rate from label if available
    const tax = taxes.find(t => t.value === taxId);
    // Extract rate from label if it contains rate info (e.g., "VAT 10%" -> 10)
    if (tax?.label) {
      const rateMatch = tax.label.match(/(\d+(?:\.\d+)?)%?/);
      return rateMatch ? parseFloat(rateMatch[1]) : 0;
    }
    return 0;
  }, [product, taxes]);

  const selectedVariantKeys = React.useMemo(() => {
    if (!product?.variants || !Array.isArray(product.variants)) return [];
    // Handle API response structure: variants array with variantType and value
    return product.variants.map((v: any) => {
      const variantTypeId = v.variantType?.id || v.variant_type?.id || v.vtype_id;
      return variantTypeId;
    }).filter(Boolean);
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
    <PermissionBoundary screen="/dashboard/products/view[id]" mode="block">
      <div className="space-y-6 scrollbar-stable">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold truncate">View Product</h1>
            <p className="mt-2 text-sm text-muted-foreground">Product details</p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => router.push("/dashboard/products")} className="hover:bg-gray-50 transition-colors">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </Button>
            <Button onClick={() => router.push(`/dashboard/products/edit/${id}`)} disabled={!id || !product}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </Button>
          </div>
        </div>

        {loading ? (
          <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-purple-50">
            <CardContent className="p-16 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-blue-100">
                <svg className="w-8 h-8 text-blue-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div className="text-lg font-medium text-gray-900">Loading product details...</div>
              <div className="mt-2 text-sm text-gray-500">Please wait while we fetch the information</div>
            </CardContent>
          </Card>
        ) : !product ? (
          <Card className="shadow-lg border-0 bg-gradient-to-br from-red-50 to-orange-50">
            <CardContent className="p-16 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-red-100">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-lg font-medium text-gray-900">Product not found</div>
              <div className="mt-2 text-sm text-gray-500">The product you're looking for doesn't exist or has been removed</div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-blue-50/30">
              <CardHeader className="bg-blue-600 text-white">
                <CardTitle className="text-xl font-semibold flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Product Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full ${product.is_active ? 'bg-green-500 shadow-green-500/50 shadow-lg animate-pulse' : 'bg-red-500 shadow-red-500/50 shadow-lg'}`}></div>
                    <span className="text-sm font-semibold text-gray-700">{product.is_active ? "Active" : "Inactive"}</span>
                  </div>
                </div>
                
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="group rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition-all hover:border-blue-300">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</div>
                    <div className="mt-1 text-base font-semibold text-gray-900">{product.title}</div>
                  </div>
                  <div className="group rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition-all hover:border-blue-300">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</div>
                    <div className="mt-1 text-base font-semibold text-gray-900">{product.sku ?? "—"}</div>
                  </div>
                  <div className="group rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition-all hover:border-blue-300">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Category</div>
                    <div className="mt-1 text-base font-semibold text-gray-900">{product.category?.name ?? "—"}</div>
                  </div>
                  <div className="group rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition-all hover:border-blue-300">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</div>
                    <div className="mt-1 text-base font-semibold text-gray-900">{product.brand?.name ?? "—"}</div>
                  </div>
                  <div className="group rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition-all hover:border-blue-300">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</div>
                    <div className="mt-1 text-base font-semibold text-gray-900">{getSupplierName(product.supplier_id || "")}</div>
                  </div>
                  <div className="group rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition-all hover:border-blue-300">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tax</div>
                    <div className="mt-1 text-base font-semibold text-gray-900">{getTaxName(product.tax_id || "")}</div>
                  </div>
                  <div className="group rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition-all hover:border-blue-300">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Warehouse</div>
                    <div className="mt-1 text-base font-semibold text-gray-900">{getWarehouseName(product.warehouse_id || "")}</div>
                  </div>
                  <div className="group rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition-all hover:border-blue-300">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</div>
                    <div className="mt-1 text-base font-semibold text-gray-900">{product.stock_quantity}</div>
                  </div>
                  <div className="group rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition-all hover:border-blue-300">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Created</div>
                    <div className="mt-1 text-base font-semibold text-gray-900">{product.created_at ? new Date(product.created_at).toLocaleDateString() : "—"}</div>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-6 hover:shadow-md transition-all">
                  <div className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Description</div>
                  <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">{product.description || "—"}</div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-6 hover:shadow-md transition-all">
                  <div className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Customer Visibility</div>
                  <div className="flex gap-3">
                    {(product.visibility_wholesale ?? true) && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Wholesale</span>
                    )}
                    {(product.visibility_retail ?? true) && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Retail</span>
                    )}
                    {!(product.visibility_wholesale ?? true) && !(product.visibility_retail ?? true) && (
                      <span className="text-gray-500 text-sm">No visibility settings</span>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-6 hover:shadow-md transition-all">
                  <div className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Product Variants</div>
                  {!product.variants || !Array.isArray(product.variants) || product.variants.length === 0 ? (
                    <div className="text-gray-500 text-sm">No variants configured</div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {product.variants.map((variant: any, index: number) => {
                        const variantTypeId = variant.variantType?.id || variant.variant_type?.id || variant.vtype_id;
                        const variantValue = variant.value;
                        return (
                          <div key={index} className="rounded-lg border border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50 p-4">
                            <div className="text-xs font-medium text-gray-600 uppercase tracking-wider">{getVariantName(variantTypeId)}</div>
                            <div className="mt-1 text-base font-semibold text-gray-900">{variantValue || "—"}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-green-50/30">
              <CardHeader className="bg-green-600 text-white">
                <CardTitle className="text-xl font-semibold flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Pricing Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="group rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition-all hover:border-green-300">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Selling Price</div>
                    <div className="mt-1 text-lg font-bold text-green-600">
                      {convertedPrices ? 
                        `${convertedPrices.sellingPrice.symbol} ${convertedPrices.sellingPrice.amount.toFixed(2)}` :
                        `${product.currency} ${safeNumber(product.selling_price ?? product.price).toFixed(2)}`
                      }
                    </div>
                  </div>
                  <div className="group rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition-all hover:border-green-300">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Currency</div>
                    <div className="mt-1 text-base font-semibold text-gray-900">{product.currency}</div>
                  </div>
                  <div className="group rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition-all hover:border-green-300">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</div>
                    <div className="mt-1 text-base font-semibold text-gray-900">
                      {convertedPrices ? 
                        `${convertedPrices.cost.symbol} ${convertedPrices.cost.amount.toFixed(2)}` :
                        safeNumber(product.cost).toFixed(2)
                      }
                    </div>
                  </div>
                  <div className="group rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition-all hover:border-green-300">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Freight</div>
                    <div className="mt-1 text-base font-semibold text-gray-900">
                      {convertedPrices ? 
                        `${convertedPrices.freight.symbol} ${convertedPrices.freight.amount.toFixed(2)}` :
                        safeNumber(product.freight).toFixed(2)
                      }
                    </div>
                  </div>
                  <div className="group rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition-all hover:border-green-300">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tax Rate</div>
                    <div className="mt-1 text-base font-semibold text-gray-900">{getTaxRate(product.tax_id || "")}%</div>
                  </div>
                  <div className="group rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition-all hover:border-green-300">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Discount</div>
                    <div className="mt-1 text-base font-semibold text-gray-900">{product.discount || "0"}%</div>
                  </div>
                  <div className="group rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition-all hover:border-green-300">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</div>
                    <div className="mt-1 text-base font-semibold text-gray-900">{product.start_discount_date || "—"}</div>
                  </div>
                  <div className="group rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition-all hover:border-green-300">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</div>
                    <div className="mt-1 text-base font-semibold text-gray-900">{product.end_discount_date || "—"}</div>
                  </div>
                  <div className="group rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition-all hover:border-green-300">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Price</div>
                    <div className="mt-1 text-base font-semibold text-gray-900">{product.total_price || "—"}</div>
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="rounded-xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-emerald-700 uppercase tracking-wider">Total Cost</div>
                        <div className="text-2xl font-bold text-emerald-800 mt-1">
                          {convertedPrices ? 
                            `${convertedPrices.totalCost.symbol} ${convertedPrices.totalCost.amount.toFixed(2)}` :
                            `${product.currency} ${pricing.totalCost.toFixed(2)}`
                          }
                        </div>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                        <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-blue-700 uppercase tracking-wider">Price After Discount</div>
                        <div className="text-2xl font-bold text-blue-800 mt-1">
                          {convertedPrices ? 
                            `${convertedPrices.priceAfterDiscount.symbol} ${convertedPrices.priceAfterDiscount.amount.toFixed(2)}` :
                            `${product.currency} ${pricing.priceAfterDiscount.toFixed(2)}`
                          }
                        </div>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-6 hover:shadow-md transition-all">
                  <div className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Bulk Pricing
                  </div>
                  {!product.bulkPrices?.length ? (
                    <div className="text-gray-500 text-sm">No bulk pricing configured</div>
                  ) : (
                    <div className="space-y-3">
                      {product.bulkPrices.map((row: any) => (
                        <div key={row.id} className="grid gap-4 sm:grid-cols-2 p-4 rounded-lg bg-gradient-to-r from-gray-50 to-blue-50 border border-gray-200">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                              </svg>
                            </div>
                            <div>
                              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</div>
                              <div className="text-base font-semibold text-gray-900">{row.quantity || "—"}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div>
                              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Price per Unit</div>
                              <div className="text-base font-semibold text-gray-900">${row.price_per_product || "—"}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-purple-50/30">
              <CardHeader className="bg-purple-600 text-white">
                <CardTitle className="text-xl font-semibold flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Product Media
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Featured Image and Gallery Images in One Row */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 hover:shadow-md transition-all">
                  <div className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Product Images
                  </div>
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {/* Featured Image */}
                    {product.product_img_url && (
                      <div className="flex-shrink-0 relative group">
                        <div className="w-48 h-48 rounded-xl overflow-hidden border-2 border-blue-200 shadow-lg">
                          <Image
                            src={product.product_img_url}
                            alt={product.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                          Featured
                        </div>
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 rounded-xl"></div>
                      </div>
                    )}
                    
                    {/* Gallery Images */}
                    {product.images?.map((image) => (
                      <div key={image.id} className="flex-shrink-0 relative group">
                        <div className="w-48 h-48 rounded-xl overflow-hidden border-2 border-gray-200 shadow-lg">
                          <Image
                            src={image.url}
                            alt={image.file_name || "Gallery image"}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 rounded-xl"></div>
                      </div>
                    ))}
                    
                    {/* No Images State */}
                    {!product.product_img_url && (!product.images || product.images.length === 0) && (
                      <div className="w-48 h-48 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center border-2 border-gray-300">
                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>

                {/* Product Video */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 hover:shadow-md transition-all">
                  <div className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Product Video
                  </div>
                  {product.product_video_url ? (
                    <div className="aspect-video rounded-xl overflow-hidden border-2 border-gray-200 shadow-lg">
                      <video
                        src={product.product_video_url}
                        controls
                        className="w-full h-full object-cover"
                      >
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  ) : (
                    <div className="aspect-video rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center border-2 border-gray-300">
                      <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-orange-50/30">
              <CardHeader className="bg-orange-600 text-white">
                <CardTitle className="text-xl font-semibold flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  Inventory and Shipping
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="group rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition-all hover:border-orange-300">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Quantity</div>
                    <div className="mt-1 text-base font-semibold text-gray-900">{product.stock_quantity}</div>
                  </div>
                  <div className="group rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition-all hover:border-orange-300">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Weight</div>
                    <div className="mt-1 text-base font-semibold text-gray-900">{product.weight || "—"}</div>
                  </div>
                  <div className="group rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition-all hover:border-orange-300">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Length</div>
                    <div className="mt-1 text-base font-semibold text-gray-900">{product.length || "—"}</div>
                  </div>
                  <div className="group rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition-all hover:border-orange-300">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Width</div>
                    <div className="mt-1 text-base font-semibold text-gray-900">{product.width || "—"}</div>
                  </div>
                  <div className="group rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition-all hover:border-orange-300">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Height</div>
                    <div className="mt-1 text-base font-semibold text-gray-900">{product.height || "—"}</div>
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
