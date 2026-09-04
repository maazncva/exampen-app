// Very small heuristic parser -- just enough for a readable "Chrome on Windows"
// style label in login alerts and the admin device list. Not meant to be exact.
export function parseDeviceLabel(userAgent) {
  const ua = userAgent || "";
  let os = "Unknown OS";
  if (/iPhone|iPad/.test(ua)) os = "iOS";
  else if (/Android/.test(ua)) os = "Android";
  else if (/Mac OS X/.test(ua)) os = "macOS";
  else if (/Windows/.test(ua)) os = "Windows";
  else if (/Linux/.test(ua)) os = "Linux";

  let browser = "Unknown browser";
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/Chrome\//.test(ua)) browser = "Chrome";
  else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = "Safari";
  else if (/Firefox\//.test(ua)) browser = "Firefox";

  return `${browser} on ${os}`;
}
