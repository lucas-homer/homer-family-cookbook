import type { StorybookConfig } from "@storybook/react-native-web-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(ts|tsx)"],
  framework: {
    name: "@storybook/react-native-web-vite",
    options: {
      // NativeWind turns className into styles through its JSX runtime.
      pluginReactOptions: { jsxImportSource: "nativewind" },
      modulesToTranspile: ["expo-blur", "expo-glass-effect", "expo-modules-core", "react-native-svg"],
    },
  },
  core: { disableTelemetry: true },
  async viteFinal(config) {
    const { mergeConfig } = await import("vite");
    return mergeConfig(config, {
      resolve: {
        alias: { "@react-native/assets-registry/registry": new URL("./shims/assets-registry.js", import.meta.url).pathname },
      },
      define: {
        "process.env.EXPO_OS": JSON.stringify("web"),
        __DEV__: JSON.stringify(process.env.NODE_ENV !== "production"),
      },
    });
  },
};

export default config;
