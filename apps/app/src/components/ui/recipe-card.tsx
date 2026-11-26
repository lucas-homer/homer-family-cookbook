import * as React from "react";
import { Pressable, View, type ImageSourcePropType } from "react-native";
import { Icon } from "./icon";
import { Photo } from "./photo";
import { Text } from "./text";

export type RecipeSummary = {
  title: string;
  /** Category, or "Breads · 25 min". */
  meta?: string;
  author?: string;
  photo?: ImageSourcePropType;
  favorite?: boolean;
};

export type RecipeCardProps = RecipeSummary & { onPress?: () => void; photoHeight?: number };

/** Grid card for Library and Favorites. Title in Newsreader. */
export function RecipeCard({ title, meta, photo, favorite, onPress, photoHeight = 150 }: RecipeCardProps) {
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={title} onPress={onPress} className="gap-1.5 active:opacity-80">
      <View>
        <Photo source={photo} alt={`Photo of ${title}`} height={photoHeight} />
        {favorite ? (
          <View className="absolute right-2 top-2 h-8 w-8 items-center justify-center rounded-full bg-card/90">
            <Icon name="heart" size={16} filled color="primary" />
          </View>
        ) : null}
      </View>
      <Text serif className="text-[17px] font-semibold leading-[20px]">
        {title}
      </Text>
      {meta ? <Text variant="caption" className="-mt-0.5 font-normal">{meta}</Text> : null}
    </Pressable>
  );
}

export type RecipeRowProps = RecipeSummary & { onPress?: () => void; trailing?: React.ReactNode };

/** List row with a thumbnail: search results, My recipes, Recently viewed. */
export function RecipeRow({ title, meta, photo, onPress, trailing }: RecipeRowProps) {
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={title} onPress={onPress} className="flex-row items-center gap-3.5 py-2.5 active:opacity-80">
      <Photo source={photo} alt={`Photo of ${title}`} height={60} width={60} rounded="thumb" />
      <View className="min-w-0 flex-1 gap-0.5">
        <Text serif className="text-[18px] font-semibold leading-[21px]" numberOfLines={2}>
          {title}
        </Text>
        {meta ? <Text variant="footnote">{meta}</Text> : null}
      </View>
      {trailing ?? <Icon name="chevron" size={16} strokeWidth={2.4} color="chevron" />}
    </Pressable>
  );
}
