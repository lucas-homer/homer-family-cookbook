import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import * as React from "react";
import { ScrollView, View } from "react-native";
import { LoadError, Loading, useTopInset } from "@/components/screen";
import { IconButton, TagCloud, Text, Toolbar } from "@/components/ui";
import { api, toTag } from "@/lib/api";
import { groupTags } from "@/lib/tags";

// Browse by tag: every tag that has recipes, in the seven groups.
export default function BrowseTags() {
  const top = useTopInset();
  const q = useQuery({ queryKey: ["tags"], queryFn: api.tags });
  const groups = React.useMemo(() => groupTags((q.data?.tags ?? []).filter((t) => t.recipeCount > 0).map(toTag)), [q.data]);

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ paddingTop: top, paddingHorizontal: 18, paddingBottom: 80 }}>
        <Toolbar left={<IconButton icon="back" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} />} />
        <Text variant="largeTitle" className="mb-4 mt-3">
          Tags
        </Text>
        {q.isPending ? (
          <Loading />
        ) : q.isError && !q.data ? (
          <LoadError error={q.error} onRetry={() => q.refetch()} />
        ) : (
          <View className="gap-6">
            {groups.map((g) => (
              <View key={g.id} className="gap-2.5">
                <Text variant="section">{g.label}</Text>
                <TagCloud tags={g.tags} onToggle={(t) => router.push(`/tag/${t.id}`)} />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
