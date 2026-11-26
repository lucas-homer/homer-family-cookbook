import * as React from "react";
import { ScrollView } from "react-native";
import { Empty, useTopInset } from "@/components/screen";
import { Text } from "@/components/ui";

// Cooking: running timers and the recipe you're cooking. Built in phase 2.
export default function Cooking() {
  const top = useTopInset();
  return (
    <ScrollView contentContainerStyle={{ paddingTop: top + 44, paddingHorizontal: 18, paddingBottom: 120 }} contentInsetAdjustmentBehavior="automatic">
      <Text variant="largeTitle" className="mb-3.5 mt-3">
        Cooking
      </Text>
      <Empty title="Nothing cooking yet" message="Start cooking from a recipe and your steps and timers show up here." />
    </ScrollView>
  );
}
