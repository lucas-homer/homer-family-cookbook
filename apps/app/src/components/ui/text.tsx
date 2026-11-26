import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { Platform, Text as RNText, type TextProps as RNTextProps } from "react-native";
import { cn } from "@/lib/utils";

export const textVariants = cva("text-foreground font-sans", {
  variants: {
    variant: {
      largeTitle: "text-large-title font-serif font-medium tracking-tight",
      title1: "text-title-1 font-serif font-medium tracking-tight",
      title2: "text-title-2 font-serif font-medium",
      title3: "text-title-3 font-semibold",
      headline: "text-headline font-semibold",
      body: "text-body",
      callout: "text-callout",
      subhead: "text-subhead",
      footnote: "text-footnote text-muted-foreground",
      caption: "text-caption font-semibold text-muted-foreground",
      label: "text-footnote font-semibold text-muted-foreground",
      section: "text-footnote font-semibold uppercase tracking-wide text-muted-foreground",
      step: "text-step font-serif font-medium",
    },
    /** Newsreader, for recipe names and editorial moments. */
    serif: { true: "font-serif", false: "" },
  },
  defaultVariants: { variant: "body", serif: false },
});

const WEIGHT = /\bfont-(normal|medium|semibold|bold)\b/g;

/**
 * Picks the font file for the weight. On native each weight of a custom font
 * is its own family and fontWeight would fall back to the system font, so
 * the weight class becomes a family and is dropped. Web keeps both.
 */
export function withFontFamily(classes: string) {
  const serif = /\bfont-serif(-\w+)?\b/.test(classes);
  const weights = [...classes.matchAll(WEIGHT)].map((m) => m[1]);
  const weight = weights.at(-1) ?? (serif ? "medium" : "normal");
  const family = serif
    ? weight === "normal"
      ? "font-serif-regular"
      : weight === "medium"
        ? "font-serif"
        : "font-serif-semibold"
    : weight === "normal"
      ? "font-sans"
      : `font-sans-${weight}`;
  const merged = cn(classes, family);
  return Platform.OS === "web" ? merged : merged.replace(WEIGHT, "").replace(/\s+/g, " ").trim();
}

export type TextProps = RNTextProps & VariantProps<typeof textVariants> & { className?: string };

export function Text({ variant, serif, className, ...props }: TextProps) {
  return <RNText className={withFontFamily(cn(textVariants({ variant, serif }), className))} {...props} />;
}
