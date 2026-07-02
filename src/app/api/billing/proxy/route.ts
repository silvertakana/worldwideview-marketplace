import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.PROVISIONING_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: "Proxy not configured" }, { status: 500 });
    }

    const authHost = process.env.NEXT_PUBLIC_AUTH_HOST_URL;
    if (!authHost) {
        return NextResponse.json({ error: "Auth host not configured" }, { status: 500 });
    }

    try {
        const response = await fetch(
            `${authHost}/api/account?userId=${user.id}`,
            {
                headers: {
                    "x-api-key": apiKey,
                    "Content-Type": "application/json",
                },
            },
        );

        if (!response.ok) {
            return NextResponse.json(
                { error: "Failed to fetch subscription from upstream" },
                { status: 502 },
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch {
        return NextResponse.json(
            { error: "Failed to fetch subscription from upstream" },
            { status: 502 },
        );
    }
}
