import "./global.css";
import { InstrumentSans_400Regular } from "@expo-google-fonts/instrument-sans/400Regular";
import { InstrumentSans_500Medium } from "@expo-google-fonts/instrument-sans/500Medium";
import { InstrumentSans_600SemiBold } from "@expo-google-fonts/instrument-sans/600SemiBold";
import { InstrumentSans_700Bold } from "@expo-google-fonts/instrument-sans/700Bold";
import { Newsreader_400Regular } from "@expo-google-fonts/newsreader/400Regular";
import { Newsreader_500Medium } from "@expo-google-fonts/newsreader/500Medium";
import { Newsreader_600SemiBold } from "@expo-google-fonts/newsreader/600SemiBold";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import * as React from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Button, Chip, Group, ListRow, RecipeCard, TalkPill, Text, TimerBar } from "@/components/ui";

/**
 * Placeholder home while the design system is built. The real screens come
 * with Expo Router in src/app. Browse every component in Storybook.
 */
export default function App() {
  const [fontsLoaded] = useFonts({
    InstrumentSans_400Regular,
    InstrumentSans_500Medium,
    InstrumentSans_600SemiBold,
    InstrumentSans_700Bold,
    Newsreader_400Regular,
    Newsreader_500Medium,
    Newsreader_600SemiBold,
  });
  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView contentContainerClassName="gap-5 p-[18px] pb-24">
          <Text variant="largeTitle">Family Cookbook</Text>
          <Text variant="callout" className="text-muted-foreground">
            Design system preview. Components live in src/components/ui.
          </Text>
          <View className="flex-row gap-2">
            <Chip label="All" selected />
            <Chip label="Breads" />
            <Chip label="Desserts" />
          </View>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <RecipeCard title="Grandma's Buttermilk Biscuits" meta="Breads" favorite />
            </View>
            <View className="flex-1">
              <RecipeCard title="Lemon Bars" meta="Desserts" />
            </View>
          </View>
          <TimerBar label="Oven to 450°F" seconds={252} />
          <Group title="Settings">
            <ListRow label="Timer alerts" icon="bell" iconTone="success" toggle={{ value: true, onChange: () => {} }} />
            <ListRow label="Change password" icon="key" iconTone="muted" onPress={() => {}} />
          </Group>
          <Button label="Start cooking" block />
          <TalkPill />
        </ScrollView>
      </SafeAreaView>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
