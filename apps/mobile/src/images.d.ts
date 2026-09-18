/**
 * Metro resolves an image import to an asset id, but `expo/types` does not
 * declare the module shape in this SDK, so `import mark from "../assets/x.png"`
 * fails typecheck. expo-env.d.ts is generated and says not to edit it, so the
 * declaration lives here.
 */
declare module "*.png" {
  const asset: number;
  export default asset;
}
