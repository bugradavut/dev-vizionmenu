var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// services/websrm-adapter/websrm-client.ts
var websrm_client_exports = {};
__export(websrm_client_exports, {
  generateIdempotencyKey: () => generateIdempotencyKey,
  getWebSrmBaseUrl: () => getWebSrmBaseUrl,
  isNetworkEnabled: () => isNetworkEnabled,
  postTransaction: () => postTransaction
});
module.exports = __toCommonJS(websrm_client_exports);
var import_crypto = require("crypto");
var import_https = __toESM(require("https"));
var import_url = require("url");
async function postTransaction(config, path, bodyCanonical, headers, idempotencyKey) {
  const url = `${config.baseUrl}${path}`;
  const timeout = config.timeout || 3e4;
  const requestHeaders = {
    "Content-Type": "application/json; charset=utf-8",
    "Accept": "application/json",
    ...headers
  };
  if (idempotencyKey) {
    requestHeaders["X-Idempotency-Key"] = idempotencyKey;
  }
  console.log("[WEB-SRM] \u{1F4E4} FULL Request Body:");
  console.log(JSON.stringify(JSON.parse(bodyCanonical), null, 2));
  const parsedUrl = new import_url.URL(url);
  const httpsOptions = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || 443,
    path: parsedUrl.pathname + parsedUrl.search,
    method: "POST",
    headers: requestHeaders,
    timeout
  };
  if (config.certPem && config.keyPem) {
    httpsOptions.cert = config.certPem;
    httpsOptions.key = config.keyPem;
    httpsOptions.rejectUnauthorized = true;
  }
  return new Promise((resolve) => {
    let timedOut = false;
    const req = import_https.default.request(httpsOptions, (res) => {
      const chunks = [];
      res.on("data", (chunk) => {
        chunks.push(chunk);
      });
      res.on("end", () => {
        if (timedOut) return;
        const rawBody = Buffer.concat(chunks).toString("utf8");
        let parsedBody;
        try {
          parsedBody = JSON.parse(rawBody);
        } catch {
          parsedBody = rawBody;
        }
        const responseHeaders = {};
        if (res.headers) {
          Object.entries(res.headers).forEach(([key, value]) => {
            if (typeof value === "string") {
              responseHeaders[key] = value;
            } else if (Array.isArray(value)) {
              responseHeaders[key] = value.join(", ");
            }
          });
        }
        const httpStatus = res.statusCode || 0;
        const success = httpStatus >= 200 && httpStatus < 300;
        if (!success) {
          console.error("[WEB-SRM] \u274C Quebec API Error Response:");
          console.error("  Status:", httpStatus);
          console.error("  Body:", JSON.stringify(parsedBody, null, 2));
          console.error("  Response Headers:", JSON.stringify(responseHeaders, null, 2));
          console.error("  Request Headers:", JSON.stringify(requestHeaders, null, 2));
        } else {
          console.log("[WEB-SRM] \u2705 Quebec API Success Response:");
          console.log("  Status:", httpStatus);
          console.log("  Body:", JSON.stringify(parsedBody, null, 2));
        }
        resolve({
          success,
          httpStatus,
          body: parsedBody,
          rawBody,
          headers: responseHeaders
        });
      });
    });
    req.setTimeout(timeout, () => {
      timedOut = true;
      req.destroy();
      resolve({
        success: false,
        httpStatus: 0,
        error: {
          code: "TIMEOUT",
          message: `Request timeout after ${timeout}ms`
        }
      });
    });
    req.on("error", (error) => {
      if (timedOut) return;
      resolve({
        success: false,
        httpStatus: 0,
        error: {
          code: "NETWORK_ERROR",
          message: error.message || "Network request failed"
        }
      });
    });
    req.write(bodyCanonical);
    req.end();
  });
}
__name(postTransaction, "postTransaction");
function generateIdempotencyKey(env, tenantId, orderId, timestamp, signature, totalAmount) {
  const input = `${env}|${tenantId}|${orderId}|${timestamp}|${signature}|${totalAmount}`;
  return (0, import_crypto.createHash)("sha256").update(input, "utf8").digest("hex");
}
__name(generateIdempotencyKey, "generateIdempotencyKey");
function isNetworkEnabled() {
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  return process.env.WEBSRM_NETWORK_ENABLED === "true";
}
__name(isNetworkEnabled, "isNetworkEnabled");
function getWebSrmBaseUrl(env) {
  if (process.env.WEBSRM_BASE_URL) {
    return process.env.WEBSRM_BASE_URL;
  }
  switch (env) {
    case "DEV":
      return "https://cnfr.api.rq-fo.ca";
    case "ESSAI":
      return "https://cnfr.api.rq-fo.ca";
    case "PROD":
      return "https://cnfr.api.rq-fo.ca";
    default:
      throw new Error(`[WEB-SRM] Invalid environment: ${env}`);
  }
}
__name(getWebSrmBaseUrl, "getWebSrmBaseUrl");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  generateIdempotencyKey,
  getWebSrmBaseUrl,
  isNetworkEnabled,
  postTransaction
});
