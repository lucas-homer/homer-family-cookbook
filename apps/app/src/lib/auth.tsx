import * as SecureStore from "expo-secure-store";
import * as React from "react";
import { Platform } from "react-native";
import { api, ApiError, type User } from "./api";

// Who is signed in. The API token lives in the iOS Keychain (SecureStore).
// On web the app is served by the same Worker later; until then the token is
// kept in localStorage there.

const KEY = "hfc.token";

const store = {
  get: async (): Promise<string | null> => {
    if (Platform.OS === "web") return globalThis.localStorage?.getItem(KEY) ?? null;
    return SecureStore.getItemAsync(KEY);
  },
  set: async (token: string) => {
    if (Platform.OS === "web") return globalThis.localStorage?.setItem(KEY, token);
    await SecureStore.setItemAsync(KEY, token);
  },
  clear: async () => {
    if (Platform.OS === "web") return globalThis.localStorage?.removeItem(KEY);
    await SecureStore.deleteItemAsync(KEY);
  },
};

type AuthState = {
  /** null while the stored token is being checked. */
  ready: boolean;
  token: string | null;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = React.createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = React.useState(false);
  const [token, setToken] = React.useState<string | null>(null);
  const [user, setUser] = React.useState<User | null>(null);

  React.useEffect(() => {
    let live = true;
    (async () => {
      const saved = await store.get();
      if (saved) {
        try {
          const { user: me } = await api.me(saved);
          if (live) {
            setToken(saved);
            setUser(me);
          }
        } catch (e) {
          // A rejected token is cleared; offline keeps it for next time.
          if (e instanceof ApiError && e.status === 401) await store.clear();
        }
      }
      if (live) setReady(true);
    })();
    return () => {
      live = false;
    };
  }, []);

  const value = React.useMemo<AuthState>(
    () => ({
      ready,
      token,
      user,
      signIn: async (email, password) => {
        const res = await api.signIn(email, password);
        await store.set(res.token);
        setToken(res.token);
        setUser(res.user);
      },
      signOut: async () => {
        const current = token;
        setToken(null);
        setUser(null);
        await store.clear();
        if (current) await api.signOut(current).catch(() => {});
      },
    }),
    [ready, token, user],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
