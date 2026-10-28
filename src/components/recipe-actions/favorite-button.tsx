import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { setFavoriteFn } from "~/server/favorites.functions";

// Heart toggle on the recipe page. Shown only to signed-in users (as in legacy).
export function FavoriteButton({ recipeId, isFavorite, signedIn }: { recipeId: string; isFavorite: boolean; signedIn: boolean }) {
  const router = useRouter();
  const setFavorite = useServerFn(setFavoriteFn);
  const [optimistic, setOptimistic] = useState(isFavorite);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => setOptimistic(isFavorite), [isFavorite]);

  if (!signedIn) return null;

  async function toggle() {
    const next = !optimistic;
    setOptimistic(next);
    setSaving(true);
    setFailed(false);
    try {
      await setFavorite({ data: { recipeId, favorite: next } });
      await router.invalidate();
    } catch {
      setOptimistic(!next);
      setFailed(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={saving}
      aria-pressed={optimistic}
      className="text-md flex items-center gap-1 text-zinc-900"
    >
      <HeartIcon filled={optimistic} />
      <span>{saving ? "saving..." : optimistic ? "Unfavorite" : "Favorite"}</span>
      {failed ? <span className="text-red-600" role="alert">Couldn’t save</span> : null}
    </button>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
      <path d="M12 21s-7.5-4.6-9.5-9.2C1.1 8.4 3.3 5 6.8 5c2 0 3.4 1.1 4.2 2.4h2C13.8 6.1 15.2 5 17.2 5c3.5 0 5.7 3.4 4.3 6.8C19.5 16.4 12 21 12 21z" />
    </svg>
  );
}
