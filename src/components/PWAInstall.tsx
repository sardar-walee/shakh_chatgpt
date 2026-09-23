import React, { useEffect, useState } from "react";
import { Download, WifiOff, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return { isInstallable: !!deferredPrompt, isInstalled, isIOS, install };
}

export const PWAInstallButton: React.FC<{
  t: (ku: string, ar: string, en: string) => string;
}> = ({ t }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="pwa-install-btn"
        title={t("دابەزاندنی ئەپ", "تثبيت التطبيق", "Install app")}
      >
        <Download size={16} />
        <span>{t("دابەزاندنی ئەپ", "تثبيت التطبيق", "Install App")}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="pwa-install-btn ios"
        >
          <Download size={16} />
          <span>{t("دابەزاندن بۆ iOS", "تثبيت على iOS", "Install on iOS")}</span>
        </button>

        {showIOSGuide && (
          <div className="ios-modal-overlay" onClick={() => setShowIOSGuide(false)}>
            <div className="ios-modal" onClick={(e) => e.stopPropagation()}>
              <div className="ios-modal-head">
                <h3>{t("دابەزاندن لەسەر ئایفۆن", "التثبيت على أيفون", "Install on iPhone")}</h3>
                <button onClick={() => setShowIOSGuide(false)}>
                  <X size={16} />
                </button>
              </div>
              <p>
                1. {t("داگرتنی دوگمەی هاوبەشکردن", "انقر على زر المشاركة", "Tap Share in Safari")}.<br />
                2. {t("زیادکردن بۆ پەڕەی سەرەکی", "اختر إضافة إلى الشاشة الرئيسية", "Tap 'Add to Home Screen'")}.
              </p>
              <button className="ios-modal-close" onClick={() => setShowIOSGuide(false)}>
                {t("داخستن", "إغلاق", "Close")}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC<{
  t: (ku: string, ar: string, en: string) => string;
}> = ({ t }) => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="offline-banner">
      <WifiOff size={16} />
      <span>
        {t(
          "دۆخی ئۆفلاین — زانیارییە شاشەکراوەکان بەکاردێن",
          "وضع عدم الاتصال — يتم استخدام البيانات المحفوظة",
          "Offline mode — Using cached data"
        )}
      </span>
    </div>
  );
};
