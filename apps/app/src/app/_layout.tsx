import "../../global.css";
import { InstrumentSans_400Regular } from "@expo-google-fonts/instrument-sans/400Regular";
import { InstrumentSans_500Medium } from "@expo-google-fonts/instrument-sans/500Medium";
import { InstrumentSans_600SemiBold } from "@expo-google-fonts/instrument-sans/600SemiBold";
import { InstrumentSans_700Bold } from "@expo-google-fonts/instrument-sans/700Bold";
import { Newsreader_400Regular } from "@expo-google-fonts/newsreader/400Regular";
import { Newsreader_500Medium } from "@expo-google-fonts/newsreader/500Medium";
import { Newsreader_600SemiBold } from "@expo-google-fonts/newsreader/600SemiBold";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useFonts } from "expo-font";
import { colorScheme } from "nativewind";
import { Platform, useColorScheme as useSystemScheme } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "@/lib/auth";
import { CookingProvider } from "@/lib/cooking";
import { TimersProvider } from "@/lib/timers";
import { useTheme } from "@/theme/use-theme";

// Recipes and lists you have opened are saved on the device, so they still
// read in a kitchen with no signal. Search results and invites are not kept.
const CACHE_MAX_AGE = 30 * 24 * 60 * 60 * 1000;
const KEPT = new Set(["library", "recipe", "tags", "tag", "favorites", "recent"]);
const persistOptions = {
  persister: createAsyncStoragePersister({ storage: AsyncStorage, key: "hfc.cache" }),
  maxAge: CACHE_MAX_AGE,
  // Bump when API shapes change, so an old cache isn't read as new.
  buster: "api-v1",
  dehydrateOptions: {
    shouldDehydrateQuery: (q: { queryKey: readonly unknown[]; state: { status: string } }) =>
      q.state.status === "success" && KEPT.has(String(q.queryKey[0])),
  },
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    InstrumentSans_400Regular,
    InstrumentSans_500Medium,
    InstrumentSans_600SemiBold,
    InstrumentSans_700Bold,
    Newsreader_400Regular,
    Newsreader_500Medium,
    Newsreader_600SemiBold,
  });
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          // offlineFirst: show what's cached, then try the network. gcTime must be
          // Infinity, not 30 days: a timer that long overflows setTimeout and
          // fires at once, dropping the restored cache.
          queries: { staleTime: 60_000, gcTime: Infinity, retry: 1, networkMode: "offlineFirst" },
        },
      }),
  );
  const { colors } = useTheme();
  // Native follows the system scheme by itself. On the web, dark mode is the
  // `dark` class on <html>, so mirror the system setting there.
  const system = useSystemScheme();
  React.useEffect(() => {
    if (Platform.OS === "web") colorScheme.set(system === "dark" ? "dark" : "light");
  }, [system]);
  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
        <AuthProvider>
          <CookingProvider>
          <TimersProvider>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="recipe/[id]" />
            <Stack.Screen name="sign-in" options={{ presentation: "modal", contentStyle: { backgroundColor: colors.grouped } }} />
            <Stack.Screen name="join/[token]" options={{ presentation: "modal", contentStyle: { backgroundColor: colors.grouped } }} />
            <Stack.Screen name="cook/[id]" options={{ presentation: "fullScreenModal", gestureEnabled: false }} />
          </Stack>
          <StatusBar style="auto" />
          </TimersProvider>
          </CookingProvider>
        </AuthProvider>
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  );
}
