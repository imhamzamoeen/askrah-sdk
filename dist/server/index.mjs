// src/server/cookie.ts
import { base64url } from "jose";
var ALGORITHM = { name: "HMAC", hash: "SHA-256" };
async function importKey(secret) {
  const keyData = new TextEncoder().encode(secret);
  return crypto.subtle.importKey("raw", keyData, ALGORITHM, false, [
    "sign",
    "verify"
  ]);
}
async function signCookieValue(payload, secret) {
  const jsonBytes = new TextEncoder().encode(JSON.stringify(payload));
  const encodedPayload = base64url.encode(jsonBytes);
  const key = await importKey(secret);
  const payloadBytes = new TextEncoder().encode(encodedPayload);
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, payloadBytes);
  const encodedSignature = base64url.encode(new Uint8Array(signatureBuffer));
  return `${encodedPayload}.${encodedSignature}`;
}
async function verifyCookieValue(cookieValue, secret, maxAgeSeconds) {
  const dotIndex = cookieValue.indexOf(".");
  if (dotIndex === -1 || dotIndex === 0 || dotIndex === cookieValue.length - 1) {
    return null;
  }
  const encodedPayload = cookieValue.substring(0, dotIndex);
  const encodedSignature = cookieValue.substring(dotIndex + 1);
  let signatureBytes;
  try {
    signatureBytes = base64url.decode(encodedSignature);
  } catch {
    return null;
  }
  const key = await importKey(secret);
  const payloadBytes = new TextEncoder().encode(encodedPayload);
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes.buffer,
    payloadBytes
  );
  if (!valid) {
    return null;
  }
  let payload;
  try {
    const jsonBytes = base64url.decode(encodedPayload);
    const jsonString = new TextDecoder().decode(jsonBytes);
    payload = JSON.parse(jsonString);
  } catch {
    return null;
  }
  if (typeof payload.ref !== "string" || !payload.ref || typeof payload.ts !== "number") {
    return null;
  }
  const nowSeconds = Math.floor(Date.now() / 1e3);
  if (nowSeconds - payload.ts > maxAgeSeconds) {
    return null;
  }
  return payload;
}
function serializeSetCookie(name, value, options) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${options.path}`,
    `Max-Age=${options.maxAge}`,
    `SameSite=${options.sameSite}`
  ];
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.secure) parts.push("Secure");
  if (options.domain) parts.push(`Domain=${options.domain}`);
  return parts.join("; ");
}
function serializeClearCookie(name, path, domain) {
  const parts = [
    `${name}=`,
    `Path=${path}`,
    `Max-Age=0`,
    `Expires=Thu, 01 Jan 1970 00:00:00 GMT`
  ];
  if (domain) parts.push(`Domain=${domain}`);
  return parts.join("; ");
}
function parseCookieHeader(cookieHeader, name) {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";");
  for (const cookie of cookies) {
    const [cookieName, ...rest] = cookie.trim().split("=");
    if (cookieName?.trim() === name) {
      const value = rest.join("=").trim();
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    }
  }
  return null;
}

// src/server/handler.ts
var DEFAULT_COOKIE_NAME = "askrah_ref";
var DEFAULT_MAX_AGE = 30 * 24 * 60 * 60;
var DEFAULT_PATH = "/";
var DEFAULT_SAME_SITE = "Lax";
var DEFAULT_SECURE = true;
var REF_CODE_PATTERN = /^[A-Za-z0-9_-]{4,32}$/;
function createRefHandler(config) {
  if (!config.signingSecret || !config.signingSecret.startsWith("sk_")) {
    throw new Error(
      '[AskRah] Invalid signingSecret: must start with "sk_". Get this from your AskRah dashboard.'
    );
  }
  const cookieName = config.cookieName ?? DEFAULT_COOKIE_NAME;
  const maxAge = config.cookieMaxAge ?? DEFAULT_MAX_AGE;
  const path = config.cookiePath ?? DEFAULT_PATH;
  const sameSite = config.cookieSameSite ?? DEFAULT_SAME_SITE;
  const secure = config.cookieSecure ?? DEFAULT_SECURE;
  const domain = config.cookieDomain;
  const debug = config.debug ?? false;
  function log(...args) {
    if (debug) console.log("[AskRah Server]", ...args);
  }
  function jsonResponse(body, status, headers) {
    return new Response(JSON.stringify(body), {
      status,
      headers: {
        "Content-Type": "application/json",
        ...headers
      }
    });
  }
  async function POST(request) {
    let body;
    try {
      body = await request.json();
    } catch {
      log("Invalid JSON body");
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }
    const refCode = body.ref_code;
    if (typeof refCode !== "string" || !REF_CODE_PATTERN.test(refCode)) {
      log("Invalid ref_code:", refCode);
      return jsonResponse(
        { error: "Invalid ref_code: must be 4-32 alphanumeric characters" },
        400
      );
    }
    const clickId = typeof body.click_id === "string" ? body.click_id : void 0;
    const payload = {
      ref: refCode,
      ts: Math.floor(Date.now() / 1e3)
    };
    if (clickId) {
      payload.cid = clickId;
    }
    const cookieValue = await signCookieValue(payload, config.signingSecret);
    const setCookieHeader = serializeSetCookie(cookieName, cookieValue, {
      maxAge,
      path,
      domain,
      secure,
      sameSite,
      httpOnly: true
    });
    log("Setting ref cookie for:", refCode);
    return jsonResponse({ success: true }, 200, {
      "Set-Cookie": setCookieHeader
    });
  }
  async function DELETE(_request) {
    const clearHeader = serializeClearCookie(cookieName, path, domain);
    log("Clearing ref cookie");
    return jsonResponse({ success: true }, 200, {
      "Set-Cookie": clearHeader
    });
  }
  return { POST, DELETE };
}
async function getRefFromRequest(request, signingSecret, cookieName = DEFAULT_COOKIE_NAME, maxAgeSeconds = DEFAULT_MAX_AGE) {
  const cookieHeader = request.headers.get("cookie");
  const cookieValue = parseCookieHeader(cookieHeader, cookieName);
  if (!cookieValue) {
    return null;
  }
  const payload = await verifyCookieValue(
    cookieValue,
    signingSecret,
    maxAgeSeconds
  );
  if (!payload) {
    return null;
  }
  return {
    refCode: payload.ref,
    clickId: payload.cid ?? null,
    timestamp: payload.ts
  };
}
export {
  createRefHandler,
  getRefFromRequest
};
