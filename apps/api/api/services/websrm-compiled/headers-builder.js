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

// apps/api/services/websrm-adapter/headers-builder.ts
var headers_builder_exports = {};
__export(headers_builder_exports, {
  buildCanonicalBaseString: () => buildCanonicalBaseString,
  buildOfficialHeaders: () => buildOfficialHeaders,
  validateHeaderInput: () => validateHeaderInput
});
module.exports = __toCommonJS(headers_builder_exports);

// apps/api/services/websrm-adapter/signature-ecdsa.ts
var import_crypto = require("crypto");
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
__name(derToP1363, "derToP1363");
function signP256P1363(baseString, privateKeyPem) {
  const signer = (0, import_crypto.createSign)("sha256");
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
__name(signP256P1363, "signP256P1363");
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
  const hash = (0, import_crypto.createHash)("sha1");
  hash.update(derBytes);
  const fingerprint = hash.digest("hex");
  return fingerprint.toLowerCase();
}
__name(fingerprintSha1, "fingerprintSha1");

// apps/api/services/websrm-adapter/headers-builder.ts
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
function validateHeaderInput(input) {
  const errors = [];
  return {
    valid: errors.length === 0,
    errors
  };
}
__name(validateHeaderInput, "validateHeaderInput");
function buildCanonicalBaseString(method, path, canonicalBody, headers) {
  const { createHash: createHash2 } = require("crypto");
  const upperMethod = method.toUpperCase();
  if (upperMethod !== "POST") {
    throw new Error(`Only POST method is supported, got: ${method}`);
  }
  if (!path || !path.startsWith("/")) {
    throw new Error(`Path must start with '/', got: ${path}`);
  }
  const bodyHash = createHash2("sha256").update(canonicalBody, "utf8").digest("hex").toLowerCase();
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  buildCanonicalBaseString,
  buildOfficialHeaders,
  validateHeaderInput
});
