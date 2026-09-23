import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ShoppingCart, Search, UserRound, Bike, Store, Utensils, Shirt, Sparkles, CarFront,
  ShieldCheck, Plus, Trash2, LayoutDashboard, Wallet, Package, Languages, Menu, X,
  Eye, UploadCloud, ImagePlus, Camera, Home, MapPin, CheckCircle2, Moon, Sun, PlusCircle, SlidersHorizontal
} from "lucide-react";
import { isSupabaseConfigured, supabase, ensureProfileExists } from "./lib/supabase";
import { mapConfig, storageBucket } from "./lib/platform";
import AdminConsole from "./components/AdminConsole";
import { OrdersView } from "./components/OrdersView";
import { PWAInstallButton, OfflineIndicator } from "./components/PWAInstall";
import "./styles.css";

type Role = "super_admin" | "admin" | "captain" | "restaurant" | "supermarket" | "fashion" | "beauty" | "car_dealer" | "customer";
type Product = {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  emoji: string;
  owner: string;
  ownerId: string | null;
  status: string;
  attributes: Record<string, unknown>;
};
type UserProfile = { id: string; full_name: string; phone: string; role: Role; email: string };
type WalletTransaction = { id: string; type: string; kind?: string; amount: number; status: string; reference_id?: string | null; created_at: string; note?: string | null };
type Field = { key: string; label: string; type: "text" | "number" | "date" | "select" | "multi" | "textarea"; required?: boolean; options?: string[]; placeholder?: string };

const roles: { id: Role; ku: string; ar: string; en: string; icon: React.ReactNode }[] = [
  { id: "restaurant", ku: "چێشتخانە", ar: "مطعم", en: "Restaurant", icon: <Utensils /> },
  { id: "supermarket", ku: "سوپەرمارکێت", ar: "سوبرماركت", en: "Supermarket", icon: <Store /> },
  { id: "fashion", ku: "جل و بەرگ", ar: "أزياء", en: "Fashion", icon: <Shirt /> },
  { id: "beauty", ku: "جوانکاری", ar: "تجميل", en: "Beauty", icon: <Sparkles /> },
  { id: "car_dealer", ku: "ئۆتۆمبێل", ar: "سيارات", en: "Cars", icon: <CarFront /> },
  { id: "captain", ku: "گەیاندن", ar: "توصيل", en: "Delivery", icon: <Bike /> }
];

const merchantRoles: Role[] = ["restaurant", "supermarket", "fashion", "beauty", "car_dealer"];

const roleLabel = (role: Role, t: (a: string, b: string, c: string) => string) => {
  const labels: Record<Role, [string, string, string]> = {
    super_admin: ["بەڕێوەبەری گشتی", "المدير العام", "Super admin"],
    admin: ["بەڕێوەبەر", "المدير", "Admin"],
    captain: ["شۆفێر / گەیاندکار", "السائق / المندوب", "Driver / Captain"],
    restaurant: ["خاوەنی چێشتخانە", "صاحب المطعم", "Restaurant merchant"],
    supermarket: ["خاوەنی سوپەرمارکێت", "صاحب السوبرماركت", "Supermarket merchant"],
    fashion: ["فرۆشیاری جل و بەرگ", "بائع الأزياء", "Fashion merchant"],
    beauty: ["فرۆشیاری جوانکاری", "بائع التجميل", "Beauty merchant"],
    car_dealer: ["فرۆشیاری ئۆتۆمبێل", "بائع السيارات", "Car merchant"],
    customer: ["کڕیار", "عميل", "Customer"]
  };
  return t(...(labels[role] || labels.customer));
};

const commonSizes = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
const shoeSizes = ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46"];
const colors = ["ڕەش / Black", "سپی / White", "سور / Red", "شین / Blue", "سەوز / Green", "زەرد / Yellow", "پەمەیی / Pink", "مۆر / Purple", "قاوەیی / Brown", "خۆڵەمێشی / Gray", "نارنجی / Orange"];

const field = (key: string, label: string, type: Field["type"], options?: string[], required = false): Field => ({ key, label, type, options, required });

const categorySchemas: Record<string, Field[]> = {
  fashion: [
    field("gender", "جۆری بەکارهێنەر / Gender", "select", ["پیاوان / Men", "ئافرەتان / Women", "منداڵان / Kids", "Unisex"], true),
    field("clothing_type", "جۆری جل / Clothing type", "select", ["کراس / Shirt", "پانتۆڵ / Trousers", "تی‌شێرت / T-shirt", "جاکەت / Jacket", "کاڵا / Coat", "فستان / Dress", "جل و بەرگی منداڵان / Kidswear", "پێڵاو / Shoes", "سپۆرت / Sportswear", "پێوەکراو / Accessories", "هەر جۆرێکی تر / Other"], true),
    field("size", "قەبارە / Size", "multi", [...commonSizes, ...shoeSizes, "Custom size"], true),
    field("custom_size", "قەبارەی تایبەت / Custom size", "text"),
    field("colors", "ڕەنگ / Colors", "multi", colors, true),
    field("custom_color", "ڕەنگی تایبەت / Custom color", "text"),
    field("brand", "مارکە / Brand", "text"),
    field("material", "جۆری مادە / Material", "text"),
    field("season", "وەرز / Season", "select", ["بەهار / Spring", "هاوین / Summer", "پاییز / Autumn", "زستان / Winter", "هەموو وەرزەکان / All seasons"]),
    field("quantity", "دانە / Quantity", "number"),
    field("discount", "داشکاندن % / Discount", "number"),
    field("video_url", "ڤیدیۆ / Video URL", "text")
  ],
  car_dealer: [
    field("make", "مارکە / Make", "text", undefined, true),
    field("model", "مۆدێل / Model", "text", undefined, true),
    field("model_year", "ساڵ / Model year", "number", undefined, true),
    field("location", "شوێن / Location", "text", undefined, true),
    field("vehicle_type", "جۆر / Vehicle type", "select", ["Sedan", "SUV", "Crossover", "Coupe", "Hatchback", "Pickup", "Van", "Truck", "Motorcycle", "Other"], true),
    field("fuel", "بەنزین / Fuel", "select", ["Petrol", "Diesel", "Hybrid", "Electric", "LPG"]),
    field("transmission", "گێڕ / Transmission", "select", ["Automatic", "Manual", "CVT"]),
    field("drive_type", "جوڵان / Drive type", "select", ["FWD", "RWD", "AWD / 4WD"]),
    field("engine_size", "قەبارەی ماتۆڕ / Engine size", "text"),
    field("horsepower", "هێزی ماتۆڕ / Horsepower", "number"),
    field("cylinder", "سیلندەر / Cylinder", "number"),
    field("mileage", "کارکردن / Mileage", "number"),
    field("mileage_unit", "یەکەی کارکردن / Mileage unit", "select", ["km", "miles"]),
    field("exterior_color", "ڕەنگی دەرەوە / Exterior color", "text"),
    field("interior_color", "ڕەنگی ناوەوە / Interior color", "text"),
    field("seats", "ژمارەی کورسی / Seats", "number"),
    field("condition", "دۆخ / Condition", "select", ["New", "Used"], true),
    field("registration_status", "بارودۆخی تۆمارکردن / Registration", "text"),
    field("import_status", "بارودۆخی هاوردە / Import status", "text"),
    field("features", "تایبەتمەندییەکان / Features", "multi", ["Sunroof", "Panoramic Roof", "Leather Seats", "Reverse Camera", "360 Camera", "Parking Sensors", "Cruise Control", "Adaptive Cruise", "Bluetooth", "Apple CarPlay", "Android Auto", "Navigation", "Keyless Entry", "Push Start", "Heated Seats", "Ventilated Seats", "Air Conditioning", "Safety features"]),
    field("video_url", "ڤیدیۆ / Video URL", "text")
  ],
  supermarket: [
    field("brand", "مارکە / Brand", "text"),
    field("product_category", "بەشی بەرهەم / Category", "select", ["خواردن / Food", "خواردنەوە / Drinks", "شیر / Dairy", "برنج / Rice", "ڕۆن / Oil", "شەکر / Sugar", "ئارد / Flour", "مۆڵک / Spices", "کنسەرڤ / Canned", "شۆربا / Soup", "Snack", "پاککردنەوە / Cleaning", "منداڵان / Baby", "Personal Care", "Diapers", "بەرهەمی ماڵ / Home", "Fresh / Cake"], true),
    field("subcategory", "بەشی لاوەکی / Subcategory", "text"),
    field("quantity", "دانە / Quantity", "number"),
    field("unit", "یەکە / Unit", "select", ["دانە / Piece", "کیلۆ / Kg", "گرام / Gram", "لیتر / Liter", "پاکەت / Pack", "کارتۆن / Carton", "بوتڵ / Bottle", "بۆکس / Box", "کێسە / Bag", "Other"], true),
    field("weight", "کێش / Weight", "number"),
    field("volume", "قەبارە / Volume", "number"),
    field("package_size", "قەبارەی پاکەت / Package size", "text"),
    field("production_date", "بەرواری بەرهەمهێنان / Production date", "date"),
    field("expiry_date", "بەرواری بەسەرچوون / Expiry date", "date"),
    field("baby_gender", "ڕەگەزی منداڵ / Baby gender", "select", ["Boy", "Girl", "Unisex"]),
    field("diaper_size", "قەبارەی Diaper", "select", ["1", "2", "3", "4", "5", "6"]),
    field("ingredients", "پێکهاتەکان / Ingredients", "textarea")
  ],
  beauty: [
    field("brand", "مارکە / Brand", "text"),
    field("beauty_category", "جۆری جوانکاری / Beauty category", "select", ["Makeup", "Skincare", "Haircare", "Perfume", "Shampoo", "Cream", "Lotion", "Foundation", "Lipstick", "Mascara", "Eyeliner", "Nail Products", "Hair Products", "Men's Grooming", "Women's Beauty", "Accessories"], true),
    field("subcategory", "بەشی لاوەکی / Subcategory", "text"),
    field("skin_type", "جۆری پێست / Skin type", "select", ["Dry", "Oily", "Combination", "Normal", "Sensitive"]),
    field("hair_type", "جۆری قژ / Hair type", "text"),
    field("shade", "سێد / Shade or color", "text"),
    field("size_volume", "قەبارە / Size or volume", "text"),
    field("weight", "کێش / Weight", "text"),
    field("ingredients", "پێکهاتەکان / Ingredients", "textarea"),
    field("manufacturer", "بەرهەمهێنەر / Manufacturer", "text"),
    field("country_origin", "وڵاتی بەرهەمهێنان / Country of origin", "text"),
    field("production_date", "بەرواری بەرهەمهێنان / Production date", "date"),
    field("expiry_date", "بەرواری بەسەرچوون / Expiry date", "date"),
    field("video_url", "ڤیدیۆ / Video URL", "text")
  ],
  restaurant: [
    field("restaurant", "چێشتخانە / Restaurant", "text", undefined, true),
    field("food_category", "بەشی خواردن / Food category", "text", undefined, true),
    field("food_name", "ناوی خواردن / Food name", "text", undefined, true),
    field("size", "قەبارە / Size", "multi", ["Small", "Medium", "Large"]),
    field("size_prices", "نرخی Small/Medium/Large", "text"),
    field("ingredients", "پێکهاتەکان / Ingredients", "textarea"),
    field("calories", "کالۆری / Calories", "number"),
    field("spicy_level", "ئاستی توندی / Spicy level", "select", ["None", "Mild", "Medium", "Hot"]),
    field("availability", "بەردەستبوون / Availability", "select", ["Available", "Out of stock"]),
    field("preparation_time", "کاتی ئامادەکردن / Preparation minutes", "number"),
    field("discount", "داشکاندن % / Discount", "number"),
    field("video_url", "ڤیدیۆ / Video URL", "text")
  ]
};

function readableAuthError(error: unknown, t: (a: string, b: string, c: string) => string) {
  const message = typeof error === "object" && error !== null && "message" in error ? String((error as { message?: unknown }).message || "") : String(error || "");
  const lower = message.toLowerCase();
  if (!message || message === "[object Object]" || message === "{}") return t("هەڵەیەک ڕوویدا. تکایە دواتر هەوڵ بدەرەوە.", "حدث خطأ. حاول مرة أخرى.", "Something went wrong. Please try again.");
  if (lower.includes("failed to fetch") || lower.includes("fetch failed") || lower.includes("networkerror") || lower.includes("network error")) {
    return t("پەیوەندی لەگەڵ سێرڤەر بەردەست نییە. تکایە هێڵی ئینتەرنێتەکەت بپشکنە.", "تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت.", "Unable to connect to server. Please check your internet connection.");
  }
  if (lower.includes("email not confirmed")) return t("ئیمەیڵەکەت پشتڕاست نەکراوەتەوە. inbox و spam ـەکەت بپشکنە.", "لم يتم تأكيد بريدك الإلكتروني. تحقق من inbox و spam.", "Your email is not confirmed. Check your inbox and spam folder.");
  if (lower.includes("invalid login credentials")) return t("ئیمەیڵ یان وشەی نهێنی هەڵەیە.", "البريد الإلكتروني أو كلمة المرور غير صحيحة.", "The email or password is incorrect.");
  if (lower.includes("user already registered")) return t("ئەم ئیمەیڵە پێشتر هەژماری هەیە.", "هذا البريد الإلكتروني مسجل مسبقاً.", "This email is already registered.");
  return message;
}

function getAuthRedirectUrl() {
  if (typeof window === "undefined") return "http://localhost:5173";
  return window.location.origin || "http://localhost:5173";
}

const sampleProducts: Product[] = [
  { id: "sample-1", name: "کەباب شاندز (Shandiz Kebab)", description: "گۆشتی تازەی بەرخ لەگەڵ برنجی کوردی و سەوزەوات", category: "restaurant", price: 12000, emoji: "🥙", owner: "چێشتخانەی شاندز", ownerId: null, status: "active", attributes: { restaurant: "چێشتخانەی شاندز", preparation_time: 25, images: ["https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&auto=format&fit=crop&q=80"] } },
  { id: "sample-2", name: "پیتزا مێکس بێف (Mix Beef Pizza)", description: "پیتزای ئیتاڵی بە پەنیر و گۆشتی گۆڵک", category: "restaurant", price: 10000, emoji: "🍕", owner: "پیتزا هاوس", ownerId: null, status: "active", attributes: { restaurant: "پیتزا هاوس", spicy_level: "Mild", images: ["https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80"] } },
  { id: "sample-3", name: "شیر کالیبەر ۱ لیتر (Caliber Milk)", description: "شێری تەندروستی پڕ بەها", category: "supermarket", price: 2500, emoji: "🥛", owner: "مارکێتی شاخ", ownerId: null, status: "active", attributes: { product_category: "شیر / Dairy", unit: "دانە / Piece", images: ["https://images.unsplash.com/photo-1563636619-e9143da7973b?w=600&auto=format&fit=crop&q=80"] } },
  { id: "sample-4", name: "کراسی پیاوان (Men's Shirt)", description: "قوماشی کۆتۆنی بەرز، لە هەموو قەبارەکان بەردەستە", category: "fashion", price: 25000, emoji: "👔", owner: "بوتیکی مۆدا", ownerId: null, status: "active", attributes: { gender: "پیاوان / Men", size: ["M", "L", "XL"], images: ["https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&auto=format&fit=crop&q=80"] } },
  { id: "sample-5", name: "سیرۆمی جوانکاری پێست (Skin Serum)", description: "سیرۆمی ڤیتامین C بۆ درەوشانەوە و شێدارکردنەوەی پێست", category: "beauty", price: 18000, emoji: "✨", owner: "سنتر جوانکاری شاخ", ownerId: null, status: "active", attributes: { beauty_category: "Skincare", skin_type: "All", images: ["https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=80"] } },
  { id: "sample-6", name: "تۆیۆتا کامری ۲۰۲۳ (Toyota Camry 2023)", description: "سفر کیلۆمەتر, ڕەنگی سپی, بێ بۆیاخ", category: "car_dealer", price: 24500000, emoji: "🚗", owner: "پیشانگای هەولێر", ownerId: null, status: "active", attributes: { make: "Toyota", model: "Camry", model_year: 2023, condition: "New", images: ["https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=600&auto=format&fit=crop&q=80"] } },
  { id: "sample-7", name: "خزمەتگوزاری گەیاندنی خێرا (Express Captain)", description: "گەیاندنی خێرا لە هەموو شوێنەکانی شاری هەولێر، سلێمانی و دهۆک", category: "captain", price: 3000, emoji: "🛵", owner: "گەیاندنی شاخ", ownerId: null, status: "active", attributes: { vehicle_type: "Motorcycle", availability: "Available", images: ["https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=600&auto=format&fit=crop&q=80"] } }
];

function getProductImageUrl(p: Product): string | undefined {
  if (p.emoji && (p.emoji.startsWith("http://") || p.emoji.startsWith("https://") || p.emoji.startsWith("data:") || p.emoji.startsWith("/"))) {
    return p.emoji;
  }
  const images = p.attributes?.images;
  if (Array.isArray(images) && typeof images[0] === "string" && images[0]) {
    return images[0];
  }
  if (typeof p.attributes?.image_url === "string" && p.attributes.image_url) {
    return p.attributes.image_url;
  }
  return undefined;
}

function ProductLazyImage({ src, alt, emoji, badgeText }: { src?: string; alt: string; emoji?: string; badgeText?: React.ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const isImage = Boolean(src && !error && (src.startsWith("http") || src.startsWith("data:") || src.startsWith("/") || src.startsWith("blob:")));

  return (
    <div className={`product-image-container ${loaded ? "is-loaded" : "is-loading"}`}>
      <div className="product-image-placeholder">
        <span className="placeholder-blur-bg" />
        <span className="placeholder-emoji">{emoji || "📦"}</span>
      </div>

      {isImage && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={`product-img ${loaded ? "loaded" : "blur-loading"}`}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
      )}

      {badgeText && <span className="badge">{badgeText}</span>}
    </div>
  );
}

function App() {
  const [lang, setLang] = useState<"ku" | "ar" | "en">("ku");
  const [role, setRole] = useState<Role>("customer");
  const [tab, setTab] = useState("home");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [priceRange, setPriceRange] = useState<"all" | "under10k" | "10k-25k" | "above25k">("all");
  const [cart, setCart] = useState<Product[]>([]);
  const [products, setProducts] = useState<Product[]>(sampleProducts);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [walletLoading, setWalletLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [authMode, setAuthMode] = useState<"login" | "signup" | "forgot" | "reset">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authConfirmPassword, setAuthConfirmPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [updateReady, setUpdateReady] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [notice, setNotice] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [form, setForm] = useState({ id: "", name: "", price: "", category: "restaurant", description: "", emoji: "📦", images: "", attributes: {} as Record<string, unknown> });

  const t = (ku: string, ar: string, en: string) => lang === "ku" ? ku : lang === "ar" ? ar : en;

  useEffect(() => {
    document.documentElement.dir = lang === "en" ? "ltr" : "rtl";
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => { void loadData(); }, []);

  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange(event => {
      if (event === "PASSWORD_RECOVERY") { setAuthMode("reset"); setTab("auth"); setAuthMessage(""); }
    });
    return () => { data.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    const install = (event: Event) => { event.preventDefault(); setInstallPrompt(event); };
    window.addEventListener("beforeinstallprompt", install);
    const onMessage = (event: MessageEvent) => { if (event.data?.type === "APP_UPDATE_READY") setUpdateReady(true); };
    navigator.serviceWorker?.addEventListener("message", onMessage);
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js");
    return () => { window.removeEventListener("beforeinstallprompt", install); navigator.serviceWorker?.removeEventListener("message", onMessage); };
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let channel: any;
    try {
      channel = client.channel("posts-live").on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => { void loadData(); }).subscribe();
    } catch (err) {
      console.warn("Supabase channel error:", err);
    }
    return () => { if (channel) void client.removeChannel(channel); };
  }, [userId]);

  async function loadData() {
    if (!supabase) {
      setProducts(sampleProducts);
      setLoading(false);
      return;
    }
    try {
      const { data: sessionData } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
      const session = sessionData?.session;
      setUserId(session?.user.id ?? null);
      if (!session?.user) { setProfile(null); setRole("customer"); }
      if (session?.user.id) await loadWallet(session.user.id);
      if (session?.user.id) {
        await ensureProfileExists(
          session.user.id,
          session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "User",
          "customer"
        );
        const { data: profileData } = await supabase.from("profiles").select("id,full_name,phone,role").eq("id", session.user.id).maybeSingle().catch(() => ({ data: null }));
        const profileRole = profileData?.role as Role | undefined;
        if (profileData?.id && profileRole && (roles.some(item => item.id === profileRole) || profileRole === "super_admin" || profileRole === "admin")) {
          setRole(profileRole);
          setProfile({ id: profileData.id, full_name: profileData.full_name || session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "User", phone: profileData.phone || "", role: profileRole, email: session.user.email || "" });
        } else {
          setProfile({ id: session.user.id, full_name: session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "User", phone: "", role: "customer", email: session.user.email || "" });
        }
      }

      const query = supabase
        .from("posts")
        .select("id,user_id,title,content,category,price,status,image_url,images,attributes,created_at, profiles(full_name, phone)")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      const { data, error } = await query;
      if (error) {
        console.warn("Supabase posts load note:", error.message || error);
      }
      if (!error && data && data.length > 0) {
        setProducts(data.map((post: any) => {
          const ownerName = post.profiles?.full_name || post.attributes?.restaurant || post.attributes?.brand || post.attributes?.make || post.attributes?.vendor_name || "SHAKH MERCHANT";
          return {
            id: post.id,
            name: post.title,
            description: post.content || "",
            category: post.category,
            price: Number(post.price),
            emoji: post.image_url || "📦",
            ownerId: post.user_id || null,
            owner: ownerName,
            status: post.status,
            attributes: { ...(post.attributes || {}), images: post.images || [] }
          };
        }));
      } else {
        setProducts(sampleProducts);
      }
    } catch (err) {
      console.warn("Supabase loadData fallback:", err);
      setProducts(sampleProducts);
    } finally {
      setLoading(false);
    }
  }

  async function loadWallet(currentUserId: string) {
    if (!supabase) return;
    setWalletLoading(true);
    try {
      const { data, error } = await supabase.from("wallet_transactions").select("id,type,amount,status,reference_id,created_at,note").eq("user_id", currentUserId).order("created_at", { ascending: false });
      if (error) { console.warn("Supabase wallet load note:", error); setWalletTransactions([]); }
      else setWalletTransactions((data || []).map((item: any) => ({ ...item, type: item.type || "transaction", amount: Number(item.amount || 0) })));
    } catch (err) {
      console.warn("Supabase loadWallet error:", err);
      setWalletTransactions([]);
    } finally {
      setWalletLoading(false);
    }
  }

  async function authenticate() {
    if (!supabase) { setAuthMessage(t("پەیوەندی Supabase ڕێک نەخراوە", "لم يتم إعداد اتصال Supabase", "Supabase is not configured")); return; }
    if (authMode === "forgot") { await sendReset(); return; }
    if (authMode === "reset") { await updatePassword(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authEmail.trim())) { setAuthMessage(t("تکایە ئیمەیڵێکی دروست بنووسە", "أدخل بريداً إلكترونياً صحيحاً", "Enter a valid email address")); return; }
    if (!authPassword) { setAuthMessage(t("وشەی نهێنی پێویستە", "كلمة المرور مطلوبة", "Password is required")); return; }
    if (authMode === "signup" && authPassword.length < 8) { setAuthMessage(t("وشەی نهێنی دەبێت لانیکەم ٨ پیت بێت", "يجب أن تتكون كلمة المرور من 8 أحرف على الأقل", "Password must be at least 8 characters")); return; }
    if (authMode === "signup" && !authName.trim()) { setAuthMessage(t("ناوی تەواو پێویستە", "الاسم الكامل مطلوب", "Full name is required")); return; }
    setAuthBusy(true); setAuthMessage("");
    try {
      const redirectTo = getAuthRedirectUrl();
      const result = authMode === "signup"
        ? await supabase.auth.signUp({ email: authEmail.trim(), password: authPassword, options: { data: { full_name: authName.trim() || authEmail.split("@")[0] }, emailRedirectTo: redirectTo } })
        : await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword });
      if (result.error) {
        setAuthMessage(readableAuthError(result.error, t));
        setAuthBusy(false);
        return;
      }
      if (authMode === "signup" && !result.data.session) {
        setAuthMessage(t("ئیمەیڵەکەت پشتڕاست بکەرەوە، پاشان بچۆ ژوورەوە", "تحقق من بريدك الإلكتروني ثم سجل الدخول", "Check your email, then sign in"));
      } else {
        setAuthMessage("");
        await loadData();
        setTab("dashboard");
      }
    } catch (err) {
      setAuthMessage(readableAuthError(err, t));
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleGoogleSignIn() {
    if (!supabase) { setAuthMessage(t("پەیوەندی Supabase ڕێک نەخراوە", "لم يتم إعداد اتصال Supabase", "Supabase is not configured")); return; }
    setAuthBusy(true); setAuthMessage("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: getAuthRedirectUrl(), queryParams: { access_type: "offline", prompt: "consent" } }
      });
      if (error) { setAuthMessage(readableAuthError(error, t)); }
    } catch (err) {
      setAuthMessage(readableAuthError(err, t));
    } finally {
      setAuthBusy(false);
    }
  }

  async function sendReset() {
    if (!supabase) return;
    if (!authEmail) { setAuthMessage(t("تکایە ئیمەیڵەکەت بنووسە", "أدخل بريدك الإلكتروني", "Enter your email address")); return; }
    setAuthBusy(true); setAuthMessage("");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(authEmail.trim(), { redirectTo: getAuthRedirectUrl() });
      setAuthMessage(error ? readableAuthError(error, t) : t("لینکی گۆڕینی وشەی نهێنی بۆ ئیمەیڵەکەت نێردرا.", "تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك.", "Password reset link sent to your email."));
    } catch (err) {
      setAuthMessage(readableAuthError(err, t));
    } finally {
      setAuthBusy(false);
    }
  }

  async function updatePassword() {
    if (!supabase) return;
    if (authPassword.length < 8) { setAuthMessage(t("وشەی نهێنی دەبێت لانیکەم ٨ پیت بێت", "يجب أن تتكون كلمة المرور من 8 أحرف على الأقل", "Password must be at least 8 characters")); return; }
    if (authPassword !== authConfirmPassword) { setAuthMessage(t("وشە نهێنییەکان یەکسان نین", "كلمتا المرور غير متطابقتين", "Passwords do not match")); return; }
    setAuthBusy(true); setAuthMessage("");
    try {
      const { error } = await supabase.auth.updateUser({ password: authPassword });
      if (error) setAuthMessage(readableAuthError(error, t));
      else { setAuthMode("login"); setAuthPassword(""); setAuthConfirmPassword(""); setAuthMessage(t("وشەی نهێنی نوێ کرایەوە.", "تم تحديث كلمة المرور.", "Password updated. You can sign in now.")); }
    } catch (err) {
      setAuthMessage(readableAuthError(err, t));
    } finally {
      setAuthBusy(false);
    }
  }

  async function signOut() { if (supabase) await supabase.auth.signOut(); setUserId(null); setProfile(null); setRole("customer"); setTab("home"); }

  async function updateProfile(fullName: string, phone: string) {
    if (!supabase || !profile) return;
    setProfileBusy(true); setProfileMessage("");
    const { error } = await supabase.from("profiles").update({ full_name: fullName.trim(), phone: phone.trim() }).eq("id", profile.id);
    if (error) setProfileMessage(error.message);
    else { setProfile({ ...profile, full_name: fullName.trim() || profile.full_name, phone: phone.trim() }); setProfileMessage(t("پرۆفایلەکە نوێکرایەوە", "تم تحديث الملف الشخصي", "Profile updated")); }
    setProfileBusy(false);
  }

  const visible = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return products.filter(p => {
      if (category !== "all" && p.category !== category) return false;
      if (p.status !== "active") return false;

      // Price range filter
      if (priceRange === "under10k" && p.price >= 10000) return false;
      if (priceRange === "10k-25k" && (p.price < 10000 || p.price > 25000)) return false;
      if (priceRange === "above25k" && p.price <= 25000) return false;

      if (!term) return true;
      const searchable = [p.name, p.description, p.category, p.owner, ...Object.values(p.attributes).flatMap(value => Array.isArray(value) ? value : [value])].join(" ").toLocaleLowerCase();
      return searchable.includes(term);
    });
  }, [products, category, search, priceRange]);

  const money = (n: number) => new Intl.NumberFormat("en-US").format(n) + " د.ع";

  async function savePost() {
    const fields = categorySchemas[form.category] || [];
    const missing = fields.filter(item => item.required && (!form.attributes[item.key] || (Array.isArray(form.attributes[item.key]) && !(form.attributes[item.key] as unknown[]).length))).map(item => item.label);
    if (!form.name || !form.price) { setNotice(t("ناو و نرخ پێویستن", "الاسم والسعر مطلوبان", "Name and price are required")); return; }
    if (missing.length) { setNotice(t(`ئەم خانانە پێویستن: ${missing.join(", ")}`, `الحقول المطلوبة: ${missing.join(", ")}`, `Required fields: ${missing.join(", ")}`)); return; }
    if (!supabase || !userId) { setNotice(t("بۆ پۆستکردن دەبێت هەژمارت هەبێت و بچیتە ژوورەوە", "يجب إنشاء حساب وتسجيل الدخول للنشر", "Create an account and sign in before publishing")); setTab("auth"); return; }
    if (!allowedPostCategories.includes(form.category as Role)) { setNotice(t("ئەم بەشە بۆ ڕۆڵی هەژمارەکەت ڕێگەپێدراو نییە", "هذا القسم غير مسموح لدور حسابك", "This category is not allowed for your account role")); return; }

    // Ensure profile row exists in database to satisfy posts_user_id_fkey constraint
    await ensureProfileExists(userId, profile?.full_name, profile?.role || role);

    const images = form.images.split(/[\n,]/).map(item => item.trim()).filter(Boolean).slice(0, 8);
    const isCarPosting = form.category === "car_dealer";
    const isAutoApproved = role === "super_admin" || role === "admin";
    const postStatus = (isCarPosting && !isAutoApproved) ? "pending_approval" : "active";

    const payload = {
      title: form.name,
      content: form.description,
      category: form.category,
      price: +form.price,
      image_url: images[0] || form.emoji || null,
      images,
      attributes: { ...form.attributes, vendor_name: profile?.full_name || "User", prepaid_fee_required: isCarPosting },
      status: postStatus
    };
    const isUpdate = Boolean(form.id && !form.id.startsWith("sample-"));
    const request = isUpdate
      ? supabase.from("posts").update(payload).eq("id", form.id).eq("user_id", userId)
      : supabase.from("posts").insert({ ...payload, user_id: userId });
    const { error } = await request;
    if (error) { setNotice(error.message); return; }
    await loadData();
    setTab("home");

    if (postStatus === "pending_approval") {
      setNotice(t("پۆستەکەت بۆ ئۆتۆمبێل بە سەرکەوتوویی تۆمارکرا! دوای وەرگرتنی پارەی پێشەکی، لەلایەن سوپەر ئەدمینەوە پەسەند دەکرێت و بڵاودەکرێتەوە.", "تم تسجيل منشورك بنجاح! بعد استلام المبلغ المسبق، سيتم الموافقة عليه ونشره من قبل السوبر أدمن.", "Listing submitted! After prepaid fee is received, it will be approved & published by Super Admin."));
    } else {
      setNotice(t(isUpdate ? "پۆستەکە نوێکرایەوە" : "پۆستەکە زیاد کرا", isUpdate ? "تم تحديث المنشور" : "تمت إضافة المنشور", isUpdate ? "Post updated" : "Post added"));
    }

    setForm({ id: "", name: "", price: "", category: "restaurant", description: "", emoji: "📦", images: "", attributes: {} });
  }

  function editPost(product: Product) { setForm({ id: product.id, name: product.name, price: String(product.price), category: product.category, description: product.description, emoji: product.emoji, images: Array.isArray(product.attributes.images) ? (product.attributes.images as string[]).join("\n") : "", attributes: product.attributes }); setTab("post"); }
  function buy(p: Product) { setCart(c => [...c, p]); setNotice(t("کالا زیاد کرا بۆ سەبەتە", "تمت إضافة المنتج للسلة", "Added to cart")); }

  async function checkout() {
    if (cart.length === 0) return;
    if (supabase && userId) {
      await ensureProfileExists(userId, profile?.full_name, profile?.role || role);
      const productsTotal = cart.reduce((sum, product) => sum + product.price, 0);
      const deliveryFee = 5000;
      const total = productsTotal + deliveryFee;
      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          customer_id: userId,
          products_total: productsTotal,
          delivery_fee: deliveryFee,
          total: total,
          delivery_address: deliveryAddress.trim() || "Erbil, Kurdistan Region",
          status: "pending"
        })
        .select("id")
        .single();

      if (error || !order) { setNotice(error?.message || "Unable to create order"); return; }
      const { error: itemError } = await supabase.from("order_items").insert(
        cart.map(product => ({
          order_id: order.id,
          post_id: product.id,
          quantity: 1,
          unit_price: product.price
        }))
      );
      if (itemError) { setNotice(itemError.message); return; }
    }
    setCart([]);
    setNotice(t("داواکارییەکەت بە سەرکەوتوویی تۆمار کرا", "تم تسجيل طلبك بنجاح", "Order successfully placed!"));
    setTab("orders");
  }

  const allowedPostCategories: Role[] = role === "super_admin" || role === "admin"
    ? ["restaurant", "supermarket", "fashion", "beauty", "car_dealer"]
    : merchantRoles.includes(role)
    ? Array.from(new Set<Role>([role, "car_dealer"]))
    : ["car_dealer"];
  const canPost = Boolean(userId) && allowedPostCategories.length > 0;
  const canManagePosts = role === "admin" || role === "super_admin";
  const canManageDashboard = true;
  const canUseWallet = Boolean(userId);

  return (
    <div className="app">
      <OfflineIndicator t={t} />

      <header className="topbar">
        <button className="iconbtn mobile" onClick={() => setShowMenu(!showMenu)}>
          {showMenu ? <X /> : <Menu />}
        </button>

        <div className="brand" onClick={() => { setTab("home"); setCategory("all"); }} title="SHAX DELIVERY | شاخ بۆ گەیاندن">
          <img src="/shax-logo.svg" alt="SHAX DELIVERY - شاخ بۆ گەیاندن" className="header-logo" />
        </div>

        <div className="search">
          <Search size={18} />
          <input
            placeholder={t("گەڕان بۆ کالا، چێشتخانە، ئۆتۆمبێل...", "ابحث عن منتج أو سيارة...", "Search products, restaurants, cars...")}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="actions">
          <PWAInstallButton t={t} />
          <button className="lang" onClick={() => setLang(lang === "ku" ? "ar" : lang === "ar" ? "en" : "ku")}>
            <Languages size={17} />{lang.toUpperCase()}
          </button>
          <button className={`cart ${tab === "cart" ? "active" : ""}`} onClick={() => setTab("cart")}>
            <ShoppingCart size={19} />
            {cart.length > 0 && <span>{cart.length}</span>}
          </button>
          {userId ? (
            <button className={`avatar ${tab === "profile" ? "active" : ""}`} onClick={() => setTab("profile")} title={t("پرۆفایل", "الملف الشخصي", "Profile")}>
              <UserRound size={19} />
            </button>
          ) : (
            <button className="avatar" onClick={() => setTab("auth")} title={t("چوونەژوورەوە", "تسجيل الدخول", "Sign in")}>
              <UserRound size={19} />
            </button>
          )}
        </div>

        {profile && (
          <div className="user-profile" onClick={() => setTab("profile")}>
            <div className="profile-avatar"><UserRound size={17} /></div>
            <div>
              <strong>{profile.full_name}</strong>
              <small>{roleLabel(profile.role, t)}</small>
            </div>
          </div>
        )}
      </header>

      <div className={"layout " + (showMenu ? "open" : "")}>
        <aside className="sidebar">
          <div className="side-title">{t("پێڕست", "القائمة", "Menu")}</div>
          <button className={tab === "home" ? "active" : ""} onClick={() => { setTab("home"); setCategory("all"); setShowMenu(false); }}>
            <Home size={18} /><span>{t("سەرەتا", "الرئيسية", "Home")}</span>
          </button>
          <button className={tab === "orders" ? "active" : ""} onClick={() => { setTab("orders"); setShowMenu(false); }}>
            <Package size={18} /><span>{t("داواکارییەکان", "الطلبات", "Orders")}</span>
          </button>

          <div className="side-title">{t("بەشەکان", "الأقسام", "Categories")}</div>
          <button className={category === "all" && tab === "home" ? "active" : ""} onClick={() => { setCategory("all"); setTab("home"); setShowMenu(false); }}>
            <LayoutDashboard size={18} /><span>{t("هەموو بەشەکان", "كل الأقسام", "All categories")}</span>
          </button>
          {roles.map(r => (
            <button key={r.id} className={category === r.id && tab === "home" ? "active" : ""} onClick={() => { setCategory(r.id); setTab("home"); setShowMenu(false); }}>
              {r.icon}<span>{t(r.ku, r.ar, r.en)}</span>
            </button>
          ))}

          <div className="side-title">{t("بەڕێوەبردن", "الإدارة", "Management")}</div>
          {canManageDashboard && (
            <button className={tab === "dashboard" ? "active" : ""} onClick={() => { setTab("dashboard"); setShowMenu(false); }}>
              <ShieldCheck size={18} /><span>{t("داشبۆرد", "لوحة التحكم", "Dashboard")}</span>
            </button>
          )}
          {canUseWallet && (
            <button className={tab === "wallet" ? "active" : ""} onClick={() => { setTab("wallet"); setShowMenu(false); }}>
              <Wallet size={18} /><span>{t("جزدان و مامەڵەکان", "المحفظة والمعاملات", "Wallet")}</span>
            </button>
          )}
          {canPost && (
            <button className={tab === "post" ? "active" : ""} onClick={() => { setForm(f => ({ ...f, category: allowedPostCategories[0], attributes: {} })); setTab("post"); setShowMenu(false); }}>
              <Plus size={18} /><span>{t("پۆستی نوێ", "منشور جديد", "New post")}</span>
            </button>
          )}
          {!userId && (
            <button onClick={() => { setAuthMode("signup"); setTab("auth"); setShowMenu(false); }}>
              <UserRound size={18} /><span>{t("هەژمار دروست بکە", "أنشئ حساباً", "Create account")}</span>
            </button>
          )}
        </aside>

        <main className="main">
          {notice && (
            <div className="notice">
              <span>{notice}</span>
              <button onClick={() => setNotice("")}>×</button>
            </div>
          )}

          {loading ? (
            <div className="panel"><p>{t("داتاکان بار دەکرێن...", "جار تحميل البيانات...", "Loading data...")}</p></div>
          ) : tab === "auth" ? (
            <Auth mode={authMode} setMode={setAuthMode} email={authEmail} setEmail={setAuthEmail} password={authPassword} setPassword={setAuthPassword} name={authName} setName={setAuthName} busy={authBusy} message={authMessage} submit={authenticate} t={t} googleSignIn={handleGoogleSignIn} />
          ) : tab === "cart" ? (
            <Cart cart={cart} setCart={setCart} money={money} t={t} checkout={checkout} deliveryAddress={deliveryAddress} setDeliveryAddress={setDeliveryAddress} />
          ) : tab === "orders" ? (
            <OrdersView userId={userId} role={role} t={t} money={money} />
          ) : tab === "profile" && profile ? (
            <Profile profile={profile} busy={profileBusy} message={profileMessage} save={updateProfile} signOut={signOut} t={t} />
          ) : tab === "post" ? (
            canPost ? <Post form={form} setForm={setForm} save={savePost} allowedCategories={allowedPostCategories} t={t} profile={profile} /> : <Auth mode={authMode} setMode={setAuthMode} email={authEmail} setEmail={setAuthEmail} password={authPassword} setPassword={setAuthPassword} name={authName} setName={setAuthName} busy={authBusy} message={authMessage} submit={authenticate} t={t} googleSignIn={handleGoogleSignIn} />
          ) : tab === "dashboard" ? (
            <Dashboard
              products={products}
              role={role}
              setRole={setRole}
              t={t}
              onNavigatePost={(cat) => {
                const targetCat = cat || allowedPostCategories[0] || "restaurant";
                setForm(f => ({ ...f, category: targetCat, attributes: {} }));
                setTab("post");
              }}
            />
          ) : tab === "wallet" ? (
            <WalletView money={money} t={t} role={role} transactions={walletTransactions} loading={walletLoading} />
          ) : (
            <>
              <section className="hero">
                <div>
                  <div className="eyebrow">SHAKH SUPER</div>
                  <h1>{t("بەخێربێیت بۆ پلاتفۆرمی شاخ", "مرحباً بكم في منصة شاخ", "Welcome to Shakh platform")}</h1>
                  <p>{t("پلاتفۆرمی شاخ لە خزمەت ئێوەی خۆشەویستە بۆ پێداویستییە ڕۆژانەکانتان؛ خواردنی چێشتخانە، مارکێت، جل و بەرگ، ئۆتۆمبێل و گەیاندنی خێرا.", "منصة شاخ في خدمتكم لتلبية احتياجاتكم اليومية؛ طعام المطاعم، السوبرماركت، الأزياء، السيارات والتوصيل السريع.", "Shakh platform is here to serve your daily needs: restaurants, market, fashion, cars and express delivery.")}</p>
                  <button onClick={() => setCategory("all")}>{t("دەستپێبکە", "ابدأ الآن", "Start exploring")} <span>←</span></button>
                </div>
                <div className="hero-art">🛍️<div>🍔 🛒 🧴 🧺</div></div>
              </section>

              <div className="section-head">
                <div>
                  <h2>{t("بەرهەمەکان", "المنتجات", "Products")}</h2>
                  <p>{t("بەرهەمەکانت هەڵبژێرە و داواکاری بکە", "اختر منتجاتك واطلب الآن", "Choose products and order now")}</p>
                </div>
                <div className="role-select">
                  <UserRound size={16} />
                  <span>{profile ? roleLabel(profile.role, t) : t("کڕیار", "عميل", "Customer")}</span>
                </div>
              </div>

              <div className="filter-bar">
                <div className="chips">
                  <button className={category === "all" ? "selected" : ""} onClick={() => setCategory("all")}>
                    {t("هەموو", "الكل", "All")}
                  </button>
                  {roles.map(r => (
                    <button className={category === r.id ? "selected" : ""} onClick={() => setCategory(r.id)} key={r.id}>
                      {t(r.ku, r.ar, r.en)}
                    </button>
                  ))}
                </div>

                <div className="price-filter-chips">
                  <span className="price-filter-label">
                    <SlidersHorizontal size={13} />
                    {t("بوودجە / نرخ:", "الميزانية / السعر:", "Budget:")}
                  </span>
                  <button className={priceRange === "all" ? "selected" : ""} onClick={() => setPriceRange("all")}>
                    {t("هەموو نرخەکان", "كل الأسعار", "All Prices")}
                  </button>
                  <button className={priceRange === "under10k" ? "selected" : ""} onClick={() => setPriceRange("under10k")}>
                    {t("کەمتر لە ١٠ هەزار", "أقل من 10k", "Under 10k")}
                  </button>
                  <button className={priceRange === "10k-25k" ? "selected" : ""} onClick={() => setPriceRange("10k-25k")}>
                    {t("١٠ک - ٢٥ک", "10k - 25k", "10k - 25k")}
                  </button>
                  <button className={priceRange === "above25k" ? "selected" : ""} onClick={() => setPriceRange("above25k")}>
                    {t("سەروو ٢٥ هەزار", "أكثر من 25k", "Above 25k")}
                  </button>
                </div>
              </div>

              {visible.length === 0 ? (
                <div className="panel empty-search">
                  <p>{t("هیچ بەرهەمێک لەم بەشەدا نەدۆزرایەوە", "لم يتم العثور على منتجات في هذا القسم", "No products found in this category")}</p>
                </div>
              ) : (
                <div className="grid">
                  {visible.map(p => (
                    <article className="card" key={p.id}>
                      <ProductLazyImage
                        src={getProductImageUrl(p)}
                        alt={p.name}
                        emoji={p.emoji && !p.emoji.startsWith("http") && !p.emoji.startsWith("/") ? p.emoji : "📦"}
                        badgeText={p.category === "car_dealer" ? t("فرۆشتنی ئۆتۆمبێل", "سيارة للبيع", "For sale") : t("بەردەستە", "متوفر", "Available")}
                      />
                      <div className="card-body">
                        <small className="vendor-name">{p.owner}</small>
                        <h3>{p.name}</h3>
                        <p className="product-desc">{p.description}</p>
                        <div className="price">{money(p.price)}</div>
                        <button className="add" onClick={() => buy(p)}>
                          <Plus size={17} />{t("زیادکردن بۆ سەبەتە", "أضف للسلة", "Add to cart")}
                        </button>
                        {(p.ownerId === userId || canManagePosts) && (
                          <button className="iconbtn edit-btn" onClick={() => editPost(p)} title={t("دەستکاری", "تعديل", "Edit")}>
                            ✎
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-nav">
        <button className={tab === "home" ? "active" : ""} onClick={() => { setTab("home"); setShowMenu(false); }}>
          <Home size={20} />
          <span>{t("سەرەتا", "الرئيسية", "Home")}</span>
        </button>
        <button className={showMenu ? "active" : ""} onClick={() => setShowMenu(!showMenu)}>
          <LayoutDashboard size={20} />
          <span>{t("بەشەکان", "الأقسام", "Categories")}</span>
        </button>
        {canPost && (
          <button className={tab === "post" ? "active" : ""} onClick={() => { setForm(f => ({ ...f, category: allowedPostCategories[0], attributes: {} })); setTab("post"); setShowMenu(false); }}>
            <PlusCircle size={20} />
            <span>{t("پۆست", "نشر", "Post")}</span>
          </button>
        )}
        <button className={tab === "orders" ? "active" : ""} onClick={() => { setTab("orders"); setShowMenu(false); }}>
          <Package size={20} />
          <span>{t("داواکاری", "الطلبات", "Orders")}</span>
        </button>
        <button className={tab === "cart" ? "active" : ""} onClick={() => { setTab("cart"); setShowMenu(false); }}>
          <div className="mobile-cart-badge">
            <ShoppingCart size={20} />
            {cart.length > 0 && <span>{cart.length}</span>}
          </div>
          <span>{t("سەبەتە", "السلة", "Cart")}</span>
        </button>
      </nav>

      <footer>
        {t("© شاخ سوپەر — پلاتفۆرمی فرۆشتن و گەیاندن", "© شاخ سوبر — منصة التسوق والتوصيل", "© Shakh Super — Marketplace & delivery platform")}
        <span>کوردی · عربي · English</span>
      </footer>
    </div>
  );
}

function Auth({ mode, setMode, email, setEmail, password, setPassword, name, setName, busy, message, submit, t, googleSignIn }: { mode: "login" | "signup" | "forgot" | "reset"; setMode: React.Dispatch<React.SetStateAction<"login" | "signup" | "forgot" | "reset">>; email: string; setEmail: React.Dispatch<React.SetStateAction<string>>; password: string; setPassword: React.Dispatch<React.SetStateAction<string>>; name: string; setName: React.Dispatch<React.SetStateAction<string>>; busy: boolean; message: string; submit: () => void; t: (a: string, b: string, c: string) => string; googleSignIn: () => void }) {
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localMessage, setLocalMessage] = useState("");
  const recovery = mode === "forgot" || mode === "reset";
  const title = mode === "login" ? t("بەخێربێیتەوە", "مرحباً بعودتك", "Welcome back") : mode === "signup" ? t("هەژمارێکی نوێ دروست بکە", "أنشئ حساباً جديداً", "Create your account") : mode === "forgot" ? t("وشەی نهێنیت لەبیرچووە؟", "نسيت كلمة المرور؟", "Forgot your password?") : t("وشەی نهێنی نوێ دابنێ", "أنشئ كلمة مرور جديدة", "Create a new password");

  const submitForm = () => {
    if (mode === "reset" && password !== confirmPassword) { setLocalMessage(t("وشە نهێنییەکان یەکسان نین", "كلمتا المرور غير متطابقتين", "Passwords do not match")); return; }
    setLocalMessage(""); submit();
  };

  return (
    <div className="auth-panel">
      <div className="auth-intro">
        <div className="auth-orbit">S</div>
        <span>SHAKH SUPER</span>
        <h2>{title}</h2>
        <p>{recovery ? t("ئێمە یارمەتیت دەدەین بۆ گەڕاندنەوەی دەستگەیشتن بە هەژمارەکەت.", "سنساعدك على استعادة الوصول إلى حسابك.", "We will help you get back into your account.") : t("بازاڕەکەت بە ئارامی بەڕێوە ببە.", "أدر سوقك بسهولة.", "Your marketplace, made simple.")}</p>
      </div>
      <div className="auth-form">
        <div className="auth-kicker">{mode === "signup" ? t("بەشداربوون", "انضم إلينا", "Join us") : mode === "login" ? t("چوونەژوورەوەی پارێزراو", "دخول آمن", "Secure sign in") : t("پاراستنی هەژمار", "حماية الحساب", "Account recovery")}</div>
        {mode === "signup" && <input placeholder={t("ناوی تەواو", "الاسم الكامل", "Full name")} value={name} onChange={e => setName(e.target.value)} />}
        <input type="email" autoComplete="email" placeholder={t("ئیمەیڵ", "البريد الإلكتروني", "Email")} value={email} onChange={e => setEmail(e.target.value)} />
        {mode !== "forgot" && <input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder={t("وشەی نهێنی", "كلمة المرور", "Password")} value={password} onChange={e => setPassword(e.target.value)} />}
        {mode === "reset" && <input type="password" autoComplete="new-password" placeholder={t("دووبارە وشەی نهێنی بنووسە", "أعد كتابة كلمة المرور", "Confirm password")} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />}
        {mode !== "reset" && mode !== "forgot" && (
          <button type="button" className="google-btn" onClick={googleSignIn} disabled={busy}>
            {t("بە گۆگڵ بچۆ ژوورەوە", "تسجيل الدخول عبر Google", "Continue with Google")}
          </button>
        )}
        {(message || localMessage) && <p className="auth-message">{localMessage || message}</p>}
        <button className="primary auth-submit" disabled={busy || !email || (mode !== "forgot" && !password)} onClick={submitForm}>
          {busy ? t("چاوەڕوان بە...", "انتظر...", "Please wait...") : mode === "login" ? t("چوونەژوورەوە", "تسجيل الدخول", "Sign in") : mode === "signup" ? t("دروستکردنی هەژمار", "إنشاء حساب", "Create account") : mode === "forgot" ? t("ناردنی لینکی گۆڕین", "إرسال رابط الاستعادة", "Send reset link") : t("نوێکردنەوەی وشەی نهێنی", "تحديث كلمة المرور", "Update password")}
        </button>
        <button type="button" className="linkbtn auth-back" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
          {mode === "login" ? t("هەژمارت نییە؟ دروستی بکە", "ليس لديك حساب؟ أنشئ حساباً", "Create an account") : mode === "signup" ? t("پێشتر هەژمارت هەیە؟ بچۆ ژوورەوە", "لديك حساب؟ سجل الدخول", "Already have an account? Sign in") : t("گەڕانەوە بۆ چوونەژوورەوە", "العودة لتسجيل الدخول", "Back to sign in")}
        </button>
        {mode === "login" && (
          <button type="button" className="forgot-link" onClick={() => { setMode("forgot"); setLocalMessage(""); }}>
            {t("وشەی نهێنیت لەبیرچووە؟", "نسيت كلمة المرور؟", "Forgot password?")}
          </button>
        )}
      </div>
    </div>
  );
}

function Cart({ cart, setCart, money, t, checkout, deliveryAddress, setDeliveryAddress }: { cart: Product[]; setCart: React.Dispatch<React.SetStateAction<Product[]>>; money: (n: number) => string; t: (a: string, b: string, c: string) => string; checkout: () => void; deliveryAddress: string; setDeliveryAddress: (s: string) => void }) {
  const productsTotal = cart.reduce((s, p) => s + p.price, 0);
  const deliveryFee = cart.length > 0 ? 5000 : 0;
  const grandTotal = productsTotal + deliveryFee;

  return (
    <div className="panel cart-panel">
      <h2>{t("سەبەتەی کڕین", "سلة التسوق", "Shopping cart")}</h2>
      {cart.length === 0 ? (
        <p>{t("سەبەتەکە بەتاڵە", "السلة فارغة", "Your cart is empty")}</p>
      ) : (
        <>
          {cart.map((p, i) => (
            <div className="cartrow" key={`${p.id}-${i}`}>
              <div className="cartrow-info">
                <span>{p.emoji} <strong>{p.name}</strong></span>
                <small className="cart-vendor">{p.owner}</small>
              </div>
              <b>{money(p.price)}</b>
              <button onClick={() => setCart(c => c.filter((_, j) => j !== i))} aria-label="Remove item">
                <Trash2 size={16} />
              </button>
            </div>
          ))}

          <div className="cart-summary">
            <div className="cart-summary-row">
              <span>{t("نرخی کالاكان", "مجموع المنتجات", "Products total")}:</span>
              <span>{money(productsTotal)}</span>
            </div>
            <div className="cart-summary-row">
              <span>{t("کرێی گەیاندن", "أجرة التوصيل", "Delivery fee")}:</span>
              <span>{money(deliveryFee)}</span>
            </div>
            <div className="total">
              {t("کۆی گشتی", "المجموع الكلي", "Grand Total")}: <b>{money(grandTotal)}</b>
            </div>
          </div>

          <div className="delivery-address-field">
            <label>
              <MapPin size={16} />
              <span>{t("ناونیشانی گەیاندن", "عنوان التوصيل", "Delivery Address")}</span>
            </label>
            <input
              type="text"
              placeholder={t("شار، گەڕەک، کۆڵان، ژمارەی خانوو...", "المدينة، الحي، الشارع، رقم المنزل...", "City, District, Street, House number...")}
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
            />
          </div>

          <button className="primary checkout-btn" onClick={checkout}>
            {t("تۆمارکردنی داواکاری (کاش لە کاتی گەیاندن)", "تأكيد الطلب (الدفع عند الاستلام)", "Place Order (Cash on Delivery)")} ✓
          </button>
        </>
      )}
    </div>
  );
}

function Profile({ profile, busy, message, save, signOut, t }: { profile: UserProfile; busy: boolean; message: string; save: (fullName: string, phone: string) => void; signOut: () => void; t: (a: string, b: string, c: string) => string }) {
  const [fullName, setFullName] = useState(profile.full_name);
  const [phone, setPhone] = useState(profile.phone);

  return (
    <div className="profile-page">
      <div className="profile-hero">
        <div className="profile-large-avatar"><UserRound size={34} /></div>
        <div>
          <p className="profile-eyebrow">SHAKH SUPER</p>
          <h2>{t("بەخێربێیتەوە", "مرحباً", "Welcome")}, {profile.full_name}</h2>
          <p>{t("پرۆفایلی بەکارهێنەر", "الملف الشخصي للمستخدم", "User profile")}</p>
        </div>
      </div>
      <div className="profile-grid">
        <section className="panel profile-card">
          <h3>{t("زانیاری هەژمار", "معلومات الحساب", "Account information")}</h3>
          <label>{t("ناوی تەواو", "الاسم الكامل", "Full name")}<input value={fullName} onChange={event => setFullName(event.target.value)} /></label>
          <label>{t("ژمارەی مۆبایل", "رقم الهاتف", "Phone number")}<input value={phone} onChange={event => setPhone(event.target.value)} /></label>
          <label>{t("ئیمەیڵ", "البريد الإلكتروني", "Email")}<input value={profile.email} readOnly /></label>
          <button className="primary" disabled={busy} onClick={() => save(fullName, phone)}>{busy ? t("چاوەڕوان بە...", "جار الحفظ...", "Saving...") : t("نوێکردنەوەی پرۆفایل", "تحديث الملف الشخصي", "Update profile")}</button>
          {message && <p className="profile-message">{message}</p>}
        </section>
        <section className="panel profile-card">
          <h3>{t("ڕۆڵ و دەسەڵات", "الدور والصلاحيات", "Role and permissions")}</h3>
          <div className="profile-detail"><span>{t("ڕۆڵ", "الدور", "Role")}</span><strong>{roleLabel(profile.role, t)}</strong></div>
          <div className="profile-detail"><span>{t("ناسنامەی بەکارهێنەر", "معرف المستخدم", "User ID")}</span><code>{profile.id}</code></div>
          <div className="profile-role-note">{profile.role === "super_admin" ? t("هەموو تایبەتمەندی و دەسەڵاتەکانت چالاکن.", "جميع الميزات والصلاحيات مفعلة.", "All features and permissions are enabled.") : t("تایبەتمەندییەکان بەپێی ڕۆڵی هەژمارەکەت دیاری دەکرێن.", "تتحدد الميزات حسب دور حسابك.", "Features are determined by your account role.")}</div>
        </section>
      </div>
      <div className="profile-signout">
        <button className="signout-button" onClick={signOut}>{t("دەرچوون لە هەژمار", "تسجيل الخروج", "Sign out")}</button>
      </div>
    </div>
  );
}

function Post({ form, setForm, save, allowedCategories, t, profile }: { form: any; setForm: any; save: () => void; allowedCategories: Role[]; t: (a: string, b: string, c: string) => string; profile: UserProfile | null }) {
  const fields = categorySchemas[form.category] || [];
  const [uploading, setUploading] = useState(false);
  const update = (key: string, value: unknown) => setForm({ ...form, attributes: { ...form.attributes, [key]: value } });
  const selectedRole = roles.find(r => r.id === form.category);
  const images = String(form.images || "").split(/[\n,]/).map((item: string) => item.trim()).filter(Boolean).slice(0, 8);
  const fieldValue = (key: string) => form.attributes?.[key];

  const uploadImages = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!supabase || !event.target.files?.length) return;
    setUploading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) throw new Error(t("تکایە سەرەتا بچۆ ژوورەوە", "سجل الدخول أولاً", "Please sign in first"));
      const uploaded: string[] = [];
      for (const file of Array.from(event.target.files).slice(0, 8 - images.length)) {
        const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${userId}/${crypto.randomUUID()}.${extension}`;
        const { error } = await supabase.storage.from(storageBucket).upload(path, file, { contentType: file.type || "image/jpeg", upsert: false });
        if (error) throw error;
        uploaded.push(supabase.storage.from(storageBucket).getPublicUrl(path).data.publicUrl);
      }
      setForm({ ...form, images: [...images, ...uploaded].join("\n") });
    } catch (error) {
      window.alert(error instanceof Error ? error.message : t("بارکردنی وێنە سەرکەوتوو نەبوو", "فشل رفع الصور", "Image upload failed"));
    } finally { setUploading(false); event.target.value = ""; }
  };

  const removeImage = (url: string) => setForm({ ...form, images: images.filter((item: string) => item !== url).join("\n") });

  const renderField = (item: Field) => {
    const value = fieldValue(item.key);
    return (
      <label className={`post-field ${item.type === "textarea" ? "post-field-wide" : ""}`} key={item.key}>
        <span className="post-field-label">{item.label}{item.required && <em>*</em>}</span>
        {item.type === "select" ? (
          <select value={String(value || "")} onChange={e => update(item.key, e.target.value)}>
            <option value="">{t("هەڵبژێرە", "اختر", "Select")}</option>
            {item.options?.map(option => <option key={option}>{option}</option>)}
          </select>
        ) : item.type === "multi" ? (
          <select multiple className="post-multi" value={Array.isArray(value) ? value as string[] : []} onChange={e => update(item.key, Array.from(e.target.selectedOptions).map(option => option.value))}>
            {item.options?.map(option => <option key={option}>{option}</option>)}
          </select>
        ) : item.type === "textarea" ? (
          <textarea rows={4} value={String(value || "")} onChange={e => update(item.key, e.target.value)} placeholder={t("زانیارییەکان بنووسە...", "أدخل التفاصيل...", "Enter details...")} />
        ) : (
          <input type={item.type} value={String(value || "")} onChange={e => update(item.key, e.target.value)} placeholder={item.placeholder || ""} />
        )}
      </label>
    );
  };

  return (
    <div className="post-editor">
      <div className="post-editor-hero">
        <div>
          <div className="post-kicker">SHAKH SUPER · SELLER STUDIO</div>
          <h2>{t(form.id ? "دەستکاری پۆست" : "پۆستی نوێ زیاد بکە", form.id ? "تعديل المنشور" : "إضافة منشور جديد", form.id ? "Edit post" : "Create new post")}</h2>
          <p>{t("پۆستێکی جوان و تەواو دروست بکە و بەکارهێنەر بە یەکەم نیگاکە سەرنجی پێبدە.", "أنشئ منشوراً احترافياً واجذب انتباه العملاء من النظرة الأولى.", "Create a polished listing designed to capture attention from the first glance.")}</p>
        </div>
        <div className="post-hero-mark">✦</div>
      </div>

      <div className="post-layout">
        <div className="post-form-column">
          {form.category === "car_dealer" && (
            <div style={{ background: "#fff7ed", border: "1.5px solid #f97316", borderRadius: "12px", padding: "14px 18px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "12px" }}>
              <DollarSign style={{ color: "#f97316", flexShrink: 0 }} size={24} />
              <div style={{ fontSize: "13px", color: "#9a3412", lineHeight: "1.5" }}>
                <strong style={{ display: "block", fontSize: "14px", marginBottom: "2px" }}>{t("پۆستکردنی ئۆتۆمبێل بە پارەی پێشەکی:", "نشر السيارات بدفع مسبق:", "Car Posting Prepaid Fee Notice:")}</strong>
                {t("هەموو کەسێک دەتوانێت ئۆتۆمبێل پۆست بکات بەڵام بە پارەی پێشەکی. لە پاش ناردنی پۆستەکە و وەرگرتنی پارەکە، ڕێگەپێدان و بڵاوکردنەوە لەلایەن سوپەر ئەدمینەوە ئەنجام دەدرێت.", "يمكن لأي شخص نشر سيارة ولكن بالدفع المسبق. بعد إرسال المنشور واستلام المبلغ المسبق، سيتم الموافقة على النشر من قبل السوبر أدمن.", "Anyone can post a car listing with a prepaid fee. After submission and payment receipt, the Super Admin will approve and publish your listing.")}
              </div>
            </div>
          )}

          <section className="post-card">
            <div className="post-section-head">
              <div className="post-step">01</div>
              <div>
                <h3>{t("زانیاری سەرەکی", "المعلومات الأساسية", "Basic information")}</h3>
                <p>{t("ناو، نرخ و بەشی پۆستەکە دیاری بکە.", "حدد الاسم والسعر والقسم.", "Set the name, price and category.")}</p>
              </div>
            </div>
            <div className="post-grid two">
              <label className="post-field post-field-wide">
                <span className="post-field-label">{t("ناوی بەرهەم", "اسم المنتج", "Product name")}<em>*</em></span>
                <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value, attributes: form.category === "restaurant" ? { ...form.attributes, food_name: e.target.value } : form.attributes })} placeholder={t("بۆ نموونە: بریانی تایبەت", "مثال: برياني خاص", "e.g. Signature biryani")} />
              </label>
              <label className="post-field">
                <span className="post-field-label">{t("نرخ", "السعر", "Price")}<em>*</em></span>
                <div className="input-with-suffix">
                  <input required type="number" min="0" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
                  <span>د.ع</span>
                </div>
              </label>
              <label className="post-field">
                <span className="post-field-label">{t("بەش", "القسم", "Category")}<em>*</em></span>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value, attributes: {} })}>
                  {roles.filter(r => allowedCategories.includes(r.id)).map(r => <option value={r.id} key={r.id}>{t(r.ku, r.ar, r.en)}</option>)}
                </select>
              </label>
              <label className="post-field post-field-wide">
                <span className="post-field-label">{t("وەسف", "الوصف", "Description")}</span>
                <textarea rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder={t("کورتەیەک لەسەر بەرهەم، خزمەت یان تایبەتمەندییەکە بنووسە...", "اكتب وصفاً مختصراً عن المنتج أو الخدمة...", "Write a short description about the product or service...")} />
              </label>
            </div>
          </section>

          <section className="post-card">
            <div className="post-section-head">
              <div className="post-step">02</div>
              <div>
                <h3>{t("تایبەتمەندییەکانی بەش", "خصائص القسم", "Category details")}</h3>
                <p>{selectedRole ? t(selectedRole.ku, selectedRole.ar, selectedRole.en) : ""} · {t("تایبەتمەندییە پەیوەندیدارەکان لێرە پڕبکەرەوە.", "أكمل التفاصيل الخاصة بهذا القسم.", "Complete the details specific to this category.")}</p>
              </div>
            </div>
            <div className="category-pill">{selectedRole?.icon}<span>{selectedRole ? t(selectedRole.ku, selectedRole.ar, selectedRole.en) : ""}</span></div>
            <div className="post-grid two">{fields.filter(item => item.key !== "video_url").map(renderField)}</div>
          </section>

          <section className="post-card">
            <div className="post-section-head">
              <div className="post-step">03</div>
              <div>
                <h3>{t("وێنەکان", "الصور", "Images")}</h3>
                <p>{t("وێنەکان لە گەلەری یان کامێرا هەڵبژێرە؛ تا ٨ وێنە.", "اختر الصور من المعرض أو الكاميرا؛ حتى 8 صور.", "Choose images from your gallery or camera; up to 8 images.")}</p>
              </div>
              <strong className="image-count">{images.length} / 8</strong>
            </div>
            <div className="image-upload-zone">
              <UploadCloud size={28} />
              <strong>{t("وێنەکان هەڵبژێرە", "اختر الصور", "Choose your images")}</strong>
              <small>{t("PNG و JPG، تا ٨ وێنە", "PNG و JPG، حتى 8 صور", "PNG and JPG, up to 8 images")}</small>
              <div className="image-upload-actions">
                <label>
                  <ImagePlus size={16} />{t("لە گەلەری", "من المعرض", "Gallery")}
                  <input type="file" accept="image/*" multiple onChange={uploadImages} disabled={uploading || images.length >= 8} />
                </label>
                <label>
                  <Camera size={16} />{t("لە کامێرا", "من الكاميرا", "Camera")}
                  <input type="file" accept="image/*" capture="environment" onChange={uploadImages} disabled={uploading || images.length >= 8} />
                </label>
              </div>
            </div>
            {uploading && <p className="image-uploading">{t("وێنەکان بار دەکرێن...", "جار رفع الصور...", "Uploading images...")}</p>}
            {images.length > 0 && (
              <div className="image-preview-grid">
                {images.map((url: string, index: number) => (
                  <div className="image-preview" key={`${url}-${index}`}>
                    <img src={url} alt="" onError={e => { e.currentTarget.style.display = "none"; }} />
                    <span>{index + 1}</span>
                    <button type="button" onClick={() => removeImage(url)} aria-label={t("سڕینەوەی وێنە", "حذف الصورة", "Remove image")}>
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="post-actions-bar">
            <button className="post-publish" type="button" onClick={save}>
              <Plus size={18} />{form.id ? t("پاشەکەوتکردنی گۆڕانکاری", "حفظ التعديلات", "Save changes") : t("پۆستکردن", "نشر المنشور", "Publish post")}
            </button>
          </div>
        </div>

        <aside className="post-preview-column">
          <div className="preview-sticky">
            <div className="preview-heading">
              <div><span>{t("پێشبینین", "معاينة", "Preview")}</span><h3>{t("پۆستی تۆ", "منشورك", "Your listing")}</h3></div>
              <Eye size={18} />
            </div>
            <article className="live-post-card">
              <div className="live-post-image">
                {images[0] ? (
                  <img src={images[0]} alt="" onError={e => { e.currentTarget.style.display = "none"; }} />
                ) : (
                  <div className="live-placeholder">
                    {selectedRole?.icon || "✦"}
                    <span>{t("وێنەی پۆست", "صورة المنشور", "Post image")}</span>
                  </div>
                )}
                <span className="live-badge">{t("نوێ", "جديد", "NEW")}</span>
              </div>
              <div className="live-post-body">
                <div className="live-meta">
                  <span>{selectedRole ? t(selectedRole.ku, selectedRole.ar, selectedRole.en) : "SHAKH SUPER"}</span>
                  <span>{profile?.full_name || "SHAKH VENDOR"}</span>
                </div>
                <h4>{form.name || t("ناوی بەرهەمەکەت", "اسم المنتج", "Your product name")}</h4>
                <p>{form.description || t("وەسفی پۆستەکەت لێرە پیشان دەدرێت...", "سيظهر وصف منشورك هنا...", "Your listing description will appear here...")}</p>
                <div className="live-price">{form.price ? `${new Intl.NumberFormat("en-US").format(Number(form.price))} د.ع` : "0 د.ع"}</div>
                <button type="button" className="live-cta">{t("زیادکردن بۆ سەبەتە", "أضف للسلة", "Add to cart")}</button>
              </div>
            </article>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Dashboard({ products, role, setRole, t, onNavigatePost }: { products: Product[]; role: Role; setRole: any; t: (a: string, b: string, c: string) => string; onNavigatePost?: (cat?: Role) => void }) {
  return <AdminConsole productsCount={products.length} role={role} t={t} setRole={setRole} onNavigatePost={onNavigatePost} />;
}

function WalletView({ money, t, role = "customer", transactions = [], loading = false }: { money: (n: number) => string; t: (a: string, b: string, c: string) => string; role?: Role; transactions?: WalletTransaction[]; loading?: boolean }) {
  const [amount, setAmount] = useState("");
  const [localTransactions, setLocalTransactions] = useState<WalletTransaction[]>([]);
  const [localLoading, setLocalLoading] = useState(false);

  useEffect(() => {
    if (transactions.length || !supabase) return;
    let mounted = true;
    setLocalLoading(true);
    void supabase.from("wallet_transactions").select("id,type,kind,amount,status,reference_id,created_at,note").order("created_at", { ascending: false }).then(({ data }) => {
      if (mounted) setLocalTransactions((data || []).map((item: any) => ({ ...item, type: item.type || item.kind || "transaction", amount: Number(item.amount || 0) })));
      if (mounted) setLocalLoading(false);
    });
    return () => { mounted = false; };
  }, [transactions.length]);

  const displayedTransactions = transactions.length ? transactions : localTransactions;
  const displayedLoading = loading || localLoading;
  const balance = displayedTransactions.reduce((total, item) => total + item.amount, 0);
  const canRequestPayout = role === "captain" || merchantRoles.includes(role);

  const requestPayout = async (numAmount: number) => {
    if (!supabase || !numAmount || numAmount <= 0) return;
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      await supabase.from("wallet_payout_requests").insert({ user_id: data.session.user.id, amount: numAmount });
      window.alert(t("داواکارییەکەت نێردرا", "تم إرسال طلب السحب", "Withdrawal request submitted"));
      setAmount("");
    }
  };

  return (
    <div className="panel">
      <div className="section-head">
        <div>
          <h2>{t("جزدان و مامەڵەکان", "المحفظة والمعاملات", "Wallet & transactions")}</h2>
          <p>{roleLabel(role, t)}</p>
        </div>
        <strong className="price">{money(balance)}</strong>
      </div>
      <div className="stats">
        <div><Wallet /><b>{money(balance)}</b><span>{t("باڵانسی بەردەست", "الرصيد الحالي", "Current balance")}</span></div>
        <div><Package /><b>{displayedTransactions.length}</b><span>{t("تۆماری مامەڵەکان", "سجل المعاملات", "Transaction records")}</span></div>
      </div>
      {canRequestPayout && (
        <div className="wallet-action">
          <input type="number" min="1" placeholder={t("بڕی دەرکردن", "مبلغ السحب", "Withdrawal amount")} value={amount} onChange={e => setAmount(e.target.value)} />
          <button className="primary" onClick={() => requestPayout(Number(amount))}>{t("داواکاری دەرکردن", "طلب سحب", "Request withdrawal")}</button>
        </div>
      )}
      <h3>{t("مێژووی مامەڵەکان", "سجل المعاملات", "Transaction log")}</h3>
      {displayedLoading ? (
        <p>{t("بارکردن...", "جار التحميل...", "Loading...")}</p>
      ) : displayedTransactions.length === 0 ? (
        <p>{t("هیچ مامەڵەیەک نییە", "لا توجد معاملات بعد", "No transactions yet")}</p>
      ) : (
        <div className="transaction-list">
          {displayedTransactions.map(item => (
            <div className="transaction" key={item.id}>
              <span><b>{item.type}</b><small>{new Date(item.created_at).toLocaleString()}</small></span>
              <strong className={item.amount < 0 ? "negative" : "positive"}>{money(item.amount)}</strong>
              <em>{item.status}</em>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
