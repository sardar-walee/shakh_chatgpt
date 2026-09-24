import React, { useEffect, useState, useRef } from "react";
import { Car, CheckCircle2, Eye, X, AlertCircle, DollarSign, Bell } from "lucide-react";
import { CarListingItem, formatTimeAgo } from "../lib/carNotificationStore";

interface CarApprovalToastProps {
  listing: CarListingItem;
  onClose: () => void;
  onReview: (listing: CarListingItem) => void;
  onApprove: (listingId: string) => Promise<void> | void;
  t: (ku: string, ar: string, en: string) => string;
  durationMs?: number;
}

export function CarApprovalToast({
  listing,
  onClose,
  onReview,
  onApprove,
  t,
  durationMs = 9000
}: CarApprovalToastProps) {
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const [approving, setApproving] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const remainingTimeRef = useRef<number>(durationMs);

  useEffect(() => {
    if (isPaused) return;

    startTimeRef.current = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const newRemaining = Math.max(0, remainingTimeRef.current - elapsed);
      const percent = (newRemaining / durationMs) * 100;
      setProgress(percent);

      if (newRemaining <= 0) {
        clearInterval(interval);
        onClose();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [isPaused, durationMs, onClose]);

  const handleMouseEnter = () => {
    remainingTimeRef.current = (progress / 100) * durationMs;
    setIsPaused(true);
  };

  const handleMouseLeave = () => {
    startTimeRef.current = Date.now();
    setIsPaused(false);
  };

  const handleQuickApprove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setApproving(true);
    try {
      await onApprove(listing.id);
      onClose();
    } finally {
      setApproving(false);
    }
  };

  return (
    <div
      className="car-toast-container"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="alert"
      aria-live="assertive"
    >
      <div className="car-toast-card">
        {/* Animated Progress Countdown Bar */}
        <div
          className="car-toast-progress-bar"
          style={{ width: `${progress}%` }}
        />

        {/* Header Bar */}
        <div className="car-toast-header">
          <div className="car-toast-badge">
            <span className="car-toast-dot" />
            <Car size={14} />
            <span>{t("ئاگاداری پۆستکردنی ئۆتۆمبێل", "تنبيه إدراج سيارة جديدة", "New Car Listing Alert")}</span>
          </div>
          <span className="car-toast-time">{formatTimeAgo(listing.created_at, t)}</span>
          <button
            className="car-toast-close"
            onClick={onClose}
            aria-label={t("داخستن", "إغلاق", "Close notification")}
          >
            <X size={15} />
          </button>
        </div>

        {/* Body content */}
        <div className="car-toast-body">
          <div className="car-toast-icon-wrap">
            <Car size={24} />
          </div>

          <div className="car-toast-content">
            <h4 className="car-toast-title">{listing.title}</h4>
            <div className="car-toast-meta">
              {listing.vendor && (
                <span className="car-toast-vendor">
                  {t("فرۆشیار:", "البائع:", "Vendor:")} <strong>{listing.vendor}</strong>
                </span>
              )}
              {listing.price > 0 && (
                <span className="car-toast-price">
                  {listing.price.toLocaleString()} د.ع
                </span>
              )}
            </div>

            <div className="car-toast-notice">
              <DollarSign size={13} style={{ flexShrink: 0 }} />
              <span>
                {t(
                  "ئەم پۆستە لە چاوەڕوانی وەرگرتنی پارەی پێشەکی و پەسەندکردنی سوپەر ئەدمیندایە.",
                  "هذا المنشور بانتظار استلام الدفع المسبق وموافقة السوبر أدمن.",
                  "Listing requires prepaid fee confirmation & Super Admin approval."
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="car-toast-actions">
          <button
            type="button"
            className="car-toast-btn-approve"
            onClick={handleQuickApprove}
            disabled={approving}
          >
            <CheckCircle2 size={14} />
            <span>
              {approving
                ? t("پەسەند دەکرێت...", "جار الموافقة...", "Approving...")
                : t("پەسەندکردن و بڵاوکردنەوە", "الموافقة والنشر", "Approve & Publish")}
            </span>
          </button>

          <button
            type="button"
            className="car-toast-btn-review"
            onClick={() => onReview(listing)}
          >
            <Eye size={14} />
            <span>{t("پێداچوونەوە", "مراجعة", "Review Details")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
