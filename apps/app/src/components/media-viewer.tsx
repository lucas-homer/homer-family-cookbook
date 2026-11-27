import { StatusBar } from "expo-status-bar";
import { useVideoPlayer, VideoView } from "expo-video";
import * as React from "react";
import { Animated, Image, Modal, PanResponder, ScrollView, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconButton, Text } from "@/components/ui";
import { mediaUrl, type RecipeMedia } from "@/lib/api";

// Full-page photo and video viewer, on iPhone and iPad alike (the NYT Cooking
// pattern). Swipe sideways between items, pinch a photo to zoom, and close
// with the button or by swiping down.

function ViewerVideo({ id, active }: { id: string; active: boolean }) {
  const player = useVideoPlayer(mediaUrl(id));
  React.useEffect(() => {
    if (!active) player.pause();
  }, [active, player]);
  return <VideoView player={player} nativeControls contentFit="contain" style={{ width: "100%", height: "100%" }} />;
}

export function MediaViewer({
  media,
  index,
  title,
  onClose,
}: {
  media: RecipeMedia[];
  /** Which item to open on; null when closed. */
  index: number | null;
  title: string;
  onClose: () => void;
}) {
  // Mounted only while open, so each opening starts fresh on the tapped item.
  if (index === null) return null;
  return <Viewer media={media} start={index} title={title} onClose={onClose} />;
}

function Viewer({ media, start, title, onClose }: { media: RecipeMedia[]; start: number; title: string; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = React.useState(start);
  const [zoomed, setZoomed] = React.useState(false);
  const [drag] = React.useState(() => new Animated.Value(0));

  // Swipe down to close. Not while zoomed in, so a zoomed photo can pan.
  const pan = React.useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, g) => !zoomed && g.dy > 12 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5,
        onPanResponderMove: (_, g) => drag.setValue(Math.max(0, g.dy)),
        onPanResponderRelease: (_, g) => {
          if (g.dy > 120 || g.vy > 1.2) onClose();
          else Animated.spring(drag, { toValue: 0, useNativeDriver: true }).start();
        },
        onPanResponderTerminate: () => Animated.spring(drag, { toValue: 0, useNativeDriver: true }).start(),
      }),
    [drag, onClose, zoomed],
  );
  const fade = React.useMemo(() => drag.interpolate({ inputRange: [0, 400], outputRange: [1, 0.3], extrapolate: "clamp" }), [drag]);

  return (
    <Modal visible animationType="fade" presentationStyle="overFullScreen" transparent onRequestClose={onClose} supportedOrientations={["portrait", "landscape"]}>
      <StatusBar style="light" />
      <Animated.View style={{ flex: 1, backgroundColor: "black", opacity: fade }}>
        <Animated.View style={{ flex: 1, transform: [{ translateY: drag }] }} {...pan.panHandlers}>
          <ScrollView
            horizontal
            pagingEnabled
            scrollEnabled={!zoomed}
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: start * width, y: 0 }}
            onMomentumScrollEnd={(e) => setCurrent(Math.round(e.nativeEvent.contentOffset.x / width))}
          >
            {media.map((m, i) => (
              <View key={m.id} style={{ width, height }}>
                {m.kind === "video" ? (
                  <View style={{ flex: 1, paddingTop: insets.top + 56, paddingBottom: insets.bottom }}>
                    <ViewerVideo id={m.id} active={i === current} />
                  </View>
                ) : (
                  <ScrollView
                    maximumZoomScale={4}
                    minimumZoomScale={1}
                    centerContent
                    bouncesZoom
                    showsHorizontalScrollIndicator={false}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ width, height }}
                    scrollEventThrottle={64}
                    onScroll={(e) => setZoomed((e.nativeEvent.zoomScale ?? 1) > 1.01)}
                  >
                    <Image source={{ uri: mediaUrl(m.id) }} accessibilityLabel={`Photo ${i + 1} of ${title}`} style={{ width, height }} resizeMode="contain" />
                  </ScrollView>
                )}
              </View>
            ))}
          </ScrollView>
        </Animated.View>
        <View pointerEvents="box-none" className="absolute left-0 right-0 flex-row items-center justify-between px-4" style={{ top: insets.top + 8 }}>
          <Text variant="subhead" className="font-semibold text-white">
            {media.length > 1 ? `${current + 1} of ${media.length}` : ""}
          </Text>
          <IconButton icon="x" label="Close" onPress={onClose} />
        </View>
      </Animated.View>
    </Modal>
  );
}
