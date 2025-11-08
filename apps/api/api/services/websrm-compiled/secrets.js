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

// apps/api/services/websrm-adapter/secrets.ts
var secrets_exports = {};
__export(secrets_exports, {
  decryptSecret: () => decryptSecret,
  encryptSecret: () => encryptSecret,
  generateEncryptionKey: () => generateEncryptionKey,
  validateEncryptedSecret: () => validateEncryptedSecret
});
module.exports = __toCommonJS(secrets_exports);
var import_crypto = require("crypto");
var ALGORITHM = "aes-256-gcm";
var IV_LENGTH = 16;
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
function encryptSecret(plaintext) {
  const key = getEncryptionKey();
  const iv = (0, import_crypto.randomBytes)(IV_LENGTH);
  const cipher = (0, import_crypto.createCipheriv)(ALGORITHM, key, iv);
  let ciphertext = cipher.update(plaintext, "utf8", "hex");
  ciphertext += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext}`;
}
__name(encryptSecret, "encryptSecret");
function decryptSecret(encrypted) {
  const key = getEncryptionKey();
  const parts = encrypted.split(":");
  if (parts.length !== 3) {
    throw new Error("[WEB-SRM] Invalid encrypted data format (expected iv:authTag:ciphertext)");
  }
  const [ivHex, authTagHex, ciphertext] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = (0, import_crypto.createDecipheriv)(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let plaintext = decipher.update(ciphertext, "hex", "utf8");
  plaintext += decipher.final("utf8");
  return plaintext;
}
__name(decryptSecret, "decryptSecret");
function generateEncryptionKey() {
  return (0, import_crypto.randomBytes)(KEY_LENGTH).toString("hex");
}
__name(generateEncryptionKey, "generateEncryptionKey");
function validateEncryptedSecret(encrypted) {
  try {
    decryptSecret(encrypted);
    return true;
  } catch {
    return false;
  }
}
__name(validateEncryptedSecret, "validateEncryptedSecret");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  decryptSecret,
  encryptSecret,
  generateEncryptionKey,
  validateEncryptedSecret
});
