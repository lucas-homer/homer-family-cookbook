import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import * as React from "react";
import { View } from "react-native";
import { Avatar, Choice, IconButton, SheetSurface, TabBar, Text, TextField, Toast, Toolbar } from "@/components/ui";
import { Backdrop, Stack } from "./frame";

const meta: Meta = { title: "Components/Surfaces", parameters: { layout: "padded" } };
export default meta;
type Story = StoryObj;

export const ImportSheet: Story = {
  name: "Sheet: new recipe",
  render: () => (
    <View className="w-[390px]">
      <SheetSurface title="New recipe" cancel={{ label: "Cancel" }}>
        <Stack className="gap-2.5">
          <Choice icon="mic" title="Talk it through" detail="Say it and the form fills in" />
          <Choice icon="camera" title="Take a photo" detail="Of a recipe card or cookbook page" />
          <Choice icon="link" title="Paste a link" detail="From any recipe site" />
          <Choice icon="edit" title="Type it in" />
        </Stack>
      </SheetSurface>
    </View>
  ),
};

export const FormSheet: Story = {
  name: "Sheet: change password",
  render: () => (
    <View className="w-[390px]">
      <SheetSurface title="Change password" cancel={{ label: "Cancel" }} confirm={{ label: "Save", disabled: true }}>
        <Stack className="gap-3">
          <TextField label="Current password" secureTextEntry />
          <TextField label="New password" secureTextEntry hint="At least 10 characters" />
        </Stack>
      </SheetSurface>
    </View>
  ),
};

export const Tabs: Story = {
  name: "Tab bar",
  render: function Render() {
    const [t, setT] = React.useState<"library" | "favorites" | "cooking">("library");
    return (
      <Backdrop height={140}>
        <View className="w-[354px]">
          <TabBar
            active={t}
            onChange={setT}
            items={[
              { key: "library", label: "Library", icon: "book" },
              { key: "favorites", label: "Favorites", icon: "heart" },
              { key: "cooking", label: "Cooking", icon: "pot" },
            ]}
          />
        </View>
      </Backdrop>
    );
  },
};

export const Toolbars: Story = {
  render: () => (
    <Stack className="w-[358px]">
      <Toolbar left={<IconButton icon="back" label="Back" />} right={<><IconButton icon="heart" label="Favorite" /><IconButton icon="more" label="More" /></>} />
      <Toolbar left={<IconButton icon="person" label="Account" />} title="Library" right={<IconButton icon="plus" label="New recipe" variant="primary" />} />
      <Toolbar left={<Avatar name="Lucas Homer" />} />
    </Stack>
  ),
};

export const Toasts: Story = {
  render: () => (
    <Stack className="items-start">
      <Toast message="Saved to the cookbook" />
      <Toast icon="timer" message="Biscuits timer started" action={{ label: "Undo" }} />
      <Text variant="footnote">Short, then gone. Announced to VoiceOver.</Text>
    </Stack>
  ),
};
