import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import * as React from "react";
import { ScrollView, View } from "react-native";
import { LoadError, Loading, useTopInset } from "@/components/screen";
import { Chip, IconButton, IngredientRow, Photo, StepRow, Text, Toolbar } from "@/components/ui";
import { api, authorName, splitSteps, type RecipeResponse } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { compareTags } from "@/lib/tags";

// One recipe. Phase 0 shows the real data; the full design (photo hero,
// notes, cook mode) is phase 1 and 2.
export default function RecipeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const top = useTopInset();
  const { token } = useAuth();
  const client = useQueryClient();
  const key = ["recipe", id, token];
  const q = useQuery({ queryKey: key, queryFn: () => api.recipe(id, token) });
  const [checked, setChecked] = React.useState<Set<string>>(new Set());

  const favorite = useMutation({
    mutationFn: (next: boolean) => api.setFavorite(token!, id, next),
    onMutate: (next) => {
      client.setQueryData<RecipeResponse>(key, (old) => (old ? { ...old, viewer: { ...old.viewer, isFavorite: next } } : old));
    },
    onError: () => client.invalidateQueries({ queryKey: key }),
    onSettled: () => client.invalidateQueries({ queryKey: ["favorites"] }),
  });

  const data = q.data;
  const isFavorite = data?.viewer.isFavorite ?? false;

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ paddingTop: top, paddingHorizontal: 18, paddingBottom: 80 }}>
        <Toolbar
          left={<IconButton icon="back" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} />}
          right={
            data ? (
              <IconButton
                icon="heart"
                label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                variant={isFavorite ? "primary" : "glass"}
                onPress={() => (token ? favorite.mutate(!isFavorite) : router.push("/sign-in"))}
              />
            ) : null
          }
        />
        {q.isPending ? (
          <Loading />
        ) : q.isError ? (
          <LoadError error={q.error} onRetry={() => q.refetch()} />
        ) : data ? (
          <View className="gap-4 pt-3">
            <Photo alt={`Photo of ${data.recipe.title}`} height={220} rounded="card" />
            <View className="gap-1">
              <Text variant="title1">{data.recipe.title}</Text>
              <Text variant="subhead" className="text-muted-foreground">
                {[authorName(data.recipe), data.recipe.servings && `Makes ${data.recipe.servings}`].filter(Boolean).join(" · ")}
              </Text>
            </View>
            {data.recipe.categories.length ? (
              <View className="flex-row flex-wrap gap-2">
                {[...data.recipe.categories].sort(compareTags).map((t) => (
                  <Chip key={t.id} label={t.name} surface="solid" />
                ))}
              </View>
            ) : null}
            {data.recipe.background ? <Text variant="callout">{data.recipe.background}</Text> : null}

            <Text variant="title2" className="mt-2">
              Ingredients
            </Text>
            <View className="overflow-hidden rounded-card bg-card">
              {data.recipe.ingredients.map((ing) => (
                <IngredientRow
                  key={ing.id}
                  quantity={ing.quantity ?? undefined}
                  name={ing.name}
                  checked={checked.has(ing.id)}
                  onToggle={() =>
                    setChecked((s) => {
                      const n = new Set(s);
                      if (n.has(ing.id)) n.delete(ing.id);
                      else n.add(ing.id);
                      return n;
                    })
                  }
                />
              ))}
            </View>

            <Text variant="title2" className="mt-2">
              Steps
            </Text>
            <View className="gap-3">
              {splitSteps(data.recipe.instructions).map((step, i) => (
                <StepRow key={i} number={i + 1} text={step} />
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
