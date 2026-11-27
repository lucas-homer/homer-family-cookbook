import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import * as React from "react";
import { FlatList, View } from "react-native";
import { SplitView, useRecipeOpener } from "@/components/split";
import { Empty, LoadError, Loading, useTopInset } from "@/components/screen";
import { IconButton, NarrowRow, RecipeRow, SegmentedTabs, TagCloud, Text, Toolbar } from "@/components/ui";
import { api, authorName, coverOf, toTag, type RecipeSummary } from "@/lib/api";
import { groupTags, MAX_COMBINED_TAGS, type Tag } from "@/lib/tags";

const SORTS = ["A to Z", "Z to A"] as const;

// One tag's recipes. "Narrow" adds more tags (AND, up to 8 in all); the
// extra tags live in the URL (?with=a,b) so Back undoes a narrow.
export default function TagScreen() {
  const { split, selected, open } = useRecipeOpener();
  const { id, with: withParam } = useLocalSearchParams<{ id: string; with?: string }>();
  const top = useTopInset();
  const withIds = React.useMemo(() => (withParam ?? "").split(",").filter(Boolean), [withParam]);
  const [sort, setSort] = React.useState<(typeof SORTS)[number]>("A to Z");
  const [narrowing, setNarrowing] = React.useState(false);
  const q = useQuery({
    queryKey: ["tag", id, withIds.join(","), sort],
    queryFn: () => api.tag(id, { sort: sort === "A to Z" ? "asc" : "desc", with: withIds }),
    placeholderData: keepPreviousData,
  });

  const setWith = (ids: string[]) => router.setParams({ with: ids.length ? ids.join(",") : undefined });
  const add = (t: Tag) => {
    setNarrowing(false);
    if (withIds.length + 1 < MAX_COMBINED_TAGS) router.push({ pathname: "/tag/[id]", params: { id, with: [...withIds, String(t.id)].join(",") } });
  };
  const remove = (t: Tag) => setWith(withIds.filter((w) => w !== String(t.id)));

  const data = q.data;
  const header = (
    <View style={{ paddingTop: top }}>
      <Toolbar left={<IconButton icon="back" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} />} />
      {data ? (
        <View className="gap-3 pb-3 pt-3">
          <View className="gap-1">
            <Text variant="largeTitle">{data.category.name}</Text>
            {data.category.description ? <Text variant="callout" className="text-muted-foreground">{data.category.description}</Text> : null}
          </View>
          <NarrowRow extra={data.selected.map(toTag)} onRemove={remove} onNarrow={data.related.length ? () => setNarrowing((v) => !v) : undefined} />
          {narrowing ? (
            <View className="gap-4 rounded-card bg-card p-4">
              <Text variant="subhead" className="text-muted-foreground">
                Only show recipes that also have…
              </Text>
              {groupTags(data.related.map(toTag)).map((g) => (
                <View key={g.id} className="gap-2">
                  <Text variant="section">{g.label}</Text>
                  <TagCloud tags={g.tags} onToggle={add} />
                </View>
              ))}
            </View>
          ) : null}
          <View className="flex-row items-center justify-between pt-1">
            <Text variant="subhead" className="text-muted-foreground">
              {data.recipes.length === 1 ? "1 recipe" : `${data.recipes.length} recipes`}
            </Text>
            <SegmentedTabs options={SORTS} value={sort} onChange={setSort} className="w-[180px]" />
          </View>
        </View>
      ) : null}
    </View>
  );

  return (
    <SplitView split={split} selected={selected}>
    <View className="flex-1 bg-background">
      <FlatList<RecipeSummary>
        data={data?.recipes ?? []}
        keyExtractor={(r) => r.id}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 80 }}
        ListEmptyComponent={
          q.isPending ? <Loading /> : q.isError ? <LoadError error={q.error} onRetry={() => q.refetch()} /> : <Empty title="No recipes" message="No recipe has all of these tags. Take one off." />
        }
        renderItem={({ item }) => <RecipeRow title={item.title} photo={coverOf(item)} meta={authorName(item)} onPress={() => open(item.id)} />}
      />
    </View>
    </SplitView>
  );
}
