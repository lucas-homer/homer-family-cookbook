import * as React from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { useTheme, type ColorToken } from "@/theme";

/** Line icons drawn to match SF Symbols weight. 24pt grid, round caps. */
const paths = {
  search: <><Circle cx="11" cy="11" r="6.5" /><Path d="M20 20l-4.2-4.2" /></>,
  plus: <Path d="M12 5v14M5 12h14" />,
  minus: <Path d="M5 12h14" />,
  back: <Path d="M15 5l-7 7 7 7" />,
  chevron: <Path d="M9 5l7 7-7 7" />,
  x: <Path d="M6 6l12 12M18 6L6 18" />,
  more: <><Circle cx="5" cy="12" r="1.3" /><Circle cx="12" cy="12" r="1.3" /><Circle cx="19" cy="12" r="1.3" /></>,
  heart: <Path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  timer: <><Circle cx="12" cy="13" r="7" /><Path d="M12 9v4l2.5 2M10 3h4" /></>,
  check: <Path d="M6 12.5l4 4 8-9" />,
  book: <><Path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" /><Path d="M5 17a3 3 0 0 1 3-3h11" /></>,
  pot: <><Path d="M4 10h16v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" /><Path d="M2 10h20M9 6c0-1 .5-2 1.5-2M14 6c0-1 .5-2 1.5-2" /></>,
  edit: <Path d="M4 20h4L19 9l-4-4L4 16z" />,
  trash: <Path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />,
  note: <><Path d="M5 4h14v12l-4 4H5z" /><Path d="M15 20v-4h4" /></>,
  share: <Path d="M12 3v12M7 8l5-5 5 5M5 14v6h14v-6" />,
  clock: <><Circle cx="12" cy="12" r="8" /><Path d="M12 8v4l3 2" /></>,
  grip: <Path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" />,
  camera: <><Path d="M4 8h3l2-3h6l2 3h3v11H4z" /><Circle cx="12" cy="13" r="3.5" /></>,
  link: <Path d="M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1" />,
  tag: <><Path d="M3 12V4h8l10 10-8 8z" /><Circle cx="8" cy="9" r="1.5" /></>,
  person: <><Circle cx="12" cy="8" r="4" /><Path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>,
  mail: <><Rect x="3" y="5" width="18" height="14" rx="2" /><Path d="M3 7l9 6 9-6" /></>,
  key: <><Circle cx="8" cy="15" r="4" /><Path d="M11 12l9-9M17 6l3 3" /></>,
  bell: <><Path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" /><Path d="M10 20a2 2 0 0 0 4 0" /></>,
  sparkle: <Path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />,
  recent: <><Path d="M4 12a8 8 0 1 0 2.5-5.8M4 4v4h4" /><Path d="M12 8v4l3 2" /></>,
  mic: <><Rect x="9" y="3" width="6" height="11" rx="3" /><Path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>,
  keyboard: <><Rect x="2" y="6" width="20" height="12" rx="2" /><Path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" /></>,
  play: <Path d="M8 5l11 7-11 7z" />,
  pause: <Path d="M8 5v14M16 5v14" />,
  photo: <><Rect x="3" y="5" width="18" height="14" rx="2" /><Circle cx="9" cy="10" r="1.5" /><Path d="M21 16l-5-5-9 8" /></>,
  gear: <><Circle cx="12" cy="12" r="3" /><Path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" /></>,
} as const;

export type IconName = keyof typeof paths;
export const iconNames = Object.keys(paths) as IconName[];

export type IconProps = {
  name: IconName;
  size?: number;
  /** A theme color token, or any CSS color. Defaults to foreground. */
  color?: ColorToken | (string & {});
  strokeWidth?: number;
  /** Filled shapes (a favorited heart, the play glyph). */
  filled?: boolean;
};

export function Icon({ name, size = 20, color = "foreground", strokeWidth = 2, filled = false }: IconProps) {
  const { colors } = useTheme();
  const c = (colors as Record<string, string>)[color] ?? color;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? c : "none"}
      stroke={c}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {paths[name]}
    </Svg>
  );
}
