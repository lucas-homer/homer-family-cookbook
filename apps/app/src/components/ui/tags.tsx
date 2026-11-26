import * as React from "react";
import { Pressable, TextInput, View } from "react-native";
import { groupTags, hasRequiredTag, MAX_COMBINED_TAGS, type Tag } from "@/lib/tags";
import { cn } from "@/lib/utils";
import { useTheme } from "@/theme/use-theme";
import { Chip } from "./chip";
import { Glass } from "./glass";
import { Icon } from "./icon";
import { Text } from "./text";

/** A row of tag chips that wraps. */
export function TagCloud({
  tags,
  selected,
  onToggle,
  surface = "solid",
  showCounts = true,
  className,
}: {
  tags: Tag[];
  selected?: ReadonlySet<number>;
  onToggle?: (tag: Tag) => void;
  surface?: "glass" | "solid";
  showCounts?: boolean;
  className?: string;
}) {
  return (
    <View className={cn("flex-row flex-wrap gap-2", className)}>
      {tags.map((t) => (
        <Chip
          key={t.id}
          label={t.name}
          count={showCounts ? t.count : undefined}
          selected={selected?.has(t.id)}
          surface={surface}
          onPress={onToggle ? () => onToggle(t) : undefined}
        />
      ))}
    </View>
  );
}

/**
 * Tags on the recipe form. Shows what is picked and opens the picker.
 * Warns until there is a Course tag, which every recipe needs.
 */
export function TagField({
  tags,
  onAdd,
  onRemove,
  label = "Tags",
  suggested,
}: {
  tags: Tag[];
  onAdd?: () => void;
  onRemove?: (tag: Tag) => void;
  label?: string;
  /** Imported recipes: tags we guessed, shown in butter to check. */
  suggested?: ReadonlySet<number>;
}) {
  const needsCourse = !hasRequiredTag(tags);
  return (
    <View className="gap-1.5">
      <Text variant="label">{label}</Text>
      <View className="flex-row flex-wrap items-center gap-2">
        {tags.map((t) => (
          <Chip
            key={t.id}
            label={t.name}
            selected={!suggested?.has(t.id)}
            surface="solid"
            removable={!!onRemove}
            className={suggested?.has(t.id) ? "border-accent bg-accent-soft" : undefined}
            onPress={onRemove ? () => onRemove(t) : undefined}
          />
        ))}
        <Pressable
          accessibilityRole="button"
          onPress={onAdd}
          className="h-9 flex-row items-center gap-1.5 rounded-full border border-dashed border-primary/50 px-3.5 active:opacity-70"
        >
          <Icon name="plus" size={15} strokeWidth={2.4} color="primary" />
          <Text variant="subhead" className="font-semibold text-primary">
            {tags.length ? "More" : "Add tags"}
          </Text>
        </Pressable>
      </View>
      {needsCourse ? <Text variant="footnote">Needs a Course, like Breads or Mains.</Text> : null}
    </View>
  );
}

function CheckRow({ tag, on, onPress, last }: { tag: Tag; on: boolean; onPress?: () => void; last?: boolean }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      onPress={onPress}
      className={cn("min-h-[46px] flex-row items-center gap-3 px-3.5 active:bg-border/5", !last && "border-b border-border/10")}
    >
      {on ? (
        <View className="h-[26px] w-[26px] items-center justify-center rounded-full bg-primary">
          <Icon name="check" size={15} strokeWidth={3} color="primaryForeground" />
        </View>
      ) : (
        <View className="h-[26px] w-[26px] rounded-full border-2 border-border/25" />
      )}
      <Text className="flex-1">{tag.name}</Text>
      {tag.count != null ? <Text variant="subhead" className="text-muted-foreground">{tag.count}</Text> : null}
    </Pressable>
  );
}

function SearchField({ value, onChangeText, placeholder }: { value: string; onChangeText: (v: string) => void; placeholder: string }) {
  const { colors } = useTheme();
  return (
    <View className="h-[42px] flex-row items-center gap-2 rounded-[14px] bg-border/10 px-3">
      <Icon name="search" size={18} color="mutedForeground" />
      <TextInput
        accessibilityLabel={placeholder}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        className="flex-1 font-sans text-body text-foreground"
      />
    </View>
  );
}

/**
 * The tag picker sheet body. Course is a checklist (pick at least one);
 * the other groups are chip clouds. Search filters every group.
 */
export function TagPicker({
  tags,
  selected,
  onToggle,
  courseLimit = 6,
}: {
  tags: Tag[];
  selected: ReadonlySet<number>;
  onToggle: (tag: Tag) => void;
  /** Course rows shown before "All n". */
  courseLimit?: number;
}) {
  const [query, setQuery] = React.useState("");
  const [allCourses, setAllCourses] = React.useState(false);
  const q = query.trim().toLowerCase();
  const visible = q ? tags.filter((t) => t.name.toLowerCase().includes(q)) : tags;
  const picked = tags.filter((t) => selected.has(t.id));
  return (
    <View className="gap-3">
      <SearchField value={query} onChangeText={setQuery} placeholder="Search tags" />
      {picked.length ? (
        <View className="flex-row flex-wrap items-center gap-1.5">
          <Text variant="label">Picked</Text>
          {picked.map((t) => (
            <Chip key={t.id} label={t.name} selected removable onPress={() => onToggle(t)} />
          ))}
        </View>
      ) : null}
      {groupTags(visible).map((g) => {
        if (g.id === "course") {
          const rows = allCourses || q ? g.tags : g.tags.slice(0, courseLimit);
          return (
            <View key={g.id} className="gap-2">
              <View className="flex-row items-baseline justify-between px-0.5">
                <Text variant="section">{g.label} · pick at least one</Text>
                {!q && g.tags.length > courseLimit ? (
                  <Pressable accessibilityRole="button" onPress={() => setAllCourses((v) => !v)}>
                    <Text variant="subhead" className="font-semibold text-primary">
                      {allCourses ? "Fewer" : `All ${g.tags.length}`}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
              <View className="overflow-hidden rounded-[20px] bg-card">
                {rows.map((t, i) => (
                  <CheckRow key={t.id} tag={t} on={selected.has(t.id)} onPress={() => onToggle(t)} last={i === rows.length - 1} />
                ))}
              </View>
            </View>
          );
        }
        return (
          <View key={g.id} className="gap-2">
            <Text variant="section" className="px-0.5">
              {g.label}
            </Text>
            <TagCloud tags={g.tags} selected={selected} onToggle={onToggle} />
          </View>
        );
      })}
      {q && !visible.length ? <Text variant="callout" className="text-muted-foreground">No tags match “{query}”.</Text> : null}
    </View>
  );
}

/**
 * Under a tag page's title: "and Christmas ✕  + Narrow". Narrowing is AND,
 * up to MAX_COMBINED_TAGS tags including the page's own.
 */
export function NarrowRow({ extra, onRemove, onNarrow }: { extra: Tag[]; onRemove?: (tag: Tag) => void; onNarrow?: () => void }) {
  const full = extra.length + 1 >= MAX_COMBINED_TAGS;
  return (
    <View className="flex-row flex-wrap items-center gap-2">
      {extra.length ? <Text variant="subhead" className="text-muted-foreground">and</Text> : null}
      {extra.map((t) => (
        <Chip key={t.id} label={t.name} selected removable onPress={onRemove ? () => onRemove(t) : undefined} />
      ))}
      {full ? null : (
        <Pressable accessibilityRole="button" onPress={onNarrow} className="active:opacity-80">
          <Glass className="h-9 flex-row items-center gap-1.5 rounded-full px-3.5">
            <View className="flex-row items-center gap-1.5">
              <Icon name="plus" size={15} strokeWidth={2.4} color="primary" />
              <Text variant="subhead" className="font-semibold text-primary">
                Narrow
              </Text>
            </View>
          </Glass>
        </Pressable>
      )}
    </View>
  );
}
