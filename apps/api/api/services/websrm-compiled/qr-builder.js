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

// services/websrm-adapter/qr-builder.ts
var qr_builder_exports = {};
__export(qr_builder_exports, {
  buildOfficialQr: () => buildOfficialQr,
  buildStructuredQr: () => buildStructuredQr,
  extractTransactionId: () => extractTransactionId,
  toBase64Url: () => toBase64Url,
  validateQrData: () => validateQrData
});
module.exports = __toCommonJS(qr_builder_exports);
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
function buildStructuredQr(response) {
  const parts = [
    "SRM",
    response.idTransSrm || "unknown",
    response.idTrans || "unknown",
    response.dtConfirmation || (/* @__PURE__ */ new Date()).toISOString()
  ];
  return parts.join("|");
}
__name(buildStructuredQr, "buildStructuredQr");
function validateQrData(qrData) {
  const errors = [];
  return {
    valid: errors.length === 0,
    errors
  };
}
__name(validateQrData, "validateQrData");
function extractTransactionId(qrData) {
  return null;
}
__name(extractTransactionId, "extractTransactionId");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  buildOfficialQr,
  buildStructuredQr,
  extractTransactionId,
  toBase64Url,
  validateQrData
});
