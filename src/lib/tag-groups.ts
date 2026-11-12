// Tags are grouped so the browse page, recipe form and recipe page can show
// them in a stable, meaningful order. Stored in categories.tag_group.
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
export const TAG_GROUP_IDS = TAG_GROUPS.map((group) => group.id) as unknown as readonly [TagGroup, ...TagGroup[]];

const order = new Map<string, number>(TAG_GROUPS.map((group, index) => [group.id, index]));

export function tagGroupLabel(id: string): string {
  return TAG_GROUPS.find((group) => group.id === id)?.label ?? id;
}

// Sorts tags by group order, then name.
export function compareTags(
  a: { readonly tagGroup: string; readonly name: string },
  b: { readonly tagGroup: string; readonly name: string },
): number {
  return (
    (order.get(a.tagGroup) ?? 99) - (order.get(b.tagGroup) ?? 99) ||
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );
}

// Groups tags (already in any order) into TAG_GROUPS order, skipping empty groups.
export function groupTags<T extends { readonly tagGroup: string; readonly name: string }>(
  tags: ReadonlyArray<T>,
): Array<{ id: string; label: string; tags: T[] }> {
  return TAG_GROUPS.map((group) => ({
    id: group.id,
    label: group.label,
    tags: tags.filter((tag) => tag.tagGroup === group.id).sort(compareTags),
  })).filter((group) => group.tags.length > 0);
}
