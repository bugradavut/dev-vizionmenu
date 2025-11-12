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

// services/websrm-adapter/persist.ts
var persist_exports = {};
__export(persist_exports, {
  persistReceipt: () => persistReceipt
});
module.exports = __toCommonJS(persist_exports);
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  persistReceipt
});
