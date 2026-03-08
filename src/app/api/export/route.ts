import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db, initDb } from "@/db";
import { birdingEvents, birdEntries } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateCsv } from "@/lib/csv";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  initDb();

  const events = await db
    .select()
    .from(birdingEvents)
    .where(eq(birdingEvents.userId, session.id))
    .orderBy(birdingEvents.date);

  const birds = await db.select().from(birdEntries);

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
