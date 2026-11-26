import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import * as React from "react";
import { FlatList, RefreshControl, ScrollView, View } from "react-native";
import { Empty, LoadError, Loading, useTopInset } from "@/components/screen";
import { Button, Chip, RecipeRow, Text } from "@/components/ui";
import { api, authorName, type RecipeSummary } from "@/lib/api";
import { useAuth } from "@/lib/auth";

// Favorites: the signed-in person's saved recipes, with Course tabs.
export default function Favorites() {
  const top = useTopInset();
  const { token, ready } = useAuth();
  const [tag, setTag] = React.useState<string | null>(null);
  const q = useQuery({ queryKey: ["favorites", token, tag], queryFn: () => api.favorites(token!, tag), enabled: !!token });

  const header = (
    <View style={{ paddingTop: top + 44 }}>
      <Text variant="largeTitle" className="mb-3.5 mt-3">
        Favorites
      </Text>
      {q.data?.courses.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 8 }}>
          <Chip label="All" selected={!tag} onPress={() => setTag(null)} />
          {q.data.courses.map((c) => (
            <Chip key={c.id} label={c.name} selected={tag === c.id} onPress={() => setTag(tag === c.id ? null : c.id)} />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );

  const empty = !ready || (token && q.isPending) ? (
    <Loading />
  ) : !token ? (
    <Empty
      title="Save recipes you love"
      message="Sign in to keep your favorites here, on every device."
      action={<Button label="Sign in" onPress={() => router.push("/sign-in")} />}
    />
  ) : q.isError ? (
    <LoadError error={q.error} onRetry={() => q.refetch()} />
  ) : (
    <Empty title="No favorites yet" message="Tap the heart on a recipe to save it here." />
  );

  return (
    <FlatList<RecipeSummary>
      data={token ? (q.data?.recipes ?? []) : []}
      keyExtractor={(r) => r.id}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 120 }}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={token ? <RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} /> : undefined}
      renderItem={({ item }) => <RecipeRow title={item.title} meta={authorName(item)} onPress={() => router.push(`/recipe/${item.id}`)} />}
    />
  );
}
