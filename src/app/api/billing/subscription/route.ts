import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { freeSubscription, readSubscription } from "@/lib/billing/subscription";

/**
 * The signed-in user's subscription, read from the hub's durable billing
 * record through their own session. See src/lib/billing/subscription.ts for
 * why the marketplace reads the shared table directly instead of calling the
 * hub's session-only /api/account route.
 */
export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const subscription = await readSubscription(supabase, user);
        return NextResponse.json(subscription, {
            headers: { "Cache-Control": "no-store" },
        });
    } catch (error) {
        // A throw here (client construction, cookie access) is a read failure,
        // not evidence that the user pays for nothing, so it reports the same
        // distinguishable fail-safe. The 200 keeps the billing page rendering.
        console.error("[billing] subscription route failed:", error);
        return NextResponse.json(freeSubscription("read-error"), {
            headers: { "Cache-Control": "no-store" },
        });
    }
}
