import { router, useGlobalSearchParams, useSegments } from "expo-router";
import * as React from "react";
import { Platform, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsSplit } from "@/components/split";
import { TimerStack } from "@/components/timers-list";
import { Glass } from "@/components/ui";
import { useTimers } from "@/lib/timers";

// Running timers float over every screen, so they keep counting in view while
// you search, browse or read another recipe. Cook mode shows its own stack in
// its control panel, so this one hides there, on the Cooking tab (which lists
// them all) and under the sign-in sheets.
// On iPhone the tab bar sits at the bottom of the tab screens; float above it.
// (On iPad and the web the tabs are at the top.)

const TAB_BAR = 64;

export function FloatingTimers() {
  const { timers } = useTimers();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const split = useIsSplit();
  const { width } = useWindowDimensions();
  const params = useGlobalSearchParams<{ id?: string }>();
  const first = segments[0];
  // The Cooking tab already lists every timer.
  if (!timers.length || first === "cook" || first === "sign-in" || first === "join" || (segments as string[])[1] === "cooking") return null;

  const onTabs = first === "(tabs)";
  const bottom = Math.max(insets.bottom, 12) + (onTabs && !split && Platform.OS !== "web" ? TAB_BAR : 0);
  // On iPad, a card in the bottom-right corner rather than across the whole screen.
  const placement = split ? { right: 16, width: Math.min(420, width - 32) } : { left: 10, right: 10 };
  // The recipe the person is looking at, so its own timers skip the recipe name.
  const recipeId = first === "recipe" && typeof params.id === "string" ? params.id : undefined;

  return (
    <Glass pointerEvents="box-none" className="absolute rounded-[32px] p-3" style={{ bottom, ...placement }}>
      <TimerStack recipeId={recipeId} onShowAll={() => router.push("/cooking")} />
    </Glass>
  );
}
