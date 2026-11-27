import AsyncStorage from "@react-native-async-storage/async-storage";
import * as React from "react";

// What you're cooking right now: the recipe, the step you're on and the
// ingredients you've checked off. Saved on the device so it survives the app
// being closed mid-recipe. One recipe at a time for now.

const KEY = "hfc.cooking";

export type CookingSession = {
  recipeId: string;
  title: string;
  step: number;
  checked: string[];
  startedAt: number;
};

type CookingState = {
  session: CookingSession | null;
  /** Start cooking a recipe, or pick up where you left off if it's the one already cooking. */
  start: (recipeId: string, title: string) => void;
  update: (patch: Partial<Pick<CookingSession, "step" | "checked">>) => void;
  finish: () => void;
};

const Ctx = React.createContext<CookingState | null>(null);

// A session left for more than a day is stale: nobody is still cooking it.
const STALE_MS = 24 * 60 * 60 * 1000;

export function CookingProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<CookingSession | null>(null);

  React.useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((value) => {
        const saved = value ? (JSON.parse(value) as CookingSession) : null;
        if (saved && Date.now() - saved.startedAt < STALE_MS) setSession((s) => s ?? saved);
      })
      .catch(() => {});
  }, []);

  const save = React.useCallback((next: CookingSession | null) => {
    setSession(next);
    void (next ? AsyncStorage.setItem(KEY, JSON.stringify(next)) : AsyncStorage.removeItem(KEY)).catch(() => {});
  }, []);

  const value = React.useMemo<CookingState>(
    () => ({
      session,
      start: (recipeId, title) => {
        if (session?.recipeId === recipeId) return;
        save({ recipeId, title, step: 0, checked: [], startedAt: Date.now() });
      },
      update: (patch) => {
        if (session) save({ ...session, ...patch });
      },
      finish: () => save(null),
    }),
    [session, save],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCooking() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useCooking must be used inside CookingProvider");
  return ctx;
}
