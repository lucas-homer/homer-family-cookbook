import "../global.css";
import type { Decorator, Preview } from "@storybook/react-native-web-vite";
import { colorScheme } from "nativewind";
import * as React from "react";
import { View } from "react-native";

const withTheme: Decorator = (Story, ctx) => {
  const theme = (ctx.globals.theme as "light" | "dark") ?? "light";
  const surface = (ctx.parameters.surface as "background" | "grouped" | "none") ?? "background";
  React.useLayoutEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      colorScheme.set(theme);
    } catch {
      // Older NativeWind builds only allow this with darkMode "class".
    }
  }, [theme]);
  if (surface === "none") return <Story />;
  return (
    <View
      className={surface === "grouped" ? "bg-grouped" : "bg-background"}
      style={{ minHeight: "100vh" as unknown as number, padding: ctx.parameters.layout === "fullscreen" ? 0 : 24 }}
    >
      <Story />
    </View>
  );
};

const preview: Preview = {
  decorators: [withTheme],
  parameters: {
    layout: "fullscreen",
    controls: { matchers: { color: /(background|color)$/i } },
    options: {
      storySort: { order: ["Foundations", ["Colors", "Typography", "Spacing & radius", "Icons", "Glass"], "Components", "Patterns"] },
    },
  },
  globalTypes: {
    theme: {
      description: "Light or dark",
      toolbar: {
        title: "Theme",
        icon: "mirror",
        items: [
          { value: "light", title: "Light", icon: "sun" },
          { value: "dark", title: "Dark", icon: "moon" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: "light" },
};

export default preview;
