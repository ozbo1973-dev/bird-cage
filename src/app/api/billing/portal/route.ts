import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { getAuthBaseUrl } from "@/lib/get-auth-base-url";
import { getStripeCustomerId } from "@/lib/dal/billing";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.emailVerified)
    return NextResponse.json({ error: "Email not verified" }, { status: 403 });

  const stripeCustomerId = await getStripeCustomerId(session.user.id);
  if (!stripeCustomerId) {
    return NextResponse.json(
      { error: "No Stripe subscription found" },
      { status: 404 },
    );
  }

  const origin = getAuthBaseUrl();

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${origin}/billing`,
  });

  return NextResponse.json({ url: portalSession.url });
}
