import { useQueryClient } from "@tanstack/react-query";
import * as SecureStore from "expo-secure-store";
import * as React from "react";
import { Platform } from "react-native";
import { api, ApiError, type User } from "./api";

// Who is signed in. The API token lives in the iOS Keychain (SecureStore).
// On web the app is served by the same Worker later; until then the token is
// kept in localStorage there.

const KEY = "hfc.session";

type Saved = { token: string; user: User };

const raw = {
  get: async (): Promise<string | null> => {
    if (Platform.OS === "web") return globalThis.localStorage?.getItem(KEY) ?? null;
    return SecureStore.getItemAsync(KEY);
  },
  set: async (value: string) => {
    if (Platform.OS === "web") return globalThis.localStorage?.setItem(KEY, value);
    await SecureStore.setItemAsync(KEY, value);
  },
  clear: async () => {
    if (Platform.OS === "web") return globalThis.localStorage?.removeItem(KEY);
    await SecureStore.deleteItemAsync(KEY);
  },
};

const store = {
  get: async (): Promise<Saved | null> => {
    try {
      const value = await raw.get();
      const saved = value ? (JSON.parse(value) as Saved) : null;
      return saved?.token && saved.user ? saved : null;
    } catch {
      return null;
    }
  },
  set: (saved: Saved) => raw.set(JSON.stringify(saved)),
  clear: raw.clear,
};

type AuthState = {
  /** false while the saved session is being read. */
  ready: boolean;
  token: string | null;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  /** Start using a session the API just issued (sign in, join). */
  adopt: (saved: Saved) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = React.createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = React.useState(false);
  const [session, setSession] = React.useState<Saved | null>(null);
  const client = useQueryClient();

  React.useEffect(() => {
    let live = true;
    (async () => {
      // The saved user is used straight away, so the app works offline in
      // the kitchen. Then /me confirms the token; only a 401 signs out.
      const saved = await store.get();
      if (!live) return;
      setSession(saved);
      setReady(true);
      if (!saved) return;
      try {
        const { user } = await api.me(saved.token);
        if (!live) return;
        const next = { token: saved.token, user };
        setSession(next);
        await store.set(next);
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          await store.clear();
          if (live) setSession(null);
        }
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  const value = React.useMemo<AuthState>(() => {
    const adopt = async (saved: Saved) => {
      await store.set(saved);
      setSession(saved);
    };
    return {
      ready,
      token: session?.token ?? null,
      user: session?.user ?? null,
      adopt,
      signIn: async (email, password) => {
        const res = await api.signIn(email, password);
        await adopt({ token: res.token, user: res.user });
      },
      signOut: async () => {
        const current = session?.token;
        setSession(null);
        await store.clear();
        // Drop what was fetched as this person (favorites, recents, their view of recipes).
        client.removeQueries({ queryKey: ["favorites"] });
        client.removeQueries({ queryKey: ["recent"] });
        client.removeQueries({ predicate: (q) => q.queryKey[0] === "recipe" && q.queryKey[2] != null });
        if (current) await api.signOut(current).catch(() => {});
      },
    };
  }, [ready, session, client]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
