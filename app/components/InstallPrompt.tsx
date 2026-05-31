"use client";

import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [visible, setVisible] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        // Detect iOS (no beforeinstallprompt support — needs manual instructions)
        const ua = window.navigator.userAgent;
        const iOS = /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window);
        const isStandalone = window.matchMedia("(display-mode: standalone)").matches
            || ("standalone" in window.navigator && (window.navigator as { standalone?: boolean }).standalone);

        // Already installed → never show
        if (isStandalone) return;

        // Dismissed recently → respect that for 7 days
        const dismissedAt = localStorage.getItem("swaynow_install_dismissed");
        if (dismissedAt && Date.now() - parseInt(dismissedAt) < 7 * 24 * 60 * 60 * 1000) return;

        if (iOS) {
            setIsIOS(true);
            // Show iOS hint after a short delay
            const t = setTimeout(() => setVisible(true), 4000);
            return () => clearTimeout(t);
        }

        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setTimeout(() => setVisible(true), 4000);
        };
        window.addEventListener("beforeinstallprompt", handler);
        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted" || outcome === "dismissed") {
            setVisible(false);
            setDeferredPrompt(null);
        }
    };

    const handleDismiss = () => {
        setVisible(false);
        localStorage.setItem("swaynow_install_dismissed", Date.now().toString());
    };

    if (!visible) return null;

    return (
        <div className="fixed bottom-24 left-4 right-4 z-40 max-w-md mx-auto animate-in slide-in-from-bottom duration-300">
            <div className="bg-[#1a1a2e] border border-blue-500/30 rounded-2xl p-4 shadow-2xl flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    </svg>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">Add SwayNow to your phone</p>
                    {isIOS ? (
                        <p className="text-xs text-[#A1A1AA] mt-0.5 leading-relaxed">
                            Tap <span className="inline-block">⎙</span> Share, then &quot;Add to Home Screen&quot;
                        </p>
                    ) : (
                        <p className="text-xs text-[#A1A1AA] mt-0.5">Quick access, like a real app.</p>
                    )}
                </div>
                {!isIOS && (
                    <button onClick={handleInstall}
                            className="shrink-0 px-4 py-2 rounded-xl bg-blue-500 text-white text-xs font-bold hover:bg-blue-600 active:scale-95 transition-all">
                        Install
                    </button>
                )}
                <button onClick={handleDismiss}
                        className="shrink-0 text-[#52525B] hover:text-white transition-colors w-6 h-6 flex items-center justify-center">
                    ✕
                </button>
            </div>
        </div>
    );
}