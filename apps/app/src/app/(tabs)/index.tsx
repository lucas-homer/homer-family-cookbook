import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import * as React from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { Empty, LoadError, Loading, useTopInset } from "@/components/screen";
import { Avatar, Chip, IconButton, RecipeRow, Text, Toolbar } from "@/components/ui";
import { api, authorName, type LibraryRecipe } from "@/lib/api";
import { useAuth } from "@/lib/auth";

// Library: every recipe A to Z, filtered by Course.
export default function Library() {
  const top = useTopInset();
  const { user } = useAuth();
  const q = useQuery({ queryKey: ["library"], queryFn: api.library });
  const [course, setCourse] = React.useState<string | null>(null);

  const courses = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of q.data?.recipes ?? []) for (const c of r.courses) counts.set(c, (counts.get(c) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
  }, [q.data]);
  const recipes = (q.data?.recipes ?? []).filter((r) => !course || r.courses.includes(course));

  const header = (
    <View style={{ paddingTop: top }}>
      <Toolbar
        left={
          <Pressable accessibilityRole="button" accessibilityLabel={user ? "Account" : "Sign in"} onPress={() => router.push("/sign-in")}>
            {user ? <Avatar name={authorName(user)} /> : <Text className="font-semibold text-primary">Sign in</Text>}
          </Pressable>
        }
        right={user ? <IconButton icon="plus" label="New recipe" /> : null}
      />
      <Text variant="largeTitle" className="mb-3.5 mt-3">
        Library
      </Text>
      {courses.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 8 }}>
          <Chip label="All" selected={!course} onPress={() => setCourse(null)} />
          {courses.map((c) => (
            <Chip key={c} label={c} selected={course === c} onPress={() => setCourse(course === c ? null : c)} />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );

  return (
    <FlatList<LibraryRecipe>
      data={recipes}
      keyExtractor={(r) => r.id}
      ListHeaderComponent={header}
      contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 120 }}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} />}
      ListEmptyComponent={
        q.isPending ? <Loading /> : q.isError ? <LoadError error={q.error} onRetry={() => q.refetch()} /> : <Empty title="No recipes yet" message="Recipes the family adds show up here." />
      }
      renderItem={({ item }) => (
        <RecipeRow title={item.title} meta={[item.courses.join(", "), authorName(item)].filter(Boolean).join(" · ")} onPress={() => router.push(`/recipe/${item.id}`)} />
      )}
    />
  );
}
