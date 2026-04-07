/**
 * Dev database seed script.
 * Clears all data and inserts 4 test users with events and bird sightings.
 * Usage: npx tsx scripts/seed.ts
 */
import "dotenv/config";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import path from "path";
import * as schema from "../src/db/schema";

const DB_PATH =
  process.env.DATABASE_URL ?? path.join(process.cwd(), "bird-cage.db");

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

const db = drizzle(sqlite, { schema });

// Run migrations first to ensure schema is up-to-date
migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });

const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET ?? "seed-secret-not-for-production",
  database: drizzleAdapter(db, { provider: "sqlite" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: false,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "placeholder",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "placeholder",
    },
  },
});

const SEED_PASSWORD = "password1234";

const USERS = [
  {
    name: "Alice Wren",
    email: "bbbove20.dev+Test1@gmail.com",
    role: "admin",
    email_verified: true,
  },
  {
    name: "Bob Finch",
    email: "bbbove20.dev+Test2@gmail.com",
    role: "user",
    email_verified: true,
  },
  {
    name: "Carol Hawk",
    email: "carol@example.com",
    role: "user",
    email_verified: true,
  },
  {
    name: "David Crane",
    email: "david@example.com",
    role: "user",
    email_verified: false,
  },
];

const EVENTS_BY_USER: Record<
  string,
  {
    title: string;
    date: string;
    notes?: string;
    birds: {
      type: string;
      species: string;
      locationName: string;
      lat?: number;
      lng?: number;
      dateStamp: string;
      notes?: string;
    }[];
  }[]
> = {
  "bbbove20.dev+Test1@gmail.com": [
    {
      title: "Morning Wetlands Walk",
      date: "2026-03-01",
      notes: "Clear skies, light breeze",
      birds: [
        {
          type: "Wading Bird",
          species: "Great Blue Heron",
          locationName: "Riverside Marsh",
          lat: 37.7749,
          lng: -122.4194,
          dateStamp: "2026-03-01",
          notes: "Stood motionless for 10 minutes before striking",
        },
        {
          type: "Waterfowl",
          species: "Mallard",
          locationName: "Riverside Marsh",
          lat: 37.7749,
          lng: -122.4194,
          dateStamp: "2026-03-01",
        },
        {
          type: "Shorebird",
          species: "Killdeer",
          locationName: "Mudflats near parking lot",
          dateStamp: "2026-03-01",
          notes: "Distraction display observed",
        },
      ],
    },
    {
      title: "Backyard Feeder Watch",
      date: "2026-03-05",
      birds: [
        {
          type: "Songbird",
          species: "American Goldfinch",
          locationName: "Backyard feeder",
          dateStamp: "2026-03-05",
        },
        {
          type: "Songbird",
          species: "Black-capped Chickadee",
          locationName: "Backyard feeder",
          dateStamp: "2026-03-05",
          notes: "Frequent visitor throughout the morning",
        },
      ],
    },
  ],
  "bbbove20.dev+Test2@gmail.com": [
    {
      title: "Forest Trail Hike",
      date: "2026-02-20",
      notes: "Overcast but mild",
      birds: [
        {
          type: "Raptor",
          species: "Red-tailed Hawk",
          locationName: "Pine Ridge Trail",
          lat: 37.8044,
          lng: -122.2712,
          dateStamp: "2026-02-20",
          notes: "Perched high in a dead snag",
        },
        {
          type: "Woodpecker",
          species: "Downy Woodpecker",
          locationName: "Oak grove near creek",
          dateStamp: "2026-02-20",
        },
        {
          type: "Songbird",
          species: "Dark-eyed Junco",
          locationName: "Trailhead",
          dateStamp: "2026-02-20",
        },
      ],
    },
    {
      title: "Lake Shore Survey",
      date: "2026-03-08",
      birds: [
        {
          type: "Waterfowl",
          species: "Canada Goose",
          locationName: "Lakeview Park",
          lat: 37.8716,
          lng: -122.2727,
          dateStamp: "2026-03-08",
        },
        {
          type: "Gull",
          species: "Ring-billed Gull",
          locationName: "Lakeview Park pier",
          lat: 37.8716,
          lng: -122.2727,
          dateStamp: "2026-03-08",
          notes: "Large flock of about 30",
        },
      ],
    },
  ],
  "carol@example.com": [
    {
      title: "Coastal Cliffs Walk",
      date: "2026-02-15",
      notes: "Windy, spectacular views",
      birds: [
        {
          type: "Seabird",
          species: "Brandt's Cormorant",
          locationName: "Seal Rock",
          lat: 37.7717,
          lng: -122.5132,
          dateStamp: "2026-02-15",
          notes: "Colony of about 200 nesting birds",
        },
        {
          type: "Seabird",
          species: "Common Murre",
          locationName: "Seal Rock",
          lat: 37.7717,
          lng: -122.5132,
          dateStamp: "2026-02-15",
        },
        {
          type: "Raptor",
          species: "Peregrine Falcon",
          locationName: "Cliff edge overlook",
          dateStamp: "2026-02-15",
          notes: "Stooping on a pigeon at high speed",
        },
      ],
    },
    {
      title: "City Park Lunch Break",
      date: "2026-03-10",
      birds: [
        {
          type: "Pigeon",
          species: "Rock Pigeon",
          locationName: "Main Square fountain",
          dateStamp: "2026-03-10",
        },
        {
          type: "Songbird",
          species: "House Sparrow",
          locationName: "Cafe outdoor seating",
          dateStamp: "2026-03-10",
          notes: "Bold individuals begging for crumbs",
        },
      ],
    },
  ],
  "david@example.com": [
    {
      title: "Desert Scrub Birding",
      date: "2026-02-28",
      notes: "Sunny, 72F, excellent conditions",
      birds: [
        {
          type: "Songbird",
          species: "Cactus Wren",
          locationName: "Chaparral Trail",
          lat: 33.4484,
          lng: -112.074,
          dateStamp: "2026-02-28",
          notes: "State bird of Arizona, very vocal",
        },
        {
          type: "Raptor",
          species: "Harris's Hawk",
          locationName: "Saguaro ridge",
          lat: 33.4484,
          lng: -112.074,
          dateStamp: "2026-02-28",
          notes: "Pack hunting pair observed",
        },
        {
          type: "Songbird",
          species: "Verdin",
          locationName: "Palo verde stand",
          dateStamp: "2026-02-28",
        },
      ],
    },
    {
      title: "Riparian Corridor Survey",
      date: "2026-03-06",
      birds: [
        {
          type: "Hummingbird",
          species: "Costa's Hummingbird",
          locationName: "Desert wash",
          lat: 33.5722,
          lng: -112.088,
          dateStamp: "2026-03-06",
          notes: "Male in full iridescent plumage",
        },
        {
          type: "Flycatcher",
          species: "Say's Phoebe",
          locationName: "Old adobe ruins",
          dateStamp: "2026-03-06",
        },
      ],
    },
  ],
};

async function clearData() {
  // Delete in dependency order (foreign keys enforced)
  db.delete(schema.birdEntries).run();
  db.delete(schema.birdingEvents).run();
  db.delete(schema.session).run();
  db.delete(schema.account).run();
  db.delete(schema.verification).run();
  db.delete(schema.user).run();
  console.log("Cleared all data");
}

async function seedUser(
  name: string,
  email: string,
  role: "user" | "admin",
  email_verified: boolean,
): Promise<string> {
  const response = await auth.api.signUpEmail({
    body: { name, email, password: SEED_PASSWORD },
  });
  if (!response?.user?.id) {
    throw new Error(`Failed to create user ${email}`);
  }

  await db
    .update(schema.user)
    .set({ role, emailVerified: email_verified })
    .where(eq(schema.user.id, response.user.id));

  return response.user.id;
}

async function seedEvents(userId: string, email: string) {
  const events = EVENTS_BY_USER[email];
  for (const event of events) {
    const [inserted] = await db
      .insert(schema.birdingEvents)
      .values({
        userId,
        title: event.title,
        date: event.date,
        notes: event.notes,
      })
      .returning({ id: schema.birdingEvents.id });

    if (event.birds.length > 0) {
      await db
        .insert(schema.birdEntries)
        .values(event.birds.map((bird) => ({ ...bird, eventId: inserted.id })));
    }
  }
}

async function main() {
  console.log("Starting seed...");
  await clearData();

  for (const { name, email, role, email_verified } of USERS) {
    const userId = await seedUser(
      name,
      email,
      role as "user" | "admin",
      email_verified,
    );
    await seedEvents(userId, email);

    console.log(`Seeded user: ${email}`);
  }

  console.log("Seed complete. All users have password:", SEED_PASSWORD);
  sqlite.close();
}

main().catch((err) => {
  console.error(err);
  sqlite.close();
  process.exit(1);
});
