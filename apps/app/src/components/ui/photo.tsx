import * as React from "react";
import { Image, Pressable, View, type ImageSourcePropType } from "react-native";
import { cn } from "@/lib/utils";
import { Icon } from "./icon";
import { Text } from "./text";

export type PhotoProps = {
  source?: ImageSourcePropType;
  /** Describes the photo for VoiceOver. */
  alt: string;
  height?: number;
  width?: number;
  rounded?: "thumb" | "card" | "none";
  className?: string;
};

/** Recipe photo. Without a source, shows the warm placeholder. */
export function Photo({ source, alt, height = 150, width, rounded = "card", className }: PhotoProps) {
  const r = rounded === "thumb" ? "rounded-thumb" : rounded === "card" ? "rounded-card" : "";
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={alt}
      className={cn("overflow-hidden bg-muted", r, className)}
      style={{ height, width }}
    >
      {source ? <Image source={source} style={{ width: "100%", height: "100%" }} resizeMode="cover" /> : null}
    </View>
  );
}

export type AddPhotoProps = { note?: string; onPress?: () => void; className?: string };

/** Dashed drop target at the top of the recipe form. */
export function AddPhoto({ note, onPress, className }: AddPhotoProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Add a photo"
      onPress={onPress}
      className={cn("h-24 items-center justify-center gap-1 rounded-card border-2 border-dashed border-border/20 active:opacity-70", className)}
    >
      <View className="flex-row items-center gap-2">
        <Icon name="camera" size={22} color="mutedForeground" />
        <Text variant="subhead" className="font-semibold text-muted-foreground">
          Add a photo
        </Text>
      </View>
      {note ? <Text variant="caption" className="font-normal">{note}</Text> : null}
    </Pressable>
  );
}
