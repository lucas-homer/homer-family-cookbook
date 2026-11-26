import * as React from "react";
import { Image, View } from "react-native";
import { cn } from "@/lib/utils";
import { Text } from "./text";

export type AvatarProps = { name: string; uri?: string; size?: number; className?: string };

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "")).toUpperCase();
}

/** Butter circle with initials, or the person's photo. */
export function Avatar({ name, uri, size = 36, className }: AvatarProps) {
  const dims = { width: size, height: size };
  return (
    <View accessibilityLabel={name} className={cn("items-center justify-center overflow-hidden rounded-full bg-accent", className)} style={dims}>
      {uri ? (
        <Image source={{ uri }} style={dims} />
      ) : (
        <Text className="font-bold text-accent-foreground" style={{ fontSize: Math.round(size * 0.38) }}>
          {initials(name)}
        </Text>
      )}
    </View>
  );
}
