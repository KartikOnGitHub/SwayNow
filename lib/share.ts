// Native share on mobile (opens WhatsApp, iMessage, Instagram, etc.)
// Falls back to clipboard copy on desktop.

const APP_URL = typeof window !== "undefined" ? window.location.origin : "https://swaynow.app";

export async function shareApp(): Promise<"shared" | "copied" | "failed"> {
    const shareData = {
        title: "SwayNow",
        text: "I'm using SwayNow to meet people nearby right now. Join me 👋",
        url: APP_URL,
    };
    return doShare(shareData);
}

export async function sharePost(postText: string, city: string): Promise<"shared" | "copied" | "failed"> {
    const shareData = {
        title: "SwayNow",
        text: `Someone in ${city} is up for: "${postText.slice(0, 80)}". Join them on SwayNow 👋`,
        url: APP_URL,
    };
    return doShare(shareData);
}

export async function shareProfile(name: string, userId: string): Promise<"shared" | "copied" | "failed"> {
    const shareData = {
        title: `${name} on SwayNow`,
        text: `Check out ${name}'s profile on SwayNow`,
        url: `${APP_URL}/profile/${userId}`,
    };
    return doShare(shareData);
}

async function doShare(data: { title: string; text: string; url: string }): Promise<"shared" | "copied" | "failed"> {
    try {
        if (typeof navigator !== "undefined" && navigator.share) {
            await navigator.share(data);
            return "shared";
        }
        // Fallback: copy link to clipboard
        if (typeof navigator !== "undefined" && navigator.clipboard) {
            await navigator.clipboard.writeText(`${data.text}\n${data.url}`);
            return "copied";
        }
        return "failed";
    } catch (e) {
        // User cancelled share sheet — not an error
        const err = e as { name?: string };
        if (err?.name === "AbortError") return "failed";
        // Try clipboard as last resort
        try {
            await navigator.clipboard.writeText(`${data.text}\n${data.url}`);
            return "copied";
        } catch {
            return "failed";
        }
    }
}