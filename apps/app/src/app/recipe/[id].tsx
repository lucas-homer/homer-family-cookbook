import { router, useLocalSearchParams } from "expo-router";
import * as React from "react";
import { RecipeDetail } from "@/components/recipe-detail";

export default function RecipeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <RecipeDetail key={id} id={id} onBack={() => (router.canGoBack() ? router.back() : router.replace("/"))} />;
}
