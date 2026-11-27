import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import * as React from "react";
import { ScrollView, View } from "react-native";
import {
  AddPhoto,
  AddRow,
  Button,
  CheckTick,
  Chip,
  EdgeScroll,
  IconButton,
  IngredientRow,
  ListeningBadge,
  QuickTimerButton,
  RecipeCard,
  SegmentedTabs,
  StepProgress,
  StepRow,
  TabBar,
  TalkPill,
  Text,
  TextAction,
  TagField,
  TextField,
  TimerBar,
  Toolbar,
  VoiceBar,
  Avatar,
  Glass,
} from "@/components/ui";
import { tagByName } from "./sample-tags";
import { Phone } from "./frame";

const meta: Meta = { title: "Patterns", parameters: { layout: "centered", surface: "background" } };
export default meta;
type Story = StoryObj;

const pad = { paddingTop: 56 };

type Tab = "Basics" | "Ingredients" | "Steps";

/** The form with the mic on: switch tabs, the voice bar stays. Tap the mic to pause. */
export const TalkItThrough: Story = {
  name: "Talk it through (interactive)",
  render: function Render() {
    const [tab, setTab] = React.useState<Tab>("Basics");
    const [on, setOn] = React.useState(true);
    const transcript = { Basics: "“…she made these every Sunday before church”", Ingredients: "“…and three quarters cup of buttermilk”", Steps: "“…bake until golden, about twelve minutes”" }[tab];
    return (
      <Phone grouped>
        <View className="flex-1 px-4" style={pad}>
          <Toolbar
            left={<TextAction label="Cancel" tone="foreground" />}
            title={
              <View className="items-center gap-px">
                <Text variant="headline">New recipe</Text>
                {on ? <ListeningBadge /> : null}
              </View>
            }
            right={<TextAction label="Save" bold />}
          />
          <SegmentedTabs className="mb-3.5 mt-3" options={["Basics", "Ingredients", "Steps"] as const} value={tab} onChange={setTab} />
          <ScrollView contentContainerStyle={{ paddingBottom: 220 }}>
            {tab === "Basics" ? (
              <View className="gap-3">
                <AddPhoto />
                <TextField label="Title" defaultValue="Grandma's Buttermilk Biscuits" />
                <TagField tags={[tagByName("Breads"), tagByName("Christmas")]} />
                <View className="flex-row gap-2.5">
                  <TextField className="flex-1" label="Makes" defaultValue="12" />
                  <TextField className="flex-1" label="Total time" defaultValue="25 min" />
                </View>
                <TextField label="The story" multiline defaultValue="She made these every Sunday before church" active={on} />
              </View>
            ) : tab === "Ingredients" ? (
              <View className="overflow-hidden rounded-card bg-card">
                {[["2 cups", "Flour"], ["1 tbsp", "Baking powder"], ["6 tbsp", "Cold butter, cubed"], ["¾ cup", "Buttermilk"]].map(([q, n], i) => (
                  <View key={n}>
                    <IngredientRow quantity={q} name={n!} fresh={on && i === 3} />
                    <View className="h-px bg-border/10" />
                  </View>
                ))}
                <AddRow label="Add ingredient" />
              </View>
            ) : (
              <View className="overflow-hidden rounded-card bg-card">
                <StepRow number={1} text="Heat the oven to 450°F. Whisk the flour and baking powder." timer="10 min" />
                <View className="h-px bg-border/10" />
                <StepRow number={2} text="Cut in the cold butter until crumbly. Stir in the buttermilk, barely." />
                <View className="h-px bg-border/10" />
                <StepRow number={3} text="Pat out, fold twice, cut. Bake until golden, about 12 minutes." timer="12 min" fresh={on} />
                <AddRow label="Add step" />
              </View>
            )}
          </ScrollView>
        </View>
        <View className="absolute bottom-3.5 left-2.5 right-2.5">
          {on ? (
            <VoiceBar
              transcript={transcript}
              onMicPress={() => setOn(false)}
              checklist={tab === "Basics" ? ["Title", "Course", "Makes", "Time", "Story"].map((label) => ({ label, done: true })) : undefined}
              summary={
                tab === "Basics" ? undefined : (
                  <View className="flex-row items-center gap-2">
                    <CheckTick label={tab === "Ingredients" ? "4 ingredients" : "3 steps · 2 timers"} done />
                    <Text variant="caption" className="font-normal">Say “next” for {tab === "Ingredients" ? "Steps" : "a new step"}</Text>
                  </View>
                )
              }
            />
          ) : (
            <View className="pb-2.5">
              <TalkPill onPress={() => setOn(true)} />
            </View>
          )}
        </View>
      </Phone>
    );
  },
};

export const CookMode: Story = {
  render: () => (
    <Phone>
      <View className="flex-1 px-[22px]" style={pad}>
        <Toolbar left={<IconButton icon="back" label="Back" />} right={<IconButton icon="more" label="More" />} />
        <View className="mt-4 gap-2">
          <StepProgress total={6} current={3} />
          <Text className="mt-4 text-subhead font-semibold text-primary">Step 3 of 6</Text>
          <Text variant="step">Pat out, fold twice, cut. Bake until golden.</Text>
        </View>
      </View>
      <View className="absolute right-[18px]" style={{ bottom: 196 }}>
        <QuickTimerButton />
      </View>
      <Glass className="absolute bottom-3 left-2.5 right-2.5 gap-3 rounded-[40px] px-5 pb-[18px] pt-4">
        <TimerBar label="Oven to 450°F" seconds={252} />
        <View className="flex-row gap-2.5">
          <View className="flex-1">
            <Button label="Back" variant="secondary" block />
          </View>
          <View className="flex-[2]">
            <Button label="Next step" block />
          </View>
        </View>
      </Glass>
    </Phone>
  ),
};

export const Library: Story = {
  render: function Render() {
    const [cat, setCat] = React.useState("All");
    return (
      <Phone>
        <ScrollView contentContainerStyle={{ paddingTop: 56, paddingHorizontal: 18, paddingBottom: 120 }}>
          <Toolbar left={<Avatar name="Lucas Homer" />} right={<IconButton icon="plus" label="New recipe" />} />
          <Text variant="largeTitle" className="mb-3.5 mt-3">Library</Text>
          <EdgeScroll contentContainerStyle={{ paddingBottom: 16 }}>
            {["All", "Mains", "Cookies & Bars", "Sides", "Desserts", "Breads"].map((c) => (
              <Chip key={c} label={c} selected={c === cat} onPress={() => setCat(c)} />
            ))}
          </EdgeScroll>
          <View className="flex-row flex-wrap justify-between gap-y-4">
            {[["Grandma's Buttermilk Biscuits", "Breads"], ["Lemon Bars", "Desserts"], ["Sunday Pot Roast", "Mains"], ["Christmas Fudge", "Desserts · Christmas"], ["Corn Pudding", "Sides"], ["Peach Cobbler", "Desserts"]].map(([t, m]) => (
              <View key={t} style={{ width: 171 }}>
                <RecipeCard title={t!} meta={m} />
              </View>
            ))}
          </View>
        </ScrollView>
        <View className="absolute bottom-[26px] left-[18px] right-[18px]">
          <TabBar
            active="library"
            items={[
              { key: "library", label: "Library", icon: "book" },
              { key: "favorites", label: "Favorites", icon: "heart" },
              { key: "cooking", label: "Cooking", icon: "pot" },
            ]}
          />
        </View>
      </Phone>
    );
  },
};
