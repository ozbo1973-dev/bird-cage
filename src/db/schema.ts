import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
});

export const birdingEvents = sqliteTable("birding_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  title: text("title").notNull(),
  date: text("date").notNull(),
  notes: text("notes"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const birdEntries = sqliteTable("bird_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  eventId: integer("event_id")
    .notNull()
    .references(() => birdingEvents.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  species: text("species").notNull(),
  locationName: text("location_name").notNull(),
  lat: real("lat"),
  lng: real("lng"),
  dateStamp: text("date_stamp").notNull(),
  notes: text("notes"),
});

export type User = typeof users.$inferSelect;
export type BirdingEvent = typeof birdingEvents.$inferSelect;
export type BirdEntry = typeof birdEntries.$inferSelect;
export type NewBirdingEvent = typeof birdingEvents.$inferInsert;
export type NewBirdEntry = typeof birdEntries.$inferInsert;
