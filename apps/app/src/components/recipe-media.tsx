import { useQueryClient } from "@tanstack/react-query";
import { useVideoPlayer, VideoView } from "expo-video";
import * as React from "react";
import { ActionSheetIOS, ActivityIndicator, Alert, Platform, Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { MediaViewer } from "@/components/media-viewer";
import { AddPhoto, Button, IconButton, Photo, Text } from "@/components/ui";
import { api, ApiError, mediaUrl, type RecipeMedia } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { pickMedia, uploadMedia, type Source } from "@/lib/media";
import { useTheme } from "@/theme/use-theme";

const HEIGHT = 260;
const MAX = 12;

function MediaVideo({ id, width }: { id: string; width: number }) {
  const player = useVideoPlayer(mediaUrl(id));
  return (
    <View className="overflow-hidden rounded-card bg-muted" style={{ width, height: HEIGHT }}>
      <VideoView player={player} nativeControls contentFit="cover" style={{ width: "100%", height: "100%" }} />
    </View>
  );
}

/**
 * The recipe's photos and videos, swiped through side by side. Nothing at all
 * when there are none, unless you can edit the recipe: then a card to add one.
 */
export function RecipeMediaGallery({ recipeId, title, media, canEdit }: { recipeId: string; title: string; media: RecipeMedia[]; canEdit: boolean }) {
  const { token } = useAuth();
  const client = useQueryClient();
  const { colors } = useTheme();
  const { width: screen } = useWindowDimensions();
  // The iPad pane is narrower than the window; measure instead of guessing.
  const [width, setWidth] = React.useState(Math.min(screen - 36, 700));
  const [busy, setBusy] = React.useState(false);
  const [viewing, setViewing] = React.useState<number | null>(null);

  const refresh = () => {
    void client.invalidateQueries({ queryKey: ["recipe", recipeId] });
    void client.invalidateQueries({ queryKey: ["library"] });
    void client.invalidateQueries({ queryKey: ["recent"] });
    void client.invalidateQueries({ queryKey: ["favorites"] });
  };

  const add = async (source: Source) => {
    if (!token) return;
    try {
      const asset = await pickMedia(source);
      if (!asset) return;
      setBusy(true);
      await uploadMedia(token, recipeId, asset);
      refresh();
    } catch (e) {
      Alert.alert("Couldn't add that", e instanceof ApiError ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const choose = () => {
    const options = ["Take a photo or video", "Choose from library", "Cancel"];
    const run = (i: number) => (i === 0 ? add("camera") : i === 1 ? add("library") : undefined);
    if (Platform.OS === "ios") ActionSheetIOS.showActionSheetWithOptions({ options, cancelButtonIndex: 2 }, run);
    else if (Platform.OS === "web") void add("library");
    else Alert.alert("Add a photo or video", undefined, [{ text: options[0], onPress: () => run(0) }, { text: options[1], onPress: () => run(1) }, { text: "Cancel", style: "cancel" }]);
  };

  const remove = (m: RecipeMedia) =>
    Alert.alert(m.kind === "video" ? "Remove this video?" : "Remove this photo?", "It's removed from the recipe for everyone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await api.deleteMedia(token!, recipeId, m.id);
            refresh();
          } catch {
            Alert.alert("Couldn't remove it", "Try again in a moment.");
          }
        },
      },
    ]);

  if (!media.length) {
    if (!canEdit) return null;
    return busy ? (
      <View className="h-24 flex-row items-center justify-center gap-2 rounded-card bg-muted">
        <ActivityIndicator color={colors.primary} />
        <Text variant="subhead" className="text-muted-foreground">
          Uploading…
        </Text>
      </View>
    ) : (
      <AddPhoto label="Add a photo or video" onPress={choose} />
    );
  }

  return (
    <View className="gap-2" onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <ScrollView horizontal pagingEnabled={media.length > 1} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 0 }}>
        {media.map((m, i) => (
          <View key={m.id} style={{ width }}>
            {m.kind === "video" ? (
              <MediaVideo id={m.id} width={width} />
            ) : (
              <Pressable accessibilityRole="button" accessibilityLabel={`View photo ${i + 1} of ${title} full size`} onPress={() => setViewing(i)}>
                <Photo source={{ uri: mediaUrl(m.id) }} alt={`Photo ${i + 1} of ${title}`} height={HEIGHT} width={width} rounded="card" />
              </Pressable>
            )}
            <View className="absolute bottom-2 right-2">
              <IconButton icon="expand" size={36} label={m.kind === "video" ? "Play video full screen" : "View photo full size"} onPress={() => setViewing(i)} />
            </View>
            {canEdit ? (
              <View className="absolute right-2 top-2">
                <IconButton icon="trash" size={36} label={m.kind === "video" ? "Remove video" : "Remove photo"} onPress={() => remove(m)} />
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>
      {media.length > 1 ? (
        <Text variant="caption" className="text-center font-normal">
          Swipe for more
        </Text>
      ) : null}
      {canEdit && media.length < MAX ? (
        busy ? (
          <View className="flex-row items-center gap-2 self-start py-2">
            <ActivityIndicator color={colors.primary} />
            <Text variant="subhead" className="text-muted-foreground">
              Uploading…
            </Text>
          </View>
        ) : (
          <Button label="Add a photo or video" icon="camera" variant="text" size="sm" onPress={choose} />
        )
      ) : null}
      <MediaViewer media={media} index={viewing} title={title} onClose={() => setViewing(null)} />
    </View>
  );
}
