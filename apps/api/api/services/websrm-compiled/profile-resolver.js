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

// apps/api/services/websrm-adapter/profile-resolver.ts
var profile_resolver_exports = {};
__export(profile_resolver_exports, {
  getProfileKey: () => getProfileKey,
  resolveProfile: () => resolveProfile,
  validateProfile: () => validateProfile
});
module.exports = __toCommonJS(profile_resolver_exports);

// apps/api/services/websrm-adapter/secrets.ts
var import_crypto = require("crypto");
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
  const decipher = (0, import_crypto.createDecipheriv)(ALGORITHM, key, iv);
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
        const fs = require("fs");
        const path = require("path");
        const keyPath = path.join(__dirname, "../../../../../tmp/certs/essai-fob-client.key.pem");
        if (fs.existsSync(keyPath)) {
          const keyPem = fs.readFileSync(keyPath, "utf8");
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
        const fs = require("fs");
        const path = require("path");
        const certPath = path.join(__dirname, "../../../../../tmp/certs/essai-fob-client.crt.pem");
        if (fs.existsSync(certPath)) {
          const certPem = fs.readFileSync(certPath, "utf8");
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
      const supabase = (0, import_supabase_js.createClient)(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      const env2 = process.env.WEBSRM_ENV || "DEV";
      const { data: profile, error } = await supabase.from("websrm_profiles").select("*").eq("tenant_id", tenantId).eq("env", env2).eq("is_active", true).single();
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
function validateProfile(profile) {
  const required = [
    "deviceId",
    "partnerId",
    "certCode",
    "softwareId",
    "softwareVersion",
    "versi",
    "versiParn",
    "env",
    "privateKeyPem",
    "certPem"
  ];
  for (const field of required) {
    if (!profile[field]) {
      throw new Error(`[WEB-SRM] Profile missing required field: ${field}`);
    }
  }
  if (!profile.privateKeyPem.includes("BEGIN PRIVATE KEY")) {
    throw new Error("[WEB-SRM] Invalid private key PEM format");
  }
  if (!profile.certPem.includes("BEGIN CERTIFICATE")) {
    throw new Error("[WEB-SRM] Invalid certificate PEM format");
  }
  if (!["DEV", "ESSAI", "PROD"].includes(profile.env)) {
    throw new Error(`[WEB-SRM] Invalid environment: ${profile.env}`);
  }
}
__name(validateProfile, "validateProfile");
function getProfileKey(tenantId, branchId, deviceLocalId) {
  return `${tenantId}:${branchId || "default"}:${deviceLocalId || "default"}`;
}
__name(getProfileKey, "getProfileKey");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getProfileKey,
  resolveProfile,
  validateProfile
});
