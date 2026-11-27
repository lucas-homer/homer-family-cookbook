import { useQuery } from "@tanstack/react-query";
import * as React from "react";
import { FlatList, TextInput, View } from "react-native";
import { SplitView, useRecipeOpener } from "@/components/split";
import { Empty, LoadError, Loading, useTopInset, TabScreen } from "@/components/screen";
import { Icon, RecipeRow, Text } from "@/components/ui";
import { api, authorName, coverOf } from "@/lib/api";
import { useTheme } from "@/theme/use-theme";

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

// Search matches titles, ingredients, instructions and tag names.
export default function Search() {
  const { split, selected, open } = useRecipeOpener();
  const top = useTopInset();
  const { colors } = useTheme();
  const [text, setText] = React.useState("");
  const term = useDebounced(text.trim(), 250);
  const q = useQuery({ queryKey: ["search", term], queryFn: ({ signal }) => api.search(term, signal), enabled: term.length > 0 });

  return (
    <TabScreen>
    <SplitView split={split} selected={selected}>
    <FlatList
      data={term ? (q.data?.results ?? []) : []}
      keyExtractor={(r) => r.id}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 120 }}
     
      ListHeaderComponent={
        <View style={{ paddingTop: top }}>
          <Text variant="largeTitle" className="mb-3.5 mt-3">
            Search
          </Text>
          <View className="mb-2 h-[42px] flex-row items-center gap-2 rounded-[14px] bg-border/10 px-3">
            <Icon name="search" size={18} color="mutedForeground" />
            <TextInput
              accessibilityLabel="Search recipes"
              autoFocus
              value={text}
              onChangeText={setText}
              placeholder="Recipes, ingredients, tags"
              placeholderTextColor={colors.mutedForeground}
              returnKeyType="search"
              clearButtonMode="while-editing"
              className="flex-1 font-sans text-body text-foreground"
            />
          </View>
        </View>
      }
      ListEmptyComponent={
        !term ? undefined : q.isPending ? <Loading /> : q.isError ? <LoadError error={q.error} onRetry={() => q.refetch()} /> : <Empty title="No matches" message={`Nothing matches "${term}". Try another word.`} />
      }
      renderItem={({ item }) => <RecipeRow title={item.title} photo={coverOf(item)} meta={authorName(item)} onPress={() => open(item.id)} />}
    />
    </SplitView>
    </TabScreen>
  );
}
