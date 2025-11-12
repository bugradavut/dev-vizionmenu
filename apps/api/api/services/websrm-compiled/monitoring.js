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

// services/websrm-adapter/monitoring.ts
var monitoring_exports = {};
__export(monitoring_exports, {
  checkQrOverflow: () => checkQrOverflow,
  logCircuitBreakerState: () => logCircuitBreakerState,
  logErrorDistribution: () => logErrorDistribution,
  logQueueMetrics: () => logQueueMetrics,
  runMonitoringChecks: () => runMonitoringChecks
});
module.exports = __toCommonJS(monitoring_exports);
var import_supabase_js = require("@supabase/supabase-js");
var supabase = (0, import_supabase_js.createClient)(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
async function logQueueMetrics(tenantId) {
  const query = supabase.from("websrm_transaction_queue").select("status", { count: "exact" });
  if (tenantId) {
    query.eq("tenant_id", tenantId);
  }
  const { data, count, error } = await query;
  if (error) {
    console.error("[WEB-SRM Monitoring] Failed to fetch queue metrics:", error.message);
    return {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      total: 0,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  const metrics = {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    total: count || 0,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (data) {
    for (const row of data) {
      if (row.status === "pending") metrics.pending++;
      if (row.status === "processing") metrics.processing++;
      if (row.status === "completed") metrics.completed++;
      if (row.status === "failed") metrics.failed++;
    }
  }
  console.info("[WEB-SRM Monitoring] Queue Metrics:", {
    tenant: tenantId || "all",
    ...metrics
  });
  return metrics;
}
__name(logQueueMetrics, "logQueueMetrics");
async function logCircuitBreakerState() {
  const { data, error } = await supabase.from("websrm_circuit_breaker").select("*").order("key", { ascending: true });
  if (error) {
    console.error("[WEB-SRM Monitoring] Failed to fetch CB state:", error.message);
    return [];
  }
  const metrics = (data || []).map((row) => ({
    key: row.key,
    state: row.state,
    consecutiveFailures: row.consecutive_failures,
    openedAt: row.opened_at,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  }));
  console.info("[WEB-SRM Monitoring] Circuit Breaker State:", metrics);
  const openCircuits = metrics.filter((m) => m.state === "OPEN");
  if (openCircuits.length > 0) {
    console.warn("[WEB-SRM Monitoring] ALERT: Circuit breaker(s) OPEN:", openCircuits);
  }
  return metrics;
}
__name(logCircuitBreakerState, "logCircuitBreakerState");
async function logErrorDistribution(hours = 24, tenantId) {
  const sinceTimestamp = new Date(Date.now() - hours * 60 * 60 * 1e3).toISOString();
  let query = supabase.from("websrm_audit_log").select("error_code, cod_retour").gte("created_at", sinceTimestamp).not("error_code", "is", null);
  if (tenantId) {
    query = query.eq("tenant_id", tenantId);
  }
  const { data, error } = await query;
  if (error) {
    console.error("[WEB-SRM Monitoring] Failed to fetch error distribution:", error.message);
    return [];
  }
  const errorCounts = /* @__PURE__ */ new Map();
  let totalErrors = 0;
  if (data) {
    for (const row of data) {
      const code = row.cod_retour || row.error_code || "UNKNOWN";
      errorCounts.set(code, (errorCounts.get(code) || 0) + 1);
      totalErrors++;
    }
  }
  const distribution = Array.from(errorCounts.entries()).map(([code, count]) => ({
    errorCode: code,
    count,
    percentage: totalErrors > 0 ? Math.round(count / totalErrors * 100) : 0
  })).sort((a, b) => b.count - a.count);
  console.info("[WEB-SRM Monitoring] Error Distribution (last ${hours}h):", {
    tenant: tenantId || "all",
    totalErrors,
    distribution
  });
  return distribution;
}
__name(logErrorDistribution, "logErrorDistribution");
async function checkQrOverflow(hours = 24) {
  const sinceTimestamp = new Date(Date.now() - hours * 60 * 60 * 1e3).toISOString();
  const { data, error } = await supabase.from("receipts").select("id, qr_data").gte("created_at", sinceTimestamp).not("qr_data", "is", null);
  if (error) {
    console.error("[WEB-SRM Monitoring] Failed to check QR overflow:", error.message);
    return 0;
  }
  const overflowCount = (data || []).filter(
    (row) => row.qr_data && row.qr_data.length > 2048
  ).length;
  if (overflowCount > 0) {
    console.warn(`[WEB-SRM Monitoring] ALERT: ${overflowCount} QR codes exceed 2048 chars`);
  } else {
    console.info(`[WEB-SRM Monitoring] QR check OK: 0 overflows (last ${hours}h)`);
  }
  return overflowCount;
}
__name(checkQrOverflow, "checkQrOverflow");
async function runMonitoringChecks(options) {
  console.info("[WEB-SRM Monitoring] Running monitoring checks...");
  const [queue, circuitBreaker, errors, qrOverflow] = await Promise.all([
    logQueueMetrics(options?.tenantId),
    logCircuitBreakerState(),
    logErrorDistribution(options?.hours, options?.tenantId),
    checkQrOverflow(options?.hours)
  ]);
  return {
    queue,
    circuitBreaker,
    errors,
    qrOverflow
  };
}
__name(runMonitoringChecks, "runMonitoringChecks");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  checkQrOverflow,
  logCircuitBreakerState,
  logErrorDistribution,
  logQueueMetrics,
  runMonitoringChecks
});
