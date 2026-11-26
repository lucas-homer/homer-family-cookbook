import { router } from "expo-router";
import * as React from "react";
import { useWindowDimensions, View } from "react-native";
import { Text } from "@/components/ui";
import { RecipeDetail } from "./recipe-detail";

/** iPad (and wide windows): the list sits beside the open recipe. */
export const SPLIT_MIN_WIDTH = 768;
const LIST_WIDTH = 380;

export function useIsSplit() {
  return useWindowDimensions().width >= SPLIT_MIN_WIDTH;
}

/**
 * Opening a recipe from a list: on iPhone it pushes the recipe screen; in
 * split view it shows in the right-hand pane and the list stays put.
 */
export function useRecipeOpener() {
  const split = useIsSplit();
  const [selected, setSelected] = React.useState<string | null>(null);
  const open = React.useCallback((id: string) => (split ? setSelected(id) : router.push(`/recipe/${id}`)), [split]);
  return { split, selected: split ? selected : null, open };
}

export function SplitView({ split, selected, children }: { split: boolean; selected: string | null; children: React.ReactNode }) {
  if (!split) return <>{children}</>;
  return (
    <View className="flex-1 flex-row bg-background">
      <View style={{ width: LIST_WIDTH }} className="border-r border-border/10">
        {children}
      </View>
      <View className="flex-1">
        {selected ? (
          <RecipeDetail key={selected} id={selected} />
        ) : (
          <View className="flex-1 items-center justify-center px-10">
            <Text variant="title3" className="text-muted-foreground">
              Pick a recipe
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
