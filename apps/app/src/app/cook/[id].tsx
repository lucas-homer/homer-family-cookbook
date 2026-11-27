import { router, useLocalSearchParams } from "expo-router";
import { useKeepAwake } from "expo-keep-awake";
import * as React from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRecipe } from "@/components/recipe-detail";
import { LoadError, Loading, useTopInset } from "@/components/screen";
import { Button, Glass, IconButton, IngredientRow, StepProgress, SwipePager, Text, Toolbar } from "@/components/ui";
import { splitSteps } from "@/lib/api";
import { useCooking } from "@/lib/cooking";

// Cook mode: one step at a time in big type, swipe or tap Next. The screen
// stays on while it's open. Timers come next (they need the native build).
export default function Cook() {
  useKeepAwake();
  const { id } = useLocalSearchParams<{ id: string }>();
  const top = useTopInset();
  const bottom = useSafeAreaInsets().bottom;
  const { q } = useRecipe(id);
  const { session, start, update, finish } = useCooking();
  const [showIngredients, setShowIngredients] = React.useState(false);

  const data = q.data;
  // Opened from a link with no session yet: start one.
  React.useEffect(() => {
    if (data && session?.recipeId !== id) start(id, data.recipe.title);
  }, [data, id, session?.recipeId, start]);

  const close = () => (router.canGoBack() ? router.back() : router.replace(`/recipe/${id}`));
  const steps = data ? splitSteps(data.recipe.instructions) : [];
  const ours = session?.recipeId === id ? session : null;
  const step = Math.min(ours?.step ?? 0, Math.max(0, steps.length - 1));
  const checked = new Set(ours?.checked ?? []);
  const last = step >= steps.length - 1;
  const go = (next: number) => update({ step: next });

  const toggle = (ingredientId: string) => {
    const n = new Set(checked);
    if (n.has(ingredientId)) n.delete(ingredientId);
    else n.add(ingredientId);
    update({ checked: [...n] });
  };

  return (
    <View className="flex-1 bg-background">
      <View className="px-[22px]" style={{ paddingTop: top }}>
        <Toolbar
          left={<IconButton icon="x" label="Close cook mode" onPress={close} />}
          title={
            data ? (
              <Text variant="subhead" numberOfLines={1} className="flex-1 text-center font-semibold">
                {data.recipe.title}
              </Text>
            ) : null
          }
          right={
            data?.recipe.ingredients.length ? (
              <IconButton
                icon={showIngredients ? "pot" : "book"}
                label={showIngredients ? "Show steps" : "Show ingredients"}
                onPress={() => setShowIngredients((v) => !v)}
              />
            ) : null
          }
        />
      </View>

      {q.isPending ? (
        <Loading />
      ) : q.isError && !data ? (
        <LoadError error={q.error} onRetry={() => q.refetch()} />
      ) : !data ? null : showIngredients ? (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: 200 + bottom }}>
          <Text variant="title2" className="mb-3">
            Ingredients
          </Text>
          <View className="overflow-hidden rounded-card bg-card">
            {data.recipe.ingredients.map((ing) => (
              <IngredientRow
                key={ing.id}
                quantity={ing.quantity ?? undefined}
                name={ing.name}
                checked={checked.has(ing.id)}
                onToggle={() => toggle(ing.id)}
              />
            ))}
          </View>
        </ScrollView>
      ) : steps.length ? (
        <SwipePager index={step} count={steps.length} onChange={go} className="flex-1">
          <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 16, paddingBottom: 200 + bottom }}>
            <StepProgress total={steps.length} current={step + 1} />
            <Text className="mt-6 text-subhead font-semibold text-primary">
              Step {step + 1} of {steps.length}
            </Text>
            <Text variant="step" className="mt-2">
              {steps[step]}
            </Text>
          </ScrollView>
        </SwipePager>
      ) : (
        <View className="px-[22px] pt-6">
          <Text variant="callout" className="text-muted-foreground">
            This recipe has no steps yet.
          </Text>
        </View>
      )}

      {data && steps.length && !showIngredients ? (
        <Glass className="absolute left-2.5 right-2.5 flex-row gap-2.5 rounded-[40px] px-5 pb-[18px] pt-4" style={{ bottom: Math.max(bottom, 12) }}>
          <View className="flex-1">
            <Button label="Back" variant="secondary" block disabled={step === 0} onPress={() => go(step - 1)} />
          </View>
          <View className="flex-[2]">
            <Button
              label={last ? "Done cooking" : "Next step"}
              icon={last ? "check" : undefined}
              block
              onPress={() => {
                if (!last) return go(step + 1);
                finish();
                close();
              }}
            />
          </View>
        </Glass>
      ) : null}
    </View>
  );
}
