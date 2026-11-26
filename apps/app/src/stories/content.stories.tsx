import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import * as React from "react";
import { View } from "react-native";
import { AddRow, Avatar, Group, Icon, IngredientRow, ListRow, RecipeCard, RecipeRow, StepProgress, StepRow, Text } from "@/components/ui";
import { Row, Stack } from "./frame";

const meta: Meta = { title: "Components/Content", parameters: { layout: "padded" } };
export default meta;
type Story = StoryObj;

export const RecipeCards: Story = {
  render: () => (
    <View className="max-w-[390px] flex-row flex-wrap gap-x-3 gap-y-4">
      {[
        ["Grandma's Buttermilk Biscuits", "Breads", true],
        ["Lemon Bars", "Desserts", false],
        ["Sunday Pot Roast", "Mains", true],
        ["Christmas Fudge", "Holidays", false],
      ].map(([t, m, f]) => (
        <View key={t as string} style={{ width: 171 }}>
          <RecipeCard title={t as string} meta={m as string} favorite={f as boolean} />
        </View>
      ))}
    </View>
  ),
};

export const RecipeRows: Story = {
  render: () => (
    <View className="max-w-[358px]">
      <RecipeRow title="Sunday Pot Roast" meta="Mains · 3 hr" />
      <View className="h-px bg-border/10" />
      <RecipeRow title="Lemon Bars" meta="Desserts · edited last week" trailing={<Icon name="edit" size={18} color="mutedForeground" />} />
    </View>
  ),
};

export const Ingredients: Story = {
  render: function Render() {
    const [done, setDone] = React.useState<number[]>([0]);
    const items = [
      ["2 cups", "Flour"],
      ["1 tbsp", "Baking powder"],
      ["6 tbsp", "Cold butter", "cubed"],
      ["¾ cup", "Buttermilk"],
    ];
    return (
      <Row className="items-start gap-6">
        <Stack className="w-[358px] gap-2">
          <Text variant="section">Editing (last one just heard)</Text>
          <View className="overflow-hidden rounded-card bg-card">
            {items.map(([q, n, note], i) => (
              <View key={n}>
                <IngredientRow quantity={q} name={n!} note={note} fresh={i === 3} />
                <View className="h-px bg-border/10" />
              </View>
            ))}
            <AddRow label="Add ingredient" />
          </View>
        </Stack>
        <Stack className="w-[358px] gap-2">
          <Text variant="section">Cooking (tap to check off)</Text>
          <View className="overflow-hidden rounded-card bg-card">
            {items.map(([q, n], i) => (
              <IngredientRow key={n} quantity={q} name={n!} checked={done.includes(i)} onToggle={() => setDone((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i]))} />
            ))}
          </View>
        </Stack>
      </Row>
    );
  },
};

export const Steps: Story = {
  render: () => (
    <Stack className="w-[358px]">
      <View className="overflow-hidden rounded-card bg-card">
        <StepRow number={1} text="Heat the oven to 450°F. Whisk the flour and baking powder." timer="10 min" onTimerPress={() => {}} />
        <View className="h-px bg-border/10" />
        <StepRow number={2} text="Cut in the cold butter until crumbly. Stir in the buttermilk, barely." />
        <View className="h-px bg-border/10" />
        <StepRow number={3} text="Pat out, fold twice, cut. Bake until golden, about 12 minutes." timer="12 min" fresh onTimerPress={() => {}} />
        <AddRow label="Add step" />
      </View>
      <Text variant="section">Cook mode progress</Text>
      <StepProgress total={6} current={3} />
    </Stack>
  ),
};

export const GroupedList: Story = {
  parameters: { surface: "grouped" },
  render: function Render() {
    const [on, setOn] = React.useState(true);
    return (
      <View className="w-[358px]">
        <Group title="Account">
          <ListRow label="Name" detail="Lucas Homer" icon="person" />
          <ListRow label="Email" detail="Change" icon="mail" iconTone="accent" />
          <ListRow label="Change password" icon="key" iconTone="muted" onPress={() => {}} />
        </Group>
        <Group title="Cooking" footer="Timers ring on your lock screen and Apple Watch.">
          <ListRow label="Timer alerts" icon="bell" iconTone="success" toggle={{ value: on, onChange: setOn }} />
        </Group>
        <Group>
          <ListRow label="Sign out" destructive onPress={() => {}} />
        </Group>
      </View>
    );
  },
};

export const Avatars: Story = {
  render: () => (
    <Row>
      <Avatar name="Lucas Homer" />
      <Avatar name="Grandma Ruth" size={48} />
      <Avatar name="Ann" size={64} />
    </Row>
  ),
};
