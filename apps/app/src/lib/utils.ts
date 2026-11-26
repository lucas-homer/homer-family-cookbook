import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Teach tailwind-merge our custom text sizes and radii, or it mistakes
// text-headline for a color and drops text-foreground.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        { text: ["large-title", "title-1", "title-2", "title-3", "headline", "body", "callout", "subhead", "footnote", "caption", "step", "timer"] },
      ],
      rounded: [{ rounded: ["thumb", "field", "card", "panel", "sheet"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
