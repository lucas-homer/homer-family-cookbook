// Mirrors src/lib/tag-groups.ts on the site (tags are stored as categories
// with a tag_group). Copied rather than imported so the app stays separate.
export const TAG_GROUPS = [
  { id: "course", label: "Course" },
  { id: "ingredient", label: "Ingredient" },
  { id: "kind", label: "Kind" },
  { id: "occasion", label: "Occasion" },
  { id: "family", label: "Family" },
  { id: "source", label: "Source" },
  { id: "practical", label: "Good to know" },
] as const;

export type TagGroup = (typeof TAG_GROUPS)[number]["id"];

/** Every recipe needs at least one tag from this group. */
export const REQUIRED_GROUP: TagGroup = "course";

/** Narrowing a tag page combines at most this many tags (AND). */
export const MAX_COMBINED_TAGS = 8;

export type TagId = string | number;
export type Tag = { id: TagId; name: string; tagGroup: TagGroup | (string & {}); count?: number };

const order = new Map<string, number>(TAG_GROUPS.map((g, i) => [g.id, i]));

export function tagGroupLabel(id: string): string {
  return TAG_GROUPS.find((g) => g.id === id)?.label ?? id;
}

export function compareTags(a: Pick<Tag, "tagGroup" | "name">, b: Pick<Tag, "tagGroup" | "name">): number {
  return (order.get(a.tagGroup) ?? 99) - (order.get(b.tagGroup) ?? 99) || a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

/** Groups tags into TAG_GROUPS order, skipping empty groups. */
export function groupTags<T extends Pick<Tag, "tagGroup" | "name">>(tags: readonly T[]) {
  return TAG_GROUPS.map((g) => ({ id: g.id, label: g.label, tags: tags.filter((t) => t.tagGroup === g.id).sort(compareTags) })).filter(
    (g) => g.tags.length > 0,
  );
}

export function hasRequiredTag(tags: readonly Pick<Tag, "tagGroup">[]): boolean {
  return tags.some((t) => t.tagGroup === REQUIRED_GROUP);
}
