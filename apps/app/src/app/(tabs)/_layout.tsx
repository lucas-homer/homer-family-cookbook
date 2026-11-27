import { NativeTabs } from "expo-router/native-tabs";
import * as React from "react";
import { useTheme } from "@/theme/use-theme";

// System tab bar: Liquid Glass on iOS 26. Search is the system search tab,
// which iOS draws as the separate round button the designs show. On iPad the
// tab bar can become the sidebar from the designs.
// disableAutomaticContentInsets: otherwise iOS adds the safe area on top of
// the padding each screen already leaves for the status bar.
export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <NativeTabs tintColor={colors.primary} minimizeBehavior="onScrollDown" sidebarAdaptable>
      <NativeTabs.Trigger name="index" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label>Library</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "book", selected: "book.fill" }} md="menu_book" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="favorites" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label>Favorites</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "heart", selected: "heart.fill" }} md="favorite" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="cooking" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label>Cooking</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="frying.pan" md="skillet" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="search" role="search" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label>Search</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
