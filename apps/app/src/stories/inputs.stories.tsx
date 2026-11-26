import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import * as React from "react";
import { View } from "react-native";
import { AddPhoto, CheckTick, Chip, SegmentedTabs, Text, TextField } from "@/components/ui";
import { Row, Stack } from "./frame";

const meta: Meta = { title: "Components/Inputs", parameters: { layout: "padded", surface: "grouped" } };
export default meta;
type Story = StoryObj;

export const TextFields: Story = {
  render: () => (
    <Stack className="max-w-[358px] gap-3">
      <TextField label="Title" placeholder="Recipe name" />
      <TextField label="Title" defaultValue="Grandma's Buttermilk Biscuits" active />
      <TextField label="Makes" defaultValue="12" tone="heard" hint="Heard just now" />
      <TextField label="Oven" defaultValue="450°F" tone="check" hint="Check this: the card was hard to read" />
      <TextField label="Total time" defaultValue="twenty" error="Use minutes, like 25 min" />
      <TextField label="The story" placeholder="Where it came from…" multiline />
      <TextField label="Disabled" defaultValue="Can't say this one" editable={false} />
    </Stack>
  ),
};

export const Chips: Story = {
  render: function Render() {
    const [sel, setSel] = React.useState<string[]>(["Breads"]);
    const all = ["Breads", "Holidays", "Sides", "Desserts"];
    return (
      <Stack>
        <Text variant="label">Categories</Text>
        <Row className="gap-2">
          {all.map((c) => (
            <Chip key={c} label={c} selected={sel.includes(c)} onPress={() => setSel((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]))} />
          ))}
          <Chip label="More" icon="plus" />
        </Row>
        <Text variant="label">On a card</Text>
        <View className="rounded-card bg-card p-4">
          <Row className="gap-2">
            <Chip label="All" selected surface="solid" />
            <Chip label="Mains" surface="solid" />
            <Chip label="Desserts" surface="solid" />
          </Row>
        </View>
      </Stack>
    );
  },
};

export const VoiceChecklist: Story = {
  name: "Check ticks (voice)",
  render: () => (
    <Stack>
      <Row className="gap-[5px]">
        <CheckTick label="Title" done />
        <CheckTick label="Category" done />
        <CheckTick label="Makes" done />
        <CheckTick label="Time" />
        <CheckTick label="Story" />
      </Row>
      <Text variant="footnote">Shown in the voice bar. Each one turns green when that field is heard.</Text>
    </Stack>
  ),
};

export const Segmented: Story = {
  render: function Render() {
    const [v, setV] = React.useState<"Basics" | "Ingredients" | "Steps">("Basics");
    return (
      <View className="max-w-[358px]">
        <SegmentedTabs options={["Basics", "Ingredients", "Steps"] as const} value={v} onChange={setV} />
      </View>
    );
  },
};

export const PhotoDrop: Story = {
  name: "Add photo",
  render: () => (
    <View className="max-w-[358px]">
      <AddPhoto note="Or say “add a photo” later" />
    </View>
  ),
};
