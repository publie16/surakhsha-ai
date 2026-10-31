"use client";

import { useState, useEffect, useRef } from "react";
import { Search, MapPin, Loader2, X } from "lucide-react";
import type { PlaceResult, Coordinates } from "@/lib/types";

interface PlaceSearchProps {
  label: string;
  placeholder: string;
  iconColor?: string;
  value: string;
  onSelect: (coords: Coordinates, displayName: string) => void;
  onClear?: () => void;
  isActive?: boolean;
  onFocus?: () => void;
}

export default function PlaceSearch({
  label,
  placeholder,
  iconColor = "text-copper",
  value,
  onSelect,
  onClear,
  isActive = false,
  onFocus,
}: PlaceSearchProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync internal input when external value changes
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query || query.trim().length < 2 || query === value) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data: PlaceResult[] = await res.json();
          setResults(data);
          setIsOpen(true);
        }
      } catch (err) {
        console.error("Geocoding error:", err);
      } finally {
        setIsLoading(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [query, value]);

  const handleSelect = (place: PlaceResult) => {
    const lat = parseFloat(place.lat);
    const lng = parseFloat(place.lon);
    setQuery(place.display_name);
    setIsOpen(false);
    onSelect({ lat, lng }, place.display_name);
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    if (onClear) onClear();
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex items-center justify-between mb-1.5 px-0.5">
        <label className="text-xs font-semibold text-cream/80 flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${iconColor.includes("safe") ? "bg-safe" : "bg-sos"}`} />
          {label}
        </label>
        {isActive && (
          <span className="text-[10px] text-terracotta bg-terracotta/20 px-2 py-0.5 rounded-full font-medium animate-pulse">
            Click map to set
          </span>
        )}
      </div>

      <div
        className={`relative flex items-center rounded-xl bg-surface border transition-all ${
          isActive
            ? "border-copper ring-2 ring-copper/30 shadow-sm"
            : "border-white/10 hover:border-white/20"
        }`}
      >
        <div className="pl-3.5 pr-2 pointer-events-none">
          <Search className={`w-4 h-4 ${iconColor}`} />
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (onFocus) onFocus();
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full py-2.5 pr-8 bg-transparent text-sm text-cream placeholder-cream-muted/50 focus:outline-none"
        />

        <div className="pr-3 flex items-center">
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-copper animate-spin" />
          ) : query ? (
            <button
              type="button"
              onClick={handleClear}
              className="text-cream-muted hover:text-cream p-0.5 rounded-full hover:bg-white/10"
              title="Clear"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Autocomplete dropdown */}
      {isOpen && results.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 mt-2 bg-surface-dark/95 backdrop-blur-xl border border-white/15 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
          {results.map((item) => (
            <li key={item.place_id}>
              <button
                type="button"
                onClick={() => handleSelect(item)}
                className="w-full text-left px-3.5 py-2.5 text-xs text-cream hover:bg-white/10 transition-colors flex items-start gap-2.5 border-b border-white/5 last:border-0"
              >
                <MapPin className="w-3.5 h-3.5 text-copper shrink-0 mt-0.5" />
                <span className="line-clamp-2 leading-relaxed">
                  {item.display_name}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
