import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import * as React from "react";
import { Button, IconButton, Text, iconNames } from "@/components/ui";
import { Backdrop, Row, Stack } from "./frame";

const meta: Meta<typeof Button> = {
  title: "Components/Button",
  component: Button,
  parameters: { layout: "padded" },
  args: { label: "Start cooking", variant: "primary", size: "lg", block: false, loading: false, disabled: false },
  argTypes: {
    variant: { control: "inline-radio", options: ["primary", "secondary", "butter", "destructive", "text"] },
    size: { control: "inline-radio", options: ["sm", "md", "lg", "xl"] },
    icon: { control: "select", options: [undefined, ...iconNames] },
  },
};
export default meta;
type Story = StoryObj<typeof Button>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <Stack>
      <Row>
        <Button label="Next step" />
        <Button label="Back" variant="secondary" />
        <Button label="Start 12 min" variant="butter" icon="timer" />
        <Button label="Delete recipe" variant="destructive" icon="trash" />
        <Button label="Save" variant="text" />
      </Row>
      <Text variant="footnote">Primary is the one main action on a screen. Secondary is glass. Butter starts timers.</Text>
    </Stack>
  ),
};

export const Sizes: Story = {
  render: () => (
    <Row className="items-end">
      <Button label="Small" size="sm" />
      <Button label="Medium" size="md" />
      <Button label="Large" size="lg" />
      <Button label="Stop" size="xl" />
    </Row>
  ),
};

export const States: Story = {
  render: () => (
    <Row>
      <Button label="Saving" loading />
      <Button label="Save" disabled />
      <Button label="Add ingredient" icon="plus" variant="secondary" />
    </Row>
  ),
};

export const FullWidth: Story = {
  render: () => (
    <Stack className="max-w-[358px]">
      <Button label="Start cooking" block />
      <Button label="Not now" variant="secondary" block />
    </Stack>
  ),
};

export const IconButtons: Story = {
  render: () => (
    <Backdrop>
      <Row>
        <IconButton icon="back" label="Back" />
        <IconButton icon="heart" label="Favorite" />
        <IconButton icon="share" label="Share" />
        <IconButton icon="more" label="More" />
        <IconButton icon="plus" label="New recipe" variant="primary" />
        <IconButton icon="x" label="Close" variant="plain" />
      </Row>
    </Backdrop>
  ),
};
