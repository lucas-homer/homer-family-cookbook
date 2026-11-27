import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import * as React from "react";
import { ScrollView, View } from "react-native";
import { Chip, NarrowRow, RecipeRow, SheetSurface, TagCloud, TagField, TagPicker, Text, Toolbar, IconButton } from "@/components/ui";
import type { Tag, TagId } from "@/lib/tags";
import { Phone, Row, Stack } from "./frame";
import { sampleTags, tagByName } from "./sample-tags";

const meta: Meta = { title: "Components/Tags", parameters: { layout: "padded", surface: "grouped" } };
export default meta;
type Story = StoryObj;

function useToggle(initial: string[]) {
  const [sel, setSel] = React.useState<Set<TagId>>(() => new Set(initial.map((n) => tagByName(n).id)));
  const toggle = (t: Tag) =>
    setSel((s) => {
      const next = new Set(s);
      if (next.has(t.id)) next.delete(t.id);
      else next.add(t.id);
      return next;
    });
  return [sel, toggle] as const;
}

export const TagChips: Story = {
  name: "Chips",
  render: () => (
    <Stack>
      <Text variant="label">With counts</Text>
      <Row className="gap-2">
        <Chip label="Christmas" count={14} />
        <Chip label="Potluck" count={6} />
        <Chip label="Mains" count={22} selected />
      </Row>
      <Text variant="label">Picked, tap to remove</Text>
      <Row className="gap-2">
        <Chip label="Breads" selected removable />
        <Chip label="Christmas" selected removable />
      </Row>
    </Stack>
  ),
};

export const Cloud: Story = {
  render: function Render() {
    const [sel, toggle] = useToggle(["Christmas"]);
    return (
      <Stack className="max-w-[358px]">
        <Text variant="section">Occasion</Text>
        <TagCloud tags={sampleTags.filter((t) => t.tagGroup === "occasion")} selected={sel} onToggle={toggle} />
      </Stack>
    );
  },
};

export const FormField: Story = {
  name: "Tag field",
  render: function Render() {
    const [tags, setTags] = React.useState<Tag[]>([tagByName("Breads"), tagByName("Christmas")]);
    return (
      <Stack className="max-w-[358px] gap-6">
        <TagField tags={tags} onRemove={(t) => setTags((ts) => ts.filter((x) => x.id !== t.id))} onAdd={() => setTags([tagByName("Breads"), tagByName("Christmas")])} />
        <TagField tags={[tagByName("Christmas")]} label="Missing a Course" />
        <TagField tags={[tagByName("Desserts"), tagByName("Chocolate")]} suggested={new Set([tagByName("Desserts").id, tagByName("Chocolate").id])} label="Imported, check these" />
      </Stack>
    );
  },
};

export const Picker: Story = {
  name: "Tag picker",
  parameters: { surface: "none" },
  render: function Render() {
    const [sel, toggle] = useToggle(["Breads", "Christmas"]);
    return (
      <Phone>
        <View className="flex-1 bg-grouped pt-14">
          <SheetSurface title="Tags" cancel={{ label: "Cancel" }} confirm={{ label: "Done" }} fill>
            <ScrollView className="px-4 pt-2" contentContainerStyle={{ paddingBottom: 40 }}>
              <TagPicker tags={sampleTags} selected={sel} onToggle={toggle} courseLimit={5} />
            </ScrollView>
          </SheetSurface>
        </View>
      </Phone>
    );
  },
};

export const Narrow: Story = {
  name: "Tag page, narrowed",
  parameters: { surface: "none" },
  render: function Render() {
    const [extra, setExtra] = React.useState<Tag[]>([tagByName("Christmas")]);
    return (
      <Phone>
        <View className="flex-1 bg-background px-[18px] pt-14">
          <Toolbar left={<IconButton icon="back" label="All tags" />} right={<IconButton icon="more" label="Sort" />} />
          <View className="gap-1 pt-3">
            <Text variant="section" className="text-primary">Course</Text>
            <Text variant="largeTitle">Cookies &amp; Bars</Text>
            <View className="mb-2 mt-1">
              <NarrowRow
                extra={extra}
                onRemove={(t) => setExtra((e) => e.filter((x) => x.id !== t.id))}
                onNarrow={() => setExtra((e) => (e.length ? e : [tagByName("Christmas")]))}
              />
            </View>
            <Text variant="footnote">{extra.length ? "8 recipes with both tags · A–Z" : "19 recipes · A–Z"}</Text>
            <RecipeRow title="Peppermint Bark Brownies" meta="Grandma Hiller · Make Ahead" />
            <RecipeRow title="Gingerbread Bars" meta="Grandma Raske" />
            <RecipeRow title="Sugar Cookie Cutouts" meta="Grandma Homer · Kid Favorite" />
          </View>
        </View>
      </Phone>
    );
  },
};
