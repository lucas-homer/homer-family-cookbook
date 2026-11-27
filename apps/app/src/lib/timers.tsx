import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import * as React from "react";
import { Platform } from "react-native";

// Cook-mode timers. Several can run at once, across recipes. Each running
// timer has a local notification scheduled for when it ends, so it goes off
// on the lock screen (and on an Apple Watch, which mirrors the phone's
// notifications) even when the app is closed. The list is saved on the
// device, so timers survive the app being quit.
//
// Later, in a native build: AlarmKit countdowns and a Live Activity.

export type Timer = {
  id: string;
  label: string;
  recipeId?: string;
  recipeTitle?: string;
  /** Length when started, in seconds (+1 min adds to it). */
  total: number;
  /** When it ends, in ms since epoch. Null while paused. */
  endsAt: number | null;
  /** Seconds left while paused. */
  remaining: number;
  notificationId?: string;
};

type TimersState = {
  timers: Timer[];
  start: (t: { label: string; seconds: number; recipeId?: string; recipeTitle?: string }) => Promise<void>;
  pause: (id: string) => void;
  resume: (id: string) => void;
  addMinute: (id: string) => void;
  end: (id: string) => void;
};

const KEY = "hfc.timers";
const native = Platform.OS !== "web";
const Ctx = React.createContext<TimersState | null>(null);

if (native) {
  // Show the alert and play the sound when a timer ends while the app is open, too.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }),
  });
}

/** Seconds left on a timer at `now`. 0 once it has gone off. */
export function secondsLeft(t: Timer, now: number) {
  return t.endsAt === null ? t.remaining : Math.max(0, Math.ceil((t.endsAt - now) / 1000));
}

async function canNotify() {
  if (!native) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
  return asked.granted;
}

async function schedule(t: Timer, seconds: number) {
  if (!native || seconds <= 0 || !(await canNotify())) return undefined;
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: `${t.label} is done`,
        body: t.recipeTitle ?? "Timer",
        sound: "default",
        interruptionLevel: "timeSensitive",
        data: { timerId: t.id, recipeId: t.recipeId },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.max(1, Math.round(seconds)) },
    });
  } catch {
    return undefined;
  }
}

function unschedule(t: Timer) {
  if (native && t.notificationId) void Notifications.cancelScheduledNotificationAsync(t.notificationId).catch(() => {});
}

export function TimersProvider({ children }: { children: React.ReactNode }) {
  const [timers, setTimers] = React.useState<Timer[]>([]);
  const ref = React.useRef(timers);

  React.useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((value) => {
        if (!value) return;
        const saved = JSON.parse(value) as Timer[];
        // Drop timers that ended more than an hour ago.
        const fresh = saved.filter((t) => t.endsAt === null || t.endsAt > Date.now() - 60 * 60 * 1000);
        ref.current = fresh;
        setTimers(fresh);
      })
      .catch(() => {});
  }, []);

  const save = React.useCallback((next: Timer[]) => {
    ref.current = next;
    setTimers(next);
    void AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const patch = React.useCallback(
    (id: string, change: (t: Timer) => Timer) => save(ref.current.map((t) => (t.id === id ? change(t) : t))),
    [save],
  );

  const value = React.useMemo<TimersState>(
    () => ({
      timers,
      start: async ({ label, seconds, recipeId, recipeTitle }) => {
        const t: Timer = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          label,
          recipeId,
          recipeTitle,
          total: seconds,
          endsAt: Date.now() + seconds * 1000,
          remaining: seconds,
        };
        save([...ref.current, t]);
        const notificationId = await schedule(t, seconds);
        if (notificationId) patch(t.id, (x) => ({ ...x, notificationId }));
      },
      pause: (id) =>
        patch(id, (t) => {
          unschedule(t);
          return { ...t, remaining: secondsLeft(t, Date.now()), endsAt: null, notificationId: undefined };
        }),
      resume: (id) => {
        const t = ref.current.find((x) => x.id === id);
        if (!t || t.endsAt !== null) return;
        patch(id, (x) => ({ ...x, endsAt: Date.now() + x.remaining * 1000 }));
        void schedule(t, t.remaining).then((notificationId) => notificationId && patch(id, (x) => ({ ...x, notificationId })));
      },
      addMinute: (id) => {
        const t = ref.current.find((x) => x.id === id);
        if (!t) return;
        unschedule(t);
        const now = Date.now();
        const left = secondsLeft(t, now) + 60;
        const next: Timer =
          t.endsAt === null
            ? { ...t, remaining: left, total: t.total + 60, notificationId: undefined }
            : { ...t, endsAt: now + left * 1000, total: t.total + 60, notificationId: undefined };
        patch(id, () => next);
        if (next.endsAt !== null) void schedule(next, left).then((notificationId) => notificationId && patch(id, (x) => ({ ...x, notificationId })));
      },
      end: (id) => {
        const t = ref.current.find((x) => x.id === id);
        if (t) unschedule(t);
        save(ref.current.filter((x) => x.id !== id));
      },
    }),
    [timers, save, patch],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTimers() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useTimers must be used inside TimersProvider");
  return ctx;
}

/** The current time, updated every second while `active`. For countdowns. */
export function useNow(active = true) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}
