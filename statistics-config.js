/** Public collection identifier only; account passwords and API tokens never belong here. */
export const STATISTICS_CONFIGURATION = Object.freeze({
  provider: "umami",
  enabled: false,
  websiteId: "",
  collectUrl: "https://gateway.umami.is/api/send"
});
