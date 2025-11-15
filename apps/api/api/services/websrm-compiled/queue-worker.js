var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
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

// apps/api/services/websrm-adapter/signature-ecdsa.ts
var signature_ecdsa_exports = {};
__export(signature_ecdsa_exports, {
  derToP1363: () => derToP1363,
  fingerprintSha1: () => fingerprintSha1,
  p1363ToDer: () => p1363ToDer,
  signP256P1363: () => signP256P1363,
  verifyP256P1363: () => verifyP256P1363
});
function derToP1363(der) {
  let offset = 0;
  if (der[offset++] !== 48) {
    throw new Error("DER signature must start with SEQUENCE tag (0x30)");
  }
  const seqLen = der[offset++];
  if (seqLen & 128) {
    const lenBytes = seqLen & 127;
    offset += lenBytes;
  }
  if (der[offset++] !== 2) {
    throw new Error("Expected INTEGER tag (0x02) for R");
  }
  let rLen = der[offset++];
  let rStart = offset;
  while (rLen > 0 && der[rStart] === 0) {
    rStart++;
    rLen--;
  }
  const r = der.slice(rStart, rStart + rLen);
  offset = rStart + rLen;
  if (der[offset++] !== 2) {
    throw new Error("Expected INTEGER tag (0x02) for S");
  }
  let sLen = der[offset++];
  let sStart = offset;
  while (sLen > 0 && der[sStart] === 0) {
    sStart++;
    sLen--;
  }
  const s = der.slice(sStart, sStart + sLen);
  const rPadded = Buffer.alloc(32);
  const sPadded = Buffer.alloc(32);
  r.copy(rPadded, 32 - r.length);
  s.copy(sPadded, 32 - s.length);
  return Buffer.concat([rPadded, sPadded]);
}
function p1363ToDer(sig64) {
  if (sig64.length !== 64) {
    throw new Error(`P1363 signature must be 64 bytes, got ${sig64.length}`);
  }
  let r = sig64.slice(0, 32);
  let s = sig64.slice(32, 64);
  while (r.length > 1 && r[0] === 0 && r[1] < 128) {
    r = r.slice(1);
  }
  while (s.length > 1 && s[0] === 0 && s[1] < 128) {
    s = s.slice(1);
  }
  if (r[0] & 128) {
    r = Buffer.concat([Buffer.from([0]), r]);
  }
  if (s[0] & 128) {
    s = Buffer.concat([Buffer.from([0]), s]);
  }
  const rDer = Buffer.concat([Buffer.from([2, r.length]), r]);
  const sDer = Buffer.concat([Buffer.from([2, s.length]), s]);
  const seqLen = rDer.length + sDer.length;
  const der = Buffer.concat([
    Buffer.from([48, seqLen]),
    // SEQUENCE
    rDer,
    sDer
  ]);
  return der;
}
function signP256P1363(baseString, privateKeyPem) {
  const signer = (0, import_crypto2.createSign)("sha256");
  signer.update(baseString, "utf8");
  const derSignature = signer.sign(privateKeyPem);
  const p1363Signature = derToP1363(derSignature);
  const base64Signature = p1363Signature.toString("base64");
  if (base64Signature.length !== 88) {
    console.warn(
      `[WEBSRM] P1363 signature length mismatch: expected 88, got ${base64Signature.length}`
    );
  }
  return base64Signature;
}
function fingerprintSha1(certPem) {
  const pemHeader = "-----BEGIN CERTIFICATE-----";
  const pemFooter = "-----END CERTIFICATE-----";
  const startIndex = certPem.indexOf(pemHeader);
  const endIndex = certPem.indexOf(pemFooter);
  if (startIndex === -1 || endIndex === -1) {
    throw new Error("Invalid PEM certificate: missing BEGIN/END markers");
  }
  const base64Body = certPem.substring(startIndex + pemHeader.length, endIndex).replace(/\s/g, "");
  const derBytes = Buffer.from(base64Body, "base64");
  const hash = (0, import_crypto2.createHash)("sha1");
  hash.update(derBytes);
  const fingerprint = hash.digest("hex");
  return fingerprint.toLowerCase();
}
function verifyP256P1363(baseString, p1363SignatureBase64, publicKeyPem) {
  try {
    const p1363Signature = Buffer.from(p1363SignatureBase64, "base64");
    if (p1363Signature.length !== 64) {
      throw new Error(`P1363 signature must be 64 bytes, got ${p1363Signature.length}`);
    }
    const derSignature = p1363ToDer(p1363Signature);
    const verifier = (0, import_crypto2.createVerify)("sha256");
    verifier.update(baseString, "utf8");
    const isValid = verifier.verify(publicKeyPem, derSignature);
    return isValid;
  } catch (error) {
    return false;
  }
}
var import_crypto2;
var init_signature_ecdsa = __esm({
  "apps/api/services/websrm-adapter/signature-ecdsa.ts"() {
    import_crypto2 = require("crypto");
    __name(derToP1363, "derToP1363");
    __name(p1363ToDer, "p1363ToDer");
    __name(signP256P1363, "signP256P1363");
    __name(fingerprintSha1, "fingerprintSha1");
    __name(verifyP256P1363, "verifyP256P1363");
  }
});

// apps/api/services/websrm-adapter/body-signer.ts
var body_signer_exports = {};
__export(body_signer_exports, {
  canonicalizePayload: () => canonicalizePayload,
  computeBodySignatures: () => computeBodySignatures,
  getPreviousSignature: () => getPreviousSignature,
  validateSignaturePair: () => validateSignaturePair
});
function computeBodySignatures(payload, opts) {
  const { createHash: createHash5 } = require("crypto");
  const { signP256P1363: signP256P13632 } = (init_signature_ecdsa(), __toCommonJS(signature_ecdsa_exports));
  if (!opts.privateKeyPem || typeof opts.privateKeyPem !== "string") {
    throw new Error("privateKeyPem is required and must be a string");
  }
  if (!opts.privateKeyPem.includes("-----BEGIN")) {
    throw new Error("privateKeyPem must be a valid PEM key");
  }
  if (opts.previousActu !== void 0) {
    if (typeof opts.previousActu !== "string" || opts.previousActu.length !== 88) {
      throw new Error("previousActu must be exactly 88 Base64 characters");
    }
    if (!/^[A-Za-z0-9+/=]+$/.test(opts.previousActu)) {
      throw new Error("previousActu must be valid Base64");
    }
  }
  const canonical = canonicalizePayload(payload);
  const sha256Hex = createHash5("sha256").update(canonical, "utf8").digest("hex").toLowerCase();
  const actu = signP256P13632(canonical, opts.privateKeyPem);
  if (actu.length !== 88) {
    throw new Error(`Generated signature must be 88 characters, got ${actu.length}`);
  }
  const preced = opts.previousActu || "=".repeat(88);
  return {
    preced,
    actu,
    canonical,
    sha256Hex
  };
}
function canonicalizePayload(payload) {
  const sanitizeAscii2 = /* @__PURE__ */ __name((text) => {
    const replacements = {
      "\xE0": "a",
      "\xE1": "a",
      "\xE2": "a",
      "\xE3": "a",
      "\xE4": "a",
      "\xE5": "a",
      "\xE8": "e",
      "\xE9": "e",
      "\xEA": "e",
      "\xEB": "e",
      "\xEC": "i",
      "\xED": "i",
      "\xEE": "i",
      "\xEF": "i",
      "\xF2": "o",
      "\xF3": "o",
      "\xF4": "o",
      "\xF5": "o",
      "\xF6": "o",
      "\xF9": "u",
      "\xFA": "u",
      "\xFB": "u",
      "\xFC": "u",
      "\xFD": "y",
      "\xFF": "y",
      "\xF1": "n",
      "\xE7": "c",
      "\xC0": "A",
      "\xC1": "A",
      "\xC2": "A",
      "\xC3": "A",
      "\xC4": "A",
      "\xC5": "A",
      "\xC8": "E",
      "\xC9": "E",
      "\xCA": "E",
      "\xCB": "E",
      "\xCC": "I",
      "\xCD": "I",
      "\xCE": "I",
      "\xCF": "I",
      "\xD2": "O",
      "\xD3": "O",
      "\xD4": "O",
      "\xD5": "O",
      "\xD6": "O",
      "\xD9": "U",
      "\xDA": "U",
      "\xDB": "U",
      "\xDC": "U",
      "\xDD": "Y",
      "\u0178": "Y",
      "\xD1": "N",
      "\xC7": "C"
    };
    let sanitized = "";
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const code = char.charCodeAt(0);
      if (code <= 127) {
        sanitized += char;
      } else if (replacements[char]) {
        sanitized += replacements[char];
      }
    }
    return sanitized;
  }, "sanitizeAscii");
  function canonicalize(value) {
    if (value === null) {
      return null;
    }
    if (value === void 0) {
      return void 0;
    }
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "number") {
      if (!Number.isInteger(value)) {
        throw new Error(`Float numbers not allowed in payload: ${value}. Use integers (cents) instead.`);
      }
      return value;
    }
    if (typeof value === "string") {
      const sanitized = sanitizeAscii2(value);
      return sanitized;
    }
    if (Array.isArray(value)) {
      return value.map((item) => canonicalize(item));
    }
    if (typeof value === "object") {
      const sortedKeys = Object.keys(value).sort();
      const canonical = {};
      for (const key of sortedKeys) {
        const canonicalValue = canonicalize(value[key]);
        if (canonicalValue !== void 0) {
          canonical[key] = canonicalValue;
        }
      }
      return canonical;
    }
    throw new Error(`Unsupported type in payload: ${typeof value}`);
  }
  __name(canonicalize, "canonicalize");
  const canonicalPayload = canonicalize(payload);
  return JSON.stringify(canonicalPayload);
}
function validateSignaturePair(sigs) {
  const errors = [];
  return {
    valid: errors.length === 0,
    errors
  };
}
async function getPreviousSignature(branchId) {
  return void 0;
}
var init_body_signer = __esm({
  "apps/api/services/websrm-adapter/body-signer.ts"() {
    __name(computeBodySignatures, "computeBodySignatures");
    __name(canonicalizePayload, "canonicalizePayload");
    __name(validateSignaturePair, "validateSignaturePair");
    __name(getPreviousSignature, "getPreviousSignature");
  }
});

// apps/api/services/websrm-adapter/queue-worker.ts
var queue_worker_exports = {};
__export(queue_worker_exports, {
  consumeQueue: () => consumeQueue,
  enqueueDailyClosing: () => enqueueDailyClosing,
  enqueueOrder: () => enqueueOrder,
  processQueueItem: () => processQueueItem
});
module.exports = __toCommonJS(queue_worker_exports);
var import_supabase_js2 = require("@supabase/supabase-js");
var import_crypto5 = require("crypto");
var import_p_limit = __toESM(require("p-limit"));

// apps/api/services/websrm-adapter/websrm-client.ts
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

// apps/api/services/websrm-adapter/error-mapper.ts
function mapWebSrmError(response) {
  if (response.success && response.httpStatus >= 200 && response.httpStatus < 300) {
    return {
      code: "OK",
      retryable: false,
      httpStatus: response.httpStatus
    };
  }
  if (response.error?.code === "TIMEOUT" || response.error?.code === "NETWORK_ERROR") {
    return {
      code: "TEMP_UNAVAILABLE",
      retryable: true,
      httpStatus: 0,
      rawCode: response.error.code,
      rawMessage: sanitizeErrorMessage(response.error.message)
    };
  }
  const httpStatus = response.httpStatus;
  if (httpStatus === 409) {
    return {
      code: "DUPLICATE",
      retryable: false,
      httpStatus,
      rawCode: extractRawCode(response),
      rawMessage: sanitizeErrorMessage(extractRawMessage(response))
    };
  }
  if (httpStatus === 429) {
    return {
      code: "RATE_LIMIT",
      retryable: true,
      httpStatus,
      rawCode: extractRawCode(response),
      rawMessage: sanitizeErrorMessage(extractRawMessage(response))
    };
  }
  if (httpStatus >= 400 && httpStatus < 500) {
    const rawCode = extractRawCode(response);
    const rawMessage = extractRawMessage(response);
    if (isSignatureError(rawCode, rawMessage)) {
      return {
        code: "INVALID_SIGNATURE",
        retryable: false,
        httpStatus,
        rawCode,
        rawMessage: sanitizeErrorMessage(rawMessage)
      };
    }
    if (isHeaderError(rawCode, rawMessage)) {
      return {
        code: "INVALID_HEADER",
        retryable: false,
        httpStatus,
        rawCode,
        rawMessage: sanitizeErrorMessage(rawMessage)
      };
    }
    return {
      code: "UNKNOWN",
      retryable: false,
      httpStatus,
      rawCode,
      rawMessage: sanitizeErrorMessage(rawMessage)
    };
  }
  if (httpStatus >= 500 && httpStatus < 600) {
    return {
      code: "TEMP_UNAVAILABLE",
      retryable: true,
      httpStatus,
      rawCode: extractRawCode(response),
      rawMessage: sanitizeErrorMessage(extractRawMessage(response))
    };
  }
  return {
    code: "UNKNOWN",
    retryable: false,
    httpStatus,
    rawCode: extractRawCode(response),
    rawMessage: sanitizeErrorMessage(extractRawMessage(response))
  };
}
__name(mapWebSrmError, "mapWebSrmError");
function extractRawCode(response) {
  if (!response.body) return void 0;
  if (typeof response.body === "object") {
    return response.body.code || response.body.errorCode || response.body.cod_retour || response.body.error_code || void 0;
  }
  return void 0;
}
__name(extractRawCode, "extractRawCode");
function extractRawMessage(response) {
  if (!response.body) {
    return response.error?.message;
  }
  if (typeof response.body === "object") {
    return response.body.message || response.body.errorMessage || response.body.error || response.body.description || void 0;
  }
  if (typeof response.body === "string") {
    return response.body.substring(0, 200);
  }
  return void 0;
}
__name(extractRawMessage, "extractRawMessage");
function isSignatureError(code, message) {
  if (!code && !message) return false;
  const lowerCode = (code || "").toLowerCase();
  const lowerMessage = (message || "").toLowerCase();
  const signatureKeywords = [
    "signature",
    "signa",
    "sign",
    "verification",
    "verify",
    "invalid_signature",
    "sig_invalid"
  ];
  return signatureKeywords.some(
    (keyword) => lowerCode.includes(keyword) || lowerMessage.includes(keyword)
  );
}
__name(isSignatureError, "isSignatureError");
function isHeaderError(code, message) {
  if (!code && !message) return false;
  const lowerCode = (code || "").toLowerCase();
  const lowerMessage = (message || "").toLowerCase();
  const headerKeywords = [
    "header",
    "missing",
    "required",
    "invalid_header",
    "header_missing",
    "idapprl",
    "idsev",
    "codcertif"
  ];
  return headerKeywords.some(
    (keyword) => lowerCode.includes(keyword) || lowerMessage.includes(keyword)
  );
}
__name(isHeaderError, "isHeaderError");
function sanitizeErrorMessage(message) {
  if (!message) return void 0;
  let sanitized = message.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, "[EMAIL]").replace(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, "[PHONE]").replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, "[CARD]").replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "[UUID]").replace(/\b[A-Z]{2}\d{2}[A-Z0-9]{1,30}\b/g, "[IBAN]").replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[SSN]").replace(/\b\d{3}[-\s]\d{3}[-\s]\d{3}\b/g, "[SIN]");
  if (sanitized.length > 500) {
    sanitized = sanitized.substring(0, 500) + "...";
  }
  return sanitized;
}
__name(sanitizeErrorMessage, "sanitizeErrorMessage");
function calculateBackoff(retryCount, baseDelaySeconds = 60, maxDelaySeconds = 3600) {
  const delaySeconds = Math.min(baseDelaySeconds * Math.pow(2, retryCount), maxDelaySeconds);
  const jitter = delaySeconds * 0.1 * (Math.random() * 2 - 1);
  return Math.floor((delaySeconds + jitter) * 1e3);
}
__name(calculateBackoff, "calculateBackoff");

// packages/websrm-core/dist/enums.js
var ActionType;
(function(ActionType2) {
  ActionType2["REGISTER"] = "ENR";
  ActionType2["CANCEL"] = "ANN";
  ActionType2["MODIFY"] = "MOD";
  ActionType2["CLOSING"] = "FER";
})(ActionType || (ActionType = {}));
var ServiceType;
(function(ServiceType2) {
  ServiceType2["RESTAURANT"] = "REST";
  ServiceType2["DELIVERY"] = "LIV";
})(ServiceType || (ServiceType = {}));
var TransactionType;
(function(TransactionType2) {
  TransactionType2["SALE"] = "VEN";
  TransactionType2["REFUND"] = "REM";
})(TransactionType || (TransactionType = {}));
var PrintMode;
(function(PrintMode2) {
  PrintMode2["ELECTRONIC"] = "ELE";
  PrintMode2["PAPER"] = "PAP";
  PrintMode2["NONE"] = "AUC";
})(PrintMode || (PrintMode = {}));
var PrintFormat;
(function(PrintFormat2) {
  PrintFormat2["SUMMARY"] = "SUM";
  PrintFormat2["DETAILED"] = "DET";
})(PrintFormat || (PrintFormat = {}));
var PaymentMode;
(function(PaymentMode2) {
  PaymentMode2["CARD"] = "CRE";
  PaymentMode2["CASH"] = "ARG";
  PaymentMode2["DEBIT"] = "DEB";
  PaymentMode2["CHECK"] = "CHQ";
  PaymentMode2["ELECTRONIC"] = "MVO";
})(PaymentMode || (PaymentMode = {}));
var TaxType;
(function(TaxType2) {
  TaxType2["FEDERAL"] = "FED";
  TaxType2["PROVINCIAL"] = "PROV";
})(TaxType || (TaxType = {}));
var ResponseCode;
(function(ResponseCode2) {
  ResponseCode2["SUCCESS"] = "00";
  ResponseCode2["ERROR"] = "99";
  ResponseCode2["INVALID_SIGNATURE"] = "01";
  ResponseCode2["MISSING_FIELDS"] = "02";
  ResponseCode2["INVALID_FORMAT"] = "03";
  ResponseCode2["DUPLICATE"] = "04";
  ResponseCode2["NOT_FOUND"] = "05";
  ResponseCode2["INVALID_CERTIFICATION"] = "JW00B";
  ResponseCode2["DEVICE_NOT_REGISTERED"] = "JW00C";
  ResponseCode2["CERTIFICATE_EXPIRED"] = "JW00D";
  ResponseCode2["TIMEOUT"] = "TIMEOUT";
})(ResponseCode || (ResponseCode = {}));
var Environment;
(function(Environment2) {
  Environment2["DEV"] = "dev";
  Environment2["ESSAI"] = "essai";
  Environment2["PROD"] = "prod";
})(Environment || (Environment = {}));
var TransactionStatus;
(function(TransactionStatus2) {
  TransactionStatus2["PENDING"] = "pending";
  TransactionStatus2["SENDING"] = "sending";
  TransactionStatus2["SENT"] = "sent";
  TransactionStatus2["FAILED"] = "failed";
  TransactionStatus2["FAILED_PERMANENT"] = "failed_permanent";
})(TransactionStatus || (TransactionStatus = {}));
var CurrencyCode;
(function(CurrencyCode2) {
  CurrencyCode2["CAD"] = "CAD";
})(CurrencyCode || (CurrencyCode = {}));
var WEBSRM_CONSTANTS = {
  /** Maximum length for text fields (ASCII only) */
  MAX_TEXT_LENGTH: 255,
  /** Maximum number of line items per transaction */
  MAX_LINE_ITEMS: 1e3,
  /** GST rate for Canada (5%) */
  GST_RATE: 0.05,
  /** QST rate for Québec (9.975%) */
  QST_RATE: 0.09975,
  /** Maximum retry attempts for failed transactions */
  MAX_RETRY_ATTEMPTS: 5,
  /** Retry delay in milliseconds (exponential backoff base) */
  RETRY_DELAY_MS: 1e3,
  /** Request timeout in milliseconds */
  REQUEST_TIMEOUT_MS: 1e4,
  /** Québec timezone */
  QUEBEC_TIMEZONE: "America/Toronto",
  /** Software version format (semver) */
  VERSION_REGEX: /^\d+\.\d+\.\d+$/
};
var PAYMENT_METHOD_MAP = {
  // SW-78 FO-116: New payment method types
  online: PaymentMode.ELECTRONIC,
  // Online payment (MVO)
  cash: PaymentMode.CASH,
  // Cash at counter (ARG)
  card: PaymentMode.CARD,
  // Card at counter (CRE)
  // Legacy mappings (backward compatibility)
  credit_card: PaymentMode.CARD,
  debit_card: PaymentMode.DEBIT,
  counter: PaymentMode.CASH,
  // Old counter → default to cash
  check: PaymentMode.CHECK,
  digital_wallet: PaymentMode.ELECTRONIC,
  bank_transfer: PaymentMode.ELECTRONIC
};
var ORDER_TYPE_MAP = {
  dine_in: ServiceType.RESTAURANT,
  takeaway: ServiceType.RESTAURANT,
  table_service: ServiceType.RESTAURANT,
  delivery: ServiceType.DELIVERY
};
var ORDER_STATUS_MAP = {
  completed: ActionType.REGISTER,
  cancelled: ActionType.CANCEL,
  refunded: ActionType.CANCEL
};

// packages/websrm-core/dist/format.js
function formatAmount(amount) {
  if (!Number.isFinite(amount)) {
    throw new Error(`Invalid amount: ${amount}. Must be a finite number.`);
  }
  const cents = amount * 100;
  const rounded = Math.round(cents);
  if (!Number.isInteger(rounded)) {
    throw new Error(`Rounding failed for amount: ${amount}`);
  }
  return rounded;
}
__name(formatAmount, "formatAmount");
function toQuebecLocalIso(utcTimestamp) {
  if (typeof utcTimestamp !== "string" || !utcTimestamp) {
    throw new Error("Invalid UTC timestamp: must be a non-empty string");
  }
  try {
    const date = new Date(utcTimestamp);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date format: ${utcTimestamp}`);
    }
    const offsetMinutes = -5 * 60;
    const localDate = new Date(date.getTime() + offsetMinutes * 60 * 1e3);
    const year = localDate.getUTCFullYear();
    const month = String(localDate.getUTCMonth() + 1).padStart(2, "0");
    const day = String(localDate.getUTCDate()).padStart(2, "0");
    const hours = String(localDate.getUTCHours()).padStart(2, "0");
    const minutes = String(localDate.getUTCMinutes()).padStart(2, "0");
    const seconds = String(localDate.getUTCSeconds()).padStart(2, "0");
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  } catch (error) {
    throw new Error(`Failed to convert timestamp: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
__name(toQuebecLocalIso, "toQuebecLocalIso");
function sanitizeAscii(text, maxLength = WEBSRM_CONSTANTS.MAX_TEXT_LENGTH) {
  if (typeof text !== "string") {
    throw new Error("Input must be a string");
  }
  if (maxLength <= 0) {
    throw new Error("maxLength must be positive");
  }
  const replacements = {
    "\xE0": "a",
    "\xE1": "a",
    "\xE2": "a",
    "\xE3": "a",
    "\xE4": "a",
    "\xE5": "a",
    "\xE8": "e",
    "\xE9": "e",
    "\xEA": "e",
    "\xEB": "e",
    "\xEC": "i",
    "\xED": "i",
    "\xEE": "i",
    "\xEF": "i",
    "\xF2": "o",
    "\xF3": "o",
    "\xF4": "o",
    "\xF5": "o",
    "\xF6": "o",
    "\xF9": "u",
    "\xFA": "u",
    "\xFB": "u",
    "\xFC": "u",
    "\xFD": "y",
    "\xFF": "y",
    "\xF1": "n",
    "\xE7": "c",
    "\xC0": "A",
    "\xC1": "A",
    "\xC2": "A",
    "\xC3": "A",
    "\xC4": "A",
    "\xC5": "A",
    "\xC8": "E",
    "\xC9": "E",
    "\xCA": "E",
    "\xCB": "E",
    "\xCC": "I",
    "\xCD": "I",
    "\xCE": "I",
    "\xCF": "I",
    "\xD2": "O",
    "\xD3": "O",
    "\xD4": "O",
    "\xD5": "O",
    "\xD6": "O",
    "\xD9": "U",
    "\xDA": "U",
    "\xDB": "U",
    "\xDC": "U",
    "\xDD": "Y",
    "\u0178": "Y",
    "\xD1": "N",
    "\xC7": "C"
  };
  let sanitized = "";
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const code = char.charCodeAt(0);
    if (code <= 127) {
      sanitized += char;
    } else if (replacements[char]) {
      sanitized += replacements[char];
    }
  }
  return sanitized.slice(0, maxLength);
}
__name(sanitizeAscii, "sanitizeAscii");

// packages/websrm-core/dist/signature.js
var SignatureAlgorithm;
(function(SignatureAlgorithm2) {
  SignatureAlgorithm2["HMAC_SHA256"] = "HMAC-SHA256";
  SignatureAlgorithm2["ECDSA"] = "ECDSA";
})(SignatureAlgorithm || (SignatureAlgorithm = {}));

// packages/websrm-core/dist/field-mapper.js
function mapOrderToReqTrans(order, signature) {
  if (!order || !order.id) {
    throw new Error("Order is required and must have an ID");
  }
  if (!signature || typeof signature !== "string") {
    throw new Error("Signature is required");
  }
  const acti = mapOrderStatusToAction(order.order_status);
  const typServ = mapOrderTypeToServiceType(order.order_type);
  const typTrans = order.order_status === "refunded" ? TransactionType.REFUND : TransactionType.SALE;
  const modImpr = mapReceiptPrintMode(order.receipt_print_mode);
  const formImpr = mapReceiptFormat(order.receipt_format);
  const modPai = mapPaymentMethod(order.payment_method);
  const montST = formatAmount(order.items_subtotal);
  const montTPS = formatAmount(order.gst_amount);
  const montTVQ = formatAmount(order.qst_amount);
  const montTot = formatAmount(order.total_amount);
  const pourcent = order.tip_type === "percentage" && order.tip_value ? Math.round(order.tip_value * 100) : void 0;
  const montRab = order.discount_amount ? formatAmount(order.discount_amount) : void 0;
  const dtTrans = toQuebecLocalIso(order.created_at);
  const refTrans = order.id.substring(0, 8).toUpperCase();
  const refEmpl = order.served_by_user_id || void 0;
  const refCli = order.customer_phone || void 0;
  const eCommerce = isEcommerceOrder(order);
  const desc = mapLineItems(order.items);
  return {
    idTrans: order._transaction_id || order.id,
    // FO-116: Use queue ID for unique transactions
    acti,
    typServ,
    typTrans,
    modImpr,
    formImpr,
    modPai,
    montST,
    montTPS,
    montTVQ,
    montTot,
    pourcent,
    montRab,
    dtTrans,
    refTrans,
    refEmpl,
    refCli,
    eCommerce,
    desc,
    signature
  };
}
__name(mapOrderToReqTrans, "mapOrderToReqTrans");
function mapOrderStatusToAction(orderStatus) {
  const mapped = ORDER_STATUS_MAP[orderStatus];
  if (!mapped) {
    console.warn(`Unknown order status: ${orderStatus}, defaulting to REGISTER`);
    return ActionType.REGISTER;
  }
  return mapped;
}
__name(mapOrderStatusToAction, "mapOrderStatusToAction");
function mapOrderTypeToServiceType(orderType) {
  const mapped = ORDER_TYPE_MAP[orderType];
  if (!mapped) {
    console.warn(`Unknown order type: ${orderType}, defaulting to RESTAURANT`);
    return ServiceType.RESTAURANT;
  }
  return mapped;
}
__name(mapOrderTypeToServiceType, "mapOrderTypeToServiceType");
function mapPaymentMethod(paymentMethod) {
  const mapped = PAYMENT_METHOD_MAP[paymentMethod];
  if (!mapped) {
    console.warn(`Unknown payment method: ${paymentMethod}, defaulting to CARD`);
    return PaymentMode.CARD;
  }
  return mapped;
}
__name(mapPaymentMethod, "mapPaymentMethod");
function mapReceiptPrintMode(receiptPrintMode) {
  const map = {
    electronic: PrintMode.ELECTRONIC,
    paper: PrintMode.PAPER,
    none: PrintMode.NONE
  };
  return map[receiptPrintMode || "electronic"] || PrintMode.ELECTRONIC;
}
__name(mapReceiptPrintMode, "mapReceiptPrintMode");
function mapReceiptFormat(receiptFormat) {
  const map = {
    summary: PrintFormat.SUMMARY,
    detailed: PrintFormat.DETAILED
  };
  return map[receiptFormat || "detailed"] || PrintFormat.DETAILED;
}
__name(mapReceiptFormat, "mapReceiptFormat");
function isEcommerceOrder(order) {
  const paymentMethod = order.payment_method;
  if (paymentMethod === "cash" || paymentMethod === "card") {
    return false;
  }
  if (paymentMethod === "online") {
    return true;
  }
  const ecommerceSourcesRegex = /^(web|mobile|qr_code)$/i;
  if (order.third_party_platform) {
    return ecommerceSourcesRegex.test(order.third_party_platform);
  }
  return true;
}
__name(isEcommerceOrder, "isEcommerceOrder");
function mapLineItems(items) {
  if (!items || items.length === 0) {
    throw new Error("Order must have at least one item");
  }
  return items.map((item) => ({
    desc: sanitizeAscii(item.menu_item_name, 255),
    // ASCII-only, max 255 chars
    montLig: formatAmount(item.item_total),
    qte: item.quantity,
    prixUnit: formatAmount(item.menu_item_price)
  }));
}
__name(mapLineItems, "mapLineItems");
function mapClosingToReqFer(closing, signature) {
  if (!closing || !closing.id) {
    throw new Error("Daily closing is required and must have an ID");
  }
  if (!signature || typeof signature !== "string") {
    throw new Error("Signature is required");
  }
  if (!closing.closing_date || !/^\d{4}-\d{2}-\d{2}$/.test(closing.closing_date)) {
    throw new Error("Valid closing_date is required (YYYY-MM-DD format)");
  }
  const montVente = formatAmount(closing.total_sales);
  const montRembours = formatAmount(closing.total_refunds);
  const montNet = formatAmount(closing.net_sales);
  const montTPS = formatAmount(closing.gst_collected);
  const montTVQ = formatAmount(closing.qst_collected);
  const montComptant = formatAmount(closing.terminal_total);
  const montCarte = formatAmount(closing.online_total);
  return {
    idFer: closing.id,
    acti: ActionType.CLOSING,
    dtFer: closing.closing_date,
    montVente,
    montRembours,
    montNet,
    montTPS,
    montTVQ,
    nbTrans: closing.transaction_count,
    montComptant,
    montCarte,
    refSucc: closing.branch_id,
    refEmpl: closing.created_by,
    signature
  };
}
__name(mapClosingToReqFer, "mapClosingToReqFer");

// apps/api/services/websrm-adapter/runtime-adapter.ts
init_body_signer();

// apps/api/services/websrm-adapter/headers-builder.ts
init_signature_ecdsa();
function buildOfficialHeaders(input, baseString) {
  if (!input.env || !["DEV", "ESSAI", "PROD"].includes(input.env)) {
    throw new Error(`env must be DEV, ESSAI, or PROD, got: ${input.env}`);
  }
  const requiredFields = {
    idSev: input.idSev,
    idVersi: input.idVersi,
    codCertif: input.codCertif,
    idPartn: input.idPartn,
    versi: input.versi,
    versiParn: input.versiParn
  };
  for (const [key, value] of Object.entries(requiredFields)) {
    if (!value || typeof value !== "string" || value.trim() === "") {
      throw new Error(`${key} is required and cannot be empty`);
    }
    for (let i = 0; i < value.length; i++) {
      if (value.charCodeAt(i) > 127) {
        throw new Error(`${key} contains non-ASCII characters: ${value}`);
      }
    }
  }
  if (input.idApprl && typeof input.idApprl === "string" && input.idApprl.trim() !== "") {
    for (let i = 0; i < input.idApprl.length; i++) {
      if (input.idApprl.charCodeAt(i) > 127) {
        throw new Error(`idApprl contains non-ASCII characters: ${input.idApprl}`);
      }
    }
  }
  if (!baseString || typeof baseString !== "string") {
    throw new Error("baseString is required and must be a string");
  }
  if (baseString.endsWith("\n")) {
    throw new Error("baseString must not have a trailing newline");
  }
  const lines = baseString.split("\n");
  if (lines.length !== 4) {
    throw new Error(`baseString must have exactly 4 lines (3 newlines), got ${lines.length} lines`);
  }
  if (!input.privateKeyPem || !input.privateKeyPem.includes("-----BEGIN")) {
    throw new Error("privateKeyPem is required and must be a valid PEM key");
  }
  if (!input.certPem || !input.certPem.includes("-----BEGIN CERTIFICATE-----")) {
    throw new Error("certPem is required and must be a valid PEM certificate");
  }
  const signature = signP256P1363(baseString, input.privateKeyPem);
  if (signature.length !== 88) {
    throw new Error(`SIGNATRANSM must be 88 characters, got ${signature.length}`);
  }
  const fingerprint = fingerprintSha1(input.certPem);
  if (fingerprint.length !== 40) {
    throw new Error(`EMPRCERTIFTRANSM must be 40 characters, got ${fingerprint.length}`);
  }
  const headers = {
    ENVIRN: input.env,
    APPRLINIT: "SRV",
    // Device type: SRV = Serveur (Server) - per Quebec specification
    IDSEV: input.idSev,
    IDVERSI: input.idVersi,
    CODCERTIF: input.codCertif,
    IDPARTN: input.idPartn,
    VERSI: input.versi,
    VERSIPARN: input.versiParn,
    SIGNATRANSM: signature,
    EMPRCERTIFTRANSM: fingerprint
  };
  if (input.idApprl && input.idApprl.trim() !== "") {
    headers.IDAPPRL = input.idApprl;
  }
  if (input.caseEssai && typeof input.caseEssai === "string" && input.caseEssai.trim() !== "") {
    for (let i = 0; i < input.caseEssai.length; i++) {
      if (input.caseEssai.charCodeAt(i) > 127) {
        throw new Error(`caseEssai contains non-ASCII characters: ${input.caseEssai}`);
      }
    }
    headers.CASESSAI = input.caseEssai;
  }
  return headers;
}
__name(buildOfficialHeaders, "buildOfficialHeaders");
function buildCanonicalBaseString(method, path, canonicalBody, headers) {
  const { createHash: createHash5 } = require("crypto");
  const upperMethod = method.toUpperCase();
  if (upperMethod !== "POST") {
    throw new Error(`Only POST method is supported, got: ${method}`);
  }
  if (!path || !path.startsWith("/")) {
    throw new Error(`Path must start with '/', got: ${path}`);
  }
  const bodyHash = createHash5("sha256").update(canonicalBody, "utf8").digest("hex").toLowerCase();
  const requiredHeaders = [
    "IDSEV",
    "IDVERSI",
    "CODCERTIF",
    "IDPARTN",
    "VERSI",
    "VERSIPARN",
    "ENVIRN"
  ];
  const headerPairs = [];
  if (headers.IDAPPRL && typeof headers.IDAPPRL === "string" && headers.IDAPPRL.trim() !== "") {
    const idapprl = headers.IDAPPRL;
    for (let i = 0; i < idapprl.length; i++) {
      if (idapprl.charCodeAt(i) > 127) {
        throw new Error(`Header IDAPPRL contains non-ASCII characters: ${idapprl}`);
      }
    }
    headerPairs.push(`IDAPPRL=${idapprl}`);
  }
  for (const key of requiredHeaders) {
    const value = headers[key];
    if (!value || typeof value !== "string" || value.trim() === "") {
      throw new Error(`Required header ${key} is missing or empty`);
    }
    for (let i = 0; i < value.length; i++) {
      if (value.charCodeAt(i) > 127) {
        throw new Error(`Header ${key} contains non-ASCII characters: ${value}`);
      }
    }
    headerPairs.push(`${key}=${value}`);
  }
  if (headers.CASESSAI && typeof headers.CASESSAI === "string" && headers.CASESSAI.trim() !== "") {
    const casessai = headers.CASESSAI;
    for (let i = 0; i < casessai.length; i++) {
      if (casessai.charCodeAt(i) > 127) {
        throw new Error(`Header CASESSAI contains non-ASCII characters: ${casessai}`);
      }
    }
    headerPairs.push(`CASESSAI=${casessai}`);
  }
  const headerList = headerPairs.join(";");
  return `${upperMethod}
${path}
${bodyHash}
${headerList}`;
}
__name(buildCanonicalBaseString, "buildCanonicalBaseString");

// apps/api/services/websrm-adapter/qr-builder.ts
function toBase64Url(b64) {
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
__name(toBase64Url, "toBase64Url");
function buildOfficialQr(payload, actuBase64, opts) {
  if (!actuBase64 || typeof actuBase64 !== "string" || actuBase64.length !== 88) {
    throw new Error("actuBase64 must be exactly 88 Base64 characters");
  }
  if (!/^[A-Za-z0-9+/=]+$/.test(actuBase64)) {
    throw new Error("actuBase64 must be valid Base64");
  }
  const sigUrlSafe = toBase64Url(actuBase64);
  const no = payload.idTrans || "";
  const dt = payload.dtTrans || "";
  const tot = payload.montTot !== void 0 ? String(payload.montTot) : "";
  const baseUrl = opts?.baseUrl || "https://qr.local/verify";
  const params = new URLSearchParams();
  params.append("no", no);
  params.append("dt", dt);
  params.append("tot", tot);
  params.append("sig", sigUrlSafe);
  return `${baseUrl}?${params.toString()}`;
}
__name(buildOfficialQr, "buildOfficialQr");

// apps/api/services/websrm-adapter/persist.ts
var import_fs = require("fs");
var import_path = require("path");
async function persistReceipt(target, data) {
  if (target === "none") {
    return;
  }
  if (target === "files") {
    const baseDir = (0, import_path.join)(process.cwd(), "tmp", "receipts");
    await import_fs.promises.mkdir(baseDir, { recursive: true });
    const stamp = (data.transactionTimestamp || (/* @__PURE__ */ new Date()).toISOString()).replace(/[:.]/g, "-").slice(0, 19);
    const filename = `websrm-${data.orderId}-${stamp}.json`;
    const filepath = (0, import_path.join)(baseDir, filename);
    const output = {
      meta: {
        tenantId: data.tenantId,
        orderId: data.orderId,
        printMode: data.printMode,
        format: data.format,
        transactionTimestamp: data.transactionTimestamp,
        websrmTransactionId: data.websrmTransactionId
      },
      signatures: {
        signa_preced: data.signaPreced,
        signa_actu: data.signaActu,
        payload_hash: data.payloadHash
      },
      qr: data.qrData,
      headers: data.headers ?? {},
      canonical: data.payloadCanonical ?? ""
    };
    await import_fs.promises.writeFile(filepath, JSON.stringify(output, null, 2), "utf8");
    return;
  }
  if (target === "db") {
    if (process.env.WEBSRM_DB_ALLOW_WRITE !== "true") {
      console.warn("[WEB-SRM] DB persist blocked - WEBSRM_DB_ALLOW_WRITE not true");
      return;
    }
    try {
      const { createClient: createClient3 } = require("@supabase/supabase-js");
      const supabase2 = createClient3(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      const convertQuebecTimestamp = /* @__PURE__ */ __name((quebecTs) => {
        if (quebecTs.length !== 14) {
          return (/* @__PURE__ */ new Date()).toISOString();
        }
        const year = quebecTs.substring(0, 4);
        const month = quebecTs.substring(4, 6);
        const day = quebecTs.substring(6, 8);
        const hour = quebecTs.substring(8, 10);
        const minute = quebecTs.substring(10, 12);
        const second = quebecTs.substring(12, 14);
        return `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`;
      }, "convertQuebecTimestamp");
      const { data: receipt, error } = await supabase2.from("receipts").insert({
        tenant_id: data.tenantId,
        order_id: data.orderId,
        transaction_queue_id: data.transactionQueueId,
        // FO-116: 1:1 receipt-to-transaction mapping
        websrm_transaction_id: data.websrmTransactionId,
        transaction_timestamp: convertQuebecTimestamp(data.transactionTimestamp),
        format: data.format,
        print_mode: data.printMode,
        signa_preced: data.signaPreced,
        signa_actu: data.signaActu,
        payload_hash: data.payloadHash,
        qr_data: data.qrData,
        receipt_content: data.payloadCanonical || "",
        device_id: data.deviceId,
        env: data.env,
        software_id: data.softwareId,
        software_version: data.softwareVersion,
        metadata: data.metadata || {},
        is_reproduction: false,
        is_credit_note: false,
        print_status: "pending",
        print_attempts: 0
      }).select().single();
      if (error) {
        console.error("[WEB-SRM] Failed to persist receipt to database:", error);
        throw new Error(`Database persist failed: ${error.message}`);
      }
      console.info("[WEB-SRM] Receipt persisted to database:", receipt.id);
    } catch (error) {
      console.error("[WEB-SRM] Exception during DB persist:", error);
      throw error;
    }
  }
}
__name(persistReceipt, "persistReceipt");

// apps/api/services/websrm-adapter/runtime-adapter.ts
init_signature_ecdsa();
var import_crypto3 = require("crypto");
function formatQuebecAmount(amountInCents) {
  const amountInDollars = amountInCents / 100;
  const sign = amountInDollars >= 0 ? "+" : "-";
  const abs = Math.abs(amountInDollars).toFixed(2);
  const [integer, decimal] = abs.split(".");
  const padded = integer.padStart(9, "0");
  return `${sign}${padded}.${decimal}`;
}
__name(formatQuebecAmount, "formatQuebecAmount");
function formatQuebecQuantity(qty) {
  const sign = qty >= 0 ? "+" : "-";
  const abs = Math.abs(qty).toFixed(2);
  const [integer, decimal] = abs.split(".");
  const padded = integer.padStart(5, "0");
  return `${sign}${padded}.${decimal}`;
}
__name(formatQuebecQuantity, "formatQuebecQuantity");
function roundQuebecAmount(amount) {
  return Math.round(amount * 100) / 100;
}
__name(roundQuebecAmount, "roundQuebecAmount");
function transformToQuebecFormat(reqTrans, profile) {
  const typTransMap = {
    "ENR": "VENTE",
    "ANN": "ANNULATION",
    "MOD": "MODIFICATION"
  };
  const emprCertifSEV = profile.certPem ? fingerprintSha1(profile.certPem) : "";
  const noTransNumeric = reqTrans.idTrans.replace(/[^0-9]/g, "").slice(-10).padStart(10, "0");
  const subtotalCents = reqTrans.montST;
  const subtotalDollars = subtotalCents / 100;
  const gstCalculated = roundQuebecAmount(subtotalDollars * 0.05);
  const qstCalculated = roundQuebecAmount(subtotalDollars * 0.09975);
  const totalCalculated = roundQuebecAmount(subtotalDollars + gstCalculated + qstCalculated);
  const gstCents = Math.round(gstCalculated * 100);
  const qstCents = Math.round(qstCalculated * 100);
  const totalCents = Math.round(totalCalculated * 100);
  const supabaseTotalCents = reqTrans.montTot;
  const differenceCents = totalCents - supabaseTotalCents;
  console.log("[WEB-SRM] \u{1F9EE} Tax Recalculation:");
  console.log(`  Subtotal: $${subtotalDollars.toFixed(2)} (${subtotalCents} cents)`);
  console.log(`  GST (5%): $${gstCalculated.toFixed(2)} (${gstCents} cents)`);
  console.log(`  QST (9.975%): $${qstCalculated.toFixed(2)} (${qstCents} cents)`);
  console.log(`  Total (calculated): $${totalCalculated.toFixed(2)} (${totalCents} cents)`);
  console.log(`  Total (Supabase): $${(supabaseTotalCents / 100).toFixed(2)} (${supabaseTotalCents} cents)`);
  if (differenceCents !== 0) {
    console.log(`  \u26A0\uFE0F  Difference: ${differenceCents} cents (will use ajus/mtdu if needed)`);
  }
  return {
    // Transaction identification (Quebec field names)
    noTrans: noTransNumeric,
    datTrans: reqTrans.dtTrans,
    typTrans: "RFER",
    // Quebec API requirement: ALL transactions use RFER (closing receipt type)
    modTrans: "OPE",
    // Operating mode (normal operation)
    // Business sector (Restaurant/Bar/Cafeteria)
    sectActi: {
      abrvt: "RBC",
      // Restaurant/Bar/Cafeteria
      typServ: "TBL",
      // Table service
      noTabl: "====1",
      // Table number (optional, use ==== for unknown)
      nbClint: "001"
      // Number of clients (default 1)
    },
    commerElectr: reqTrans.eCommerce ? "O" : "N",
    // Quebec expects 'O' or 'N', not 'OUI'/'NON'
    // Amounts (Quebec expects specific format: [+/-]XXXXXXXXX.XX)
    // Use recalculated taxes to ensure: avantTax + TPS + TVQ = apresTax
    mont: {
      avantTax: formatQuebecAmount(subtotalCents),
      TPS: formatQuebecAmount(gstCents),
      TVQ: formatQuebecAmount(qstCents),
      apresTax: formatQuebecAmount(totalCents)
    },
    // FILE NUMBER (MANDATORY!) - Format: "ER0001" for restaurant test (SW-77 example)
    noDossFO: "ER0001",
    // Restaurant file number (ER for restaurant, 0001 per SW-77 doc)
    // Line items (Quebec expects formatted quantities and amounts)
    items: reqTrans.desc.map((item) => ({
      qte: formatQuebecQuantity(item.qte),
      // Format: [+/-]XXXXX.XX
      descr: item.desc,
      // "descr" not "desc"!
      prix: formatQuebecAmount(item.prixUnit),
      // "prix" not "prixUnit"!
      tax: "FP",
      // Both TPS and TVQ apply (mandatory!)
      acti: "RES"
      // Restaurant activity subsector (mandatory!)
    })),
    // Payment method
    modPai: reqTrans.modPai,
    // Merchant name (TODO: Get from tenant profile)
    nomMandt: "VizionMenu",
    // Placeholder
    // Printing format (Quebec codes: PAP/ELE/PEL/NON, not PAPIER/ABREGE)
    formImpr: "PAP",
    // Always "PAP" (paper) for now
    modImpr: "FAC",
    // Always "FAC" (facture/bill) - only valid value
    // Certificate fingerprint
    emprCertifSEV,
    // UTC offset (Quebec requires trailing "N" for night/EST timezone)
    utc: "-05:00N",
    // Business relationship
    relaCommer: "B2C",
    // Tax numbers (Quebec format: GST=9digits+RT+4digits, QST=10digits+TQ+4digits)
    noTax: {
      noTPS: profile.gstNumber || "567891234RT0001",
      // Must include RT0001 suffix
      noTVQ: profile.qstNumber || "5678912340TQ0001"
    },
    // SEV info (Quebec expects uppercase "SEV")
    SEV: {
      idSEV: profile.softwareId,
      idVersi: profile.softwareVersion,
      codCertif: profile.certCode,
      idPartn: profile.partnerId,
      versi: profile.versi,
      versiParn: profile.versiParn
    }
  };
}
__name(transformToQuebecFormat, "transformToQuebecFormat");
async function handleOrderForWebSrm(order, profile, options = { persist: "files" }) {
  const orderWithItems = {
    ...order,
    items: order.order_items || order.items || [],
    _transaction_id: options.queueId || order.id
    // Use queue ID for unique transactions
  };
  const reqTransInternal = mapOrderToReqTrans(orderWithItems, "=".repeat(88));
  const transActuBase = transformToQuebecFormat(reqTransInternal, profile);
  const sigs = computeBodySignatures(transActuBase, {
    privateKeyPem: profile.privateKeyPem,
    previousActu: options.previousActu
    // Load from storage if available
  });
  const certFingerprint = profile.certPem ? (0, import_crypto3.createHash)("sha256").update(profile.certPem, "utf8").digest("hex") : "";
  const now = /* @__PURE__ */ new Date();
  const datActuCompact = now.getFullYear().toString() + (now.getMonth() + 1).toString().padStart(2, "0") + now.getDate().toString().padStart(2, "0") + now.getHours().toString().padStart(2, "0") + now.getMinutes().toString().padStart(2, "0") + now.getSeconds().toString().padStart(2, "0");
  const signa = {
    datActu: datActuCompact,
    // Quebec compact format (YYYYMMDDHHmmss)
    actu: sigs.actu,
    preced: sigs.preced
  };
  const transActu = {
    ...transActuBase,
    signa
  };
  const payload = {
    reqTrans: {
      transActu
    }
  };
  const baseHeaders = {
    // IDAPPRL: NOT USED for /transaction (Quebec requirement)
    IDSEV: profile.softwareId,
    IDVERSI: profile.softwareVersion,
    CODCERTIF: profile.certCode,
    IDPARTN: profile.partnerId,
    VERSI: profile.versi,
    VERSIPARN: profile.versiParn,
    ENVIRN: profile.env
  };
  if (profile.env === "DEV" || profile.env === "ESSAI") {
    baseHeaders.CASESSAI = profile.casEssai || "000.000";
  }
  const base = buildCanonicalBaseString(
    "POST",
    "/transaction",
    sigs.canonical,
    baseHeaders
  );
  const headers = buildOfficialHeaders(
    {
      env: profile.env,
      caseEssai: profile.env === "DEV" || profile.env === "ESSAI" ? profile.casEssai || "000.000" : void 0,
      // CASESSAI for both DEV and ESSAI (DEV uses "000.000")
      idApprl: "",
      // Empty for transaction endpoint - Quebec: "IDAPPRL doit être absent"
      idSev: profile.softwareId,
      idVersi: profile.softwareVersion,
      codCertif: profile.certCode,
      idPartn: profile.partnerId,
      versi: profile.versi,
      versiParn: profile.versiParn,
      privateKeyPem: profile.privateKeyPem,
      certPem: profile.certPem
    },
    base
  );
  const qrBaseUrl = process.env.QR_BASE_URL || "https://dev-vizionmenu.vercel.app/verify";
  const qr = buildOfficialQr(
    {
      idTrans: reqTransInternal.idTrans,
      dtTrans: reqTransInternal.dtTrans,
      montTot: reqTransInternal.montTot
    },
    sigs.actu,
    { baseUrl: qrBaseUrl }
  );
  await persistReceipt(options.persist, {
    tenantId: order.tenant_id || profile.tenantId,
    orderId: order.id,
    transactionQueueId: options.queueId,
    // FO-116: 1:1 receipt-to-transaction mapping
    printMode: "PAPER",
    format: "CUSTOMER",
    signaPreced: sigs.preced,
    signaActu: sigs.actu,
    payloadHash: sigs.sha256Hex,
    qrData: qr,
    websrmTransactionId: transActu.noTrans,
    transactionTimestamp: transActu.datTrans || (/* @__PURE__ */ new Date()).toISOString(),
    headers,
    // Debug/audit purposes
    payloadCanonical: sigs.canonical,
    // Phase 6.1: Device/software metadata
    deviceId: profile.deviceId,
    env: profile.env,
    softwareId: profile.softwareId,
    softwareVersion: profile.softwareVersion,
    metadata: {
      partnerId: profile.partnerId,
      certCode: profile.certCode,
      versi: profile.versi,
      versiParn: profile.versiParn,
      deviceLocalId: profile.deviceLocalId
    }
  });
  return {
    headers,
    payload,
    qr,
    sigs,
    profile: {
      deviceId: profile.deviceId,
      env: profile.env
    }
  };
}
__name(handleOrderForWebSrm, "handleOrderForWebSrm");
async function handleClosingForWebSrm(closing, profile, options = { persist: "none" }) {
  const reqFer = mapClosingToReqFer(closing, "=".repeat(88));
  const payload = {
    transaction: {
      reqFer
    }
  };
  const sigs = computeBodySignatures(payload, {
    privateKeyPem: profile.privateKeyPem,
    previousActu: options.previousActu
  });
  const base = buildCanonicalBaseString(
    "POST",
    "/closing",
    // FER endpoint
    sigs.canonical,
    {
      IDAPPRL: profile.deviceId,
      IDSEV: profile.softwareId,
      IDVERSI: profile.softwareVersion,
      CODCERTIF: profile.certCode,
      IDPARTN: profile.partnerId,
      VERSI: profile.versi,
      VERSIPARN: profile.versiParn,
      ENVIRN: profile.env
    }
  );
  const headers = buildOfficialHeaders(
    {
      env: profile.env,
      idApprl: profile.deviceId,
      idSev: profile.softwareId,
      idVersi: profile.softwareVersion,
      codCertif: profile.certCode,
      idPartn: profile.partnerId,
      versi: profile.versi,
      versiParn: profile.versiParn,
      privateKeyPem: profile.privateKeyPem,
      certPem: profile.certPem
    },
    base
  );
  const qrBaseUrl = process.env.QR_BASE_URL || "https://dev-vizionmenu.vercel.app/verify";
  const qr = buildOfficialQr(payload, sigs.actu, { baseUrl: qrBaseUrl });
  return {
    headers,
    payload,
    qr,
    sigs,
    profile: {
      deviceId: profile.deviceId,
      env: profile.env
    }
  };
}
__name(handleClosingForWebSrm, "handleClosingForWebSrm");

// apps/api/services/websrm-adapter/secrets.ts
var import_crypto4 = require("crypto");
var ALGORITHM = "aes-256-gcm";
var KEY_LENGTH = 32;
function getEncryptionKey() {
  const keyHex = process.env.WEBSRM_ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error("[WEB-SRM] WEBSRM_ENCRYPTION_KEY not set in environment");
  }
  const key = Buffer.from(keyHex, "hex");
  if (key.length !== KEY_LENGTH) {
    throw new Error(`[WEB-SRM] Invalid encryption key length: ${key.length} bytes (expected ${KEY_LENGTH})`);
  }
  return key;
}
__name(getEncryptionKey, "getEncryptionKey");
function decryptSecret(encrypted) {
  const key = getEncryptionKey();
  const parts = encrypted.split(":");
  if (parts.length !== 3) {
    throw new Error("[WEB-SRM] Invalid encrypted data format (expected iv:authTag:ciphertext)");
  }
  const [ivHex, authTagHex, ciphertext] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = (0, import_crypto4.createDecipheriv)(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let plaintext = decipher.update(ciphertext, "hex", "utf8");
  plaintext += decipher.final("utf8");
  return plaintext;
}
__name(decryptSecret, "decryptSecret");

// apps/api/services/websrm-adapter/profile-resolver.ts
var import_supabase_js = require("@supabase/supabase-js");
var MOCK_PROFILES = {
  // Default DEV profile
  "dev-default": {
    deviceId: "POS-DEV-001",
    deviceLocalId: "device-001",
    partnerId: "PARTNER-001",
    certCode: "TESTCODE",
    softwareId: "SRS-VIZION-001",
    softwareVersion: "1.0.0",
    versi: "1.0.0",
    versiParn: "0",
    env: "DEV",
    privateKeyPem: process.env.WEBSRM_PRIVATE_KEY_PEM || "",
    certPem: process.env.WEBSRM_CERT_PEM || "",
    tenantId: "default-tenant",
    branchId: void 0,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    isActive: true
  },
  // ESSAI profile (Revenu Québec certification testing)
  "essai-test": {
    // Device ID: Temporary placeholder until enrolment completes
    deviceId: process.env.WEBSRM_ESSAI_DEVICE_ID || "0000-0000-0000",
    deviceLocalId: "device-essai-001",
    // Revenu Québec assigned identifiers
    partnerId: process.env.WEBSRM_ESSAI_PARTNER_ID || "0000000000001FF2",
    // IDPARTN
    certCode: process.env.WEBSRM_ESSAI_CERT_CODE || "FOB201999999",
    // CODCERTIF
    softwareId: process.env.WEBSRM_ESSAI_SOFTWARE_ID || "0000000000003973",
    // IDSEV
    softwareVersion: process.env.WEBSRM_ESSAI_SOFTWARE_VERSION || "00000000000045D6",
    // IDVERSI
    // Protocol versions
    versi: "0.1.0",
    // VERSI - WEB-SRM protocol version
    versiParn: "0",
    // VERSIPARN - Partner implementation version (per Quebec spec)
    env: "DEV",
    // TEMPORARY: Using DEV for free development (no test case chain)
    casEssai: "000.000",
    // Free development mode (no test case restrictions)
    // Authorization code (used during enrolment only)
    authorizationCode: process.env.WEBSRM_ESSAI_AUTH_CODE || "W7V7-K8W9",
    // PEM keys: Load directly from files (simpler than encryption)
    // Files are gitignored and stored in tmp/certs/
    privateKeyPem: (() => {
      try {
        const fs2 = require("fs");
        const path = require("path");
        const keyPath = path.join(__dirname, "../../../../../tmp/certs/essai-fob-client.key.pem");
        if (fs2.existsSync(keyPath)) {
          const keyPem = fs2.readFileSync(keyPath, "utf8");
          console.log("[WEB-SRM] \u2705 Private key loaded from file (length:", keyPem.length, ")");
          return keyPem;
        } else {
          console.warn("[WEB-SRM] \u26A0\uFE0F  Private key file not found:", keyPath);
          return "";
        }
      } catch (error) {
        console.error("[WEB-SRM] \u274C Failed to load private key:", error.message);
        return "";
      }
    })(),
    certPem: (() => {
      try {
        const fs2 = require("fs");
        const path = require("path");
        const certPath = path.join(__dirname, "../../../../../tmp/certs/essai-fob-client.crt.pem");
        if (fs2.existsSync(certPath)) {
          const certPem = fs2.readFileSync(certPath, "utf8");
          console.log("[WEB-SRM] \u2705 Certificate loaded from file (length:", certPem.length, ")");
          return certPem;
        } else {
          console.warn("[WEB-SRM] \u26A0\uFE0F  Certificate file not found:", certPath);
          return "";
        }
      } catch (error) {
        console.error("[WEB-SRM] \u274C Failed to load certificate:", error.message);
        return "";
      }
    })(),
    tenantId: "cc554f6f-2d89-4c17-9b6d-17a27151dcd4",
    // Queen Burger King (fallback for ESSAI tests)
    branchId: void 0,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    isActive: true
  }
};
async function resolveProfile(tenantId, branchId, deviceLocalId) {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const supabase2 = (0, import_supabase_js.createClient)(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      const env2 = process.env.WEBSRM_ENV || "DEV";
      const { data: profile, error } = await supabase2.from("websrm_profiles").select("*").eq("tenant_id", tenantId).eq("env", env2).eq("is_active", true).single();
      if (profile && !error) {
        const privateKeyPem = decryptSecret(profile.private_key_pem_encrypted);
        const certPem = decryptSecret(profile.cert_pem_encrypted);
        return {
          deviceId: profile.device_id,
          deviceLocalId: deviceLocalId || "device-001",
          partnerId: profile.partner_id,
          certCode: profile.cert_code,
          softwareId: profile.software_id,
          softwareVersion: profile.software_version,
          versi: profile.versi,
          versiParn: profile.versi_parn,
          env: profile.env,
          casEssai: profile.cas_essai,
          privateKeyPem,
          certPem,
          tenantId: profile.tenant_id,
          branchId,
          createdAt: profile.created_at,
          updatedAt: profile.updated_at,
          isActive: profile.is_active
        };
      }
    } catch (dbError) {
      console.warn("[WEB-SRM] Database lookup failed, falling back to mock profiles:", dbError);
    }
  }
  const env = process.env.WEBSRM_ENV || "DEV";
  if (env === "ESSAI") {
    return MOCK_PROFILES["essai-test"];
  }
  return MOCK_PROFILES["dev-default"];
}
__name(resolveProfile, "resolveProfile");

// apps/api/services/websrm-adapter/queue-worker.ts
var supabase = (0, import_supabase_js2.createClient)(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
var CIRCUIT_BREAKER_THRESHOLD = 5;
var CIRCUIT_BREAKER_TIMEOUT = 6e4;
function getCircuitBreakerKey(tenantId) {
  const env = (process.env.WEBSRM_ENV || "dev").toLowerCase();
  const tenant = tenantId || "global";
  return `${env}:${tenant}:transaction`;
}
__name(getCircuitBreakerKey, "getCircuitBreakerKey");
async function getCircuitBreakerState(tenantId) {
  const key = getCircuitBreakerKey(tenantId);
  const { data, error } = await supabase.from("websrm_circuit_breaker").select("*").eq("key", key).single();
  if (error || !data) {
    await supabase.from("websrm_circuit_breaker").insert({
      key,
      consecutive_failures: 0,
      state: "CLOSED"
    }).select().single();
    return {
      consecutiveFailures: 0,
      state: "CLOSED",
      openedAt: null
    };
  }
  return {
    consecutiveFailures: data.consecutive_failures,
    state: data.state,
    openedAt: data.opened_at ? new Date(data.opened_at) : null
  };
}
__name(getCircuitBreakerState, "getCircuitBreakerState");
async function updateCircuitBreakerState(tenantId, update) {
  const key = getCircuitBreakerKey(tenantId);
  const dbUpdate = {
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (update.consecutiveFailures !== void 0) {
    dbUpdate.consecutive_failures = update.consecutiveFailures;
  }
  if (update.state) {
    dbUpdate.state = update.state;
  }
  if (update.openedAt !== void 0) {
    dbUpdate.opened_at = update.openedAt ? update.openedAt.toISOString() : null;
  }
  await supabase.from("websrm_circuit_breaker").upsert({
    key,
    ...dbUpdate
  });
}
__name(updateCircuitBreakerState, "updateCircuitBreakerState");
async function isCircuitBreakerOpen(tenantId) {
  const state = await getCircuitBreakerState(tenantId);
  if (state.state !== "OPEN") {
    return false;
  }
  if (state.openedAt && Date.now() - state.openedAt.getTime() > CIRCUIT_BREAKER_TIMEOUT) {
    console.info("[WEB-SRM] Circuit breaker timeout expired - closing circuit");
    await updateCircuitBreakerState(tenantId, {
      state: "CLOSED",
      consecutiveFailures: 0,
      openedAt: null
    });
    return false;
  }
  return true;
}
__name(isCircuitBreakerOpen, "isCircuitBreakerOpen");
async function recordCircuitBreakerState(tenantId, errorCode) {
  const state = await getCircuitBreakerState(tenantId);
  if (errorCode === "TEMP_UNAVAILABLE") {
    const newFailureCount = state.consecutiveFailures + 1;
    if (newFailureCount >= CIRCUIT_BREAKER_THRESHOLD) {
      console.warn(
        `[WEB-SRM] Circuit breaker opened after ${newFailureCount} consecutive failures`
      );
      await updateCircuitBreakerState(tenantId, {
        consecutiveFailures: newFailureCount,
        state: "OPEN",
        openedAt: /* @__PURE__ */ new Date()
      });
    } else {
      await updateCircuitBreakerState(tenantId, {
        consecutiveFailures: newFailureCount
      });
    }
  } else if (errorCode === "OK") {
    if (state.state !== "CLOSED" || state.consecutiveFailures > 0) {
      console.info("[WEB-SRM] Circuit breaker reset after successful transaction");
      await updateCircuitBreakerState(tenantId, {
        consecutiveFailures: 0,
        state: "CLOSED",
        openedAt: null
      });
    }
  }
}
__name(recordCircuitBreakerState, "recordCircuitBreakerState");
async function processQueueItem(queueId) {
  const { data: queueItem, error: fetchError } = await supabase.from("websrm_transaction_queue").select("*").eq("id", queueId).single();
  if (fetchError || !queueItem) {
    return {
      success: false,
      status: "failed",
      message: `Queue item not found: ${queueId}`
    };
  }
  if (queueItem.status === "processing") {
    return {
      success: false,
      status: "pending",
      message: "Already processing"
    };
  }
  if (queueItem.status === "completed") {
    return {
      success: true,
      status: "completed",
      message: "Already completed"
    };
  }
  if (await isCircuitBreakerOpen(queueItem.tenant_id)) {
    console.warn("[WEB-SRM] Circuit breaker is OPEN - skipping queue item", queueId);
    return {
      success: false,
      status: "pending",
      message: "Circuit breaker is open - service temporarily unavailable"
    };
  }
  const startTime = Date.now();
  await supabase.from("websrm_transaction_queue").update({
    status: "processing",
    started_at: (/* @__PURE__ */ new Date()).toISOString()
  }).eq("id", queueId);
  try {
    if (!isNetworkEnabled()) {
      await supabase.from("websrm_transaction_queue").update({
        status: "completed",
        completed_at: (/* @__PURE__ */ new Date()).toISOString(),
        response_code: "NETWORK_DISABLED"
      }).eq("id", queueId);
      return {
        success: true,
        status: "completed",
        message: "Network disabled - dry-run mode"
      };
    }
    const isClosing = !!queueItem.closing_id;
    let result;
    let profile;
    let entityId;
    let transactionTimestamp;
    let totalAmount;
    if (isClosing) {
      const { data: closing } = await supabase.from("daily_closings").select("*").eq("id", queueItem.closing_id).single();
      if (!closing) {
        throw new Error(`Daily closing not found: ${queueItem.closing_id}`);
      }
      profile = await resolveProfile(
        queueItem.tenant_id,
        closing.branch_id,
        null
        // No device_id for FER transactions
      );
      result = await handleClosingForWebSrm(closing, profile, {
        persist: "db",
        // Persist receipt to database
        previousActu: await getPreviousActu(queueItem.tenant_id, profile.deviceId)
      });
      entityId = closing.id;
      transactionTimestamp = closing.closing_date;
      totalAmount = closing.net_sales;
    } else {
      const { data: order } = await supabase.from("orders").select("*, order_items(*)").eq("id", queueItem.order_id).single();
      if (!order) {
        throw new Error(`Order not found: ${queueItem.order_id}`);
      }
      profile = await resolveProfile(
        queueItem.tenant_id,
        order.branch_id,
        order.device_id
      );
      if (queueItem.metadata?.transaction_type === "REM") {
        console.log(`[WEB-SRM] REM transaction detected - will use original payment method`);
        if (queueItem.metadata?.original_payment_method) {
          console.log(`[WEB-SRM] Using original payment method: ${queueItem.metadata.original_payment_method} (order currently: ${order.payment_method})`);
          order.payment_method = queueItem.metadata.original_payment_method;
        }
        if (queueItem.metadata?.amount) {
          const refundAmount = parseFloat(queueItem.metadata.amount);
          console.log(`[WEB-SRM] REM transaction - converting to negative amounts: -$${refundAmount}`);
          order.total_amount = -Math.abs(refundAmount);
          order.gst_amount = -Math.abs(parseFloat(queueItem.metadata.gst_refund || 0));
          order.qst_amount = -Math.abs(parseFloat(queueItem.metadata.qst_refund || 0));
          order.items_subtotal = -(Math.abs(refundAmount) - Math.abs(parseFloat(queueItem.metadata.gst_refund || 0)) - Math.abs(parseFloat(queueItem.metadata.qst_refund || 0)));
          console.log(`[WEB-SRM] REM amounts - Total: $${order.total_amount}, GST: $${order.gst_amount}, QST: $${order.qst_amount}`);
        }
      }
      result = await handleOrderForWebSrm(order, profile, {
        persist: "db",
        // Persist receipt to database
        previousActu: await getPreviousActu(queueItem.tenant_id, profile.deviceId),
        queueId: queueItem.id
        // FO-116: Pass queue ID for unique transaction numbers
      });
      entityId = order.id;
      transactionTimestamp = result.payload.dtTrans;
      totalAmount = result.payload.montTot;
    }
    const idempotencyKey = generateIdempotencyKey(
      profile.env,
      queueItem.tenant_id,
      entityId,
      transactionTimestamp,
      result.sigs.actu,
      totalAmount
    );
    const baseUrl = getWebSrmBaseUrl(profile.env);
    const transactionHeaders = {
      ...result.headers,
      NOTPS: profile.gstNumber || "567891234RT0001",
      // Must include RT0001 suffix
      NOTVQ: profile.qstNumber || "5678912340TQ0001"
    };
    const { canonicalizePayload: canonicalizePayload2 } = (init_body_signer(), __toCommonJS(body_signer_exports));
    const payloadCanonical = canonicalizePayload2(result.payload);
    const response = await postTransaction(
      {
        baseUrl,
        env: profile.env,
        // casEssai: ONLY for enrolment/annulation/modification, NOT for transaction
        certPem: profile.certPem,
        // mTLS client certificate
        keyPem: profile.privateKeyPem
        // mTLS client private key
      },
      "/transaction",
      payloadCanonical,
      transactionHeaders,
      idempotencyKey
    );
    const endTime = Date.now();
    const durationMs = endTime - startTime;
    const mappedError = mapWebSrmError(response);
    await logAudit({
      tenantId: queueItem.tenant_id,
      orderId: isClosing ? null : entityId,
      closingId: isClosing ? entityId : null,
      operation: isClosing ? "closing" : "transaction",
      requestMethod: "POST",
      requestPath: isClosing ? "/closing" : "/transaction",
      requestBodyHash: result.sigs.sha256Hex,
      requestSignature: result.sigs.actu,
      responseStatus: response.httpStatus,
      responseBodyHash: response.rawBody ? (0, import_crypto5.createHash)("sha256").update(response.rawBody, "utf8").digest("hex") : null,
      websrmTransactionId: response.body?.retourTrans?.retourTransActu?.psiNoTrans || response.body?.retourFer?.retourFerActu?.psiNoFer || null,
      durationMs,
      errorCode: mappedError.code !== "OK" ? mappedError.code : null,
      errorMessage: mappedError.rawMessage || null,
      codRetour: mappedError.rawCode || null
    });
    await recordCircuitBreakerState(queueItem.tenant_id, mappedError.code);
    if (mappedError.code === "OK") {
      await supabase.from("websrm_transaction_queue").update({
        status: "completed",
        completed_at: (/* @__PURE__ */ new Date()).toISOString(),
        websrm_transaction_id: response.body?.retourTrans?.retourTransActu?.psiNoTrans || response.body?.retourFer?.retourFerActu?.psiNoFer || null,
        response_code: "OK"
      }).eq("id", queueId);
      if (isClosing) {
        await supabase.from("daily_closings").update({
          websrm_transaction_id: response.body?.retourFer?.retourFerActu?.psiNoFer || null
        }).eq("id", entityId).eq("branch_id", profile.branchId || queueItem.tenant_id);
      } else {
        await supabase.from("receipts").update({
          websrm_transaction_id: response.body?.retourTrans?.retourTransActu?.psiNoTrans || null
        }).eq("order_id", entityId).eq("tenant_id", queueItem.tenant_id);
      }
      return {
        success: true,
        status: "completed",
        message: `${isClosing ? "Closing" : "Transaction"} completed: ${response.body?.retourTrans?.retourTransActu?.psiNoTrans || response.body?.retourFer?.retourFerActu?.psiNoFer}`
      };
    } else if (mappedError.retryable) {
      const newRetryCount = queueItem.retry_count + 1;
      if (newRetryCount >= queueItem.max_retries) {
        await supabase.from("websrm_transaction_queue").update({
          status: "failed",
          error_message: `Max retries exceeded: ${mappedError.rawMessage}`,
          last_error_at: (/* @__PURE__ */ new Date()).toISOString(),
          response_code: mappedError.code
        }).eq("id", queueId);
        return {
          success: false,
          status: "failed",
          message: `Max retries exceeded (${newRetryCount}/${queueItem.max_retries})`
        };
      }
      const backoffMs = calculateBackoff(newRetryCount);
      const nextRetryAt = new Date(Date.now() + backoffMs);
      await supabase.from("websrm_transaction_queue").update({
        status: "pending",
        retry_count: newRetryCount,
        next_retry_at: nextRetryAt.toISOString(),
        error_message: mappedError.rawMessage || "Retryable error",
        last_error_at: (/* @__PURE__ */ new Date()).toISOString(),
        response_code: mappedError.code
      }).eq("id", queueId);
      return {
        success: false,
        status: "pending",
        message: `Retryable error - retry ${newRetryCount}/${queueItem.max_retries} scheduled at ${nextRetryAt.toISOString()}`
      };
    } else {
      await supabase.from("websrm_transaction_queue").update({
        status: "failed",
        error_message: mappedError.rawMessage || "Non-retryable error",
        last_error_at: (/* @__PURE__ */ new Date()).toISOString(),
        response_code: mappedError.code
      }).eq("id", queueId);
      return {
        success: false,
        status: "failed",
        message: `Non-retryable error: ${mappedError.code}`
      };
    }
  } catch (error) {
    await supabase.from("websrm_transaction_queue").update({
      status: "failed",
      error_message: error.message || "Unexpected error",
      last_error_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("id", queueId);
    return {
      success: false,
      status: "failed",
      message: `Unexpected error: ${error.message}`
    };
  }
}
__name(processQueueItem, "processQueueItem");
async function getPreviousActu(tenantId, deviceId) {
  const { data: lastReceipt } = await supabase.from("receipts").select("signa_actu").eq("tenant_id", tenantId).eq("device_id", deviceId).order("transaction_timestamp", { ascending: false }).limit(1).single();
  if (lastReceipt && lastReceipt.signa_actu) {
    return lastReceipt.signa_actu;
  }
  return "=".repeat(88);
}
__name(getPreviousActu, "getPreviousActu");
async function logAudit(params) {
  await supabase.from("websrm_audit_log").insert({
    tenant_id: params.tenantId,
    order_id: params.orderId,
    closing_id: params.closingId,
    operation: params.operation,
    request_method: params.requestMethod,
    request_path: params.requestPath,
    request_body_hash: params.requestBodyHash,
    request_signature: params.requestSignature,
    response_status: params.responseStatus,
    response_body_hash: params.responseBodyHash,
    websrm_transaction_id: params.websrmTransactionId,
    duration_ms: params.durationMs,
    error_code: params.errorCode,
    error_message: params.errorMessage,
    cod_retour: params.codRetour
  });
}
__name(logAudit, "logAudit");
async function consumeQueue(limit = 20) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const { data: queueItems, error } = await supabase.from("websrm_transaction_queue").select("id, order_id").eq("status", "pending").or(`scheduled_at.lte.${now},next_retry_at.lte.${now}`).order("scheduled_at", { ascending: true }).limit(limit);
  if (error || !queueItems || queueItems.length === 0) {
    return {
      processed: 0,
      completed: 0,
      pending: 0,
      failed: 0,
      items: []
    };
  }
  const limit5 = (0, import_p_limit.default)(5);
  const results = await Promise.all(
    queueItems.map(
      (item) => limit5(async () => {
        const result = await processQueueItem(item.id);
        return {
          id: item.id,
          orderId: item.order_id,
          status: result.status,
          message: result.message
        };
      })
    )
  );
  const summary = {
    processed: results.length,
    completed: results.filter((r) => r.status === "completed").length,
    pending: results.filter((r) => r.status === "pending").length,
    failed: results.filter((r) => r.status === "failed").length,
    items: results
  };
  return summary;
}
__name(consumeQueue, "consumeQueue");
async function enqueueOrder(orderId, tenantId) {
  const { data: existing } = await supabase.from("websrm_transaction_queue").select("id, status").eq("order_id", orderId).eq("tenant_id", tenantId).single();
  if (existing) {
    return {
      success: false,
      message: `Already queued: ${existing.status}`
    };
  }
  const { data: order } = await supabase.from("orders").select("id, total_amount").eq("id", orderId).single();
  if (!order) {
    return {
      success: false,
      message: "Order not found"
    };
  }
  const idempotencyKey = (0, import_crypto5.createHash)("sha256").update(`${tenantId}|${orderId}|${(/* @__PURE__ */ new Date()).toISOString()}`, "utf8").digest("hex");
  const { data: queueItem, error } = await supabase.from("websrm_transaction_queue").insert({
    tenant_id: tenantId,
    order_id: orderId,
    idempotency_key: idempotencyKey,
    status: "pending",
    canonical_payload_hash: "0".repeat(64)
    // Placeholder - will be updated on processing
  }).select().single();
  if (error || !queueItem) {
    return {
      success: false,
      message: `Failed to enqueue: ${error?.message}`
    };
  }
  return {
    success: true,
    queueId: queueItem.id,
    message: "Enqueued successfully"
  };
}
__name(enqueueOrder, "enqueueOrder");
async function enqueueDailyClosing(closingId, tenantId) {
  const { data: existing } = await supabase.from("websrm_transaction_queue").select("id, status").eq("closing_id", closingId).eq("tenant_id", tenantId).single();
  if (existing) {
    return {
      success: false,
      message: `Already queued: ${existing.status}`
    };
  }
  const { data: closing } = await supabase.from("daily_closings").select("id, net_sales, branch_id").eq("id", closingId).single();
  if (!closing) {
    return {
      success: false,
      message: "Daily closing not found"
    };
  }
  const idempotencyKey = (0, import_crypto5.createHash)("sha256").update(`${tenantId}|closing|${closingId}|${(/* @__PURE__ */ new Date()).toISOString()}`, "utf8").digest("hex");
  const { data: queueItem, error } = await supabase.from("websrm_transaction_queue").insert({
    tenant_id: tenantId,
    closing_id: closingId,
    idempotency_key: idempotencyKey,
    status: "pending",
    canonical_payload_hash: "0".repeat(64)
    // Placeholder - will be updated on processing
  }).select().single();
  if (error || !queueItem) {
    return {
      success: false,
      message: `Failed to enqueue: ${error?.message}`
    };
  }
  return {
    success: true,
    queueId: queueItem.id,
    message: "Daily closing enqueued successfully"
  };
}
__name(enqueueDailyClosing, "enqueueDailyClosing");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  consumeQueue,
  enqueueDailyClosing,
  enqueueOrder,
  processQueueItem
});
