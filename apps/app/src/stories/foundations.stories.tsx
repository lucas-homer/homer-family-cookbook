import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import * as React from "react";
import { View } from "react-native";
import { Glass, Icon, iconNames, Text } from "@/components/ui";
import { colors, radius, space, type as typeScale } from "@/theme";
import { useTheme } from "@/theme/use-theme";
import { Backdrop, Row, Stack } from "./frame";

const meta: Meta = { title: "Foundations", parameters: { layout: "padded" } };
export default meta;
type Story = StoryObj;

const groups: { title: string; keys: (keyof typeof colors.light)[] }[] = [
  { title: "Surfaces", keys: ["background", "grouped", "card", "muted", "accentSoft"] },
  { title: "Ink", keys: ["foreground", "mutedForeground", "placeholder", "chevron"] },
  { title: "Brand", keys: ["primary", "primaryForeground", "accent", "accentForeground"] },
  { title: "Status", keys: ["success", "successForeground", "destructive"] },
  { title: "Lines and glass", keys: ["separator", "hairline", "glassFill", "glassFillStrong", "glassEdge", "scrim"] },
];

const roles: Partial<Record<keyof typeof colors.light, string>> = {
  background: "Paper. Library, recipe, cook mode",
  grouped: "Forms, settings, sheets",
  primary: "Tomato. Main actions, selection",
  accent: "Butter. Timers, highlights",
  accentSoft: "Fields just heard or to check",
  muted: "Photo placeholder",
};

function Swatch({ name, value }: { name: string; value: string }) {
  return (
    <View className="w-[168px] gap-1.5">
      <View className="h-16 rounded-field border border-border/10" style={{ backgroundColor: value }} />
      <Text variant="subhead" className="font-semibold">
        {name}
      </Text>
      <Text variant="footnote">{value}</Text>
      {roles[name as keyof typeof roles] ? <Text variant="footnote">{roles[name as keyof typeof roles]}</Text> : null}
    </View>
  );
}

export const Colors: Story = {
  render: function Render() {
    const { colors: c, scheme } = useTheme();
    return (
      <Stack className="gap-6">
        <Text variant="largeTitle">Colors · {scheme}</Text>
        <Text variant="callout" className="max-w-[640px] text-muted-foreground">
          Tomato and butter on warm paper. Classes use the same names (bg-primary, text-muted-foreground) and read CSS
          variables, so dark mode needs no extra classes. Raw values for icons and glass tint come from src/theme/tokens.ts.
        </Text>
        {groups.map((g) => (
          <Stack key={g.title} className="gap-2">
            <Text variant="section">{g.title}</Text>
            <Row className="items-start gap-4">
              {g.keys.map((k) => (
                <Swatch key={k} name={k} value={c[k]} />
              ))}
            </Row>
          </Stack>
        ))}
      </Stack>
    );
  },
};

const typeRows: { v: React.ComponentProps<typeof Text>["variant"]; key: keyof typeof typeScale | "label" | "section"; sample: string; serif?: boolean }[] = [
  { v: "largeTitle", key: "largeTitle", sample: "Library" },
  { v: "title1", key: "title1", sample: "Grandma's Buttermilk Biscuits", serif: true },
  { v: "title2", key: "title2", sample: "Ingredients" },
  { v: "title3", key: "title3", sample: "Sunday Pot Roast", serif: true },
  { v: "headline", key: "headline", sample: "New recipe" },
  { v: "body", key: "body", sample: "Cut in the cold butter until crumbly." },
  { v: "callout", key: "callout", sample: "Heat the oven to 450°F. Whisk the flour and baking powder." },
  { v: "subhead", key: "subhead", sample: "Breads · 25 min · Makes 12" },
  { v: "footnote", key: "footnote", sample: "Added by Lucas · edited last week" },
  { v: "caption", key: "caption", sample: "4 INGREDIENTS" },
  { v: "label", key: "label", sample: "Total time" },
  { v: "section", key: "section", sample: "Timers" },
  { v: "step", key: "step", sample: "Pat out, fold twice, cut." },
];

export const Typography: Story = {
  render: () => (
    <Stack className="gap-5">
      <Text variant="largeTitle">Typography</Text>
      <Text variant="callout" className="max-w-[640px] text-muted-foreground">
        SF Pro for the interface, New York for recipe names. Sizes follow Apple’s text styles, so they scale with Dynamic Type.
        Step is a large size for reading cook mode from across the counter.
      </Text>
      {typeRows.map((r) => {
        const spec = (typeScale as Record<string, { size: number; line: number; weight: string }>)[r.key];
        return (
          <View key={r.key} className="flex-row items-baseline gap-6 border-b border-border/10 pb-3">
            <View className="w-[150px]">
              <Text variant="subhead" className="font-semibold">
                {r.v}
                {r.serif ? " · serif" : ""}
              </Text>
              <Text variant="footnote">{spec ? `${spec.size}/${spec.line} · ${spec.weight}` : "13/18 · 600"}</Text>
            </View>
            <Text variant={r.v} serif={r.serif} className="flex-1">
              {r.sample}
            </Text>
          </View>
        );
      })}
    </Stack>
  ),
};

export const SpacingAndRadius: Story = {
  name: "Spacing & radius",
  render: () => (
    <Stack className="gap-6">
      <Text variant="largeTitle">Spacing & radius</Text>
      <Text variant="section">Spacing (4pt grid)</Text>
      <Stack className="gap-2">
        {Object.entries(space).filter(([, v]) => v > 0).map(([k, v]) => (
          <Row key={k}>
            <Text variant="footnote" className="w-16">
              {k} · {v}pt
            </Text>
            <View className="h-4 rounded-sm bg-primary" style={{ width: v * 4 }} />
          </Row>
        ))}
      </Stack>
      <Text variant="section">Radius</Text>
      <Row className="items-end gap-5">
        {Object.entries(radius).map(([k, v]) => (
          <View key={k} className="items-center gap-2">
            <View className="h-24 w-24 border-[1.5px] border-primary bg-card" style={{ borderRadius: Math.min(v, 48) }} />
            <Text variant="subhead" className="font-semibold">
              {k}
            </Text>
            <Text variant="footnote">{v === 999 ? "full" : `${v}pt`}</Text>
          </View>
        ))}
      </Row>
      <Text variant="footnote" className="max-w-[560px]">
        thumb: list thumbnails · field: text fields · card: cards, grouped lists, photos · panel: popovers and cook-mode controls ·
        sheet: top corners of sheets · pill: buttons, chips, tab bar.
      </Text>
    </Stack>
  ),
};

export const Icons: Story = {
  render: () => (
    <Stack>
      <Text variant="largeTitle">Icons</Text>
      <Text variant="callout" className="max-w-[640px] text-muted-foreground">
        Line icons at SF Symbols weight on a 24pt grid. On iOS these can be swapped for real SF Symbols later without changing call sites.
      </Text>
      <Row className="gap-2">
        {iconNames.map((n) => (
          <View key={n} className="h-[88px] w-[96px] items-center justify-center gap-2 rounded-field bg-card">
            <Icon name={n} size={24} />
            <Text variant="footnote">{n}</Text>
          </View>
        ))}
      </Row>
    </Stack>
  ),
};

export const GlassMaterials: Story = {
  name: "Glass",
  render: () => (
    <Stack>
      <Text variant="largeTitle">Glass</Text>
      <Text variant="callout" className="max-w-[640px] text-muted-foreground">
        On iOS 26 the system draws Liquid Glass (expo-glass-effect). Older iOS and Android get a blur material, and the web gets
        backdrop-filter with the same fill and bright edge. Use regular for toolbars and round buttons, strong for panels with
        text, clear over photos.
      </Text>
      <Backdrop height={260}>
        <Row className="gap-4">
          {(["regular", "strong", "clear"] as const).map((v) => (
            <Glass key={v} variant={v} className="h-28 w-44 items-center justify-center rounded-card">
              <Text variant="headline">{v}</Text>
            </Glass>
          ))}
        </Row>
      </Backdrop>
    </Stack>
  ),
};
