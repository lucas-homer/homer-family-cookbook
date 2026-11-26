// react-native-svg's web build imports the pre-0.88 asset registry. Stories
// don't load bundled image assets through svg, so an empty registry is enough.
export function getAssetByID() {
  return undefined;
}
export function registerAsset() {
  return 0;
}
