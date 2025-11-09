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

// apps/api/services/websrm-adapter/runtime-adapter.ts
var runtime_adapter_exports = {};
__export(runtime_adapter_exports, {
  handleClosingForWebSrm: () => handleClosingForWebSrm,
  handleOrderForWebSrm: () => handleOrderForWebSrm
});
module.exports = __toCommonJS(runtime_adapter_exports);

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

// apps/api/services/websrm-adapter/body-signer.ts
function computeBodySignatures(payload, opts) {
  const { createHash: createHash3 } = require("crypto");
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
  const sha256Hex = createHash3("sha256").update(canonical, "utf8").digest("hex").toLowerCase();
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
__name(canonicalizePayload, "canonicalizePayload");

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
  const { createHash: createHash3 } = require("crypto");
  const upperMethod = method.toUpperCase();
  if (upperMethod !== "POST") {
    throw new Error(`Only POST method is supported, got: ${method}`);
  }
  if (!path || !path.startsWith("/")) {
    throw new Error(`Path must start with '/', got: ${path}`);
  }
  const bodyHash = createHash3("sha256").update(canonicalBody, "utf8").digest("hex").toLowerCase();
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
      const { createClient } = require("@supabase/supabase-js");
      const supabase = createClient(
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
      const { data: receipt, error } = await supabase.from("receipts").insert({
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
var import_crypto2 = require("crypto");
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
  const certFingerprint = profile.certPem ? (0, import_crypto2.createHash)("sha256").update(profile.certPem, "utf8").digest("hex") : "";
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
  const qr = buildOfficialQr(transActu, sigs.actu);
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
  const qr = buildOfficialQr(payload, sigs.actu);
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handleClosingForWebSrm,
  handleOrderForWebSrm
});
