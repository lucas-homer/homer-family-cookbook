import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import * as React from "react";
import { View } from "react-native";
import { CheckTick, ListeningBadge, TalkPill, Text, VoiceBar, Waveform } from "@/components/ui";
import { Stack } from "./frame";

const meta: Meta<typeof VoiceBar> = {
  title: "Components/Voice",
  component: VoiceBar,
  parameters: { layout: "padded", surface: "grouped" },
  args: {
    transcript: "“…makes about a dozen”",
    listening: true,
    checklist: [
      { label: "Title", done: true },
      { label: "Category", done: true },
      { label: "Makes", done: true },
      { label: "Time", done: false },
      { label: "Story", done: false },
    ],
  },
  decorators: [(S) => <View className="w-[370px]"><S /></View>],
};
export default meta;
type Story = StoryObj<typeof VoiceBar>;

export const Bar: Story = {};

export const Start: Story = {
  args: {
    transcript: "Just talk. Try “Grandma's biscuits, makes a dozen, about 25 minutes.”",
    checklist: ["Title", "Category", "Makes", "Time", "Story"].map((label) => ({ label, done: false })),
  },
};

export const IngredientsTab: Story = {
  args: {
    transcript: "“…and three quarters cup of buttermilk”",
    summary: (
      <View className="flex-row items-center gap-2">
        <CheckTick label="4 ingredients" done />
        <Text variant="caption" className="font-normal">
          Say them one after another
        </Text>
      </View>
    ),
  },
};

export const Paused: Story = {
  args: { listening: false, transcript: "Paused. Tap the mic to keep going." },
};

export const Pill: Story = {
  name: "Talk it through pill",
  render: () => (
    <Stack className="items-start">
      <TalkPill />
      <Text variant="footnote">Shown on every form tab, and on the edit screens, while the mic is off.</Text>
    </Stack>
  ),
};

export const Parts: Story = {
  render: () => (
    <Stack>
      <ListeningBadge />
      <Waveform />
      <Waveform active={false} />
    </Stack>
  ),
};
