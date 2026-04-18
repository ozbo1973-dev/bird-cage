import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { getAuthBaseUrl } from "@/lib/get-auth-base-url";
import { getStripeCustomerId } from "@/lib/dal/billing";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.emailVerified)
    return NextResponse.json({ error: "Email not verified" }, { status: 403 });

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    return NextResponse.json(
      { error: "Stripe price ID not configured" },
      { status: 500 },
    );
  }

  const origin = getAuthBaseUrl();

  // Reuse existing Stripe customer if available
  const existingCustomerId = await getStripeCustomerId(session.user.id);

  const checkoutSession = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer: existingCustomerId ?? undefined,
    customer_email: existingCustomerId ? undefined : session.user.email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/billing?success=true`,
    cancel_url: `${origin}/billing?canceled=true`,
    metadata: { userId: session.user.id },
  });

  return NextResponse.json({ sessionId: checkoutSession.id, url: checkoutSession.url });
}
