/**
 * Stripe Webhook endpoint
 *
 * Supported events:
 *   - invoice.payment_succeeded  → log one-time or MRR revenue
 *   - customer.subscription.updated / deleted → update integration cache
 *   - charge.refunded → log refund entry
 *
 * Setup:
 *   1. In Stripe Dashboard → Developers → Webhooks, add endpoint:
 *      https://your-indie-os/api/webhooks/stripe
 *   2. Add STRIPE_WEBHOOK_SECRET env var with the signing secret.
 *   3. Optionally add the Stripe project integration in indie-os and it will
 *      auto-associate revenue entries with that project.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { revenueEntries, integrations, appSettings } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createHmac } from "crypto";

// Minimal Stripe types (no SDK dependency)
interface StripeInvoice {
  id: string;
  amount_paid: number;
  currency: string;
  subscription: string | null;
  customer: string;
  lines: {
    data: { description: string | null; price: { recurring: { interval: string } | null } | null }[];
  };
  billing_reason: string | null;
  status: string;
}

interface StripeCharge {
  id: string;
  amount_refunded: number;
  currency: string;
  customer: string | null;
  description: string | null;
}

interface StripeEvent {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
}

/**
 * Verify Stripe webhook signature using the raw body and
 * STRIPE_WEBHOOK_SECRET. Returns true if valid.
 */
function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret: string
): boolean {
  const parts = Object.fromEntries(
    sigHeader.split(",").map((p) => p.split("=") as [string, string])
  );
  const timestamp = parts["t"];
  const v1 = parts["v1"];
  if (!timestamp || !v1) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const expectedSig = createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");

  // Timing-safe comparison (manual since Node timingSafeEqual needs Buffers)
  if (expectedSig.length !== v1.length) return false;
  let diff = 0;
  for (let i = 0; i < expectedSig.length; i++) {
    diff |= expectedSig.charCodeAt(i) ^ v1.charCodeAt(i);
  }
  return diff === 0;
}

async function findStripeProjectId(): Promise<number | null> {
  const integration = await db.query.integrations.findFirst({
    where: eq(integrations.type, "stripe"),
  });
  return integration?.projectId ?? null;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";

  // Get webhook secret from env or DB
  const webhookSecret =
    process.env.STRIPE_WEBHOOK_SECRET ??
    (
      await db.query.appSettings.findFirst({
        where: eq(appSettings.key, "stripe_webhook_secret"),
      })
    )?.value;

  if (webhookSecret) {
    if (!verifyStripeSignature(body, sig, webhookSecret)) {
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 400 }
      );
    }
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(body) as StripeEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const projectId = await findStripeProjectId();
  const today = new Date().toISOString().slice(0, 10);

  switch (event.type) {
    case "invoice.payment_succeeded": {
      const invoice = event.data.object as unknown as StripeInvoice;
      if (invoice.status !== "paid") break;

      const amountUSD = invoice.amount_paid / 100;
      const currency = invoice.currency.toUpperCase();

      // Determine type: MRR for recurring subscriptions, one_time otherwise
      const isRecurring =
        !!invoice.subscription ||
        invoice.billing_reason === "subscription_cycle" ||
        invoice.billing_reason === "subscription_create";

      const firstLine = invoice.lines.data[0];
      const description =
        firstLine?.description ??
        (isRecurring ? "Stripe MRR" : "Stripe payment");

      await db.insert(revenueEntries).values({
        projectId,
        amount: amountUSD,
        currency,
        type: isRecurring ? "mrr" : "one_time",
        source: "stripe",
        note: `${description} (${invoice.id})`,
        date: today,
      });
      break;
    }

    case "charge.refunded": {
      const charge = event.data.object as unknown as StripeCharge;
      if (charge.amount_refunded <= 0) break;

      await db.insert(revenueEntries).values({
        projectId,
        amount: -(charge.amount_refunded / 100),
        currency: charge.currency.toUpperCase(),
        type: "refund",
        source: "stripe",
        note: `Stripe refund (${charge.id})`,
        date: today,
      });
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      // Trigger a re-sync of the Stripe integration cache so MRR stays current
      const stripeIntegration = await db.query.integrations.findFirst({
        where: and(eq(integrations.type, "stripe"), eq(integrations.enabled, 1)),
      });
      if (stripeIntegration) {
        // Fire-and-forget background sync
        fetch(
          `${req.nextUrl.origin}/api/integrations/${stripeIntegration.id}/sync`,
          { method: "POST" }
        ).catch(() => {});
      }
      break;
    }

    default:
      // Unhandled event — return 200 to acknowledge receipt
      break;
  }

  return NextResponse.json({ received: true });
}
