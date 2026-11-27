import * as FileSystem from "expo-file-system/legacy";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";
import { API_URL, ApiError, type RecipeMedia } from "./api";

// Adding a photo or video to a recipe: pick or shoot it, then send the file
// itself to POST /api/v1/recipes/:id/media. Limits match the server's.

export const MAX_PHOTO_BYTES = 20 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 95 * 1024 * 1024;

export type Source = "library" | "camera";

const options: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images", "videos"],
  // Full quality here: photos are resized and compressed once, in shrinkPhoto.
  quality: 1,
  // HEIC photos become JPEG, so they show everywhere, the website included.
  preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
  // Keep videos small enough to upload: 720p, up to two minutes.
  videoExportPreset: ImagePicker.VideoExportPreset.H264_1280x720,
  videoQuality: ImagePicker.UIImagePickerControllerQualityType.IFrame1280x720,
  videoMaxDuration: 120,
};

/** Opens the photo library or camera. Returns null if cancelled or permission was refused. */
export async function pickMedia(source: Source): Promise<ImagePicker.ImagePickerAsset | null> {
  if (source === "camera") {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new ApiError(0, "NoPermission", { form: "Allow camera access in Settings to take a photo." });
  }
  const result = source === "camera" ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  return result.canceled ? null : (result.assets[0] ?? null);
}

const typeFor = (asset: ImagePicker.ImagePickerAsset) => {
  if (asset.mimeType) return asset.mimeType === "video/mov" ? "video/quicktime" : asset.mimeType;
  if (asset.type === "video") return asset.uri.toLowerCase().endsWith(".mov") ? "video/quicktime" : "video/mp4";
  return asset.uri.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
};

// Long edge for uploaded photos. Plenty for a phone or iPad screen, and a
// few hundred KB instead of a 4–5 MB camera original.
export const PHOTO_MAX_EDGE = 2000;

/** Resizes a photo to PHOTO_MAX_EDGE on its long edge and re-saves it as JPEG. Videos pass through. */
export async function shrinkPhoto(asset: ImagePicker.ImagePickerAsset): Promise<ImagePicker.ImagePickerAsset> {
  if (asset.type === "video" || !asset.width || !asset.height) return asset;
  const long = Math.max(asset.width, asset.height);
  const scale = Math.min(1, PHOTO_MAX_EDGE / long);
  const context = ImageManipulator.manipulate(asset.uri);
  if (scale < 1) {
    context.resize(asset.width >= asset.height ? { width: Math.round(asset.width * scale) } : { height: Math.round(asset.height * scale) });
  }
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
  return { ...asset, uri: saved.uri, width: saved.width, height: saved.height, mimeType: "image/jpeg", fileSize: undefined };
}

export async function uploadMedia(token: string, recipeId: string, picked: ImagePicker.ImagePickerAsset): Promise<RecipeMedia> {
  const asset = await shrinkPhoto(picked);
  const video = asset.type === "video";
  const max = video ? MAX_VIDEO_BYTES : MAX_PHOTO_BYTES;
  if (asset.fileSize && asset.fileSize > max) {
    throw new ApiError(400, "TooBig", { form: video ? "That video is too big. Try a shorter clip." : "That photo is too big (over 20 MB)." });
  }
  const q = new URLSearchParams();
  if (asset.width) q.set("width", String(Math.round(asset.width)));
  if (asset.height) q.set("height", String(Math.round(asset.height)));
  const url = `${API_URL}/api/v1/recipes/${encodeURIComponent(recipeId)}/media?${q}`;
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": typeFor(asset), Accept: "application/json" };

  let status: number;
  let text: string;
  try {
    if (Platform.OS === "web") {
      const blob = await (await fetch(asset.uri)).blob();
      const res = await fetch(url, { method: "POST", headers, body: blob });
      status = res.status;
      text = await res.text();
    } else {
      // Streams the file from disk, with its real length.
      const res = await FileSystem.uploadAsync(url, asset.uri, {
        httpMethod: "POST",
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers,
      });
      status = res.status;
      text = res.body;
    }
  } catch {
    throw new ApiError(0, "Offline", { form: "Couldn't upload. Check your connection and try again." });
  }
  const data = (() => {
    try {
      return JSON.parse(text) as { media?: RecipeMedia; error?: string; fieldErrors?: Record<string, string> };
    } catch {
      return {};
    }
  })();
  if (status !== 201 || !data.media) {
    const fieldErrors = data.fieldErrors ?? {};
    const message = fieldErrors.file ?? fieldErrors.contentType ?? fieldErrors.form ?? (status === 413 ? "That file is too big." : "Couldn't upload. Try again.");
    throw new ApiError(status, data.error ?? "ServerError", { form: message });
  }
  return data.media;
}
