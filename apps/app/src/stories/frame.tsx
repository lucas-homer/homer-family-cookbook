import * as React from "react";
import { View } from "react-native";
import { cn } from "@/lib/utils";

/** Story helpers. Not part of the app. */
export function Phone({ children, grouped, className }: { children: React.ReactNode; grouped?: boolean; className?: string }) {
  return (
    <View
      className={cn("overflow-hidden", grouped ? "bg-grouped" : "bg-background", className)}
      style={{ width: 390, height: 844, borderRadius: 54, boxShadow: "0 0 0 10px #1a1a1a, 0 24px 60px rgba(0,0,0,0.25)" }}
    >
      {children}
    </View>
  );
}

export function Row({ children, className }: { children: React.ReactNode; className?: string }) {
  return <View className={cn("flex-row flex-wrap items-center gap-3", className)}>{children}</View>;
}

export function Stack({ children, className }: { children: React.ReactNode; className?: string }) {
  return <View className={cn("gap-4", className)}>{children}</View>;
}

/** Flat color blocks behind glass so the blur shows. */
export function Backdrop({ children, height = 220 }: { children?: React.ReactNode; height?: number }) {
  return (
    <View className="overflow-hidden rounded-card bg-muted" style={{ height }}>
      <View className="absolute rounded-full bg-primary" style={{ width: 160, height: 160, left: 30, top: 20 }} />
      <View className="absolute rounded-full bg-accent" style={{ width: 200, height: 200, left: 170, top: 60 }} />
      <View className="absolute rounded-card bg-success" style={{ width: 120, height: 90, left: 360, top: 10 }} />
      <View className="absolute inset-0 items-center justify-center gap-3 p-4">{children}</View>
    </View>
  );
}
