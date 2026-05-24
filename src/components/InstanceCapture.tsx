"use client";

import { useEffect } from "react";
import { captureFromInstanceQuery } from "@/lib/instanceStore";

export default function InstanceCapture() {
    useEffect(() => {
        captureFromInstanceQuery();
    }, []);
    return null;
}
