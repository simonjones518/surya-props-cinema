import { useCallback, useEffect, useState } from "react";

export type WishlistLine = { prop_id: number; title: string; quantity: number };

const KEY = "scp-shoot-wishlist";
const EVENT = "scp-wishlist-change";

function read(): WishlistLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as WishlistLine[]) : [];
  } catch {
    return [];
  }
}

function write(lines: WishlistLine[]) {
  window.localStorage.setItem(KEY, JSON.stringify(lines));
  window.dispatchEvent(new Event(EVENT));
}

/** Shoot wishlist / cart persisted per browser — works for guests too. */
export function useWishlist() {
  const [lines, setLines] = useState<WishlistLine[]>([]);

  useEffect(() => {
    const sync = () => setLines(read());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const add = useCallback((prop_id: number, title: string) => {
    const current = read();
    const existing = current.find((l) => l.prop_id === prop_id);
    write(
      existing
        ? current.map((l) => (l.prop_id === prop_id ? { ...l, quantity: l.quantity + 1 } : l))
        : [...current, { prop_id, title, quantity: 1 }],
    );
  }, []);

  const setQuantity = useCallback((prop_id: number, quantity: number) => {
    write(
      read().map((l) =>
        l.prop_id === prop_id ? { ...l, quantity: Math.max(1, Math.min(99, quantity)) } : l,
      ),
    );
  }, []);

  const remove = useCallback((prop_id: number) => {
    write(read().filter((l) => l.prop_id !== prop_id));
  }, []);

  const clear = useCallback(() => write([]), []);

  return { lines, add, setQuantity, remove, clear, count: lines.length };
}
