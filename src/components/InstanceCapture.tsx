"use client";

import { useEffect } from "react";
import { captureFromInstanceQuery } from "@/lib/instanceStore";

export default function InstanceCapture() {
    useEffect(() => {
        const captured = captureFromInstanceQuery();
        if (!captured) return;

        // Fire-and-forget: also save this instance to the user's account
        // server-side. 401 (anonymous) is fine — we'll re-try on next visit
        // once they sign in.
        fetch("/api/instances/link", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ url: captured }),
        }).catch(() => { /* ignore network errors */ });
    }, []);
    return null;
}
