import officialLogo from "@/assets/ponto-pro-gestao-logo-v20261118.png.asset.json";

export const PLATFORM_LOGO = officialLogo.url;
const legacyLogo = /(?:798df0df-fee7-4f44-b98f-df1e096c0ace|1fd9a036-8b2e-4139-ad92-09df31f88a47|\/vip-logo\.png(?:\?|$)|ponto-pro-gestao-logo\.jpg)/;
export function resolvePlatformLogo(value: string) {
  return !value || legacyLogo.test(value) ? PLATFORM_LOGO : value;
}

function luminance(hex: string) {
  const values = hex.replace("#", "").match(/.{2}/g);
  if (!values || values.length !== 3) return 0;
  const [r = 0, g = 0, b = 0] = values.map(v => {
    const c = parseInt(v, 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
}
export function contrastRatio(a: string, b: string) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export function readableTextColor(requested: string, background: string) {
  if (contrastRatio(requested, background) >= 4.5) return requested;
  return contrastRatio("#ffffff", background) > contrastRatio("#0B2130", background) ? "#ffffff" : "#0B2130";
}