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

// apps/api/services/websrm-adapter/dryrun-adapter.ts
var dryrun_adapter_exports = {};
__export(dryrun_adapter_exports, {
  emitWebsrmDryRun: () => emitWebsrmDryRun
});
module.exports = __toCommonJS(dryrun_adapter_exports);

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
function validateSoftwareVersion(version) {
  if (typeof version !== "string") {
    return false;
  }
  return WEBSRM_CONSTANTS.VERSION_REGEX.test(version);
}
__name(validateSoftwareVersion, "validateSoftwareVersion");

// packages/websrm-core/dist/signature.js
var SignatureAlgorithm;
(function(SignatureAlgorithm2) {
  SignatureAlgorithm2["HMAC_SHA256"] = "HMAC-SHA256";
  SignatureAlgorithm2["ECDSA"] = "ECDSA";
})(SignatureAlgorithm || (SignatureAlgorithm = {}));
function computeSignaTransm(payload, options) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid payload: must be a non-null object");
  }
  if (!options || !options.algorithm) {
    throw new Error("Invalid options: algorithm is required");
  }
  if (options.algorithm === SignatureAlgorithm.HMAC_SHA256 && !options.secret) {
    throw new Error("HMAC-SHA256 requires a secret");
  }
  if (options.algorithm === SignatureAlgorithm.ECDSA && !options.privateKey) {
    throw new Error("ECDSA requires a privateKey");
  }
  const canonical = canonicalizePayload(payload);
  const fakeSignature = `STUB_${options.algorithm}_${canonical.length}`;
  console.warn("\u26A0\uFE0F  WARNING: Using STUB signature implementation. Do not use in production!");
  return fakeSignature;
}
__name(computeSignaTransm, "computeSignaTransm");
function canonicalizePayload(payload) {
  const sortKeys = /* @__PURE__ */ __name((obj) => {
    if (Array.isArray(obj)) {
      return obj.map(sortKeys);
    }
    if (obj !== null && typeof obj === "object") {
      return Object.keys(obj).sort().reduce((result, key) => {
        result[key] = sortKeys(obj[key]);
        return result;
      }, {});
    }
    return obj;
  }, "sortKeys");
  const sorted = sortKeys(payload);
  return JSON.stringify(sorted);
}
__name(canonicalizePayload, "canonicalizePayload");

// packages/websrm-core/dist/header-provider.js
function buildHeaders(options) {
  if (!options.certificationCode || typeof options.certificationCode !== "string") {
    throw new Error("certificationCode is required and must be a non-empty string");
  }
  if (!options.deviceId || typeof options.deviceId !== "string") {
    throw new Error("deviceId is required and must be a non-empty string");
  }
  if (!validateSoftwareVersion(options.softwareVersion)) {
    throw new Error(`Invalid softwareVersion: ${options.softwareVersion}. Must be semver format (X.Y.Z)`);
  }
  if (!options.signature || typeof options.signature !== "string") {
    throw new Error("signature is required and must be a non-empty string");
  }
  const headers = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "Authorization": `Bearer ${options.certificationCode}`,
    "X-Device-ID": options.deviceId,
    "X-Software-Version": options.softwareVersion,
    "X-Signature": options.signature
  };
  if (options.requestId) {
    headers["X-Request-ID"] = options.requestId;
  }
  return headers;
}
__name(buildHeaders, "buildHeaders");

// packages/websrm-core/dist/qr.js
function buildReceiptQr(response, options = { format: "url" }) {
  if (!response || !response.idTrans) {
    throw new Error("Invalid WEB-SRM response: missing idTrans");
  }
  const { idTrans, idTransSrm, codeQR, dtConfirmation } = response;
  switch (options.format) {
    case "url":
      if (codeQR && codeQR.startsWith("http")) {
        return codeQR;
      }
      const baseUrl = options.baseUrl || "https://websrm.revenuquebec.ca/verify";
      return `${baseUrl}/${idTransSrm || idTrans}`;
    case "json":
      return JSON.stringify({
        type: "websrm-receipt",
        version: "1.0",
        transactionId: idTrans,
        srmId: idTransSrm,
        timestamp: dtConfirmation,
        ...options.includeMetadata && {
          metadata: {
            source: "vizionmenu",
            format: "json"
          }
        }
      });
    case "custom":
      return `SRM|${idTrans}|${idTransSrm}|${dtConfirmation}`;
    default:
      throw new Error(`Unsupported QR code format: ${options.format}`);
  }
}
__name(buildReceiptQr, "buildReceiptQr");

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

// apps/api/services/websrm-adapter/dryrun-adapter.ts
var import_fs = require("fs");
var path = __toESM(require("path"));
var import_crypto = require("crypto");
async function emitWebsrmDryRun(order) {
  const timestamp = Date.now();
  if (!order?.items || order.items.length === 0) {
    return {
      hash: "skipped-no-items",
      files: [],
      transactionId: order?.id || "unknown",
      timestamp
    };
  }
  const orderShape = mapInternalOrderToShape(order);
  const partialPayload = {
    idTrans: orderShape.id,
    acti: "ENR",
    typServ: "REST",
    montST: Math.round(orderShape.items_subtotal * 100),
    montTPS: Math.round(orderShape.gst_amount * 100),
    montTVQ: Math.round(orderShape.qst_amount * 100),
    montTot: Math.round(orderShape.total_amount * 100)
  };
  const signature = computeSignaTransm(partialPayload, {
    algorithm: "HMAC-SHA256",
    secret: "websrm-dryrun-secret-key",
    encoding: "base64"
  });
  const payload = mapOrderToReqTrans(orderShape, signature);
  const headers = buildHeaders({
    certificationCode: "CERT-DRYRUN-DEV",
    deviceId: process.env.WEBSRM_DEVICE_ID || "POS-DEV-001",
    softwareVersion: "1.0.0",
    signature,
    requestId: `req-${timestamp}`
  });
  const fakeResponse = {
    idTrans: orderShape.id,
    idTransSrm: `SRM-DRYRUN-${timestamp}`,
    codeQR: `https://websrm.revenuquebec.ca/verify/${orderShape.id}`,
    dtConfirmation: (/* @__PURE__ */ new Date()).toISOString()
  };
  const qrString = buildReceiptQr(fakeResponse, { format: "url" });
  const outDir = path.join(process.cwd(), "tmp");
  await import_fs.promises.mkdir(outDir, { recursive: true });
  const createdAt = order.created_at || (/* @__PURE__ */ new Date()).toISOString();
  const stamp = new Date(createdAt).toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const baseFilename = `websrm-${order.id || "order"}-${stamp}`;
  const payloadFile = `${baseFilename}-payload.json`;
  const headersFile = `${baseFilename}-headers.json`;
  const qrFile = `${baseFilename}-qr.txt`;
  await import_fs.promises.writeFile(
    path.join(outDir, payloadFile),
    JSON.stringify(payload, null, 2),
    "utf8"
  );
  await import_fs.promises.writeFile(
    path.join(outDir, headersFile),
    JSON.stringify(headers, null, 2),
    "utf8"
  );
  await import_fs.promises.writeFile(path.join(outDir, qrFile), qrString, "utf8");
  const payloadJson = JSON.stringify(payload);
  const hash = (0, import_crypto.createHash)("sha256").update(payloadJson, "utf8").digest("hex").slice(0, 12);
  return {
    hash,
    files: [payloadFile, headersFile, qrFile],
    transactionId: orderShape.id,
    timestamp
  };
}
__name(emitWebsrmDryRun, "emitWebsrmDryRun");
function mapInternalOrderToShape(order) {
  const orderId = order.id || order.order_id || `order-${Date.now()}`;
  const branchId = order.branch_id || "UNKNOWN-BRANCH";
  const createdAt = order.created_at || (/* @__PURE__ */ new Date()).toISOString();
  const updatedAt = order.updated_at || createdAt;
  const orderType = mapOrderType(order.order_type || order.type);
  const orderStatus = mapOrderStatus(order.order_status || order.status);
  const paymentMethod = mapPaymentMethod2(order.payment_method || order.payment?.method);
  const itemsSubtotal = parseFloat(order.items_subtotal || order.subtotal || 0);
  const discountAmount = parseFloat(order.discount_amount || order.discount || 0);
  const gstAmount = parseFloat(order.gst_amount || order.tax_gst || 0);
  const qstAmount = parseFloat(order.qst_amount || order.tax_qst || 0);
  const tipAmount = parseFloat(order.tip_amount || order.tip || 0);
  const totalAmount = parseFloat(order.total_amount || order.total || 0);
  const items = mapLineItems2(order.items || order.order_items || []);
  return {
    id: orderId,
    branch_id: branchId,
    customer_name: order.customer_name,
    customer_phone: order.customer_phone,
    customer_email: order.customer_email,
    order_type: orderType,
    order_status: orderStatus,
    payment_method: paymentMethod,
    items_subtotal: itemsSubtotal,
    discount_amount: discountAmount,
    gst_amount: gstAmount,
    qst_amount: qstAmount,
    tip_amount: tipAmount,
    total_amount: totalAmount,
    tip_type: order.tip_type,
    tip_value: order.tip_value,
    served_by_user_id: order.served_by_user_id,
    receipt_print_mode: order.receipt_print_mode || "electronic",
    receipt_format: order.receipt_format || "detailed",
    created_at: createdAt,
    updated_at: updatedAt,
    third_party_platform: order.third_party_platform,
    items
  };
}
__name(mapInternalOrderToShape, "mapInternalOrderToShape");
function mapOrderType(type) {
  const typeMap = {
    dine_in: "dine_in",
    takeaway: "takeaway",
    delivery: "delivery",
    table_service: "table_service"
  };
  return typeMap[type] || "dine_in";
}
__name(mapOrderType, "mapOrderType");
function mapOrderStatus(status) {
  const statusMap = {
    pending: "pending",
    confirmed: "confirmed",
    preparing: "preparing",
    completed: "completed",
    cancelled: "cancelled",
    refunded: "refunded"
  };
  return statusMap[status] || "completed";
}
__name(mapOrderStatus, "mapOrderStatus");
function mapPaymentMethod2(method) {
  const methodMap = {
    credit_card: "credit_card",
    debit_card: "debit_card",
    cash: "cash",
    digital_wallet: "digital_wallet",
    bank_transfer: "bank_transfer"
  };
  return methodMap[method] || "credit_card";
}
__name(mapPaymentMethod2, "mapPaymentMethod");
function mapLineItems2(items) {
  if (!items || items.length === 0) {
    return [];
  }
  return items.map((item) => ({
    id: item.id || item.item_id || `item-${Date.now()}`,
    menu_item_name: item.menu_item_name || item.name || "Unknown Item",
    menu_item_price: parseFloat(item.menu_item_price || item.price || 0),
    quantity: parseInt(item.quantity || item.qty || 1, 10),
    item_total: parseFloat(item.item_total || item.total || 0),
    special_instructions: item.special_instructions || item.notes
  }));
}
__name(mapLineItems2, "mapLineItems");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  emitWebsrmDryRun
});
