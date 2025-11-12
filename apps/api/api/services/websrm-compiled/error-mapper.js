var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// services/websrm-adapter/error-mapper.ts
var error_mapper_exports = {};
__export(error_mapper_exports, {
  calculateBackoff: () => calculateBackoff,
  mapWebSrmError: () => mapWebSrmError
});
module.exports = __toCommonJS(error_mapper_exports);
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  calculateBackoff,
  mapWebSrmError
});
