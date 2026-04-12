"use client";

import { useRouter } from "next/navigation";
import styles from "./EventForm.module.css";
import BirdCard from "./BirdCard";
import { useEventForm } from "@/hooks/useEventForm";
import type { BirdEntry, BirdingEvent } from "@/db/schema";

interface InitialData {
  event: BirdingEvent;
  birds: BirdEntry[];
}

interface Props {
  initialData?: InitialData;
}

export default function EventForm({ initialData }: Props) {
  const router = useRouter();
  const form = useEventForm({
    initialData: initialData
      ? {
          event: {
            id: initialData.event.id,
            title: initialData.event.title,
            date: initialData.event.date,
            notes: initialData.event.notes ?? "",
          },
          birds: initialData.birds,
        }
      : undefined,
    onSuccess: () => {
      router.push("/dashboard");
      router.refresh();
    },
  });

  return (
    <form onSubmit={form.handleSubmit} className={styles.form}>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Event Details</h2>
        <div className={styles.field}>
          <label htmlFor="title" className={styles.label}>
            Title
          </label>
          <input
            id="title"
            type="text"
            value={form.title}
            onChange={(e) => form.setTitle(e.target.value)}
            className={styles.input}
            placeholder="e.g. Morning walk at the park"
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="date" className={styles.label}>
            Date
          </label>
          <input
            id="date"
            type="date"
            value={form.date}
            onChange={(e) => form.setDate(e.target.value)}
            className={styles.input}
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="notes" className={styles.label}>
            Notes
          </label>
          <textarea
            id="notes"
            value={form.notes}
            onChange={(e) => form.setNotes(e.target.value)}
            className={styles.textarea}
            rows={3}
            placeholder="Optional notes about the event"
          />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Bird Sightings</h2>
        {form.birdRecords.map((record, index) => (
          <BirdCard
            key={record.id}
            record={record}
            displayIndex={index}
            isEdit={form.isEdit}
            existingBirdId={initialData?.birds[index]?.id}
            eventId={initialData?.event.id}
            onFieldChange={(field, value) =>
              form.updateBirdField(record.id, field, value)
            }
            onRemove={() => form.removeBird(record.id)}
            onPhotoFile={(file) => form.handlePhotoFile(record.id, file)}
            onPhotoError={(msg) => form.handlePhotoError(record.id, msg)}
            onUseLocation={() => form.handleUseLocation(record.id)}
            onIdentified={(result) => form.handleIdentified(record.id, result)}
          />
        ))}

        <button type="button" onClick={form.addBird} className={styles.addBirdBtn}>
          + Add Bird
        </button>
      </section>

      {form.error && <p className={styles.error}>{form.error}</p>}

      <div className={styles.actions}>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className={styles.cancelBtn}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={form.saving}
          className={styles.saveBtn}
        >
          {form.saving ? "Saving…" : form.isEdit ? "Save Changes" : "Save Event"}
        </button>
      </div>
    </form>
  );
}
