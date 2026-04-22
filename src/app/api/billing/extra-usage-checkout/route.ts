import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { getAuthBaseUrl } from "@/lib/get-auth-base-url";
import { getStripeCustomerId } from "@/lib/dal/billing";
import {
  EXTRA_USAGE_OPTIONS,
  type ExtraUsageCents,
} from "@/lib/billing-config";

const ALLOWED_AMOUNTS = EXTRA_USAGE_OPTIONS.map((o) => o.cents) as unknown as readonly ExtraUsageCents[];

function getPriceId(amountCents: ExtraUsageCents): string | undefined {
  if (amountCents === 200) return process.env.STRIPE_EXTRA_USAGE_2_PRICE_ID;
  if (amountCents === 500) return process.env.STRIPE_EXTRA_USAGE_5_PRICE_ID;
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.emailVerified)
    return NextResponse.json({ error: "Email not verified" }, { status: 403 });

  const body = (await req.json()) as { amountCents?: number };
  const amountCents = body.amountCents;

  if (!ALLOWED_AMOUNTS.includes(amountCents as ExtraUsageCents)) {
    return NextResponse.json(
      { error: `Invalid amount. Must be one of: ${ALLOWED_AMOUNTS.join(", ")} cents.` },
      { status: 400 },
    );
  }

  const priceId = getPriceId(amountCents as ExtraUsageCents);
  if (!priceId) {
    return NextResponse.json(
      { error: "Extra usage price not configured for this amount" },
      { status: 500 },
    );
  }

  const origin = getAuthBaseUrl();
  const existingCustomerId = await getStripeCustomerId(session.user.id);

  const checkoutSession = await getStripe().checkout.sessions.create({
    mode: "payment",
    customer: existingCustomerId ?? undefined,
    customer_email: existingCustomerId ? undefined : session.user.email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/dashboard/profile?extraUsage=success`,
    cancel_url: `${origin}/dashboard/profile?extraUsage=canceled`,
    metadata: {
      userId: session.user.id,
      extraUsageCents: String(amountCents),
    },
  });

  return NextResponse.json({
    sessionId: checkoutSession.id,
    url: checkoutSession.url,
  });
}
