import { router } from "expo-router";
import * as React from "react";
import { ScrollView, View } from "react-native";
import { Empty, useTopInset, TabScreen } from "@/components/screen";
import { Button, Text } from "@/components/ui";
import { useCooking } from "@/lib/cooking";
import { useTimers } from "@/lib/timers";
import { TimersList } from "@/components/timers-list";

// Cooking: running timers and the recipe you're cooking now.
export default function Cooking() {
  const top = useTopInset();
  const { session, finish } = useCooking();
  const timers = useTimers();
  return (
    <TabScreen>
    <ScrollView contentContainerStyle={{ paddingTop: top, paddingHorizontal: 18, paddingBottom: 120 }}>
      <Text variant="largeTitle" className="mb-3.5 mt-3">
        Cooking
      </Text>
      {timers.timers.length ? (
        <View className="mb-5 gap-2.5">
          <Text variant="section">Timers</Text>
          <TimersList />
        </View>
      ) : null}
      {session ? (
        <View className="gap-3 rounded-card bg-card p-4">
          <Text variant="section">Cooking now</Text>
          <Text variant="title2">{session.title}</Text>
          <Text variant="subhead" className="text-muted-foreground">
            {`You're on step ${session.step + 1}.`}
          </Text>
          <View className="flex-row gap-2.5 pt-1">
            <View className="flex-[2]">
              <Button label="Keep cooking" icon="pot" block onPress={() => router.push(`/cook/${session.recipeId}`)} />
            </View>
            <View className="flex-1">
              <Button label="End" variant="secondary" block onPress={finish} />
            </View>
          </View>
        </View>
      ) : timers.timers.length ? null : (
        <Empty title="Nothing cooking yet" message="Open a recipe and tap Start cooking. Your steps show up here." />
      )}
    </ScrollView>
    </TabScreen>
  );
}
