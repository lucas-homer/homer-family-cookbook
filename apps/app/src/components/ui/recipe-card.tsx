import * as React from "react";
import { Pressable, View, type ImageSourcePropType } from "react-native";
import { cn } from "@/lib/utils";
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

/** Grid card for Library and Favorites. Title in Newsreader. Without a photo, the title fills the card instead. */
export function RecipeCard({ title, meta, photo, favorite, onPress, photoHeight = 150 }: RecipeCardProps) {
  if (!photo) {
    return (
      <Pressable accessibilityRole="link" accessibilityLabel={title} onPress={onPress} className="active:opacity-80">
        <View className="justify-end gap-1 rounded-card border border-border/10 bg-card p-3" style={{ height: photoHeight + 44 }}>
          {favorite ? (
            <View className="absolute right-2 top-2">
              <Icon name="heart" size={16} filled color="primary" />
            </View>
          ) : null}
          <Text serif className="text-[19px] font-semibold leading-[22px]" numberOfLines={4}>
            {title}
          </Text>
          {meta ? <Text variant="caption" className="font-normal">{meta}</Text> : null}
        </View>
      </Pressable>
    );
  }
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

/** List row: search results, My recipes, Recently viewed. The thumbnail shows only when there's a photo. */
export function RecipeRow({ title, meta, photo, onPress, trailing }: RecipeRowProps) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={title}
      onPress={onPress}
      className={cn("flex-row items-center gap-3.5 active:opacity-80", photo ? "py-2.5" : "min-h-[60px] py-3")}
    >
      {photo ? <Photo source={photo} alt={`Photo of ${title}`} height={60} width={60} rounded="thumb" /> : null}
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
