import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import * as React from "react";
import { View } from "react-native";
import { Group, Icon, Popover, QuickTimerButton, TimerBar, TimerChip, TimerRow, Text, Toast, Waveform, formatClock } from "@/components/ui";
import { Backdrop, Row, Stack } from "./frame";

const meta: Meta = { title: "Components/Timers", parameters: { layout: "padded" } };
export default meta;
type Story = StoryObj;

function useCountdown(start: number) {
  const [s, setS] = React.useState(start);
  React.useEffect(() => {
    const id = setInterval(() => setS((v) => (v > 0 ? v - 1 : start)), 1000);
    return () => clearInterval(id);
  }, [start]);
  return s;
}

export const Chips: Story = {
  render: () => (
    <Row>
      <TimerChip label="10 min" onPress={() => {}} />
      <TimerChip label="12 min" onPress={() => {}} />
      <TimerChip label="1 hr 30 min" onPress={() => {}} />
    </Row>
  ),
};

export const Bar: Story = {
  render: function Render() {
    const s = useCountdown(252);
    return (
      <View className="w-[358px]">
        <TimerBar label="Oven to 450°F" seconds={s} />
      </View>
    );
  },
};

export const TimersList: Story = {
  parameters: { surface: "grouped" },
  render: function Render() {
    const a = useCountdown(702);
    return (
      <View className="w-[358px]">
        <Group title="Timers">
          <TimerRow label="Bake biscuits" recipe="Buttermilk Biscuits" seconds={a} total={720} />
          <TimerRow label="Roast resting" recipe="Sunday Pot Roast" seconds={485} total={1200} paused />
        </Group>
      </View>
    );
  },
};

export const QuickTimer: Story = {
  name: "Quick timer button",
  render: () => (
    <Backdrop height={180}>
      <Row className="gap-8">
        <View className="items-center gap-2">
          <QuickTimerButton />
          <Text variant="footnote">Idle</Text>
        </View>
        <View className="items-center gap-2">
          <QuickTimerButton listening />
          <Text variant="footnote">Listening</Text>
        </View>
      </Row>
    </Backdrop>
  ),
};

export const QuickTimerFlow: Story = {
  name: "Quick timer: listening, heard, started",
  render: () => (
    <Row className="items-start gap-5">
      <Popover className="w-[300px]">
        <Text variant="headline" className="text-center">
          Listening…
        </Text>
        <View className="items-center py-2">
          <Waveform bars={14} scale={1} height={48} />
        </View>
        <Text variant="subhead" className="text-center text-muted-foreground">
          Try “twelve minutes for the biscuits”
        </Text>
      </Popover>
      <Popover className="w-[300px] gap-3">
        <Text variant="footnote" className="text-center">
          Heard “twelve minutes for the biscuits”
        </Text>
        <View className="flex-row items-center gap-3 rounded-card bg-accent px-4 py-3">
          <Icon name="timer" size={22} color="accentForeground" />
          <Text className="flex-1 font-semibold text-accent-foreground">Biscuits</Text>
          <Text className="text-title-2 font-bold text-accent-foreground">{formatClock(720)}</Text>
        </View>
      </Popover>
      <Toast message="Biscuits timer started" action={{ label: "Undo" }} />
    </Row>
  ),
};

export const Formatting: Story = {
  render: () => (
    <Stack className="gap-1">
      {[5, 65, 720, 3725].map((s) => (
        <Text key={s} variant="callout">
          {s}s → {formatClock(s)}
        </Text>
      ))}
    </Stack>
  ),
};
