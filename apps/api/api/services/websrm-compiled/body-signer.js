var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
function verifyP256P1363(baseString, p1363SignatureBase64, publicKeyPem) {
  try {
    const p1363Signature = Buffer.from(p1363SignatureBase64, "base64");
    if (p1363Signature.length !== 64) {
      throw new Error(`P1363 signature must be 64 bytes, got ${p1363Signature.length}`);
    }
    const derSignature = p1363ToDer(p1363Signature);
    const verifier = (0, import_crypto.createVerify)("sha256");
    verifier.update(baseString, "utf8");
    const isValid = verifier.verify(publicKeyPem, derSignature);
    return isValid;
  } catch (error) {
    return false;
  }
}
var import_crypto;
var init_signature_ecdsa = __esm({
  "apps/api/services/websrm-adapter/signature-ecdsa.ts"() {
    import_crypto = require("crypto");
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
module.exports = __toCommonJS(body_signer_exports);
function computeBodySignatures(payload, opts) {
  const { createHash: createHash2 } = require("crypto");
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
  const sha256Hex = createHash2("sha256").update(canonical, "utf8").digest("hex").toLowerCase();
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
__name(computeBodySignatures, "computeBodySignatures");
function canonicalizePayload(payload) {
  const sanitizeAscii = /* @__PURE__ */ __name((text) => {
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
      const sanitized = sanitizeAscii(value);
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
__name(canonicalizePayload, "canonicalizePayload");
function validateSignaturePair(sigs) {
  const errors = [];
  return {
    valid: errors.length === 0,
    errors
  };
}
__name(validateSignaturePair, "validateSignaturePair");
async function getPreviousSignature(branchId) {
  return void 0;
}
__name(getPreviousSignature, "getPreviousSignature");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  canonicalizePayload,
  computeBodySignatures,
  getPreviousSignature,
  validateSignaturePair
});
