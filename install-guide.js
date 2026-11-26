// Erkennt, wo die Installationshilfe geöffnet wurde, damit sie nur den einen passenden Weg zeigt.
// Eingebaute Browser (YouTube, Instagram, WhatsApp …) können keine Web-App installieren.

const IN_APP_TOKENS = /FBAN|FBAV|FBIOS|Instagram|GSA\/|YouTube|LinkedInApp|Line\/|Snapchat|TikTok|musical_ly|WhatsApp|Pinterest|Twitter|Telegram/i;
const IOS_OTHER_BROWSERS = /CriOS|FxiOS|EdgiOS|OPiOS/i;

export function installSituation({ userAgent = "", platform = "", maxTouchPoints = 0 } = {}) {
  const ios = /iphone|ipad|ipod/i.test(userAgent) || (platform === "MacIntel" && maxTouchPoints > 1);
  const android = !ios && /android/i.test(userAgent);
  const device = ios ? "ios" : android ? "android" : "computer";
  let browser = "other";
  if (IN_APP_TOKENS.test(userAgent)) browser = "in-app";
  else if (ios) browser = /CriOS/i.test(userAgent) ? "chrome" : IOS_OTHER_BROWSERS.test(userAgent) ? "other" : /Safari\//.test(userAgent) ? "safari" : "in-app";
  else if (android) browser = /; wv\)/.test(userAgent) ? "in-app" : /Chrome\//.test(userAgent) && !/EdgA|SamsungBrowser|Firefox|OPR/i.test(userAgent) ? "chrome" : "other";
  else browser = /Edg\//.test(userAgent) ? "edge" : /Chrome\//.test(userAgent) ? "chrome" : /Safari\//.test(userAgent) ? "safari" : "other";
  return { device, browser };
}

// Öffnet dieselbe Seite im richtigen Browser: auf dem iPhone in Safari, auf Android in Chrome.
export function openInBrowserUrl(device, pageUrl) {
  const url = new URL(pageUrl);
  if (url.protocol !== "https:" && url.protocol !== "http:") return "";
  if (device === "ios") return `x-safari-${url.href}`;
  if (device === "android") {
    const target = `${url.host}${url.pathname}${url.search}${url.hash}`;
    return `intent://${target}#Intent;scheme=${url.protocol.slice(0, -1)};package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url.href)};end`;
  }
  return "";
}

// Die Seite, die im Browser geöffnet werden soll, zeigt dort sofort die Installationshilfe.
export function installPageUrl(currentUrl) {
  const url = new URL(currentUrl);
  url.searchParams.set("install", "1");
  url.hash = "";
  return url.href;
}
