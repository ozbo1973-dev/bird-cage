"use client";

import { useState } from "react";

export interface UseGeoLocationOptions {
  onFill: (lat: string, lng: string) => void;
}

/** Returns true when both lat and lng are empty — the default fill guard. */
export function defaultShouldFill(lat: string, lng: string): boolean {
  return lat === "" && lng === "";
}

export function useGeoLocation(options: UseGeoLocationOptions): {
  loading: boolean;
  error: string;
  requestLocation: () => void;
} {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function requestLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    setLoading(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        options.onFill(
          String(position.coords.latitude),
          String(position.coords.longitude),
        );
        setLoading(false);
      },
      () => {
        setError("Unable to retrieve your location.");
        setLoading(false);
      },
    );
  }

  return { loading, error, requestLocation };
}
