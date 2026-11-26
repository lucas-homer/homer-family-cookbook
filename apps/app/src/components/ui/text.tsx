import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { Text as RNText, type TextProps as RNTextProps } from "react-native";
import { cn } from "@/lib/utils";

export const textVariants = cva("text-foreground font-sans", {
  variants: {
    variant: {
      largeTitle: "text-large-title font-bold tracking-tight",
      title1: "text-title-1 font-bold tracking-tight",
      title2: "text-title-2 font-bold",
      title3: "text-title-3 font-semibold",
      headline: "text-headline font-semibold",
      body: "text-body",
      callout: "text-callout",
      subhead: "text-subhead",
      footnote: "text-footnote text-muted-foreground",
      caption: "text-caption font-semibold text-muted-foreground",
      label: "text-footnote font-semibold text-muted-foreground",
      section: "text-footnote font-semibold uppercase tracking-wide text-muted-foreground",
      step: "text-step font-bold tracking-tight",
    },
    /** New York, for recipe names and editorial moments. */
    serif: { true: "font-serif", false: "" },
  },
  defaultVariants: { variant: "body", serif: false },
});

export type TextProps = RNTextProps & VariantProps<typeof textVariants> & { className?: string };

export function Text({ variant, serif, className, ...props }: TextProps) {
  return <RNText className={cn(textVariants({ variant, serif }), className)} {...props} />;
}
