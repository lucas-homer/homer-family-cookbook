import { useColorScheme } from "nativewind";
import { colors, type ColorScheme } from "./tokens";

/** Current color scheme and its raw color values. */
export function useTheme() {
  const { colorScheme } = useColorScheme();
  const scheme: ColorScheme = colorScheme === "dark" ? "dark" : "light";
  return { scheme, colors: colors[scheme], isDark: scheme === "dark" };
}
