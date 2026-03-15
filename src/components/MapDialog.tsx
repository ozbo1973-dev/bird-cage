"use client";

import styles from "./MapDialog.module.css";

interface Props {
  open: boolean;
  lat: number;
  lng: number;
  label: string;
  onClose: () => void;
}

export default function MapDialog({ open, lat, lng, label, onClose }: Props) {
  if (!open) return null;

  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lng}`;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <dialog open className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>{label}</span>
          <button type="button" onClick={onClose} className={styles.closeBtn}>
            Close
          </button>
        </div>
        <iframe
          src={src}
          className={styles.map}
          title={`Map of ${label}`}
          loading="lazy"
        />
      </dialog>
    </div>
  );
}
