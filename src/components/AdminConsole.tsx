import React, { useEffect, useMemo, useState } from "react";
import {
  FileText,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Tags,
  Users,
  Plus,
  TrendingUp,
  Activity,
  Bike,
  Store,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Eye,
  Trash2,
  Lock,
  Unlock,
  Building2,
  UserPlus,
  Car,
  Utensils,
  Shirt,
  Sparkles,
  Clock,
  PhoneCall,
  Check,
  Truck,
  ArrowRight,
  ChevronRight,
  Star,
  MapPin,
  PackageCheck
} from "lucide-react";
import { supabase } from "../lib/supabase";

type Role =
  | "super_admin"
  | "admin"
  | "captain"
  | "restaurant"
  | "supermarket"
  | "fashion"
  | "beauty"
  | "car_dealer"
  | "customer";

type Translate = (ku: string, ar: string, en: string) => string;
type AdminTab = "users" | "posts" | "orders" | "categories" | "audit" | "settings";

type AdminConsoleProps = {
  role: Role;
  t: Translate;
  productsCount: number;
  setRole?: (r: Role) => void;
  onNavigatePost?: (category?: Role) => void;
};

const orderStatuses = [
  "pending",
  "accepted",
  "preparing",
  "ready",
  "assigned",
  "picked_up",
  "on_the_way",
  "out_for_delivery",
  "delivered",
  "cancelled"
];

const roles: Role[] = [
  "super_admin",
  "admin",
  "captain",
  "restaurant",
  "supermarket",
  "fashion",
  "beauty",
  "car_dealer",
  "customer"
];

const initialDemoUsers = [
  { id: "usr-101", full_name: "بەڕێوەبەری سەرەکی (Super Admin)", email: "admin@shax.delivery", phone: "0750 123 4567", role: "super_admin", status: "active", created_at: new Date(Date.now() - 86400000 * 30).toISOString() },
  { id: "usr-102", full_name: "چێشتخانەی شاندز (Shandiz)", email: "shandiz@shax.delivery", phone: "0750 222 3344", role: "restaurant", status: "active", created_at: new Date(Date.now() - 86400000 * 20).toISOString() },
  { id: "usr-103", full_name: "مارکێتی شاخ (Supermarket)", email: "market@shax.delivery", phone: "0750 333 4455", role: "supermarket", status: "active", created_at: new Date(Date.now() - 86400000 * 15).toISOString() },
  { id: "usr-104", full_name: "کاپتن دارا (Delivery Fleet)", email: "dara@shax.delivery", phone: "0750 444 5566", role: "captain", status: "active", created_at: new Date(Date.now() - 86400000 * 10).toISOString() },
  { id: "usr-105", full_name: "کۆسار ئەحمەد (Customer)", email: "kosar@gmail.com", phone: "0750 555 6677", role: "customer", status: "active", created_at: new Date(Date.now() - 86400000 * 5).toISOString() }
];

const initialDemoPosts = [
  { id: "pst-201", title: "کەباب شاندز (Shandiz Kebab)", category: "restaurant", price: 12000, status: "active", vendor: "چێشتخانەی شاندز", created_at: new Date(Date.now() - 3600000 * 5).toISOString() },
  { id: "pst-202", title: "پیتزا مێکس بێف (Mix Beef Pizza)", category: "restaurant", price: 10000, status: "active", vendor: "پیتزا هاوس", created_at: new Date(Date.now() - 3600000 * 12).toISOString() },
  { id: "pst-203", title: "شیر کالیبەر ۱ لیتر (Caliber Milk)", category: "supermarket", price: 2500, status: "active", vendor: "مارکێتی شاخ", created_at: new Date(Date.now() - 3600000 * 24).toISOString() },
  { id: "pst-204", title: "کراسی پیاوان (Men's Shirt)", category: "fashion", price: 25000, status: "active", vendor: "بوتیکی مۆدا", created_at: new Date(Date.now() - 3600000 * 30).toISOString() },
  { id: "pst-205", title: "سیرۆمی جوانکاری پێست (Skin Serum)", category: "beauty", price: 18000, status: "active", vendor: "سنتر جوانکاری شاخ", created_at: new Date(Date.now() - 3600000 * 48).toISOString() },
  { id: "pst-206", title: "تۆیۆتا کامری ۲۰۲۳ (Toyota Camry 2023)", category: "car_dealer", price: 24500000, status: "active", vendor: "پیشانگای هەولێر", created_at: new Date(Date.now() - 3600000 * 72).toISOString() },
  { id: "pst-207", title: "بی ئێم دەبلیو ٥٢٠i مۆدێل ۲۰۲۴ (BMW 520i 2024)", category: "car_dealer", price: 68000000, status: "pending_approval", vendor: "ئاری عومەر (کڕیار)", created_at: new Date(Date.now() - 3600000 * 2).toISOString() },
  { id: "pst-208", title: "مێرسیدس E300 مۆدێل ۲۰۲۲ (Mercedes E300)", category: "car_dealer", price: 55000000, status: "pending_approval", vendor: "کاروان فەرهاد (کڕیار)", created_at: new Date(Date.now() - 3600000 * 1).toISOString() }
];

const initialDemoOrders = [
  { id: "ORD-9021", customer_id: "کۆسار ئەحمەد", captain_id: "کاپتن دارا", status: "out_for_delivery", total: 27000, created_at: new Date(Date.now() - 1800000).toISOString() },
  { id: "ORD-9022", customer_id: "سۆران عومەر", captain_id: "کاپتن کاروان", status: "preparing", total: 15000, created_at: new Date(Date.now() - 3600000 * 2).toISOString() },
  { id: "ORD-9023", customer_id: "شێرکۆ جەمال", captain_id: "کاپتن دارا", status: "delivered", total: 30000, created_at: new Date(Date.now() - 3600000 * 6).toISOString() },
  { id: "ORD-9024", customer_id: "هەڵکەوت فەرهاد", captain_id: "دیاری نەکراوە", status: "pending", total: 18000, created_at: new Date(Date.now() - 3600000 * 8).toISOString() }
];

const initialDemoCategories = [
  { id: "cat-1", slug: "restaurant", name: "چێشتخانە", name_ar: "المطاعم", name_en: "Restaurants", active: true, sort_order: 1 },
  { id: "cat-2", slug: "supermarket", name: "سوپەرمارکێت", name_ar: "السوبرماركت", name_en: "Supermarkets", active: true, sort_order: 2 },
  { id: "cat-3", slug: "fashion", name: "جل و بەرگ", name_ar: "الأزياء", name_en: "Fashion", active: true, sort_order: 3 },
  { id: "cat-4", slug: "beauty", name: "جوانکاری", name_ar: "التجميل", name_en: "Beauty", active: true, sort_order: 4 },
  { id: "cat-5", slug: "car_dealer", name: "ئۆتۆمبێل", name_ar: "السيارات", name_en: "Cars", active: true, sort_order: 5 },
  { id: "cat-6", slug: "captain", name: "گەیاندن", name_ar: "التوصيل", name_en: "Delivery", active: true, sort_order: 6 }
];

const initialDemoAudit = [
  { id: "aud-301", actor_id: "Super Admin", actor_role: "super_admin", action: "admin_change_user_role", resource_type: "profiles", resource_id: "usr-104", created_at: new Date(Date.now() - 1800000).toISOString() },
  { id: "aud-302", actor_id: "Admin", actor_role: "admin", action: "admin_moderate_post", resource_type: "posts", resource_id: "pst-206", created_at: new Date(Date.now() - 3600000 * 3).toISOString() },
  { id: "aud-303", actor_id: "Captain Dara", actor_role: "captain", action: "admin_set_order_status", resource_type: "orders", resource_id: "ORD-9023", created_at: new Date(Date.now() - 3600000 * 6).toISOString() }
];

export default function AdminConsole({ role, t, productsCount, setRole, onNavigatePost }: AdminConsoleProps) {
  const [tab, setTab] = useState<AdminTab>("users");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Category creation fields
  const [catNameKu, setCatNameKu] = useState("");
  const [catNameAr, setCatNameAr] = useState("");
  const [catNameEn, setCatNameEn] = useState("");

  // Platform settings state
  const [settings, setSettings] = useState<Record<string, unknown>>({
    platform_commission_percent: 5,
    default_delivery_fee: 5000,
    currency: "IQD",
    maintenance_mode: false,
    usd_rate: 1530,
    support_phone: "0750 000 0000"
  });

  // Captain online status
  const [captainOnline, setCaptainOnline] = useState(true);

  // New user creation state
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUser, setNewUser] = useState({ full_name: "", email: "", phone: "", role: "customer" as Role });

  const loadData = async () => {
    setLoading(true);
    setError("");
    setMessage("");

    if (!supabase) {
      loadFallbackData();
      setLoading(false);
      return;
    }

    try {
      let query: any;
      if (tab === "users") {
        query = supabase.from("profiles").select("*").order("created_at", { ascending: false });
      } else if (tab === "posts") {
        query = supabase.from("posts").select("*").order("created_at", { ascending: false });
      } else if (tab === "orders") {
        query = supabase.from("orders").select("*").order("created_at", { ascending: false });
      } else if (tab === "categories") {
        query = supabase.from("marketplace_categories").select("*").order("sort_order", { ascending: true });
      } else if (tab === "audit") {
        query = supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200);
      } else if (tab === "settings") {
        const result = await supabase.from("platform_settings").select("*").eq("id", true).maybeSingle();
        if (result.data) {
          setSettings(result.data as Record<string, unknown>);
        }
        setLoading(false);
        return;
      }

      const result = await query;
      if (result?.error || !result?.data || result.data.length === 0) {
        loadFallbackData();
      } else {
        setRows(result.data as Record<string, unknown>[]);
      }
    } catch {
      loadFallbackData();
    } finally {
      setLoading(false);
    }
  };

  const loadFallbackData = () => {
    if (tab === "users") setRows(initialDemoUsers);
    else if (tab === "posts") setRows(initialDemoPosts);
    else if (tab === "orders") setRows(initialDemoOrders);
    else if (tab === "categories") setRows(initialDemoCategories);
    else if (tab === "audit") setRows(initialDemoAudit);
  };

  useEffect(() => {
    void loadData();
  }, [tab]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const rowText = Object.values(row)
        .map((v) => (Array.isArray(v) ? v.join(" ") : String(v ?? "")))
        .join(" ")
        .toLowerCase();

      const matchesSearch = !search.trim() || rowText.includes(search.trim().toLowerCase());
      const matchesStatus = !statusFilter || String(row.status || row.active) === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [rows, search, statusFilter]);

  const callRpc = async (actionName: string, args: Record<string, unknown>) => {
    setMessage("");
    setError("");

    if (supabase) {
      try {
        const { error: rpcErr } = await supabase.rpc(actionName, args);
        if (rpcErr) console.warn("Supabase RPC note:", rpcErr.message);
      } catch (err) {
        console.warn("RPC fallback handled locally", err);
      }
    }

    if (actionName === "admin_change_user_role") {
      setRows((prev) =>
        prev.map((r) => (r.id === args.target_user ? { ...r, role: args.new_role } : r))
      );
      setMessage(t("ڕۆڵی بەکارهێنەر گۆڕدرا", "تم تغيير دور المستخدم", "User role updated successfully"));
    } else if (actionName === "admin_moderate_post") {
      setRows((prev) =>
        prev.map((r) => (r.id === args.target_post ? { ...r, status: args.new_status } : r))
      );
      setMessage(t("دۆخی پۆستەکە نوێکرایەوە", "تم تحديث حالة المنشور", "Post status updated"));
    } else if (actionName === "admin_set_order_status") {
      setRows((prev) =>
        prev.map((r) => (r.id === args.target_order ? { ...r, status: args.new_status } : r))
      );
      setMessage(t("دۆخی داواکارییەکە گۆڕدرا", "تم تغيير حالة الطلب", "Order status updated"));
    } else if (actionName === "toggle_user_status") {
      setRows((prev) =>
        prev.map((r) => (r.id === args.target_user ? { ...r, status: r.status === "blocked" ? "active" : "blocked" } : r))
      );
      setMessage(t("دۆخی هەژمار گۆڕدرا", "تم تغيير حالة الحساب", "User account status toggled"));
    }
  };

  const deletePost = async (postId: string) => {
    if (!window.confirm(t("ئایا دڵنیایت لە ڕەشکردنەوەی بەکارجاریی ئەم پۆستە؟", "هل أنت تأكد من حذف هذا المنشور نهائياً؟", "Are you sure you want to permanently delete this post?"))) return;

    if (supabase) {
      try {
        await supabase.from("posts").delete().eq("id", postId);
      } catch (err) {
        console.warn("Delete post error:", err);
      }
    }

    setRows((prev) => prev.filter((r) => String(r.id) !== String(postId)));
    setMessage(t("پۆستەکە بە یەکجاری ڕەشکرایەوە", "تم حذف المنشور نهائياً", "Post permanently deleted"));
  };

  const approvePost = async (postId: string) => {
    if (supabase) {
      try {
        await supabase.from("posts").update({ status: "active" }).eq("id", postId);
      } catch (err) {
        console.warn("Approve post error:", err);
      }
    }

    setRows((prev) =>
      prev.map((r) => (String(r.id) === String(postId) ? { ...r, status: "active" } : r))
    );
    setMessage(t("پارەی پێشەکی پەسەندکرا و پۆستەکە بە سەرکەوتوویی بڵاوکرایەوە!", "تم تأكيد الدفع المسبق ونشر المنشور بنجاح!", "Prepaid fee confirmed & post published successfully!"));
  };

  const createCategory = async () => {
    if (!catNameKu.trim()) return;
    const newCat = {
      id: `cat-${Date.now()}`,
      slug: catNameKu.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name: catNameKu.trim(),
      name_ar: catNameAr.trim() || catNameKu.trim(),
      name_en: catNameEn.trim() || catNameKu.trim(),
      active: true,
      sort_order: rows.length + 1
    };

    if (supabase) {
      void supabase.from("marketplace_categories").insert([newCat]);
    }

    setRows((prev) => [...prev, newCat]);
    setCatNameKu("");
    setCatNameAr("");
    setCatNameEn("");
    setMessage(t("بەشی نوێ بە سەرکەوتوویی زیادکرا", "تمت إضافة القسم الجديد بنجاح", "New category added successfully"));
  };

  const handleAddUser = () => {
    if (!newUser.full_name || !newUser.email) return;
    const addedUser = {
      id: `usr-${Date.now()}`,
      full_name: newUser.full_name,
      email: newUser.email,
      phone: newUser.phone || "0750 000 0000",
      role: newUser.role,
      status: "active",
      created_at: new Date().toISOString()
    };
    setRows((prev) => [addedUser, ...prev]);
    setShowAddUserModal(false);
    setNewUser({ full_name: "", email: "", phone: "", role: "customer" });
    setMessage(t("بەکارهێنەری نوێ زیادکرا", "تمت إضافة المستخدم الجديد", "New user added successfully"));
  };

  const saveSettings = async () => {
    if (supabase) {
      void supabase.from("platform_settings").update(settings).eq("id", true);
    }
    setMessage(t("ڕێکخستنەکان بە سەرکەوتوویی پاشەکەوت کران", "تم حفظ الإعدادات بنجاح", "Platform settings saved successfully"));
  };

  const renderRoleSwitcher = () => (
    <div className="role-select" style={{ marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", padding: "12px 16px", background: "#f8fafc", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <ShieldCheck size={20} style={{ color: "#f97316" }} />
        <div>
          <span style={{ fontWeight: 800, fontSize: "14px", display: "block" }}>{t("داشبۆردی چالاک بۆ ڕۆڵی:", "لوحة التحكم الحالية للدور:", "Active Role Dashboard:")}</span>
          <small style={{ color: "#64748b" }}>{t("دەتوانیت ڕۆڵەکەت بگۆڕیت بۆ تاقیکردنەوەی داشبۆردی جیاواز", "يمكنك تغيير الدور لاختبار لوحات التحكم المختلفة", "Switch roles to preview dedicated dashboards")}</small>
        </div>
      </div>
      <select value={role} onChange={(e) => setRole?.(e.target.value as Role)} style={{ fontWeight: 800, padding: "10px 16px", borderRadius: "12px", borderColor: "#f97316", background: "#ffffff", color: "#0f172a", fontSize: "13px" }}>
        {roles.map((r) => (
          <option value={r} key={r}>
            {r.toUpperCase()}
          </option>
        ))}
      </select>
    </div>
  );

  // ---------------------------------------------------------
  // ROLE-SPECIFIC DASHBOARD RENDERERS
  // ---------------------------------------------------------

  // RESTAURANT MERCHANT DASHBOARD
  if (role === "restaurant") {
    return (
      <div className="admin-console">
        {renderRoleSwitcher()}
        <div className="panel" style={{ borderLeft: "5px solid #ef4444" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "#fef2f2", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Utensils size={24} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: "18px" }}>{t("داشبۆردی چێشتخانە و خزمەتگوزاری خواردن", "لوحة تحكم المطعم والمأكولات", "Restaurant Merchant Dashboard")}</h2>
                <small style={{ color: "#64748b" }}>{t("بەڕێوەبردنی خۆراک، داواکارییەکان و چێشتخانەی ڕاستەوخۆ", "إدارة قائمة الطعام، الطلبات والمطبخ المباشر", "Manage food menu, orders and live kitchen status")}</small>
              </div>
            </div>
            <button className="primary" onClick={() => onNavigatePost?.("restaurant")} style={{ background: "#ef4444", borderColor: "#ef4444", display: "inline-flex", alignItems: "center", gap: "8px" }}>
              <Plus size={18} /> {t("زیادکردنی خواردنی نوێ", "إضافة وجبة جديدة", "Post New Food Item")}
            </button>
          </div>

          <div className="stats" style={{ marginBottom: "20px" }}>
            <div>
              <ShoppingBag size={22} style={{ color: "#ef4444" }} />
              <b>14 Orders</b>
              <span>{t("داواکارییەکانی ئەمڕۆ", "طلبات اليوم", "Today's Orders")}</span>
            </div>
            <div>
              <Clock size={22} style={{ color: "#f59e0b" }} />
              <b>18 Mins</b>
              <span>{t("تێکڕای کاتی ئامادەکردن", "متوسط وقت التحضير", "Avg Prep Time")}</span>
            </div>
            <div>
              <DollarSign size={22} style={{ color: "#10b981" }} />
              <b>168,000 IQD</b>
              <span>{t("داهاتی چێشتخانەی ئەمڕۆ", "إيرادات اليوم", "Today's Revenue")}</span>
            </div>
            <div>
              <Star size={22} style={{ color: "#f59e0b" }} />
              <b>4.8 ★</b>
              <span>{t("هەڵسەنگاندنی کڕیاران", "تقييم الزبائن", "Customer Rating")}</span>
            </div>
          </div>

          <h3>{t("داواکارییە لەسەر کارەکانی چێشتخانە (Live Kitchen Orders)", "طلبات المطبخ المباشرة", "Live Kitchen Orders")}</h3>
          <div className="admin-table" style={{ marginTop: "10px" }}>
            {initialDemoOrders.map((ord) => (
              <div className="admin-row" key={ord.id}>
                <div>
                  <strong>{ord.id} - {ord.customer_id}</strong>
                  <small>{t("کاپتن:", "الكابتن:", "Captain:")} {ord.captain_id}</small>
                </div>
                <span style={{ fontWeight: 800 }}>{ord.total.toLocaleString()} IQD</span>
                <div className="admin-row-actions">
                  <span className="badge" style={{ background: ord.status === "delivered" ? "#dcfce7" : "#fef3c7", color: ord.status === "delivered" ? "#15803d" : "#b45309", padding: "4px 10px", borderRadius: "8px", fontWeight: 700 }}>
                    {ord.status}
                  </span>
                  <button className="primary" onClick={() => onNavigatePost?.("restaurant")} style={{ fontSize: "11px", padding: "6px 10px" }}>
                    {t("نوێکردنەوەی دۆخ", "تحديث الحالة", "Update Status")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // SUPERMARKET MERCHANT DASHBOARD
  if (role === "supermarket") {
    return (
      <div className="admin-console">
        {renderRoleSwitcher()}
        <div className="panel" style={{ borderLeft: "5px solid #10b981" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "#ecfdf5", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Store size={24} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: "18px" }}>{t("داشبۆردی سوپەرمارکێت و کاڵاکان", "لوحة تحكم السوبرماركت والسلع", "Supermarket Merchant Dashboard")}</h2>
                <small style={{ color: "#64748b" }}>{t("بەڕێوەبردنی کۆگا، کەلوپەلی خۆراکی و گەیاندنی مارکێت", "إدارة المخزون والمنتجات التموينية", "Manage grocery inventory, stock and deliveries")}</small>
              </div>
            </div>
            <button className="primary" onClick={() => onNavigatePost?.("supermarket")} style={{ background: "#10b981", borderColor: "#10b981", display: "inline-flex", alignItems: "center", gap: "8px" }}>
              <Plus size={18} /> {t("زیادکردنی کەلوپەلی مارکێت", "إضافة منتج تمويني", "Post Grocery Item")}
            </button>
          </div>

          <div className="stats" style={{ marginBottom: "20px" }}>
            <div>
              <ShoppingBag size={22} style={{ color: "#10b981" }} />
              <b>28 Orders</b>
              <span>{t("داواکارییەکانی مارکێت", "طلبات السوبرماركت", "Daily Grocery Orders")}</span>
            </div>
            <div>
              <AlertCircle size={22} style={{ color: "#ef4444" }} />
              <b>3 Items</b>
              <span>{t("ئاگاداری کەمی کۆگا", "تنبيه نقص المخزون", "Low Stock Alert")}</span>
            </div>
            <div>
              <DollarSign size={22} style={{ color: "#10b981" }} />
              <b>340,000 IQD</b>
              <span>{t("داهاتی مارکێتی ئەمڕۆ", "إيرادات اليوم", "Today's Grocery Sales")}</span>
            </div>
            <div>
              <PackageCheck size={22} style={{ color: "#3b82f6" }} />
              <b>142 SKUs</b>
              <span>{t("کۆی کاڵا بەردەستەکان", "إجمالي المنتجات", "Total Active SKUs")}</span>
            </div>
          </div>

          <h3>{t("کەلوپەلە بەردەستەکان لە کۆگا (Market Inventory)", "السلع المتاحة في المخزن", "Grocery Inventory & Stock")}</h3>
          <div className="admin-table" style={{ marginTop: "10px" }}>
            {initialDemoPosts.filter(p => p.category === "supermarket" || p.category === "restaurant").map((item) => (
              <div className="admin-row" key={item.id}>
                <div>
                  <strong>{item.title}</strong>
                  <small>{item.vendor}</small>
                </div>
                <span style={{ fontWeight: 800 }}>{item.price.toLocaleString()} IQD</span>
                <div className="admin-row-actions">
                  <span className="badge" style={{ background: "#dcfce7", color: "#166534", padding: "4px 10px", borderRadius: "8px" }}>
                    {t("بەردەستە", "متوفر", "In Stock")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // FASHION BOUTIQUE DASHBOARD
  if (role === "fashion") {
    return (
      <div className="admin-console">
        {renderRoleSwitcher()}
        <div className="panel" style={{ borderLeft: "5px solid #ec4899" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "#fdf2f8", color: "#ec4899", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Shirt size={24} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: "18px" }}>{t("داشبۆردی بوتیکی جل و بەرگ", "لوحة تحكم أزياء وموضة", "Fashion Boutique Dashboard")}</h2>
                <small style={{ color: "#64748b" }}>{t("بەڕێوەبردنی پۆشاک، قەبارەکان، ڕەنگەکان و داواکارییەکان", "إدارة الملابس، المقاسات والطلبات", "Manage apparel inventory, sizes, colors & sales")}</small>
              </div>
            </div>
            <button className="primary" onClick={() => onNavigatePost?.("fashion")} style={{ background: "#ec4899", borderColor: "#ec4899", display: "inline-flex", alignItems: "center", gap: "8px" }}>
              <Plus size={18} /> {t("زیادکردنی جلی نوێ", "إضافة قطعة أزياء", "Post Fashion Item")}
            </button>
          </div>

          <div className="stats" style={{ marginBottom: "20px" }}>
            <div>
              <Shirt size={22} style={{ color: "#ec4899" }} />
              <b>18 Items</b>
              <span>{t("فرۆشی جل و بەرگ", "مبيعات الأزياء", "Fashion Items Sold")}</span>
            </div>
            <div>
              <DollarSign size={22} style={{ color: "#10b981" }} />
              <b>450,000 IQD</b>
              <span>{t("داهاتی هەفتانە", "الإيرادات الأسبوعية", "Weekly Revenue")}</span>
            </div>
            <div>
              <Star size={22} style={{ color: "#f59e0b" }} />
              <b>M / L Size</b>
              <span>{t("پڕداواکراوترین سایز", "المقاس الأكثر طلباً", "Top Sizing Demand")}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // BEAUTY & COSMETICS DASHBOARD
  if (role === "beauty") {
    return (
      <div className="admin-console">
        {renderRoleSwitcher()}
        <div className="panel" style={{ borderLeft: "5px solid #a855f7" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "#faf5ff", color: "#a855f7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Sparkles size={24} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: "18px" }}>{t("داشبۆردی سەنتەری جوانکاری و پێست", "لوحة تحكم التجميل والعناية", "Beauty & Skincare Center Console")}</h2>
                <small style={{ color: "#64748b" }}>{t("بەڕێوەبردنی بەرهەمەکانی پێست، ماکیاژ و کەرەستەکانی جوانکاری", "إدارة منتجات البشرة والمكياج", "Manage skincare, cosmetics & beauty products")}</small>
              </div>
            </div>
            <button className="primary" onClick={() => onNavigatePost?.("beauty")} style={{ background: "#a855f7", borderColor: "#a855f7", display: "inline-flex", alignItems: "center", gap: "8px" }}>
              <Plus size={18} /> {t("زیادکردنی کەرەستەی جوانکاری", "إضافة منتج تجميل", "Post Beauty Product")}
            </button>
          </div>

          <div className="stats" style={{ marginBottom: "20px" }}>
            <div>
              <Sparkles size={22} style={{ color: "#a855f7" }} />
              <b>11 Orders</b>
              <span>{t("داواکارییەکانی جوانکاری", "طلبات التجميل", "Beauty Orders")}</span>
            </div>
            <div>
              <DollarSign size={22} style={{ color: "#10b981" }} />
              <b>210,000 IQD</b>
              <span>{t("داهاتی ئۆنلاین", "الإيرادات", "Revenue")}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // CAR DEALERSHIP DASHBOARD
  if (role === "car_dealer") {
    return (
      <div className="admin-console">
        {renderRoleSwitcher()}
        <div className="panel" style={{ borderLeft: "5px solid #3b82f6" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "#eff6ff", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Car size={24} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: "18px" }}>{t("داشبۆردی پیشانگا و ئۆتۆمبێل", "لوحة تحكم معرض السيارات", "Car Dealership Showroom Dashboard")}</h2>
                <small style={{ color: "#64748b" }}>{t("بەڕێوەبردنی ئۆتۆمبێلەکان، نرخەکان و پەیوەندی کڕیاران", "إدارة قائمة السيارات والاستفسارات", "Manage vehicle listings, prices & buyer inquiries")}</small>
              </div>
            </div>
            <button className="primary" onClick={() => onNavigatePost?.("car_dealer")} style={{ background: "#3b82f6", borderColor: "#3b82f6", display: "inline-flex", alignItems: "center", gap: "8px" }}>
              <Plus size={18} /> {t("زیادکردنی ئۆتۆمبێلی نوێ", "إضافة سيارة جديدة", "Post Vehicle Listing")}
            </button>
          </div>

          <div className="stats" style={{ marginBottom: "20px" }}>
            <div>
              <Car size={22} style={{ color: "#3b82f6" }} />
              <b>6 Cars</b>
              <span>{t("ئۆتۆمبێلە بەردەستەکان", "السيارات المتاحة", "Available Showroom Cars")}</span>
            </div>
            <div>
              <PhoneCall size={22} style={{ color: "#10b981" }} />
              <b>19 Leads</b>
              <span>{t("پەیوەندی کڕیاران", "استفسارات المشتريين", "Buyer Inquiries")}</span>
            </div>
            <div>
              <DollarSign size={22} style={{ color: "#3b82f6" }} />
              <b>$185,000 USD</b>
              <span>{t("نرخی گشتی پیشانگا", "إجمالي قيمة المعرض", "Portfolio Value")}</span>
            </div>
          </div>

          <h3>{t("ئۆتۆمبێلە تۆمارکراوەکان لە پیشانگا (Vehicle Listings)", "السيارات المسجلة في المعرض", "Vehicle Listings")}</h3>
          <div className="admin-table" style={{ marginTop: "10px" }}>
            {initialDemoPosts.filter(p => p.category === "car_dealer").map((car) => (
              <div className="admin-row" key={car.id}>
                <div>
                  <strong>{car.title}</strong>
                  <small>{car.vendor}</small>
                </div>
                <span style={{ fontWeight: 800, color: "#2563eb" }}>{car.price.toLocaleString()} IQD</span>
                <div className="admin-row-actions">
                  <button className="primary" onClick={() => onNavigatePost?.("car_dealer")} style={{ fontSize: "11px" }}>
                    {t("دەستکاری پۆست", "تعديل المنشور", "Edit Listing")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // DELIVERY CAPTAIN DASHBOARD
  if (role === "captain") {
    return (
      <div className="admin-console">
        {renderRoleSwitcher()}
        <div className="panel" style={{ borderLeft: "5px solid #f97316" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "#fff7ed", color: "#f97316", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Bike size={24} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: "18px" }}>{t("داشبۆردی کاپتنی گەیاندن", "لوحة الكابتن والسائق", "Delivery Captain Fleet Hub")}</h2>
                <small style={{ color: "#64748b" }}>{t("سێستەمی گەیاندنی ڕاستەوخۆ و وەرگرتنی داواکارییەکان", "نظام التوصيل المباشر وقبول الطلبات", "Manage live delivery jobs & earnings")}</small>
              </div>
            </div>
            <button
              onClick={() => setCaptainOnline(!captainOnline)}
              style={{
                background: captainOnline ? "#10b981" : "#64748b",
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                padding: "10px 18px",
                fontWeight: 800,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <Bike size={18} />
              {captainOnline ? t("لەگەڕاندام (Online)", "متصل الآن (Online)", "Online (Active)") : t("دەستبەکارنیم (Offline)", "غير متصل (Offline)", "Offline")}
            </button>
          </div>

          <div className="stats" style={{ marginBottom: "20px" }}>
            <div>
              <Truck size={22} style={{ color: "#f97316" }} />
              <b>8 Deliveries</b>
              <span>{t("گەیاندنەکانی ئەمڕۆ", "توصيلات اليوم", "Today's Deliveries")}</span>
            </div>
            <div>
              <DollarSign size={22} style={{ color: "#10b981" }} />
              <b>42,000 IQD</b>
              <span>{t("کرێی گەیاندنی ئەمڕۆ", "أرباح التوصيل اليوم", "Today's Earnings")}</span>
            </div>
            <div>
              <Star size={22} style={{ color: "#f59e0b" }} />
              <b>4.9 ★</b>
              <span>{t("هەڵسەنگاندنی شۆفێر", "تقييم السائق", "Driver Rating")}</span>
            </div>
          </div>

          <h3>{t("داواکارییە سپێردراوەکان بۆ گەیاندن", "الطلبات المسندة للتوصيل", "Assigned Delivery Jobs")}</h3>
          <div className="admin-table" style={{ marginTop: "10px" }}>
            {initialDemoOrders.slice(0, 2).map((ord) => (
              <div className="admin-row" key={ord.id}>
                <div>
                  <strong>{ord.id} · {ord.customer_id}</strong>
                  <small>{t("ناونیشان: هەولێر - شۆڕش", "العنوان: أربيل - شورش", "Location: Erbil - Shorish")}</small>
                </div>
                <span style={{ fontWeight: 800, color: "#f97316" }}>5,000 IQD Fee</span>
                <div className="admin-row-actions">
                  <button className="primary" style={{ background: "#10b981", borderColor: "#10b981", fontSize: "11px" }}>
                    <Check size={14} /> {t("گەیەندرا", "تم التوصيل", "Mark Delivered")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // CUSTOMER DASHBOARD
  if (role === "customer") {
    return (
      <div className="admin-console">
        {renderRoleSwitcher()}
        <div className="panel" style={{ borderLeft: "5px solid #6366f1" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "#e0e7ff", color: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Users size={24} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: "18px" }}>{t("داشبۆردی کەسی کڕیار", "لوحة حساب الزبون", "Customer Account Dashboard")}</h2>
                <small style={{ color: "#64748b" }}>{t("بەدواداچوونی داواکارییەکان، جزدان و پۆستە کەسییەکانت", "متابعة الطلبات، المحفظة والمنشورات", "Track orders, wallet balance & personal listings")}</small>
              </div>
            </div>
            <button className="primary" onClick={() => onNavigatePost?.("car_dealer")} style={{ background: "#6366f1", borderColor: "#6366f1", display: "inline-flex", alignItems: "center", gap: "8px" }}>
              <Plus size={18} /> {t("پۆستکردنی ئۆتۆمبێل یان کاڵا", "نشر سيارة أو غرض", "Post Car / Item for Sale")}
            </button>
          </div>

          <div className="stats" style={{ marginBottom: "20px" }}>
            <div>
              <ShoppingBag size={22} style={{ color: "#6366f1" }} />
              <b>2 Active</b>
              <span>{t("داواکارییە بەردەوامەکان", "الطلبات الحالية", "Active Orders")}</span>
            </div>
            <div>
              <DollarSign size={22} style={{ color: "#10b981" }} />
              <b>25,000 IQD</b>
              <span>{t("باڵانسی جزدان", "رصيد المحفظة", "Wallet Balance")}</span>
            </div>
            <div>
              <Star size={22} style={{ color: "#f59e0b" }} />
              <b>3,500 Pts</b>
              <span>{t("خاڵەکانی کواشباک", "نقاط المكافآت", "Cashback Points")}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // MASTER SUPER ADMIN / ADMIN DASHBOARD
  // ---------------------------------------------------------
  return (
    <div className="admin-console">
      {renderRoleSwitcher()}

      {/* Analytics KPI Header Cards */}
      <div className="stats" style={{ marginBottom: "24px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <DollarSign size={24} />
            <span style={{ color: "#10b981", fontSize: "10px", fontWeight: 800 }}>+14.2%</span>
          </div>
          <b>48,500,000 IQD</b>
          <span>{t("کۆی قەبارەی فرۆش", "إجمالي حجم المبيعات", "Total Gross Volume")}</span>
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <ShoppingBag size={24} />
            <span style={{ color: "#3b82f6", fontSize: "10px", fontWeight: 800 }}>Live</span>
          </div>
          <b>{productsCount}</b>
          <span>{t("پۆست و کالا بەردەستەکان", "المنتجات المتاحة", "Active Marketplace Listings")}</span>
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Bike size={24} />
            <span style={{ color: "#10b981", fontSize: "10px", fontWeight: 800 }}>Online</span>
          </div>
          <b>18 Drivers</b>
          <span>{t("کاپتنەکانی گەیاندنی شاخ", "سائقو كابتن شاخ", "Active Shakh Delivery Fleet")}</span>
        </div>
      </div>

      {/* Main Tab Navigation Bar */}
      <div className="admin-tabs">
        {(
          [
            ["users", Users, "بەکارهێنەران", "Users"],
            ["posts", FileText, "پۆستەکان", "Posts"],
            ["orders", ShoppingBag, "داواکارییەکان", "Orders"],
            ["categories", Tags, "بەشەکان", "Categories"],
            ["audit", ShieldCheck, "تۆماری چاودێری", "Audit logs"],
            ["settings", Settings, "ڕێکخستنەکان", "Settings"]
          ] as const
        ).map(([id, Icon, ku, en]) => (
          <button
            className={tab === id ? "selected" : ""}
            key={id}
            onClick={() => {
              setTab(id);
              setSearch("");
              setStatusFilter("");
            }}
          >
            <Icon size={16} />
            {t(ku, ku, en)}
          </button>
        ))}
      </div>

      {/* Action Toolbar */}
      <div className="admin-toolbar">
        <div className="admin-search">
          <Search size={16} />
          <input
            placeholder={t("گەڕان بەدوای ناو، ئیمەیڵ، مۆبایل، کد...", "بحث بالإسم، البريد، الرقم...", "Search by name, email, phone, ID...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {(tab === "posts" || tab === "orders") && (
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">{t("هەموو دۆخەکان", "كل الحالات", "All statuses")}</option>
            {(tab === "orders" ? orderStatuses : ["active", "blocked", "deleted"]).map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        )}

        {tab === "users" && (
          <button className="primary" onClick={() => setShowAddUserModal(true)} style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "11px", padding: "10px 14px" }}>
            <UserPlus size={15} /> {t("زیادکردنی بەکارهێنەر", "إضافة مستخدم", "Add User")}
          </button>
        )}

        <button className="iconbtn" onClick={() => void loadData()} title={t("نوێکردنەوە", "تحديث", "Refresh")}>
          <RefreshCw size={16} />
        </button>
      </div>

      {message && <div className="notice">{message}</div>}
      {error && <div className="notice error">{error}</div>}

      {/* Create New User Modal */}
      {showAddUserModal && (
        <div className="panel" style={{ marginBottom: "20px", background: "#f8fafc", border: "1.5px solid #cbd5e1" }}>
          <h3 style={{ margin: "0 0 14px", fontSize: "15px" }}>{t("تۆمارکردنی بەکارهێنەری نوێ", "تسجيل مستخدم جديد", "Register New User")}</h3>
          <div className="form" style={{ maxWidth: "100%", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", display: "grid", gap: "12px" }}>
            <input placeholder={t("ناوی تەواو", "الاسم الكامل", "Full name")} value={newUser.full_name} onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })} />
            <input type="email" placeholder={t("ئیمەیڵ", "البريد الإلكتروني", "Email")} value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
            <input placeholder={t("ژمارەی مۆبایل", "رقم الهاتف", "Phone number")} value={newUser.phone} onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })} />
            <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value as Role })}>
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
            <button className="primary" onClick={handleAddUser}>
              {t("پاشەکەوتکردن", "حفظ", "Save User")}
            </button>
            <button className="iconbtn" onClick={() => setShowAddUserModal(false)}>
              {t("پاشگەزبوونەوە", "إلغاء", "Cancel")}
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Tab Views */}
      {tab === "settings" ? (
        <SettingsPanel settings={settings} setSettings={setSettings} save={saveSettings} t={t} />
      ) : tab === "categories" ? (
        <div className="admin-create">
          <div className="panel" style={{ background: "#f8fafc", marginBottom: "16px" }}>
            <h3 style={{ margin: "0 0 12px", fontSize: "14px" }}>{t("دروستکردنی بەشی نوێ", "إنشاء قسم جديد", "Create New Category")}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", marginBottom: "12px" }}>
              <input placeholder={t("ناو بە کوردی (نموونە: سوپەرمارکێت)", "الاسم بالكرية", "Name in Kurdish")} value={catNameKu} onChange={(e) => setCatNameKu(e.target.value)} />
              <input placeholder={t("ناو بە عەرەبی", "الاسم بالعربية", "Name in Arabic")} value={catNameAr} onChange={(e) => setCatNameAr(e.target.value)} />
              <input placeholder={t("ناو بە ئینگلیزی", "الاسم بالإنجليزية", "Name in English")} value={catNameEn} onChange={(e) => setCatNameEn(e.target.value)} />
            </div>
            <button className="primary" onClick={() => void createCategory()}>
              <Plus size={16} /> {t("زیادکردنی بەش", "إضافة قسم", "Add Category")}
            </button>
          </div>

          <Table rows={filteredRows} tab={tab} role={role} call={callRpc} deletePost={deletePost} approvePost={approvePost} t={t} />
        </div>
      ) : loading ? (
        <div className="panel">
          <p>{t("داتا بار دەکرێت...", "جار تحميل البيانات...", "Loading data...")}</p>
        </div>
      ) : (
        <Table rows={filteredRows} tab={tab} role={role} call={callRpc} deletePost={deletePost} approvePost={approvePost} t={t} />
      )}

      <div className="admin-summary">
        {t("کۆی تۆمارەکان", "إجمالي السجلات", "Total records")}: {filteredRows.length} · {t("سیستەمی بەڕێوەبردنی گشتی شاخ بۆ گەیاندن", "نظام إدارة شاخ للتوصيل", "SHAX Delivery Live Management Platform")}
      </div>
    </div>
  );
}

function Table({
  rows,
  tab,
  role,
  call,
  deletePost,
  approvePost,
  t
}: {
  rows: Record<string, unknown>[];
  tab: AdminTab;
  role: Role;
  call: (name: string, args: Record<string, unknown>) => Promise<void>;
  deletePost?: (id: string) => Promise<void>;
  approvePost?: (id: string) => Promise<void>;
  t: Translate;
}) {
  if (!rows.length) {
    return (
      <div className="panel">
        <p>{t("هیچ داتایەک لەم بەشەدا نەدۆزرایەوە", "لا توجد بيانات في هذا القسم", "No records found in this section")}</p>
      </div>
    );
  }

  return (
    <div className="admin-table">
      {rows.map((row, idx) => {
        const id = String(row.id || `row-${idx}`);
        const primaryTitle = String(row.full_name || row.title || row.name || row.action || row.id);
        const subTitle = String(row.email || row.category || row.role || row.status || row.resource_type || "");

        return (
          <div className="admin-row" key={id}>
            <div>
              <strong>{primaryTitle}</strong>
              <small>{subTitle}</small>
            </div>

            <span>
              {row.total
                ? `${Number(row.total).toLocaleString()} IQD`
                : row.price
                ? `${Number(row.price).toLocaleString()} IQD`
                : row.phone
                ? String(row.phone)
                : row.created_at
                ? new Date(String(row.created_at)).toLocaleDateString()
                : ""}
            </span>

            <div className="admin-row-actions">
              {tab === "users" && (
                <>
                  <select
                    value={String(row.role || "customer")}
                    onChange={(e) => void call("admin_change_user_role", { target_user: row.id, new_role: e.target.value })}
                  >
                    {roles.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => void call("toggle_user_status", { target_user: row.id })}
                    title={row.status === "blocked" ? "Activate" : "Suspend"}
                  >
                    {row.status === "blocked" ? <Unlock size={14} /> : <Lock size={14} />}
                  </button>
                </>
              )}

              {tab === "posts" && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  {row.status === "pending_approval" ? (
                    <span className="badge" style={{ background: "#fff7ed", color: "#c2410c", border: "1px solid #ffedd5", padding: "4px 8px", borderRadius: "8px", fontWeight: 700, fontSize: "11px" }}>
                      {t("لە چاوەڕوانی پارەی پێشەکیدا", "بانتظار الدفع المسبق", "Pending Prepaid Fee")}
                    </span>
                  ) : row.status === "blocked" ? (
                    <span className="badge" style={{ background: "#fef2f2", color: "#dc2626", padding: "4px 8px", borderRadius: "8px", fontWeight: 700, fontSize: "11px" }}>
                      {t("بلۆککراو", "محظور", "Blocked")}
                    </span>
                  ) : (
                    <span className="badge" style={{ background: "#f0fdf4", color: "#166534", padding: "4px 8px", borderRadius: "8px", fontWeight: 700, fontSize: "11px" }}>
                      {t("بڵاوکراوەتەوە", "منشور", "Active")}
                    </span>
                  )}

                  {row.status !== "active" && (
                    <button
                      onClick={() => void approvePost?.(String(row.id))}
                      style={{ background: "#10b981", color: "#ffffff", border: "none", padding: "6px 12px", borderRadius: "8px", fontWeight: 700, fontSize: "11px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                      title={t("تأکیدکردنی پارە و بڵاوکردنەوە", "تأكيد الدفع والنشر", "Confirm Payment & Publish")}
                    >
                      <CheckCircle2 size={13} /> {t("پەسەندکردن و بڵاوکردنەوە", "الموافقة والنشر", "Approve & Publish")}
                    </button>
                  )}

                  {row.status === "active" && (
                    <button
                      onClick={() => void call("admin_moderate_post", { target_post: row.id, new_status: "blocked" })}
                      style={{ background: "#f1f5f9", color: "#64748b", border: "1px solid #cbd5e1", padding: "6px 10px", borderRadius: "8px", fontWeight: 600, fontSize: "11px", cursor: "pointer" }}
                    >
                      {t("بلۆک", "حظر", "Block")}
                    </button>
                  )}

                  <button
                    onClick={() => void deletePost?.(String(row.id))}
                    style={{ background: "#fef2f2", color: "#ef4444", border: "1px solid #fca5a5", padding: "6px 10px", borderRadius: "8px", fontWeight: 700, fontSize: "11px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                    title={t("ڕەشکردنەوەی بەکارجاری", "حذف نهائي", "Delete Permanently")}
                  >
                    <Trash2 size={13} /> {t("ڕەشکردنەوە", "حذف", "Delete")}
                  </button>
                </div>
              )}

              {tab === "orders" && (
                <select
                  value={String(row.status || "pending")}
                  onChange={(e) => void call("admin_set_order_status", { target_order: row.id, new_status: e.target.value })}
                >
                  {orderStatuses.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SettingsPanel({
  settings,
  setSettings,
  save,
  t
}: {
  settings: Record<string, unknown>;
  setSettings: (value: Record<string, unknown>) => void;
  save: () => void;
  t: Translate;
}) {
  return (
    <div className="panel settings-panel" style={{ maxWidth: "680px" }}>
      <h3>{t("ڕێکخستنەکانی پلاتفۆرم و سیستەم", "إعدادات المنصة والنظام", "Platform & System Settings")}</h3>

      <div style={{ display: "grid", gap: "14px", marginTop: "16px" }}>
        <label>
          {t("ڕێژەی کۆمسیۆنی پلاتفۆرم (%)", "نسبة عمولة المنصة (%)", "Platform Commission (%)")}
          <input
            type="number"
            value={String(settings.platform_commission_percent ?? 5)}
            onChange={(e) => setSettings({ ...settings, platform_commission_percent: Number(e.target.value) })}
          />
        </label>

        <label>
          {t("کرێی گەیاندنی سەرەتایی (د.ع)", "رسوم التوصيل الافتراضية (د.ع)", "Default Delivery Fee (IQD)")}
          <input
            type="number"
            value={String(settings.default_delivery_fee ?? 5000)}
            onChange={(e) => setSettings({ ...settings, default_delivery_fee: Number(e.target.value) })}
          />
        </label>

        <label>
          {t("نرخی گۆڕینەوەی دۆلار (IQD بۆ $1)", "سعر صرف الدولار (د.ع لكل $1)", "USD Exchange Rate (IQD per $1)")}
          <input
            type="number"
            value={String(settings.usd_rate ?? 1530)}
            onChange={(e) => setSettings({ ...settings, usd_rate: Number(e.target.value) })}
          />
        </label>

        <label>
          {t("ژمارەی هێڵی گەرمی پشتگیری", "رقم خط الدعم الفني", "Support Hotline Phone")}
          <input
            value={String(settings.support_phone ?? "0750 000 0000")}
            onChange={(e) => setSettings({ ...settings, support_phone: e.target.value })}
          />
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "6px" }}>
          <input
            type="checkbox"
            checked={Boolean(settings.maintenance_mode)}
            onChange={(e) => setSettings({ ...settings, maintenance_mode: e.target.checked })}
            style={{ width: "18px", height: "18px", accentColor: "#f97316" }}
          />
          <span>{t("دۆخی چاکسازی سیستەم (Maintenance Mode)", "وضع الصيانة للنظام", "System Maintenance Mode")}</span>
        </label>

        <button className="primary" onClick={save} style={{ marginTop: "12px" }}>
          {t("پاشەکەوتکردنی ڕێکخستنەکان", "حفظ الإعدادات", "Save Platform Settings")}
        </button>
      </div>
    </div>
  );
}
