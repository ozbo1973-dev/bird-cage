/**
 * TDD tests for billing DAL functions.
 * Uses a real SQLite file DB (not :memory:) to avoid libSQL pool isolation issues.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import type { Client } from "@libsql/client";
import fs from "fs";

const testState = vi.hoisted(() => ({
  client: null as Client | null,
  dbPath: `/tmp/bird-cage-billing-dal-test-${process.pid}-${Date.now()}.db`,
}));

vi.mock("@/db", async () => {
  const { createClient } = await import("@libsql/client");
  const { drizzle } = await import("drizzle-orm/libsql");
  const schema = await import("@/db/schema");

  const client = createClient({ url: `file:${testState.dbPath}` });
  testState.client = client;
  const db = drizzle(client, { schema });
  return { db, getDb: () => db };
});

import {
  logUsage,
  getCurrentMonthUsage,
  isLimitReached,
  isProAllowanceReached,
  addExtraUsage,
  updateSubscriptionStatus,
  getStripeCustomerId,
  setStripeCustomerId,
  setStripeSubscriptionId,
  resetMonthlyUsage,
  getBillingInfo,
  activateSubscription,
  cancelSubscriptionByCustomerId,
  scheduleCancellation,
  reactivateSubscription,
  PRO_LIMIT_CENTS,
} from "@/lib/dal/billing";

const USER_ID = "billing-test-user-001";
const USER_ID_2 = "billing-test-user-002";

// ── Schema setup ──────────────────────────────────────────────────────────────
beforeAll(async () => {
  const c = testState.client!;

  await c.execute("PRAGMA foreign_keys = ON");

  await c.execute(`
    CREATE TABLE IF NOT EXISTS "user" (
      id                          text    PRIMARY KEY NOT NULL,
      name                        text    NOT NULL DEFAULT '',
      email                       text    NOT NULL UNIQUE,
      email_verified              integer DEFAULT 0 NOT NULL,
      image                       text,
      role                        text    DEFAULT 'user' NOT NULL,
      billing_plan                text    NOT NULL DEFAULT 'free',
      stripe_customer_id          text    UNIQUE,
      stripe_subscription_id      text,
      subscription_status         text,
      spending_limit_cents        integer,
      current_month_usage_cents   integer NOT NULL DEFAULT 0,
      extra_usage_cents           integer NOT NULL DEFAULT 0,
      cancel_at_period_end        integer NOT NULL DEFAULT 0,
      current_period_end          integer,
      fragment_millicents         integer NOT NULL DEFAULT 0,
      created_at                  integer NOT NULL DEFAULT 0,
      updated_at                  integer NOT NULL DEFAULT 0
    )
  `);

  await c.execute(`
    CREATE TABLE IF NOT EXISTS usage_logs (
      id           integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      user_id      text    NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      model_used       text    NOT NULL,
      cost_cents       integer NOT NULL DEFAULT 0,
      cost_millicents  integer NOT NULL DEFAULT 0,
      created_at       integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
    )
  `);

  await c.execute(`
    CREATE INDEX IF NOT EXISTS usage_logs_userId_createdAt_idx
    ON usage_logs (user_id, created_at)
  `);

  // Seed test users (paid plan so isLimitReached/isProAllowanceReached apply)
  await c.execute({
    sql: `INSERT INTO "user" (id, name, email, email_verified, billing_plan, created_at, updated_at)
          VALUES (?, 'Billing User', 'billing@example.com', 1, 'paid', 0, 0)`,
    args: [USER_ID],
  });
  await c.execute({
    sql: `INSERT INTO "user" (id, name, email, email_verified, billing_plan, created_at, updated_at)
          VALUES (?, 'Billing User 2', 'billing2@example.com', 1, 'paid', 0, 0)`,
    args: [USER_ID_2],
  });
});

afterAll(() => {
  for (const ext of ["", "-wal", "-shm"]) {
    try {
      fs.unlinkSync(`${testState.dbPath}${ext}`);
    } catch {
      // file may not exist
    }
  }
});

// Reset usage/stripe columns between tests
beforeEach(async () => {
  const c = testState.client!;
  await c.execute("DELETE FROM usage_logs");
  await c.execute({
    sql: `UPDATE "user" SET
            current_month_usage_cents = 0,
            extra_usage_cents = 0,
            stripe_customer_id = NULL,
            stripe_subscription_id = NULL,
            subscription_status = NULL,
            billing_plan = 'paid',
            cancel_at_period_end = 0,
            current_period_end = NULL,
            fragment_millicents = 0
          WHERE id IN (?, ?)`,
    args: [USER_ID, USER_ID_2],
  });
});

// ── PRO_LIMIT_CENTS constant ──────────────────────────────────────────────────
describe("PRO_LIMIT_CENTS", () => {
  it("is 400 (representing $4.00)", () => {
    expect(PRO_LIMIT_CENTS).toBe(400);
  });
});

// ── logUsage ──────────────────────────────────────────────────────────────────
describe("logUsage", () => {
  it("inserts a usage log entry", async () => {
    await logUsage(USER_ID, "openrouter/auto", 10, 0);

    const rows = await testState.client!.execute({
      sql: `SELECT user_id, model_used, cost_cents FROM usage_logs WHERE user_id = ?`,
      args: [USER_ID],
    });
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0][0]).toBe(USER_ID);
    expect(rows.rows[0][1]).toBe("openrouter/auto");
    expect(rows.rows[0][2]).toBe(10);
  });

  it("also increments current_month_usage_cents on the user", async () => {
    await logUsage(USER_ID, "openrouter/auto", 25, 0);

    const rows = await testState.client!.execute({
      sql: `SELECT current_month_usage_cents FROM "user" WHERE id = ?`,
      args: [USER_ID],
    });
    expect(rows.rows[0][0]).toBe(25);
  });

  it("accumulates multiple usage entries", async () => {
    await logUsage(USER_ID, "openrouter/auto", 10, 0);
    await logUsage(USER_ID, "openrouter/openai/gpt-4o", 20, 0);

    const rows = await testState.client!.execute({
      sql: `SELECT current_month_usage_cents FROM "user" WHERE id = ?`,
      args: [USER_ID],
    });
    expect(rows.rows[0][0]).toBe(30);
  });

  it("does not affect other users", async () => {
    await logUsage(USER_ID, "openrouter/auto", 50, 0);

    const rows = await testState.client!.execute({
      sql: `SELECT current_month_usage_cents FROM "user" WHERE id = ?`,
      args: [USER_ID_2],
    });
    expect(rows.rows[0][0]).toBe(0);
  });

  it("records cost_millicents in the usage_logs row", async () => {
    await logUsage(USER_ID, "openrouter/auto", 0, 400);

    const rows = await testState.client!.execute({
      sql: `SELECT cost_cents, cost_millicents FROM usage_logs WHERE user_id = ?`,
      args: [USER_ID],
    });
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0][0]).toBe(0);
    expect(rows.rows[0][1]).toBe(400);
  });

  it("accumulates fragment_millicents atomically — 3 calls × 400 millicents promotes 1 cent on 3rd call", async () => {
    await logUsage(USER_ID, "openrouter/auto", 0, 400);
    await logUsage(USER_ID, "openrouter/auto", 0, 400);

    const afterTwo = await testState.client!.execute({
      sql: `SELECT current_month_usage_cents, fragment_millicents FROM "user" WHERE id = ?`,
      args: [USER_ID],
    });
    expect(afterTwo.rows[0][0]).toBe(0);
    expect(afterTwo.rows[0][1]).toBe(800);

    await logUsage(USER_ID, "openrouter/auto", 0, 400);

    const afterThree = await testState.client!.execute({
      sql: `SELECT current_month_usage_cents, fragment_millicents FROM "user" WHERE id = ?`,
      args: [USER_ID],
    });
    expect(afterThree.rows[0][0]).toBe(1);
    expect(afterThree.rows[0][1]).toBe(200);
  });

  it("makes no DB call when both wholeCents and remainderMillicents are 0", async () => {
    await logUsage(USER_ID, "openrouter/auto", 0, 0);

    const rows = await testState.client!.execute({
      sql: `SELECT COUNT(*) FROM usage_logs WHERE user_id = ?`,
      args: [USER_ID],
    });
    expect(rows.rows[0][0]).toBe(0);
  });
});

// ── getCurrentMonthUsage ──────────────────────────────────────────────────────
describe("getCurrentMonthUsage", () => {
  it("returns 0 when no usage has been logged", async () => {
    const usage = await getCurrentMonthUsage(USER_ID);
    expect(usage).toBe(0);
  });

  it("returns the current month usage in cents", async () => {
    await logUsage(USER_ID, "openrouter/auto", 42, 0);

    const usage = await getCurrentMonthUsage(USER_ID);
    expect(usage).toBe(42);
  });

  it("returns 0 for an unknown user", async () => {
    const usage = await getCurrentMonthUsage("non-existent-user");
    expect(usage).toBe(0);
  });
});

// ── isLimitReached ────────────────────────────────────────────────────────────
describe("isLimitReached", () => {
  it("returns false when usage is below the $4 Pro limit (no extra usage)", async () => {
    await logUsage(USER_ID, "openrouter/auto", 399, 0);

    const reached = await isLimitReached(USER_ID);
    expect(reached).toBe(false);
  });

  it("returns true when usage equals the $4 Pro limit (no extra usage)", async () => {
    await logUsage(USER_ID, "openrouter/auto", 400, 0);

    const reached = await isLimitReached(USER_ID);
    expect(reached).toBe(true);
  });

  it("returns true when usage exceeds the $4 Pro limit (no extra usage)", async () => {
    await logUsage(USER_ID, "openrouter/auto", 450, 0);

    const reached = await isLimitReached(USER_ID);
    expect(reached).toBe(true);
  });

  it("returns false when usage exceeds $4 but extra usage covers it", async () => {
    await logUsage(USER_ID, "openrouter/auto", 450, 0);
    await addExtraUsage(USER_ID, 200); // $2 extra

    const reached = await isLimitReached(USER_ID);
    expect(reached).toBe(false);
  });

  it("returns true when usage exhausts both $4 Pro limit and extra usage", async () => {
    await addExtraUsage(USER_ID, 200); // $2 extra
    await logUsage(USER_ID, "openrouter/auto", 600, 0); // usage >= 400 + 200

    const reached = await isLimitReached(USER_ID);
    expect(reached).toBe(true);
  });

  it("returns false when usage equals exactly $4 + extra usage (still within limit)", async () => {
    await addExtraUsage(USER_ID, 200); // $2 extra = total $6 budget
    await logUsage(USER_ID, "openrouter/auto", 599, 0); // just under $6

    const reached = await isLimitReached(USER_ID);
    expect(reached).toBe(false);
  });

  it("returns false for unknown user", async () => {
    const reached = await isLimitReached("non-existent-user");
    expect(reached).toBe(false);
  });
});

// ── isProAllowanceReached ─────────────────────────────────────────────────────
describe("isProAllowanceReached", () => {
  it("returns false when usage is below $4", async () => {
    await logUsage(USER_ID, "openrouter/auto", 399, 0);
    expect(await isProAllowanceReached(USER_ID)).toBe(false);
  });

  it("returns true when usage reaches $4 even with extra usage remaining", async () => {
    await addExtraUsage(USER_ID, 1000);
    await logUsage(USER_ID, "openrouter/auto", 400, 0);
    expect(await isProAllowanceReached(USER_ID)).toBe(true);
  });

  it("returns false for unknown user", async () => {
    expect(await isProAllowanceReached("non-existent-user")).toBe(false);
  });
});

// ── addExtraUsage ─────────────────────────────────────────────────────────────
describe("addExtraUsage", () => {
  it("adds extra_usage_cents to a user", async () => {
    await addExtraUsage(USER_ID, 200);

    const rows = await testState.client!.execute({
      sql: `SELECT extra_usage_cents FROM "user" WHERE id = ?`,
      args: [USER_ID],
    });
    expect(rows.rows[0][0]).toBe(200);
  });

  it("accumulates multiple purchases", async () => {
    await addExtraUsage(USER_ID, 200);
    await addExtraUsage(USER_ID, 1000);

    const rows = await testState.client!.execute({
      sql: `SELECT extra_usage_cents FROM "user" WHERE id = ?`,
      args: [USER_ID],
    });
    expect(rows.rows[0][0]).toBe(1200);
  });

  it("does not affect other users", async () => {
    await addExtraUsage(USER_ID, 500);

    const rows = await testState.client!.execute({
      sql: `SELECT extra_usage_cents FROM "user" WHERE id = ?`,
      args: [USER_ID_2],
    });
    expect(rows.rows[0][0]).toBe(0);
  });
});

// ── updateSubscriptionStatus ──────────────────────────────────────────────────
describe("updateSubscriptionStatus", () => {
  it("sets subscription status to active", async () => {
    await updateSubscriptionStatus(USER_ID, "active");

    const rows = await testState.client!.execute({
      sql: `SELECT subscription_status FROM "user" WHERE id = ?`,
      args: [USER_ID],
    });
    expect(rows.rows[0][0]).toBe("active");
  });

  it("sets subscription status to canceled", async () => {
    await updateSubscriptionStatus(USER_ID, "canceled");

    const rows = await testState.client!.execute({
      sql: `SELECT subscription_status FROM "user" WHERE id = ?`,
      args: [USER_ID],
    });
    expect(rows.rows[0][0]).toBe("canceled");
  });

  it("sets subscription status to paused", async () => {
    await updateSubscriptionStatus(USER_ID, "paused");

    const rows = await testState.client!.execute({
      sql: `SELECT subscription_status FROM "user" WHERE id = ?`,
      args: [USER_ID],
    });
    expect(rows.rows[0][0]).toBe("paused");
  });
});

// ── setStripeCustomerId / getStripeCustomerId ─────────────────────────────────
describe("setStripeCustomerId and getStripeCustomerId", () => {
  it("saves and retrieves the stripe customer ID", async () => {
    await setStripeCustomerId(USER_ID, "cus_test123");

    const customerId = await getStripeCustomerId(USER_ID);
    expect(customerId).toBe("cus_test123");
  });

  it("returns null when no stripe customer ID is set", async () => {
    const customerId = await getStripeCustomerId(USER_ID);
    expect(customerId).toBeNull();
  });

  it("returns null for non-existent user", async () => {
    const customerId = await getStripeCustomerId("non-existent");
    expect(customerId).toBeNull();
  });
});

// ── setStripeSubscriptionId ───────────────────────────────────────────────────
describe("setStripeSubscriptionId", () => {
  it("saves the stripe subscription ID", async () => {
    await setStripeSubscriptionId(USER_ID, "sub_test456");

    const rows = await testState.client!.execute({
      sql: `SELECT stripe_subscription_id FROM "user" WHERE id = ?`,
      args: [USER_ID],
    });
    expect(rows.rows[0][0]).toBe("sub_test456");
  });
});

// ── resetMonthlyUsage ─────────────────────────────────────────────────────────
describe("resetMonthlyUsage", () => {
  it("resets current_month_usage_cents to 0", async () => {
    await logUsage(USER_ID, "openrouter/auto", 200, 0);
    await resetMonthlyUsage(USER_ID);

    const rows = await testState.client!.execute({
      sql: `SELECT current_month_usage_cents FROM "user" WHERE id = ?`,
      args: [USER_ID],
    });
    expect(rows.rows[0][0]).toBe(0);
  });

  it("preserves extra_usage_cents on reset (extra usage rolls over to next month)", async () => {
    await addExtraUsage(USER_ID, 1000);
    await resetMonthlyUsage(USER_ID);

    const rows = await testState.client!.execute({
      sql: `SELECT extra_usage_cents FROM "user" WHERE id = ?`,
      args: [USER_ID],
    });
    expect(rows.rows[0][0]).toBe(1000);
  });

  it("does not affect other users", async () => {
    await logUsage(USER_ID, "openrouter/auto", 100, 0);
    await logUsage(USER_ID_2, "openrouter/auto", 50, 0);
    await resetMonthlyUsage(USER_ID);

    const rows = await testState.client!.execute({
      sql: `SELECT current_month_usage_cents FROM "user" WHERE id = ?`,
      args: [USER_ID_2],
    });
    expect(rows.rows[0][0]).toBe(50);
  });

  it("stores updated currentPeriodEnd when provided", async () => {
    const periodEnd = 1800000000;
    await resetMonthlyUsage(USER_ID, periodEnd);

    const rows = await testState.client!.execute({
      sql: `SELECT current_period_end FROM "user" WHERE id = ?`,
      args: [USER_ID],
    });
    expect(rows.rows[0][0]).toBe(periodEnd);
  });

  it("does not change currentPeriodEnd when not provided", async () => {
    await testState.client!.execute({
      sql: `UPDATE "user" SET current_period_end = 1700000000 WHERE id = ?`,
      args: [USER_ID],
    });
    await resetMonthlyUsage(USER_ID);

    const rows = await testState.client!.execute({
      sql: `SELECT current_period_end FROM "user" WHERE id = ?`,
      args: [USER_ID],
    });
    expect(rows.rows[0][0]).toBe(1700000000);
  });

  it("resets fragment_millicents to 0 alongside current_month_usage_cents", async () => {
    await logUsage(USER_ID, "openrouter/auto", 0, 400);
    await resetMonthlyUsage(USER_ID);

    const rows = await testState.client!.execute({
      sql: `SELECT fragment_millicents FROM "user" WHERE id = ?`,
      args: [USER_ID],
    });
    expect(rows.rows[0][0]).toBe(0);
  });
});

// ── activateSubscription ──────────────────────────────────────────────────────
describe("activateSubscription", () => {
  it("sets billing_plan to paid, subscription status to active", async () => {
    await activateSubscription(USER_ID, "cus_act1", "sub_act1");

    const rows = await testState.client!.execute({
      sql: `SELECT billing_plan, subscription_status FROM "user" WHERE id = ?`,
      args: [USER_ID],
    });
    expect(rows.rows[0][0]).toBe("paid");
    expect(rows.rows[0][1]).toBe("active");
  });

  it("stores currentPeriodEnd when provided", async () => {
    const periodEnd = 1750000000;
    await activateSubscription(USER_ID, "cus_act2", "sub_act2", periodEnd);

    const rows = await testState.client!.execute({
      sql: `SELECT current_period_end, cancel_at_period_end FROM "user" WHERE id = ?`,
      args: [USER_ID],
    });
    expect(rows.rows[0][0]).toBe(periodEnd);
    expect(rows.rows[0][1]).toBe(0);
  });

  it("resets cancelAtPeriodEnd to false", async () => {
    await testState.client!.execute({
      sql: `UPDATE "user" SET cancel_at_period_end = 1 WHERE id = ?`,
      args: [USER_ID],
    });
    await activateSubscription(USER_ID, "cus_act3", "sub_act3");

    const rows = await testState.client!.execute({
      sql: `SELECT cancel_at_period_end FROM "user" WHERE id = ?`,
      args: [USER_ID],
    });
    expect(rows.rows[0][0]).toBe(0);
  });
});

// ── getBillingInfo (new fields) ───────────────────────────────────────────────
describe("getBillingInfo (new fields)", () => {
  it("returns cancelAtPeriodEnd=false and currentPeriodEnd=null by default", async () => {
    const info = await getBillingInfo(USER_ID);
    expect(info).not.toBeNull();
    expect(info!.cancelAtPeriodEnd).toBe(false);
    expect(info!.currentPeriodEnd).toBeNull();
  });

  it("returns cancelAtPeriodEnd=true when set", async () => {
    await testState.client!.execute({
      sql: `UPDATE "user" SET cancel_at_period_end = 1, current_period_end = 1800000000 WHERE id = ?`,
      args: [USER_ID],
    });
    const info = await getBillingInfo(USER_ID);
    expect(info!.cancelAtPeriodEnd).toBe(true);
    expect(info!.currentPeriodEnd).toBe(1800000000);
  });
});

// ── scheduleCancellation ──────────────────────────────────────────────────────
describe("scheduleCancellation", () => {
  it("sets cancelAtPeriodEnd=true, currentPeriodEnd, and subscriptionStatus=canceled", async () => {
    await setStripeCustomerId(USER_ID, "cus_sched1");
    const periodEnd = 1790000000;
    await scheduleCancellation("cus_sched1", periodEnd);

    const rows = await testState.client!.execute({
      sql: `SELECT cancel_at_period_end, current_period_end, subscription_status FROM "user" WHERE id = ?`,
      args: [USER_ID],
    });
    expect(rows.rows[0][0]).toBe(1);
    expect(rows.rows[0][1]).toBe(periodEnd);
    expect(rows.rows[0][2]).toBe("canceled");
  });

  it("only affects the user matching the stripeCustomerId", async () => {
    await setStripeCustomerId(USER_ID, "cus_sched2");
    await scheduleCancellation("cus_sched2", 1790000000);

    const rows = await testState.client!.execute({
      sql: `SELECT cancel_at_period_end FROM "user" WHERE id = ?`,
      args: [USER_ID_2],
    });
    expect(rows.rows[0][0]).toBe(0);
  });
});

// ── reactivateSubscription ────────────────────────────────────────────────────
describe("reactivateSubscription", () => {
  it("sets cancelAtPeriodEnd=false, updates currentPeriodEnd, and subscriptionStatus=active", async () => {
    await setStripeCustomerId(USER_ID, "cus_react1");
    await testState.client!.execute({
      sql: `UPDATE "user" SET cancel_at_period_end = 1, current_period_end = 1700000000, subscription_status = 'canceled' WHERE id = ?`,
      args: [USER_ID],
    });

    const newPeriodEnd = 1820000000;
    await reactivateSubscription("cus_react1", newPeriodEnd);

    const rows = await testState.client!.execute({
      sql: `SELECT cancel_at_period_end, current_period_end, subscription_status FROM "user" WHERE id = ?`,
      args: [USER_ID],
    });
    expect(rows.rows[0][0]).toBe(0);
    expect(rows.rows[0][1]).toBe(newPeriodEnd);
    expect(rows.rows[0][2]).toBe("active");
  });

  it("does NOT reset current month usage", async () => {
    await setStripeCustomerId(USER_ID, "cus_react2");
    await logUsage(USER_ID, "openrouter/auto", 150, 0);
    await reactivateSubscription("cus_react2", 1820000000);

    const rows = await testState.client!.execute({
      sql: `SELECT current_month_usage_cents FROM "user" WHERE id = ?`,
      args: [USER_ID],
    });
    expect(rows.rows[0][0]).toBe(150);
  });
});

// ── cancelSubscriptionByCustomerId (drain logic) ──────────────────────────────
describe("cancelSubscriptionByCustomerId (drain logic)", () => {
  it("flips billing_plan to free when extra_usage_cents is 0", async () => {
    await setStripeCustomerId(USER_ID, "cus_cancel1");
    await cancelSubscriptionByCustomerId("cus_cancel1");

    const rows = await testState.client!.execute({
      sql: `SELECT billing_plan, stripe_subscription_id FROM "user" WHERE id = ?`,
      args: [USER_ID],
    });
    expect(rows.rows[0][0]).toBe("free");
    expect(rows.rows[0][1]).toBeNull();
  });

  it("keeps billing_plan as paid (drain state) when extra_usage_cents > 0", async () => {
    await setStripeCustomerId(USER_ID, "cus_cancel2");
    await addExtraUsage(USER_ID, 500);
    await cancelSubscriptionByCustomerId("cus_cancel2");

    const rows = await testState.client!.execute({
      sql: `SELECT billing_plan, stripe_subscription_id FROM "user" WHERE id = ?`,
      args: [USER_ID],
    });
    expect(rows.rows[0][0]).toBe("paid");
    expect(rows.rows[0][1]).toBeNull();
  });

  it("always nulls stripeSubscriptionId and clears cancelAtPeriodEnd and currentPeriodEnd", async () => {
    await setStripeCustomerId(USER_ID, "cus_cancel3");
    await testState.client!.execute({
      sql: `UPDATE "user" SET stripe_subscription_id = 'sub_old', cancel_at_period_end = 1, current_period_end = 1700000000 WHERE id = ?`,
      args: [USER_ID],
    });
    await cancelSubscriptionByCustomerId("cus_cancel3");

    const rows = await testState.client!.execute({
      sql: `SELECT stripe_subscription_id, cancel_at_period_end, current_period_end FROM "user" WHERE id = ?`,
      args: [USER_ID],
    });
    expect(rows.rows[0][0]).toBeNull();
    expect(rows.rows[0][1]).toBe(0);
    expect(rows.rows[0][2]).toBeNull();
  });
});

// ── logUsage drain state flip ─────────────────────────────────────────────────
describe("logUsage drain state flip", () => {
  it("flips billing_plan to free when drain-state user hits the usage limit", async () => {
    // Drain state: subscription canceled, stripeSubscriptionId=null, extra_usage > 0
    await addExtraUsage(USER_ID, 100); // total budget = 400 + 100 = 500
    await testState.client!.execute({
      sql: `UPDATE "user" SET subscription_status = 'canceled' WHERE id = ?`,
      args: [USER_ID],
    });
    await logUsage(USER_ID, "openrouter/auto", 500, 0);

    const rows = await testState.client!.execute({
      sql: `SELECT billing_plan FROM "user" WHERE id = ?`,
      args: [USER_ID],
    });
    expect(rows.rows[0][0]).toBe("free");
  });

  it("does NOT flip billing_plan when active subscription user hits limit", async () => {
    // Active subscription: stripeSubscriptionId is set
    await setStripeSubscriptionId(USER_ID, "sub_active");
    await logUsage(USER_ID, "openrouter/auto", 500, 0);

    const rows = await testState.client!.execute({
      sql: `SELECT billing_plan FROM "user" WHERE id = ?`,
      args: [USER_ID],
    });
    expect(rows.rows[0][0]).toBe("paid");
  });

  it("does NOT flip billing_plan for drain-state user below limit", async () => {
    await addExtraUsage(USER_ID, 200); // budget = 400 + 200 = 600
    await testState.client!.execute({
      sql: `UPDATE "user" SET subscription_status = 'canceled' WHERE id = ?`,
      args: [USER_ID],
    });
    await logUsage(USER_ID, "openrouter/auto", 400, 0); // usage = 400, below 600

    const rows = await testState.client!.execute({
      sql: `SELECT billing_plan FROM "user" WHERE id = ?`,
      args: [USER_ID],
    });
    expect(rows.rows[0][0]).toBe("paid");
  });

  it("does NOT flip billing_plan for paid user with null subscriptionStatus", async () => {
    // User has no subscription set (fresh signup) — not drain state
    await addExtraUsage(USER_ID, 200);
    await logUsage(USER_ID, "openrouter/auto", 600, 0);

    const rows = await testState.client!.execute({
      sql: `SELECT billing_plan FROM "user" WHERE id = ?`,
      args: [USER_ID],
    });
    expect(rows.rows[0][0]).toBe("paid");
  });
});
