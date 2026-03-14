/**
 * Script Executor
 *
 * Safely executes JavaScript transform/filter/preprocessor scripts
 * in a sandboxed context with access to variable maps and utility functions.
 */

// ---- Types ----

export interface VariableMaps {
  connectorMap: Map<string, unknown>;
  channelMap: Map<string, unknown>;
  sourceMap: Map<string, unknown>;
  responseMap: Map<string, unknown>;
  globalChannelMap: Map<string, unknown>;
  globalMap: Map<string, unknown>;
  configurationMap: Map<string, unknown>;
}

export interface LogEntry {
  level: "DEBUG" | "INFO" | "WARN" | "ERROR";
  message: string;
  timestamp: string;
}

export interface ExecutionResult {
  success: boolean;
  returnValue: unknown;
  msg: string;
  logs: LogEntry[];
  error?: string;
  executionTimeMs: number;
}

// ---- Utility Classes (available inside scripts) ----

const DateUtil = {
  now(): string {
    return new Date().toISOString();
  },
  format(date: Date | string, pattern?: string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    if (!pattern) return d.toISOString();
    // Simple pattern support: yyyyMMddHHmmss
    return pattern
      .replace("yyyy", String(d.getFullYear()))
      .replace("MM", String(d.getMonth() + 1).padStart(2, "0"))
      .replace("dd", String(d.getDate()).padStart(2, "0"))
      .replace("HH", String(d.getHours()).padStart(2, "0"))
      .replace("mm", String(d.getMinutes()).padStart(2, "0"))
      .replace("ss", String(d.getSeconds()).padStart(2, "0"));
  },
  parse(dateString: string): Date {
    return new Date(dateString);
  },
  toHL7(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return DateUtil.format(d, "yyyyMMddHHmmss");
  },
};

const StringUtil = {
  isEmpty(s: unknown): boolean {
    return s === null || s === undefined || String(s).trim() === "";
  },
  trim(s: string): string {
    return (s || "").trim();
  },
  padLeft(s: string, length: number, char: string = " "): string {
    return String(s).padStart(length, char);
  },
  padRight(s: string, length: number, char: string = " "): string {
    return String(s).padEnd(length, char);
  },
  replaceAll(s: string, search: string, replacement: string): string {
    return s.split(search).join(replacement);
  },
};

const XMLUtil = {
  /** Simple XML tag extraction */
  getTagValue(xml: string, tagName: string): string {
    const regex = new RegExp(`<${tagName}[^>]*>([^<]*)</${tagName}>`, "i");
    const match = xml.match(regex);
    return match ? match[1] : "";
  },
};

// ---- Map Wrapper (Mirth-compatible put/get API) ----

function createMapProxy(map: Map<string, unknown>) {
  return {
    put(key: string, value: unknown): void {
      map.set(key, value);
    },
    get(key: string): unknown {
      return map.get(key);
    },
    remove(key: string): boolean {
      return map.delete(key);
    },
    containsKey(key: string): boolean {
      return map.has(key);
    },
    clear(): void {
      map.clear();
    },
    keySet(): string[] {
      return Array.from(map.keys());
    },
    size(): number {
      return map.size;
    },
    toObject(): Record<string, unknown> {
      const obj: Record<string, unknown> = {};
      map.forEach((v, k) => {
        obj[k] = v;
      });
      return obj;
    },
  };
}

// ---- Global maps (persist across channel lifetime) ----

const _globalMap = new Map<string, unknown>();
const _globalChannelMaps = new Map<string, Map<string, unknown>>();
const _configurationMap = new Map<string, unknown>();

export function getGlobalMap(): Map<string, unknown> {
  return _globalMap;
}

export function getGlobalChannelMap(channelId: string): Map<string, unknown> {
  if (!_globalChannelMaps.has(channelId)) {
    _globalChannelMaps.set(channelId, new Map());
  }
  return _globalChannelMaps.get(channelId)!;
}

export function getConfigurationMap(): Map<string, unknown> {
  return _configurationMap;
}

// ---- Create fresh variable maps for a new message ----

export function createVariableMaps(channelId: string): VariableMaps {
  return {
    connectorMap: new Map(),
    channelMap: new Map(),
    sourceMap: new Map(),
    responseMap: new Map(),
    globalChannelMap: getGlobalChannelMap(channelId),
    globalMap: getGlobalMap(),
    configurationMap: getConfigurationMap(),
  };
}

// ---- Script Execution ----

/**
 * Execute a script string in a sandboxed context.
 *
 * The script has access to:
 *   - msg: the current message string (mutable via return or assignment)
 *   - connectorMap, channelMap, sourceMap, responseMap, globalChannelMap, globalMap, configurationMap
 *   - logger: { debug, info, warn, error }
 *   - DateUtil, StringUtil, XMLUtil
 *   - JSON (standard)
 *
 * The script can:
 *   - Modify `msg` and return the new value
 *   - Return a boolean (for filters: true = pass, false = filter out)
 *   - Put values into maps
 *
 * @param script The JavaScript code to execute
 * @param msg The current message content
 * @param maps The variable maps
 * @returns ExecutionResult
 */
export function executeScript(
  script: string,
  msg: string,
  maps: VariableMaps
): ExecutionResult {
  const logs: LogEntry[] = [];
  const start = Date.now();

  if (!script || script.trim() === "") {
    return {
      success: true,
      returnValue: msg,
      msg,
      logs,
      executionTimeMs: 0,
    };
  }

  const logger = {
    debug(message: string) {
      logs.push({ level: "DEBUG", message: String(message), timestamp: new Date().toISOString() });
    },
    info(message: string) {
      logs.push({ level: "INFO", message: String(message), timestamp: new Date().toISOString() });
    },
    warn(message: string) {
      logs.push({ level: "WARN", message: String(message), timestamp: new Date().toISOString() });
    },
    error(message: string) {
      logs.push({ level: "ERROR", message: String(message), timestamp: new Date().toISOString() });
    },
  };

  // Build the sandbox context
  const connectorMap = createMapProxy(maps.connectorMap);
  const channelMap = createMapProxy(maps.channelMap);
  const sourceMap = createMapProxy(maps.sourceMap);
  const responseMap = createMapProxy(maps.responseMap);
  const globalChannelMap = createMapProxy(maps.globalChannelMap);
  const globalMap = createMapProxy(maps.globalMap);
  const configurationMap = createMapProxy(maps.configurationMap);

  try {
    // Wrap the script so it can return a value.
    // If the script explicitly returns, use that. Otherwise, use the (possibly mutated) msg.
    const wrappedScript = `
      "use strict";
      let msg = __msg__;
      const connectorMap = __connectorMap__;
      const channelMap = __channelMap__;
      const sourceMap = __sourceMap__;
      const responseMap = __responseMap__;
      const globalChannelMap = __globalChannelMap__;
      const globalMap = __globalMap__;
      const configurationMap = __configurationMap__;
      const logger = __logger__;
      const DateUtil = __DateUtil__;
      const StringUtil = __StringUtil__;
      const XMLUtil = __XMLUtil__;

      const __result__ = (function() {
        ${script}
      })();

      // If script returned something, use it. Otherwise return msg (may have been mutated).
      typeof __result__ !== 'undefined' ? __result__ : msg;
    `;

    // Use Function constructor for sandboxed-ish execution
    const fn = new Function(
      "__msg__",
      "__connectorMap__",
      "__channelMap__",
      "__sourceMap__",
      "__responseMap__",
      "__globalChannelMap__",
      "__globalMap__",
      "__configurationMap__",
      "__logger__",
      "__DateUtil__",
      "__StringUtil__",
      "__XMLUtil__",
      wrappedScript
    );

    const returnValue = fn(
      msg,
      connectorMap,
      channelMap,
      sourceMap,
      responseMap,
      globalChannelMap,
      globalMap,
      configurationMap,
      logger,
      DateUtil,
      StringUtil,
      XMLUtil
    );

    const resultMsg = typeof returnValue === "string" ? returnValue : msg;

    return {
      success: true,
      returnValue,
      msg: resultMsg,
      logs,
      executionTimeMs: Date.now() - start,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error(`Script execution error: ${errorMessage}`);

    return {
      success: false,
      returnValue: undefined,
      msg,
      logs,
      error: errorMessage,
      executionTimeMs: Date.now() - start,
    };
  }
}

/**
 * Execute a filter script. Returns true if the message should pass, false if filtered out.
 * A filter is a JSON object with { script: string } or a plain script string.
 */
export function executeFilter(
  filter: { script?: string } | string | null | undefined,
  msg: string,
  maps: VariableMaps
): { pass: boolean; logs: LogEntry[]; error?: string } {
  if (!filter) {
    return { pass: true, logs: [] };
  }

  const script = typeof filter === "string" ? filter : filter.script;
  if (!script || script.trim() === "") {
    return { pass: true, logs: [] };
  }

  const result = executeScript(script, msg, maps);

  if (!result.success) {
    return { pass: false, logs: result.logs, error: result.error };
  }

  // If the script returned a boolean, use it. Otherwise, pass.
  const pass = typeof result.returnValue === "boolean" ? result.returnValue : true;
  return { pass, logs: result.logs };
}

/**
 * Execute a transformer script. Returns the transformed message string.
 * A transformer is a JSON object with { script: string } or a plain script string.
 */
export function executeTransformer(
  transformer: { script?: string } | string | null | undefined,
  msg: string,
  maps: VariableMaps
): ExecutionResult {
  if (!transformer) {
    return { success: true, returnValue: msg, msg, logs: [], executionTimeMs: 0 };
  }

  const script = typeof transformer === "string" ? transformer : transformer.script;
  if (!script || script.trim() === "") {
    return { success: true, returnValue: msg, msg, logs: [], executionTimeMs: 0 };
  }

  return executeScript(script, msg, maps);
}

/**
 * Convert variable maps to plain objects for JSON serialization / DB storage.
 */
export function serializeMaps(maps: VariableMaps): {
  connectorMap: Record<string, unknown>;
  channelMap: Record<string, unknown>;
  responseMap: Record<string, unknown>;
} {
  const toObj = (m: Map<string, unknown>) => {
    const obj: Record<string, unknown> = {};
    m.forEach((v, k) => {
      obj[k] = v;
    });
    return obj;
  };

  return {
    connectorMap: toObj(maps.connectorMap),
    channelMap: toObj(maps.channelMap),
    responseMap: toObj(maps.responseMap),
  };
}
