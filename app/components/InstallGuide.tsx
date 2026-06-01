"use client";

import { useState, useEffect } from "react";

type Platform = "ios-safari" | "ios-other" | "android-chrome" | "android-samsung" | "android-firefox" | "android-other" | "desktop" | "unknown";

function detectPlatform(): Platform {
    if (typeof window === "undefined") return "unknown";
    const ua = window.navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/.test(ua);
    const isAndroid = /Android/.test(ua);
    const isSamsung = /SamsungBrowser/.test(ua);
    const isFirefox = /Firefox/.test(ua);
    const isChrome = /Chrome/.test(ua) && !/Edg/.test(ua);
    const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);

    if (isIOS && isSafari) return "ios-safari";
    if (isIOS) return "ios-other";
    if (isAndroid && isSamsung) return "android-samsung";
    if (isAndroid && isFirefox) return "android-firefox";
    if (isAndroid && isChrome) return "android-chrome";
    if (isAndroid) return "android-other";
    return "desktop";
}

function isStandalone(): boolean {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(display-mode: standalone)").matches ||
        ("standalone" in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true);
}

const STEPS: Record<Platform, { title: string; icon: string; steps: string[] }> = {
    "ios-safari": {
        title: "Add to your Home Screen",
        icon: "📱",
        steps: [
            "Tap the Share button at the bottom of Safari (the box with an arrow pointing up)",
            "Scroll down and tap \"Add to Home Screen\"",
            "Tap \"Add\" in the top right corner",
            "SwayNow appears on your home screen like a real app ✓",
        ],
    },
    "ios-other": {
        title: "Open in Safari first",
        icon: "🧭",
        steps: [
            "Copy this link: swaynow.eu",
            "Open Safari (the compass icon)",
            "Paste the link and open it",
            "Tap the Share button → \"Add to Home Screen\"",
        ],
    },
    "android-chrome": {
        title: "Add to your Home Screen",
        icon: "📱",
        steps: [
            "Tap the three dots ⋮ in the top right corner of Chrome",
            "Tap \"Add to Home screen\"",
            "Tap \"Add\" to confirm",
            "SwayNow appears on your home screen like a real app ✓",
        ],
    },
    "android-samsung": {
        title: "Add to your Home Screen",
        icon: "📱",
        steps: [
            "Tap the three lines ☰ at the bottom of Samsung Browser",
            "Tap \"Add page to\" → \"Home screen\"",
            "Tap \"Add\" to confirm",
            "SwayNow appears on your home screen like a real app ✓",
        ],
    },
    "android-firefox": {
        title: "Add to your Home Screen",
        icon: "📱",
        steps: [
            "Tap the three dots ⋮ at the bottom of Firefox",
            "Tap \"Install\"",
            "Tap \"Add\" to confirm",
            "SwayNow appears on your home screen like a real app ✓",
        ],
    },
    "android-other": {
        title: "Add to your Home Screen",
        icon: "📱",
        steps: [
            "Tap the menu icon in your browser (usually ⋮ or ☰)",
            "Look for \"Add to Home screen\" or \"Install app\"",
            "Tap \"Add\" to confirm",
            "SwayNow appears on your home screen like a real app ✓",
        ],
    },
    "desktop": {
        title: "Works best on mobile",
        icon: "📲",
        steps: [
            "Open swaynow.eu on your phone",
            "Follow the steps to add it to your home screen",
            "It works like a real app — no App Store needed",
        ],
    },
    "unknown": {
        title: "Add to your Home Screen",
        icon: "📱",
        steps: [
            "Tap your browser's menu (usually ⋮ or ☰ or share button)",
            "Look for \"Add to Home screen\" or \"Install app\"",
            "Tap Add to confirm",
            "SwayNow appears on your home screen like a real app ✓",
        ],
    },
};

export default function InstallGuide() {
    const [show, setShow]           = useState(false);
    const [platform, setPlatform]   = useState<Platform>("unknown");
    const [step, setStep]           = useState(0);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        // Don't show if already installed
        if (isStandalone()) return;

        // Don't show if dismissed in last 3 days
        const d = localStorage.getItem("swaynow_install_guide");
        if (d && Date.now() - parseInt(d) < 3 * 24 * 60 * 60 * 1000) return;

        // Don't show if visited before (only show on true first visit)
        const visited = localStorage.getItem("swaynow_visited");
        if (visited) return;

        // Mark visited
        localStorage.setItem("swaynow_visited", "1");

        const p = detectPlatform();
        setPlatform(p);

        // Show after a short delay so feed loads first
        if (p !== "desktop") {
            const t = setTimeout(() => setShow(true), 2000);
            return () => clearTimeout(t);
        }
    }, []);

    const dismiss = () => {
        localStorage.setItem("swaynow_install_guide", Date.now().toString());
        setDismissed(true);
        setTimeout(() => setShow(false), 300);
    };

    const info = STEPS[platform];
    const totalSteps = info.steps.length;
    const isLast = step === totalSteps - 1;

    if (!show) return null;

    return (
        <div
            className={`fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm transition-opacity duration-300 ${dismissed ? "opacity-0" : "opacity-100"}`}
            onClick={dismiss}
        >
            <div
                className="w-full max-w-md bg-[#0f0f1a] border border-white/10 rounded-t-3xl p-6 space-y-6 pb-10"
                onClick={(e) => e.stopPropagation()}
                style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}
            >
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">{info.icon}</span>
                            <h2 className="text-lg font-bold text-white">{info.title}</h2>
                        </div>
                        <p className="text-sm text-[#A1A1AA]">
                            Get the full app experience — no App Store needed
                        </p>
                    </div>
                    <button onClick={dismiss} className="text-[#52525B] hover:text-white transition-colors w-8 h-8 flex items-center justify-center shrink-0">
                        ✕
                    </button>
                </div>

                {/* Progress dots */}
                <div className="flex gap-1.5 justify-center">
                    {info.steps.map((_, i) => (
                        <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${
                            i === step ? "bg-blue-500 w-6" : i < step ? "bg-blue-500/40 w-3" : "bg-white/10 w-3"
                        }`} />
                    ))}
                </div>

                {/* Current step */}
                <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-5 min-h-[80px] flex items-center">
                    <div className="flex items-start gap-4">
                        <div className="w-9 h-9 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm shrink-0">
                            {step + 1}
                        </div>
                        <p className="text-[15px] text-white leading-relaxed">{info.steps[step]}</p>
                    </div>
                </div>

                {/* All steps preview */}
                <div className="space-y-2">
                    {info.steps.map((s, i) => (
                        <button key={i} onClick={() => setStep(i)}
                                className={`w-full flex items-center gap-3 text-left px-3 py-2 rounded-xl transition-all ${
                                    i === step ? "bg-blue-500/10" : "opacity-50"
                                }`}>
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                i < step ? "bg-emerald-500 text-white" :
                                    i === step ? "bg-blue-500 text-white" :
                                        "bg-white/10 text-[#52525B]"
                            }`}>
                                {i < step ? "✓" : i + 1}
                            </div>
                            <p className={`text-xs leading-relaxed ${i === step ? "text-white" : "text-[#52525B]"}`}>{s}</p>
                        </button>
                    ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    {!isLast ? (
                        <>
                            <button onClick={dismiss}
                                    style={{ minHeight: 48 }}
                                    className="flex-1 rounded-2xl border border-white/10 text-[#A1A1AA] text-sm font-medium transition-all">
                                Maybe later
                            </button>
                            <button onClick={() => setStep((s) => s + 1)}
                                    style={{ minHeight: 48 }}
                                    className="flex-[2] rounded-2xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 active:scale-[0.98] transition-all">
                                Next step →
                            </button>
                        </>
                    ) : (
                        <button onClick={dismiss}
                                style={{ minHeight: 52 }}
                                className="w-full rounded-2xl bg-emerald-500 text-white text-base font-bold hover:bg-emerald-600 active:scale-[0.98] transition-all">
                            Done — I added it! ✓
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}