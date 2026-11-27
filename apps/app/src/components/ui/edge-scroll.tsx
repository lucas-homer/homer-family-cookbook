import * as React from "react";
import { ScrollView, type ScrollViewProps } from "react-native";

/** The side margin every screen uses. */
export const GUTTER = 18;

/**
 * A horizontal list that lines up with the page's margin at rest but scrolls
 * all the way to the edges of the screen (or pane), instead of being cut off
 * at the margin. Use it for every sideways list in the app.
 */
export function EdgeScroll({
  gap = 8,
  gutter = GUTTER,
  style,
  contentContainerStyle,
  ...props
}: ScrollViewProps & { gap?: number; gutter?: number }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      {...props}
      style={[{ marginHorizontal: -gutter, flexGrow: 0 }, style]}
      contentContainerStyle={[
        { gap, paddingHorizontal: gutter },
        contentContainerStyle,
      ]}
    />
  );
}
