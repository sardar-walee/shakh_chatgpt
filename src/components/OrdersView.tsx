import React, { useEffect, useState } from "react";
import { Bike, CheckCircle2, Clock, MapPin, Package, RefreshCw, ShoppingBag, Truck, AlertTriangle, Radio } from "lucide-react";
import { supabase } from "../lib/supabase";

export type Order = {
  id: string;
  customer_id: string;
  captain_id: string | null;
  status: "pending" | "accepted" | "preparing" | "out_for_delivery" | "delivered" | "cancelled";
  payment_method: string;
  products_total: number;
  delivery_fee: number;
  total: number;
  delivery_address: string;
  created_at: string;
  order_items?: Array<{
    id: string;
    post_id: string;
    quantity: number;
    unit_price: number;
    post?: { title: string; image_url: string; category: string };
  }>;
};

interface OrdersViewProps {
  userId: string | null;
  role: string;
  t: (ku: string, ar: string, en: string) => string;
  money: (n: number) => string;
}

const STEPS = [
  { key: "pending", ku: "تۆمارکرا", ar: "تم الطلب", en: "Placed", icon: Package },
  { key: "preparing", ku: "ئامادەکردن", ar: "التحضير", en: "Preparing", icon: Clock },
  { key: "out_for_delivery", ku: "لە ڕێگادایە", ar: "التوصيل", en: "On the way", icon: Truck },
  { key: "delivered", ku: "گەیەندرا", ar: "تم التسليم", en: "Delivered", icon: CheckCircle2 }
];

const getStepIndex = (status: Order["status"]): number => {
  switch (status) {
    case "pending":
      return 0;
    case "accepted":
    case "preparing":
      return 1;
    case "out_for_delivery":
      return 2;
    case "delivered":
      return 3;
    case "cancelled":
      return -1;
    default:
      return 0;
  }
};

export const OrderStatusTracker: React.FC<{
  status: Order["status"];
  t: (ku: string, ar: string, en: string) => string;
}> = ({ status, t }) => {
  if (status === "cancelled") {
    return (
      <div className="status-tracker-cancelled">
        <AlertTriangle size={16} />
        <span>{t("ئەم داواکارییە هەڵوەشێنرایەوە", "تم إلغاء هذا الطلب", "This order was cancelled")}</span>
      </div>
    );
  }

  const currentStep = getStepIndex(status);
  const progressPercent = Math.min(100, Math.max(0, (currentStep / (STEPS.length - 1)) * 100));

  return (
    <div className="order-status-tracker">
      <div className="tracker-live-tag">
        <span className="live-dot pulse"></span>
        <span>{t("بەدواداچوونی زانیاری ڕاستەوخۆ (Realtime)", "متابعة فورية مياشرة", "Live Real-Time Status")}</span>
      </div>

      <div className="tracker-progress-bar">
        <div className="tracker-line-bg">
          <div
            className="tracker-line-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="tracker-steps">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isCompleted = idx < currentStep;
            const isCurrent = idx === currentStep;

            let stepClass = "tracker-step";
            if (isCompleted) stepClass += " completed";
            if (isCurrent) stepClass += " current";

            return (
              <div key={step.key} className={stepClass}>
                <div className="step-circle">
                  {isCompleted ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <Icon size={16} />
                  )}
                  {isCurrent && <span className="ring-pulse"></span>}
                </div>
                <span className="step-label">{t(step.ku, step.ar, step.en)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const OrdersView: React.FC<OrdersViewProps> = ({ userId, role, t, money }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadOrders = async () => {
    if (!supabase || !userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      let query = supabase
        .from("orders")
        .select(`
          id, customer_id, captain_id, status, payment_method,
          products_total, delivery_fee, total, delivery_address, created_at,
          order_items ( id, post_id, quantity, unit_price, posts ( title, image_url, category ) )
        `)
        .order("created_at", { ascending: false });

      if (role === "customer") {
        query = query.eq("customer_id", userId);
      } else if (role === "captain") {
        query = query.or(`captain_id.eq.${userId},status.eq.pending,status.eq.accepted`);
      }

      const { data, error: fetchErr } = await query;
      if (fetchErr) {
        console.warn("Supabase load orders note:", fetchErr.message);
        setError(fetchErr.message);
      } else {
        setOrders((data || []) as unknown as Order[]);
      }
    } catch (err: any) {
      console.warn("loadOrders catch error:", err);
      setError(err?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOrders();
  }, [userId, role]);

  useEffect(() => {
    if (!supabase) return;
    let channel: any;
    try {
      channel = supabase
        .channel("orders-realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
          void loadOrders();
        })
        .subscribe();
    } catch (err) {
      console.warn("Orders realtime channel error:", err);
    }
    return () => {
      if (channel) void supabase.removeChannel(channel);
    };
  }, [userId]);

  const updateOrderStatus = async (
    orderId: string,
    newStatus: Order["status"],
    assignCaptain: boolean = false
  ) => {
    if (!supabase || !userId) return;
    setUpdatingId(orderId);
    try {
      const payload: Record<string, any> = { status: newStatus };
      if (assignCaptain) {
        payload.captain_id = userId;
      }

      const { error: updateErr } = await supabase
        .from("orders")
        .update(payload)
        .eq("id", orderId);

      if (updateErr) {
        setError(updateErr.message);
      } else {
        await loadOrders();
      }
    } catch (err: any) {
      setError(err?.message || "Failed to update order");
    } finally {
      setUpdatingId(null);
    }
  };

  const statusBadgeClass = (status: Order["status"]) => {
    switch (status) {
      case "pending":
        return "status-badge pending";
      case "accepted":
      case "preparing":
        return "status-badge active";
      case "out_for_delivery":
        return "status-badge delivery";
      case "delivered":
        return "status-badge success";
      default:
        return "status-badge muted";
    }
  };

  const statusLabel = (status: Order["status"]) => {
    switch (status) {
      case "pending":
        return t("چاوەڕوانی وەرگرتن", "قيد الانتظار", "Pending");
      case "accepted":
        return t("وەرگیرا", "تم القبول", "Accepted");
      case "preparing":
        return t("لە ئامادەکردندایە", "قيد التحضير", "Preparing");
      case "out_for_delivery":
        return t("لە ڕێگای گەیاندندایە", "جاري التوصيل", "Out for delivery");
      case "delivered":
        return t("گەیەندرا", "تم التسليم", "Delivered");
      case "cancelled":
        return t("هەڵوەشێنرایەوە", "ملغي", "Cancelled");
    }
  };

  return (
    <div className="orders-container">
      <div className="section-head">
        <div>
          <div className="head-with-live">
            <h2>{t("داواکارییەکان", "الطلبات", "Orders")}</h2>
            <span className="live-indicator"><Radio size={12} className="spin-slow" /> LIVE</span>
          </div>
          <p>{t("بەدواداچوونی ڕاستەوخۆ بۆ بارودۆخی داواکاری و گەیاندن بکە", "تابع حالة الطلب والتوصيل بشكل مباشر", "Real-time order tracking & delivery updates")}</p>
        </div>
        <button className="iconbtn" onClick={loadOrders} title={t("نوێکردنەوە", "تحديث", "Refresh")}>
          <RefreshCw size={18} />
        </button>
      </div>

      {error && <div className="notice error">{error}</div>}

      {loading ? (
        <div className="panel">
          <p>{t("داواکارییەکان بار دەکرێن...", "جار تحميل الطلبات...", "Loading orders...")}</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="panel empty-orders">
          <ShoppingBag size={48} className="empty-icon" />
          <h3>{t("هیچ داواکارییەک تۆمار نەکراوە", "لا توجد طلبات مسجلة", "No orders placed yet")}</h3>
          <p>{t("کاتێک داواکاری دەکەیت، لێرە بەدواداچوونی بۆ بکە", "عندما تقوم بالطلب، ستتمكن من متابعته هنا", "When you place an order, track its progress here.")}</p>
        </div>
      ) : (
        <div className="orders-grid">
          {orders.map((ord) => (
            <article className="order-card" key={ord.id}>
              <div className="order-card-header">
                <div>
                  <span className="order-id">#{ord.id.slice(0, 8)}</span>
                  <time className="order-time">{new Date(ord.created_at).toLocaleString()}</time>
                </div>
                <span className={statusBadgeClass(ord.status)}>
                  {statusLabel(ord.status)}
                </span>
              </div>

              {/* Order Visualizer Component */}
              <OrderStatusTracker status={ord.status} t={t} />

              {ord.delivery_address && (
                <div className="order-address">
                  <MapPin size={14} />
                  <span>{ord.delivery_address}</span>
                </div>
              )}

              {ord.order_items && ord.order_items.length > 0 && (
                <div className="order-items-list">
                  {ord.order_items.map((item, idx) => (
                    <div key={item.id || idx} className="order-item-row">
                      <span className="item-title">
                        {item.post?.title || t("بەرهەم", "منتج", "Product")}
                      </span>
                      <span className="item-qty">x{item.quantity}</span>
                      <span className="item-price">{money(item.unit_price)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="order-card-footer">
                <div className="order-total-sum">
                  <span>{t("کۆی گشتی", "المجموع", "Total")}:</span>
                  <strong>{money(ord.total || ord.products_total)}</strong>
                </div>

                {/* Actions based on role */}
                {role === "captain" && (
                  <div className="order-actions">
                    {ord.status === "pending" && (
                      <button
                        className="primary-sm"
                        disabled={updatingId === ord.id}
                        onClick={() => updateOrderStatus(ord.id, "accepted", true)}
                      >
                        <Bike size={14} />
                        {t("وەرگرتنی گەیاندن", "قَبول التوصيل", "Accept Delivery")}
                      </button>
                    )}
                    {(ord.status === "accepted" || ord.status === "preparing") && ord.captain_id === userId && (
                      <button
                        className="primary-sm"
                        disabled={updatingId === ord.id}
                        onClick={() => updateOrderStatus(ord.id, "out_for_delivery")}
                      >
                        <Truck size={14} />
                        {t("دەستپێکردنی گەیاندن", "بدء التوصيل", "Start Delivery")}
                      </button>
                    )}
                    {ord.status === "out_for_delivery" && ord.captain_id === userId && (
                      <button
                        className="success-sm"
                        disabled={updatingId === ord.id}
                        onClick={() => updateOrderStatus(ord.id, "delivered")}
                      >
                        <CheckCircle2 size={14} />
                        {t("تەواوکردنی گەیاندن", "تم التسليم", "Mark Delivered")}
                      </button>
                    )}
                  </div>
                )}

                {(role === "super_admin" || role === "admin" || role === "restaurant" || role === "supermarket" || role === "fashion" || role === "beauty") && (
                  <div className="order-actions">
                    {ord.status === "pending" && (
                      <button
                        className="primary-sm"
                        disabled={updatingId === ord.id}
                        onClick={() => updateOrderStatus(ord.id, "preparing")}
                      >
                        <Clock size={14} />
                        {t("تۆمارکردن بۆ ئامادەکردن", "بدء التحضير", "Mark Preparing")}
                      </button>
                    )}
                    {(ord.status === "preparing" || ord.status === "accepted") && (
                      <button
                        className="primary-sm"
                        disabled={updatingId === ord.id}
                        onClick={() => updateOrderStatus(ord.id, "out_for_delivery")}
                      >
                        <Truck size={14} />
                        {t("ناردن بۆ گەیاندن", "إرسال للتوصيل", "Send to Delivery")}
                      </button>
                    )}
                    {ord.status === "out_for_delivery" && (
                      <button
                        className="success-sm"
                        disabled={updatingId === ord.id}
                        onClick={() => updateOrderStatus(ord.id, "delivered")}
                      >
                        <CheckCircle2 size={14} />
                        {t("تەواوبوو", "مكتمل", "Mark Delivered")}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

