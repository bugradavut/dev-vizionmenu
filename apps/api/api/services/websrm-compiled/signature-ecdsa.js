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

// apps/api/services/websrm-adapter/signature-ecdsa.ts
var signature_ecdsa_exports = {};
__export(signature_ecdsa_exports, {
  derToP1363: () => derToP1363,
  fingerprintSha1: () => fingerprintSha1,
  p1363ToDer: () => p1363ToDer,
  signP256P1363: () => signP256P1363,
  verifyP256P1363: () => verifyP256P1363
});
module.exports = __toCommonJS(signature_ecdsa_exports);
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
__name(p1363ToDer, "p1363ToDer");
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
__name(verifyP256P1363, "verifyP256P1363");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  derToP1363,
  fingerprintSha1,
  p1363ToDer,
  signP256P1363,
  verifyP256P1363
});
