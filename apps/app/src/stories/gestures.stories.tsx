import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import * as React from "react";
import { View } from "react-native";
import {
  Button,
  GestureHint,
  Glass,
  Group,
  Icon,
  IconButton,
  Popover,
  RecipeRow,
  StepProgress,
  SwipePager,
  SwipeRow,
  Text,
  TimerBar,
  TimerRow,
  Toast,
  Toolbar,
} from "@/components/ui";
import { Phone, Stack } from "./frame";

const meta: Meta = { title: "Components/Gestures", parameters: { layout: "padded", surface: "grouped" } };
export default meta;
type Story = StoryObj;

/** The gestures the app uses, in one place. Each one also has a button or a VoiceOver action. */
export const Reference: Story = {
  render: () => {
    const rows: [string, string, string][] = [
      ["Swipe left on a timer", "End it. A full swipe ends it at once; Undo shows for 5 seconds.", "Timers list, cook-mode timer bar"],
      ["Swipe right on a timer", "Add 1 minute.", "Timers list, cook-mode timer bar"],
      ["Swipe left on a recipe row", "Remove: from Favorites, or from Recently viewed.", "Favorites, Recently viewed"],
      ["Swipe right on a recipe row", "Favorite or unfavorite.", "Library list, tag pages, search"],
      ["Swipe left or right in cook mode", "Next or previous step. Back and Next buttons stay.", "Cook mode"],
      ["Tap an ingredient", "Tick it off while you cook.", "Recipe, cook mode"],
      ["Long-press a recipe", "Menu: Start cooking, Favorite, Share, Edit.", "Library grid, lists"],
      ["Swipe left on an ingredient or step", "Delete it.", "Recipe form"],
      ["Drag the grip", "Reorder ingredients and steps.", "Recipe form"],
      ["Swipe down on a sheet", "Close it (keeps a draft).", "All sheets"],
      ["Swipe from the left edge", "Go back.", "Everywhere (system)"],
    ];
    return (
      <Stack className="max-w-[720px] gap-4">
        <Text variant="title2">Gestures</Text>
        <Text variant="callout" className="text-muted-foreground">
          Gestures are shortcuts, never the only way. Every swipe action is also a VoiceOver action, and the first time a gesture is available a
          small hint shows once.
        </Text>
        <View className="overflow-hidden rounded-card bg-card">
          {rows.map(([g, does, where], i) => (
            <View key={g} className={i < rows.length - 1 ? "flex-row gap-4 border-b border-border/10 px-4 py-3" : "flex-row gap-4 px-4 py-3"}>
              <Text variant="subhead" className="w-[220px] font-semibold">
                {g}
              </Text>
              <Text variant="subhead" className="flex-1">
                {does}
              </Text>
              <Text variant="footnote" className="w-[180px]">
                {where}
              </Text>
            </View>
          ))}
        </View>
      </Stack>
    );
  },
};

export const TimerSwipe: Story = {
  name: "Swipe a timer",
  render: function Render() {
    const [timers, setTimers] = React.useState([
      { id: 1, label: "Bake biscuits", recipe: "Buttermilk Biscuits", seconds: 412, total: 720 },
      { id: 2, label: "Roast resting", recipe: "Sunday Pot Roast", seconds: 485, total: 1200 },
      { id: 3, label: "Boil eggs", recipe: "Deviled Eggs", seconds: 95, total: 600 },
    ]);
    const [ended, setEnded] = React.useState<string | null>(null);
    const add = (id: number) => setTimers((ts) => ts.map((t) => (t.id === id ? { ...t, seconds: t.seconds + 60, total: t.total + 60 } : t)));
    const end = (id: number) => {
      setEnded(timers.find((t) => t.id === id)?.label ?? null);
      setTimers((ts) => ts.filter((t) => t.id !== id));
    };
    return (
      <Stack className="max-w-[390px] gap-4">
        <Text variant="footnote">Drag a row left to end it, right to add a minute. The last row starts open to show the actions.</Text>
        <Group title="Timers">
          {timers.map((t, i) => (
            <SwipeRow
              key={t.id}
              initiallyOpen={i === timers.length - 1 && t.id === 3 ? "trailing" : undefined}
              leading={[{ label: "+1 min", icon: "plus", tone: "accent", onPress: () => add(t.id) }]}
              trailing={[{ label: "End", icon: "x", tone: "destructive", onPress: () => end(t.id) }]}
            >
              <TimerRow label={t.label} recipe={t.recipe} seconds={t.seconds} total={t.total} />
            </SwipeRow>
          ))}
        </Group>
        {ended ? <Toast icon="check" message={`${ended} ended`} action={{ label: "Undo" }} /> : null}
        <GestureHint label="Swipe left on a timer to end it" />
      </Stack>
    );
  },
};

export const RecipeRowSwipe: Story = {
  name: "Swipe a recipe row",
  render: function Render() {
    const [rows, setRows] = React.useState([
      ["Grandma's Buttermilk Biscuits", "Breads · Grandma Homer"],
      ["Peppermint Bark Brownies", "Cookies & Bars · Christmas"],
      ["Sunday Pot Roast", "Mains"],
    ]);
    return (
      <Stack className="max-w-[390px] gap-2">
        <Text variant="section" className="mx-4">
          Favorites
        </Text>
        <View className="overflow-hidden rounded-card bg-card">
          {rows.map(([t, m], i) => (
            <SwipeRow
              key={t}
              initiallyOpen={i === 1 ? "trailing" : undefined}
              trailing={[{ label: "Remove", icon: "heart", tone: "destructive", onPress: () => setRows((r) => r.filter((x) => x[0] !== t)) }]}
            >
              <View className="px-4">
                <RecipeRow title={t} meta={m} />
              </View>
            </SwipeRow>
          ))}
        </View>
      </Stack>
    );
  },
};

const steps = [
  "Heat the oven to 450°F. Whisk the flour, baking powder and salt.",
  "Cut in the cold butter until it looks like coarse crumbs.",
  "Pat out, fold twice, cut. Bake until golden.",
  "Brush the tops with melted butter while they're hot.",
];

export const CookModeSwipe: Story = {
  name: "Swipe between steps",
  parameters: { surface: "none" },
  render: function Render() {
    const [i, setI] = React.useState(2);
    const [timer, setTimer] = React.useState(true);
    return (
      <Phone>
        <View className="flex-1 px-[22px]" style={{ paddingTop: 56 }}>
          <Toolbar left={<IconButton icon="back" label="Back" />} right={<IconButton icon="more" label="More" />} />
          <SwipePager index={i} count={steps.length} onChange={setI} className="mt-4 flex-1 gap-2">
            <StepProgress total={steps.length} current={i + 1} />
            <Text className="mt-4 text-subhead font-semibold text-primary">
              Step {i + 1} of {steps.length}
            </Text>
            <Text variant="step">{steps[i]}</Text>
            <View className="mt-6 flex-row items-center gap-1.5 opacity-60">
              <Icon name="back" size={14} color="mutedForeground" />
              <Text variant="footnote">Swipe for the next step</Text>
            </View>
          </SwipePager>
        </View>
        <Glass className="absolute bottom-3 left-2.5 right-2.5 gap-3 rounded-[40px] px-5 pb-[18px] pt-4">
          {timer ? (
            <SwipeRow
              className="rounded-card"
              surfaceClassName=""
              leading={[{ label: "+1 min", icon: "plus", tone: "accent" }]}
              trailing={[{ label: "End", icon: "x", tone: "destructive", onPress: () => setTimer(false) }]}
            >
              <TimerBar label="Oven to 450°F" seconds={252} />
            </SwipeRow>
          ) : null}
          <View className="flex-row gap-2.5">
            <View className="flex-1">
              <Button label="Back" variant="secondary" block disabled={i === 0} onPress={() => setI(Math.max(0, i - 1))} />
            </View>
            <View className="flex-[2]">
              <Button label={i === steps.length - 1 ? "Done" : "Next step"} block onPress={() => setI(Math.min(steps.length - 1, i + 1))} />
            </View>
          </View>
        </Glass>
      </Phone>
    );
  },
};

export const LongPress: Story = {
  name: "Long-press a recipe",
  render: () => (
    <Stack className="max-w-[390px] gap-3">
      <Text variant="footnote">On iOS this is the system context menu with a preview; this is how it reads.</Text>
      <View className="rounded-card bg-card px-4" style={{ boxShadow: "0 18px 50px rgba(60,30,10,0.22)" }}>
        <RecipeRow title="Grandma's Buttermilk Biscuits" meta="Breads · 25 min" />
      </View>
      <Popover className="w-[250px] gap-0 p-0">
        {(
          [
            ["Start cooking", "pot"],
            ["Favorite", "heart"],
            ["Share", "share"],
            ["Edit", "edit"],
          ] as const
        ).map(([label, icon], idx) => (
          <View key={label} className={idx < 3 ? "flex-row items-center justify-between border-b border-border/10 px-4 py-3" : "flex-row items-center justify-between px-4 py-3"}>
            <Text>{label}</Text>
            <Icon name={icon} size={18} />
          </View>
        ))}
      </Popover>
    </Stack>
  ),
};
