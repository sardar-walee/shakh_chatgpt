export const mapConfig = {
  apiKey: import.meta.env.VITE_MAP_API_KEY as string | undefined,
  styleUrl: import.meta.env.VITE_MAP_STYLE_URL as string | undefined,
};

export const storageBucket = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || "product-images";
