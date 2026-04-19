import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import {
  getBillingInfo,
  scheduleCancellation,
  reactivateSubscription,
} from "@/lib/dal/billing";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.emailVerified)
    return NextResponse.json({ error: "Email not verified" }, { status: 403 });

  const billingInfo = await getBillingInfo(session.user.id);
  if (!billingInfo?.stripeSubscriptionId || !billingInfo?.stripeCustomerId) {
    return NextResponse.json(
      { error: "No subscription found" },
      { status: 404 },
    );
  }

  const { stripeSubscriptionId, stripeCustomerId } = billingInfo;

  const { action } = (await req.json()) as { action?: string };
  if (action !== "cancel" && action !== "reactivate") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  try {
    const sub = await getStripe().subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: action === "cancel",
    });

    const currentPeriodEnd = sub.items.data[0]?.current_period_end ?? 0;

    if (action === "cancel") {
      await scheduleCancellation(stripeCustomerId, currentPeriodEnd);
    } else {
      await reactivateSubscription(stripeCustomerId, currentPeriodEnd);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Stripe error" }, { status: 502 });
  }
}
