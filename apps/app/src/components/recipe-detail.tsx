import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import * as React from "react";
import { ScrollView, View } from "react-native";
import { LoadError, Loading, useTopInset } from "@/components/screen";
import { Chip, IconButton, IngredientRow, Photo, StepRow, Text, Toolbar } from "@/components/ui";
import { api, authorName, splitSteps, type RecipeResponse } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { compareTags } from "@/lib/tags";

// One recipe: its own screen on iPhone, the right-hand pane on iPad.
// `onBack` is left out in the iPad pane, which has no Back button.
export function RecipeDetail({ id, onBack }: { id: string; onBack?: () => void }) {
  const top = useTopInset();
  const { token, ready, user } = useAuth();
  const client = useQueryClient();
  // Keyed by user id, never the token: the cache is saved to plain device storage.
  const key = ["recipe", id, user?.id ?? null];
  const q = useQuery({
    queryKey: key,
    queryFn: async () => {
      const res = await api.recipe(id, token);
      // A signed-in read is recorded server side; refresh Recently viewed.
      if (token) void client.invalidateQueries({ queryKey: ["recent"] });
      return res;
    },
    // Wait for the saved session so the first fetch uses the right key (and,
    // offline, finds this person's cached copy).
    enabled: ready,
  });
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
          left={onBack ? <IconButton icon="back" label="Back" onPress={onBack} /> : null}
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
        ) : q.isError && !q.data ? (
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
                  <Chip key={t.id} label={t.name} surface="solid" onPress={() => router.push(`/tag/${t.id}`)} />
                ))}
              </View>
            ) : null}
            {data.recipe.background ? <Text variant="callout">{data.recipe.background}</Text> : null}

            {data.recipe.ingredients.length ? (
              <>
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
              </>
            ) : null}

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
