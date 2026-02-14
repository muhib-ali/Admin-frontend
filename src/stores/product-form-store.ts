import { create } from "zustand";

export type ProductFormValues = {
  title: string;
  description: string;
  category_id: string;
  subcategory_id: string;
  brand_id: string;
  supplier_id: string;
  tax_id: string;
  warehouse_id: string;
  customer_groups: string[];
  visibility_wholesale: boolean;
  visibility_retail: boolean;
  is_active: boolean;

  selling_price: string;
  currency: string;
  cost: string;
  freight: string;
  discount: string;
  start_discount_date: string;
  end_discount_date: string;
  total_price: string;

  stock_quantity: string;
  weight: string;
  length: string;
  width: string;
  height: string;

  product_img_url: string;
  product_video_url: string;
};

export type MediaItem = {
  id: string;
  kind: "image" | "video";
  url: string;
  file?: File;
  name?: string;
  type?: string;
};

export type StoredMediaItem = {
  id: string;
  kind: "image" | "video";
  name: string;
  type: string;
  url: string;
};

export type MediaUpload = {
  id: string;
  kind: "image" | "video";
  file: File;
};

export type UrlImageItem = { id: string; url: string };

export type UrlMediaBox = {
  imageUrlInput: string;
  images: UrlImageItem[];
  videoUrlInput: string;
  videoUrl: string;
};

export type ProductFormMediaState = {
  featuredImage: MediaItem | null;
  featuredBoxImages: MediaItem[];
  featuredSource: "upload" | "url" | null;

  videoFile: MediaItem | null;

  editFeaturedImage: StoredMediaItem | null;
  editGalleryImages: StoredMediaItem[];
  editExistingVideo: StoredMediaItem | null;
  pendingFeaturedImage: MediaUpload | null;
  pendingGalleryImages: MediaUpload[];
  pendingVideo: MediaUpload | null;

  urlMediaBox: UrlMediaBox;
  featuredBoxCarouselIndex: number;
  urlImageCarouselIndex: number;
};

type ProductFormStoreState = {
  values: ProductFormValues;
  media: ProductFormMediaState;

  setValues: (patch: Partial<ProductFormValues>) => void;
  updateValues: (updater: (prev: ProductFormValues) => Partial<ProductFormValues> | ProductFormValues) => void;
  replaceValues: (next: ProductFormValues) => void;
  setField: <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) => void;

  setMedia: (patch: Partial<ProductFormMediaState>) => void;
  updateMedia: (updater: (prev: ProductFormMediaState) => ProductFormMediaState) => void;
  replaceMedia: (next: ProductFormMediaState) => void;
  reset: (next?: Partial<{ values: Partial<ProductFormValues>; media: Partial<ProductFormMediaState> }>) => void;
};

const initialValues = (currency: string): ProductFormValues => ({
  title: "",
  description: "",
  category_id: "",
  subcategory_id: "",
  brand_id: "",
  supplier_id: "",
  tax_id: "",
  warehouse_id: "",
  customer_groups: [],
  visibility_wholesale: true,
  visibility_retail: true,
  is_active: true,

  selling_price: "",
  currency,
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
});

const initialMediaState = (): ProductFormMediaState => ({
  featuredImage: null,
  featuredBoxImages: [],
  featuredSource: null,

  videoFile: null,

  editFeaturedImage: null,
  editGalleryImages: [],
  editExistingVideo: null,
  pendingFeaturedImage: null,
  pendingGalleryImages: [],
  pendingVideo: null,

  urlMediaBox: {
    imageUrlInput: "",
    images: [],
    videoUrlInput: "",
    videoUrl: "",
  },

  featuredBoxCarouselIndex: 0,
  urlImageCarouselIndex: 0,
});

export const useProductFormStore = create<ProductFormStoreState>((set, get) => ({
  values: initialValues("NOK"),
  media: initialMediaState(),

  setValues: (patch) => set((s) => ({ values: { ...s.values, ...patch } })),
  updateValues: (updater) =>
    set((s) => {
      const next = updater(s.values);
      const patch = (next ?? {}) as Partial<ProductFormValues>;
      const isFullReplace =
        typeof (next as any)?.title === "string" &&
        typeof (next as any)?.description === "string" &&
        typeof (next as any)?.currency === "string";
      return {
        values: isFullReplace ? (next as ProductFormValues) : { ...s.values, ...patch },
      };
    }),
  replaceValues: (next) => set({ values: next }),
  setField: (key, value) => set((s) => ({ values: { ...s.values, [key]: value } })),

  setMedia: (patch) => set((s) => ({ media: { ...s.media, ...patch } })),
  updateMedia: (updater) => set((s) => ({ media: updater(s.media) })),
  replaceMedia: (next) => set({ media: next }),

  reset: (next) => {
    const currency = next?.values?.currency ?? get().values.currency ?? "NOK";
    set({
      values: { ...initialValues(currency), ...(next?.values ?? {}) },
      media: { ...initialMediaState(), ...(next?.media ?? {}) },
    });
  },
}));
