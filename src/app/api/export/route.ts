import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../lib/auth";
import { db } from "../../../db";
import { birdingEvents, birdEntries } from "../../../db/schema";
import { eq, inArray } from "drizzle-orm";
import { generateCsv } from "../../../lib/csv";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const events = await db
    .select()
    .from(birdingEvents)
    .where(eq(birdingEvents.userId, session.user.id))
    .orderBy(birdingEvents.date);

  const eventIds = events.map((e) => e.id);
  const birds =
    eventIds.length > 0
      ? await db
          .select()
          .from(birdEntries)
          .where(inArray(birdEntries.eventId, eventIds))
      : [];

  const eventsWithBirds = events.map((event) => ({
    ...event,
    birds: birds.filter((b) => b.eventId === event.id),
  }));

  const csv = generateCsv(eventsWithBirds);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="birding-export.csv"',
    },
  });
}
