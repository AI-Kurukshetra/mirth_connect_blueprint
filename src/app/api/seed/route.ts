import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function uuid() {
  return crypto.randomUUID();
}

function hoursAgo(h: number) {
  return new Date(Date.now() - h * 3600_000).toISOString();
}

function minutesAgo(m: number) {
  return new Date(Date.now() - m * 60_000).toISOString();
}

export async function POST() {
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── Fixed IDs so re-running is idempotent ──────────────────
  const CH_ADT = "a0000001-0000-0000-0000-000000000001";
  const CH_LAB = "a0000001-0000-0000-0000-000000000002";
  const CH_ORDERS = "a0000001-0000-0000-0000-000000000003";
  const CH_FHIR = "a0000001-0000-0000-0000-000000000004";
  const CH_PHARMACY = "a0000001-0000-0000-0000-000000000005";

  const DEST_ADT_DB = "b0000001-0000-0000-0000-000000000001";
  const DEST_ADT_FHIR = "b0000001-0000-0000-0000-000000000002";
  const DEST_LAB_DB = "b0000001-0000-0000-0000-000000000003";
  const DEST_LAB_HTTP = "b0000001-0000-0000-0000-000000000004";
  const DEST_ORDERS_LAB = "b0000001-0000-0000-0000-000000000005";
  const DEST_FHIR_REPO = "b0000001-0000-0000-0000-000000000006";
  const DEST_FHIR_HTTP = "b0000001-0000-0000-0000-000000000007";
  const DEST_PHARM_DB = "b0000001-0000-0000-0000-000000000008";

  const msgIds = Array.from({ length: 50 }, (_, i) =>
    `c0000000-0000-0000-0000-0000000000${String(i + 1).padStart(2, "0")}`
  );

  const results: Record<string, string> = {};

  try {
    // ══════════════════════════════════════════════════════════
    // 1. CREATE DEMO USER
    // ══════════════════════════════════════════════════════════
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { data: user, error: userErr } = await supabase.auth.admin.createUser({
        email: "demo@healthbridge.io",
        password: "demo1234",
        email_confirm: true,
        user_metadata: { full_name: "Demo Admin" },
      });
      results.user = userErr ? `Skipped (${userErr.message})` : `Created: ${user.user.id}`;
    } else {
      results.user = "Skipped — no service role key";
    }

    // ══════════════════════════════════════════════════════════
    // 2. CHANNELS (matches: id, name, description, group_id, revision, status, deployed, enabled, initial_state, inbound_data_type, outbound_data_type, source_connector_type, source_connector_properties, source_queue_enabled, source_response, source_filter, source_transformer, preprocessor_script, postprocessor_script, deploy_script, undeploy_script, message_storage_mode, content_encryption, prune_content_days, prune_metadata_days, tags, created_by, created_at, updated_at, last_deployed_at)
    // ══════════════════════════════════════════════════════════
    const channels = [
      {
        id: CH_ADT, name: "ADT Inbound Processor",
        description: "Receives ADT messages from Epic EHR, transforms patient demographics, and routes to FHIR repository and clinical database.",
        status: "started", deployed: true, enabled: true, revision: 3,
        source_connector_type: "tcp_listener",
        source_connector_properties: { host: "0.0.0.0", port: 2575, mode: "mllp", encoding: "UTF-8", receiveTimeout: 30000, maxConnections: 10 },
        source_queue_enabled: false, source_response: "auto",
        source_filter: { script: '// Accept only ADT^A01 and ADT^A08\nvar msgType = msg.MSH["9"]["1"].toString();\nvar trigger = msg.MSH["9"]["2"].toString();\nreturn (msgType === "ADT" && (trigger === "A01" || trigger === "A08"));' },
        source_transformer: { script: '// Extract patient demographics\nvar pid = msg.PID["3"]["1"].toString();\nvar ln = msg.PID["5"]["1"].toString();\nvar fn = msg.PID["5"]["2"].toString();\nchannelMap.put("patientId", pid);\nchannelMap.put("patientName", fn + " " + ln);' },
        preprocessor_script: 'logger.info("Received ADT message");',
        postprocessor_script: 'var c = globalChannelMap.getOrDefault("adtCount", 0);\nglobalChannelMap.put("adtCount", c + 1);',
        deploy_script: 'logger.info("ADT Inbound Processor deployed");',
        undeploy_script: 'logger.info("ADT Inbound Processor undeployed");',
        inbound_data_type: "hl7v2", outbound_data_type: "hl7v2", initial_state: "started",
        message_storage_mode: "development", content_encryption: false,
        prune_content_days: 30, prune_metadata_days: 90,
        tags: ["adt", "epic", "production"],
        last_deployed_at: hoursAgo(2), created_at: hoursAgo(720), updated_at: hoursAgo(2),
      },
      {
        id: CH_LAB, name: "Lab Results Router",
        description: "Processes ORU^R01 lab results from the laboratory information system and distributes to downstream consumers.",
        status: "started", deployed: true, enabled: true, revision: 5,
        source_connector_type: "tcp_listener",
        source_connector_properties: { host: "0.0.0.0", port: 2576, mode: "mllp", encoding: "UTF-8" },
        source_queue_enabled: false, source_response: "auto",
        source_filter: { script: 'return msg.MSH["9"]["1"].toString() === "ORU";' },
        source_transformer: { script: 'channelMap.put("orderId", msg.OBR["2"]["1"].toString());' },
        preprocessor_script: null, postprocessor_script: null, deploy_script: null, undeploy_script: null,
        inbound_data_type: "hl7v2", outbound_data_type: "json", initial_state: "started",
        message_storage_mode: "development", content_encryption: false,
        prune_content_days: 14, prune_metadata_days: 60,
        tags: ["lab", "oru", "production"],
        last_deployed_at: hoursAgo(6), created_at: hoursAgo(600), updated_at: hoursAgo(6),
      },
      {
        id: CH_ORDERS, name: "Order Dispatch",
        description: "Receives ORM orders from the EHR and dispatches to laboratory and radiology systems.",
        status: "started", deployed: true, enabled: true, revision: 2,
        source_connector_type: "http_listener",
        source_connector_properties: { contextPath: "/api/orders", port: 8080, method: "POST", responseContentType: "application/json" },
        source_queue_enabled: false, source_response: "auto",
        source_filter: null,
        source_transformer: { script: 'var orderType = msg.OBR ? msg.OBR["4"]["1"].toString() : "UNKNOWN";\nchannelMap.put("orderType", orderType);' },
        preprocessor_script: null, postprocessor_script: null, deploy_script: null, undeploy_script: null,
        inbound_data_type: "hl7v2", outbound_data_type: "hl7v2", initial_state: "started",
        message_storage_mode: "production", content_encryption: false,
        prune_content_days: 7, prune_metadata_days: 30,
        tags: ["orders", "orm"],
        last_deployed_at: hoursAgo(24), created_at: hoursAgo(480), updated_at: hoursAgo(24),
      },
      {
        id: CH_FHIR, name: "FHIR R4 Gateway",
        description: "REST gateway that accepts FHIR R4 bundles and persists resources to the FHIR repository with validation.",
        status: "started", deployed: true, enabled: true, revision: 1,
        source_connector_type: "http_listener",
        source_connector_properties: { contextPath: "/fhir/r4", port: 8443, method: "POST", responseContentType: "application/fhir+json", useTLS: true },
        source_queue_enabled: false, source_response: "auto",
        source_filter: { script: 'var rt = JSON.parse(connectorMessage.getRawData()).resourceType;\nreturn rt === "Bundle" || rt === "Patient" || rt === "Observation";' },
        source_transformer: null,
        preprocessor_script: null, postprocessor_script: null, deploy_script: null, undeploy_script: null,
        inbound_data_type: "fhir", outbound_data_type: "fhir", initial_state: "started",
        message_storage_mode: "development", content_encryption: true,
        prune_content_days: 60, prune_metadata_days: 365,
        tags: ["fhir", "r4", "gateway"],
        last_deployed_at: hoursAgo(48), created_at: hoursAgo(336), updated_at: hoursAgo(48),
      },
      {
        id: CH_PHARMACY, name: "Pharmacy Integration",
        description: "Processes medication orders (RDE/RDS) between the EHR and pharmacy system for prescription management.",
        status: "stopped", deployed: false, enabled: true, revision: 1,
        source_connector_type: "tcp_listener",
        source_connector_properties: { host: "0.0.0.0", port: 2577, mode: "mllp", encoding: "UTF-8" },
        source_queue_enabled: false, source_response: "auto",
        source_filter: null, source_transformer: null,
        preprocessor_script: null, postprocessor_script: null, deploy_script: null, undeploy_script: null,
        inbound_data_type: "hl7v2", outbound_data_type: "hl7v2", initial_state: "stopped",
        message_storage_mode: "development", content_encryption: false,
        prune_content_days: 14, prune_metadata_days: 30,
        tags: ["pharmacy", "rde", "development"],
        last_deployed_at: null, created_at: hoursAgo(72), updated_at: hoursAgo(72),
      },
    ];

    // Delete existing seed data first, then insert
    await supabase.from("queue_entries").delete().in("channel_id", [CH_ADT, CH_LAB, CH_ORDERS, CH_FHIR, CH_PHARMACY]);
    await supabase.from("messages").delete().in("channel_id", [CH_ADT, CH_LAB, CH_ORDERS, CH_FHIR, CH_PHARMACY]);
    await supabase.from("channel_stats").delete().in("channel_id", [CH_ADT, CH_LAB, CH_ORDERS, CH_FHIR, CH_PHARMACY]);
    await supabase.from("destinations").delete().in("channel_id", [CH_ADT, CH_LAB, CH_ORDERS, CH_FHIR, CH_PHARMACY]);
    await supabase.from("channels").delete().in("id", [CH_ADT, CH_LAB, CH_ORDERS, CH_FHIR, CH_PHARMACY]);

    const { error: chErr } = await supabase.from("channels").insert(channels);
    results.channels = chErr ? `Error: ${chErr.message}` : `Created ${channels.length} channels`;

    // ══════════════════════════════════════════════════════════
    // 3. DESTINATIONS
    // ══════════════════════════════════════════════════════════
    const destinations = [
      { id: DEST_ADT_DB, channel_id: CH_ADT, name: "Clinical Database", sort_order: 0, enabled: true, connector_type: "database_writer", connector_properties: { driver: "postgresql", url: "postgresql://clinicaldb:5432/patients", username: "hl7_writer", password: "***", query: "INSERT INTO patient_admissions (mrn, name, admit_date) VALUES (${patientId}, ${patientName}, NOW())" }, filter: null, transformer: null, response_transformer: null, queue_enabled: true, retry_count: 3, retry_interval_ms: 30000, rotate_queue: false, queue_thread_count: 1, inbound_data_type: "hl7v2", outbound_data_type: "raw" },
      { id: DEST_ADT_FHIR, channel_id: CH_ADT, name: "FHIR Repository", sort_order: 1, enabled: true, connector_type: "http_sender", connector_properties: { url: "https://fhir.hospital.org/r4/Patient", method: "POST", contentType: "application/fhir+json", headers: '{"Authorization":"Bearer fhir-token"}', timeout: 10000 }, filter: null, transformer: { script: 'var patient = {resourceType:"Patient",identifier:[{value:channelMap.get("patientId")}]};\nreturn JSON.stringify(patient);' }, response_transformer: null, queue_enabled: true, retry_count: 5, retry_interval_ms: 60000, rotate_queue: true, queue_thread_count: 2, inbound_data_type: "hl7v2", outbound_data_type: "fhir" },
      { id: DEST_LAB_DB, channel_id: CH_LAB, name: "Results Database", sort_order: 0, enabled: true, connector_type: "database_writer", connector_properties: { driver: "postgresql", url: "postgresql://labdb:5432/results", username: "lab_writer", password: "***", query: "INSERT INTO lab_results (order_id, result_json) VALUES (${orderId}, ${resultJson})" }, filter: null, transformer: null, response_transformer: null, queue_enabled: true, retry_count: 3, retry_interval_ms: 15000, rotate_queue: false, queue_thread_count: 1, inbound_data_type: "hl7v2", outbound_data_type: "json" },
      { id: DEST_LAB_HTTP, channel_id: CH_LAB, name: "Provider Portal Webhook", sort_order: 1, enabled: true, connector_type: "http_sender", connector_properties: { url: "https://portal.hospital.org/api/lab-results", method: "POST", contentType: "application/json", headers: '{"X-API-Key":"portal-key"}', timeout: 5000 }, filter: { script: '// Only send abnormal results\nreturn true;' }, transformer: null, response_transformer: null, queue_enabled: false, retry_count: 0, retry_interval_ms: 0, rotate_queue: false, queue_thread_count: 1, inbound_data_type: "hl7v2", outbound_data_type: "json" },
      { id: DEST_ORDERS_LAB, channel_id: CH_ORDERS, name: "Lab Information System", sort_order: 0, enabled: true, connector_type: "tcp_sender", connector_properties: { host: "lis.hospital.internal", port: 3500, mode: "mllp", encoding: "UTF-8", sendTimeout: 10000 }, filter: null, transformer: null, response_transformer: null, queue_enabled: true, retry_count: 5, retry_interval_ms: 30000, rotate_queue: true, queue_thread_count: 2, inbound_data_type: "hl7v2", outbound_data_type: "hl7v2" },
      { id: DEST_FHIR_REPO, channel_id: CH_FHIR, name: "FHIR Data Store", sort_order: 0, enabled: true, connector_type: "database_writer", connector_properties: { driver: "postgresql", url: "postgresql://fhirdb:5432/fhir_r4", username: "fhir_writer", password: "***", query: "INSERT INTO fhir_resources (resource_type, resource_id, resource) VALUES (${resourceType}, ${resourceId}, ${resourceJson})" }, filter: null, transformer: null, response_transformer: null, queue_enabled: true, retry_count: 3, retry_interval_ms: 10000, rotate_queue: false, queue_thread_count: 1, inbound_data_type: "fhir", outbound_data_type: "fhir" },
      { id: DEST_FHIR_HTTP, channel_id: CH_FHIR, name: "HIE FHIR Endpoint", sort_order: 1, enabled: true, connector_type: "http_sender", connector_properties: { url: "https://hie.state.gov/fhir/r4", method: "POST", contentType: "application/fhir+json", headers: '{"Authorization":"Bearer hie-token"}', timeout: 15000 }, filter: null, transformer: null, response_transformer: null, queue_enabled: true, retry_count: 10, retry_interval_ms: 120000, rotate_queue: true, queue_thread_count: 3, inbound_data_type: "fhir", outbound_data_type: "fhir" },
      { id: DEST_PHARM_DB, channel_id: CH_PHARMACY, name: "Pharmacy System", sort_order: 0, enabled: true, connector_type: "tcp_sender", connector_properties: { host: "pharmacy.hospital.internal", port: 4100, mode: "mllp", encoding: "UTF-8" }, filter: null, transformer: null, response_transformer: null, queue_enabled: true, retry_count: 3, retry_interval_ms: 30000, rotate_queue: false, queue_thread_count: 1, inbound_data_type: "hl7v2", outbound_data_type: "hl7v2" },
    ];

    const { error: destErr } = await supabase.from("destinations").insert(destinations);
    results.destinations = destErr ? `Error: ${destErr.message}` : `Created ${destinations.length} destinations`;

    // ══════════════════════════════════════════════════════════
    // 4. CHANNEL STATS (columns: id, channel_id, destination_id, received, filtered, queued, sent, errored, period_start, period_end, created_at)
    // ══════════════════════════════════════════════════════════
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const periodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

    const channelStats = [
      { id: uuid(), channel_id: CH_ADT, destination_id: DEST_ADT_DB, received: 1247, filtered: 83, queued: 12, sent: 1152, errored: 7, period_start: periodStart, period_end: periodEnd },
      { id: uuid(), channel_id: CH_ADT, destination_id: DEST_ADT_FHIR, received: 1247, filtered: 83, queued: 4, sent: 1148, errored: 12, period_start: periodStart, period_end: periodEnd },
      { id: uuid(), channel_id: CH_LAB, destination_id: DEST_LAB_DB, received: 3891, filtered: 245, queued: 3, sent: 3640, errored: 3, period_start: periodStart, period_end: periodEnd },
      { id: uuid(), channel_id: CH_LAB, destination_id: DEST_LAB_HTTP, received: 3891, filtered: 1200, queued: 0, sent: 2688, errored: 3, period_start: periodStart, period_end: periodEnd },
      { id: uuid(), channel_id: CH_ORDERS, destination_id: DEST_ORDERS_LAB, received: 892, filtered: 0, queued: 8, sent: 881, errored: 3, period_start: periodStart, period_end: periodEnd },
      { id: uuid(), channel_id: CH_FHIR, destination_id: DEST_FHIR_REPO, received: 2156, filtered: 112, queued: 2, sent: 2039, errored: 3, period_start: periodStart, period_end: periodEnd },
      { id: uuid(), channel_id: CH_FHIR, destination_id: DEST_FHIR_HTTP, received: 2156, filtered: 112, queued: 5, sent: 2034, errored: 5, period_start: periodStart, period_end: periodEnd },
    ];

    const { error: statsErr } = await supabase.from("channel_stats").insert(channelStats);
    results.channel_stats = statsErr ? `Error: ${statsErr.message}` : `Created ${channelStats.length} stats`;

    // ══════════════════════════════════════════════════════════
    // 5. MESSAGES (message_id is bigint, not UUID)
    // ══════════════════════════════════════════════════════════
    const hl7Adt = 'MSH|^~\\&|EPIC|HOSPITAL_A|RHAPSODY|HIE_SYSTEM|20250315120000||ADT^A01^ADT_A01|MSG00001|P|2.5.1\rEVN|A01|20250315120000\rPID|1||MRN12345^^^HOSPITAL_A^MR||DOE^JANE^MARIE^^MS||19850315|F\rPV1|1|I|WEST^W101^A';
    const hl7Oru = 'MSH|^~\\&|LAB_SYSTEM|MAIN_LAB|EPIC|HOSPITAL_A|20250315143000||ORU^R01^ORU_R01|LAB001|P|2.5.1\rPID|1||MRN12345^^^HOSPITAL_A^MR||DOE^JANE\rOBR|1|ORD789|FIL456|CBC^Complete Blood Count\rOBX|1|NM|WBC||11.5|10*3/uL|4.5-11.0|H|||F';
    const hl7Orm = 'MSH|^~\\&|EPIC|HOSPITAL_A|LAB_SYSTEM|MAIN_LAB|20250315090000||ORM^O01^ORM_O01|ORD001|P|2.5.1\rPID|1||MRN67890^^^HOSPITAL_A^MR||SMITH^ROBERT\rORC|NW|ORD789\rOBR|1|ORD789||CBC^Complete Blood Count';
    const fhirPatient = JSON.stringify({ resourceType: "Patient", id: "pat-001", name: [{ family: "Doe", given: ["Jane"] }], gender: "female", birthDate: "1985-03-15" });
    const fhirObs = JSON.stringify({ resourceType: "Observation", id: "obs-001", status: "final", code: { coding: [{ system: "http://loinc.org", code: "6690-2", display: "WBC" }] }, valueQuantity: { value: 11.5, unit: "10*3/uL" } });

    const statuses = ["received", "transformed", "sent", "sent", "sent", "sent", "sent", "error", "filtered", "sent"];
    const channelList = [CH_ADT, CH_ADT, CH_LAB, CH_LAB, CH_LAB, CH_ORDERS, CH_FHIR, CH_FHIR, CH_ADT, CH_LAB];
    const connectorNames = ["Source", "Clinical Database", "Results Database", "Provider Portal Webhook", "Results Database", "Lab Information System", "FHIR Data Store", "HIE FHIR Endpoint", "Source Filter", "Results Database"];
    const msgTypes = ["ADT^A01", "ADT^A01", "ORU^R01", "ORU^R01", "ORU^R01", "ORM^O01", "FHIR:Patient", "FHIR:Observation", "ADT^A08", "ORU^R01"];
    const rawContents = [hl7Adt, hl7Adt, hl7Oru, hl7Oru, hl7Oru, hl7Orm, fhirPatient, fhirObs, hl7Adt, hl7Oru];

    const messages = msgIds.map((id, i) => {
      const idx = i % 10;
      const status = statuses[idx];
      const minsOffset = i * 7;
      return {
        id,
        channel_id: channelList[idx],
        connector_name: connectorNames[idx],
        message_id: 100000 + i,
        status,
        message_type: msgTypes[idx],
        data_type: idx >= 6 ? "FHIR" : "HL7V2",
        direction: "inbound",
        raw_content: rawContents[idx],
        transformed_content: status === "filtered" ? null : (idx >= 6 ? rawContents[idx] : `{"patientId":"MRN${12345 + i}","messageType":"${msgTypes[idx]}","processed":true}`),
        encoded_content: status === "sent" ? "encoded-payload" : null,
        sent_content: status === "sent" ? "sent-payload" : null,
        response_content: status === "sent" ? '{"status":"success","ack":"AA"}' : (status === "error" ? '{"status":"error","message":"Connection timeout"}' : null),
        error_content: status === "error" ? "java.net.ConnectException: Connection refused\n  at TcpConnector.send(TcpConnector.java:142)" : null,
        processing_time_ms: status === "filtered" ? 2 : Math.floor(Math.random() * 450) + 15,
        connector_map: {},
        channel_map: { patientId: `MRN${12345 + i}` },
        response_map: {},
        custom_metadata: { sourceFilterPassed: status !== "filtered", destinationCount: status === "filtered" ? 0 : 2 },
        created_at: minutesAgo(minsOffset),
      };
    });

    const { error: msgErr } = await supabase.from("messages").insert(messages);
    results.messages = msgErr ? `Error: ${msgErr.message}` : `Created ${messages.length} messages`;

    // ══════════════════════════════════════════════════════════
    // 6. FHIR RESOURCES (columns: id, resource_type, resource_id, version, resource, source_message_id, created_at, updated_at)
    // ══════════════════════════════════════════════════════════
    const fhirResources = [
      { id: uuid(), resource_type: "Patient", resource_id: "pat-001", version: 1, resource: { resourceType: "Patient", id: "pat-001", identifier: [{ system: "http://hospital-a.org/mrn", value: "MRN12345" }], name: [{ use: "official", family: "Doe", given: ["Jane", "Marie"] }], gender: "female", birthDate: "1985-03-15", address: [{ line: ["123 Main St"], city: "Springfield", state: "IL", postalCode: "62701" }], maritalStatus: { coding: [{ code: "M", display: "Married" }] } }, source_message_id: msgIds[0], created_at: hoursAgo(5), updated_at: hoursAgo(5) },
      { id: uuid(), resource_type: "Patient", resource_id: "pat-002", version: 1, resource: { resourceType: "Patient", id: "pat-002", identifier: [{ system: "http://hospital-a.org/mrn", value: "MRN67890" }], name: [{ use: "official", family: "Smith", given: ["Robert", "James"] }], gender: "male", birthDate: "1972-08-22", address: [{ line: ["456 Oak Ave"], city: "Springfield", state: "IL", postalCode: "62702" }] }, source_message_id: msgIds[1], created_at: hoursAgo(3), updated_at: hoursAgo(3) },
      { id: uuid(), resource_type: "Patient", resource_id: "pat-003", version: 1, resource: { resourceType: "Patient", id: "pat-003", identifier: [{ system: "http://hospital-a.org/mrn", value: "MRN11223" }], name: [{ use: "official", family: "Johnson", given: ["Emily"] }], gender: "female", birthDate: "1990-11-04" }, source_message_id: msgIds[10], created_at: hoursAgo(1), updated_at: hoursAgo(1) },
      { id: uuid(), resource_type: "Encounter", resource_id: "enc-001", version: 1, resource: { resourceType: "Encounter", id: "enc-001", status: "in-progress", class: { code: "IMP", display: "inpatient" }, subject: { reference: "Patient/pat-001" }, period: { start: hoursAgo(5) }, location: [{ location: { display: "West Wing, Room W101" } }], reasonCode: [{ coding: [{ system: "http://hl7.org/fhir/sid/icd-10", code: "J18.9", display: "Pneumonia" }] }] }, source_message_id: msgIds[0], created_at: hoursAgo(5), updated_at: hoursAgo(5) },
      { id: uuid(), resource_type: "Encounter", resource_id: "enc-002", version: 1, resource: { resourceType: "Encounter", id: "enc-002", status: "in-progress", class: { code: "IMP", display: "inpatient" }, subject: { reference: "Patient/pat-002" }, period: { start: hoursAgo(3) }, location: [{ location: { display: "East Wing, Room E205" } }] }, source_message_id: msgIds[1], created_at: hoursAgo(3), updated_at: hoursAgo(3) },
      { id: uuid(), resource_type: "Observation", resource_id: "obs-wbc-001", version: 1, resource: { resourceType: "Observation", id: "obs-wbc-001", status: "final", code: { coding: [{ system: "http://loinc.org", code: "6690-2", display: "WBC" }], text: "White Blood Cell Count" }, subject: { reference: "Patient/pat-001" }, valueQuantity: { value: 11.5, unit: "10*3/uL" }, referenceRange: [{ low: { value: 4.5 }, high: { value: 11.0 } }], interpretation: [{ coding: [{ code: "H", display: "High" }] }] }, source_message_id: msgIds[2], created_at: hoursAgo(4), updated_at: hoursAgo(4) },
      { id: uuid(), resource_type: "Observation", resource_id: "obs-hgb-001", version: 1, resource: { resourceType: "Observation", id: "obs-hgb-001", status: "final", code: { coding: [{ system: "http://loinc.org", code: "718-7", display: "Hemoglobin" }], text: "Hemoglobin" }, subject: { reference: "Patient/pat-001" }, valueQuantity: { value: 12.8, unit: "g/dL" }, referenceRange: [{ low: { value: 12.0 }, high: { value: 16.0 } }] }, source_message_id: msgIds[2], created_at: hoursAgo(4), updated_at: hoursAgo(4) },
      { id: uuid(), resource_type: "Observation", resource_id: "obs-glu-001", version: 1, resource: { resourceType: "Observation", id: "obs-glu-001", status: "final", code: { coding: [{ system: "http://loinc.org", code: "2345-7", display: "Glucose" }], text: "Glucose" }, subject: { reference: "Patient/pat-001" }, valueQuantity: { value: 98, unit: "mg/dL" }, referenceRange: [{ low: { value: 70 }, high: { value: 100 } }] }, source_message_id: msgIds[3], created_at: hoursAgo(4), updated_at: hoursAgo(4) },
      { id: uuid(), resource_type: "DiagnosticReport", resource_id: "diag-001", version: 1, resource: { resourceType: "DiagnosticReport", id: "diag-001", status: "final", code: { coding: [{ system: "http://loinc.org", code: "58410-2", display: "CBC panel" }], text: "Complete Blood Count" }, subject: { reference: "Patient/pat-001" }, result: [{ reference: "Observation/obs-wbc-001" }, { reference: "Observation/obs-hgb-001" }], conclusion: "WBC slightly elevated. All other values normal." }, source_message_id: msgIds[2], created_at: hoursAgo(4), updated_at: hoursAgo(4) },
      { id: uuid(), resource_type: "Condition", resource_id: "cond-001", version: 1, resource: { resourceType: "Condition", id: "cond-001", clinicalStatus: { coding: [{ code: "active" }] }, code: { coding: [{ system: "http://hl7.org/fhir/sid/icd-10", code: "J18.9", display: "Pneumonia, unspecified" }] }, subject: { reference: "Patient/pat-001" }, onsetDateTime: hoursAgo(5) }, source_message_id: msgIds[0], created_at: hoursAgo(5), updated_at: hoursAgo(5) },
      { id: uuid(), resource_type: "AllergyIntolerance", resource_id: "allergy-001", version: 1, resource: { resourceType: "AllergyIntolerance", id: "allergy-001", clinicalStatus: { coding: [{ code: "active" }] }, type: "allergy", category: ["medication"], criticality: "high", code: { coding: [{ system: "http://www.nlm.nih.gov/research/umls/rxnorm", code: "PCN", display: "Penicillin" }] }, patient: { reference: "Patient/pat-001" }, reaction: [{ manifestation: [{ coding: [{ display: "Anaphylaxis" }] }], severity: "severe" }] }, source_message_id: msgIds[0], created_at: hoursAgo(5), updated_at: hoursAgo(5) },
      { id: uuid(), resource_type: "ServiceRequest", resource_id: "order-001", version: 1, resource: { resourceType: "ServiceRequest", id: "order-001", status: "active", intent: "order", priority: "stat", code: { coding: [{ code: "CBC", display: "Complete Blood Count" }] }, subject: { reference: "Patient/pat-001" }, requester: { display: "Dr. Robert Jones" }, authoredOn: hoursAgo(6) }, source_message_id: msgIds[5], created_at: hoursAgo(6), updated_at: hoursAgo(6) },
    ];

    const { error: fhirErr } = await supabase.from("fhir_resources").insert(fhirResources);
    results.fhir_resources = fhirErr ? `Error: ${fhirErr.message}` : `Created ${fhirResources.length} FHIR resources`;

    // ══════════════════════════════════════════════════════════
    // 7. EVENTS (Audit Log)
    // ══════════════════════════════════════════════════════════
    const events = [
      { id: uuid(), level: "INFO", event_name: "system.startup", description: "HealthBridge Integration Engine started successfully", attributes: { version: "1.0.0", environment: "production" }, created_at: hoursAgo(48) },
      { id: uuid(), level: "INFO", event_name: "channel.deploy", description: "Channel 'ADT Inbound Processor' deployed (revision 3)", attributes: { channel_id: CH_ADT, revision: 3 }, created_at: hoursAgo(47) },
      { id: uuid(), level: "INFO", event_name: "channel.start", description: "Channel 'ADT Inbound Processor' started", attributes: { channel_id: CH_ADT }, created_at: hoursAgo(47) },
      { id: uuid(), level: "INFO", event_name: "channel.deploy", description: "Channel 'Lab Results Router' deployed (revision 5)", attributes: { channel_id: CH_LAB, revision: 5 }, created_at: hoursAgo(46) },
      { id: uuid(), level: "INFO", event_name: "channel.start", description: "Channel 'Lab Results Router' started", attributes: { channel_id: CH_LAB }, created_at: hoursAgo(46) },
      { id: uuid(), level: "INFO", event_name: "channel.deploy", description: "Channel 'Order Dispatch' deployed (revision 2)", attributes: { channel_id: CH_ORDERS }, created_at: hoursAgo(45) },
      { id: uuid(), level: "INFO", event_name: "channel.start", description: "Channel 'Order Dispatch' started", attributes: { channel_id: CH_ORDERS }, created_at: hoursAgo(45) },
      { id: uuid(), level: "INFO", event_name: "channel.deploy", description: "Channel 'FHIR R4 Gateway' deployed (revision 1)", attributes: { channel_id: CH_FHIR }, created_at: hoursAgo(44) },
      { id: uuid(), level: "INFO", event_name: "channel.start", description: "Channel 'FHIR R4 Gateway' started", attributes: { channel_id: CH_FHIR }, created_at: hoursAgo(44) },
      { id: uuid(), level: "WARNING", event_name: "channel.queue_threshold", description: "Queue depth exceeded threshold (25) for 'FHIR Repository' on 'ADT Inbound Processor'", attributes: { channel_id: CH_ADT, queue_depth: 28, threshold: 25 }, created_at: hoursAgo(36) },
      { id: uuid(), level: "ERROR", event_name: "connector.send_error", description: "Failed to send to 'Provider Portal Webhook' — HTTP 503 Service Unavailable", attributes: { channel_id: CH_LAB, http_status: 503 }, created_at: hoursAgo(24) },
      { id: uuid(), level: "INFO", event_name: "connector.recovery", description: "Destination 'Provider Portal Webhook' recovered — connection restored", attributes: { channel_id: CH_LAB }, created_at: hoursAgo(23) },
      { id: uuid(), level: "WARNING", event_name: "message.retry_exhausted", description: "Message retry exhausted for 'Lab Information System' — moved to error queue", attributes: { channel_id: CH_ORDERS, attempts: 5 }, created_at: hoursAgo(18) },
      { id: uuid(), level: "INFO", event_name: "system.pruner", description: "Data pruner completed: removed 142 messages older than 30 days", attributes: { messages_pruned: 142, duration_ms: 1250 }, created_at: hoursAgo(12) },
      { id: uuid(), level: "ERROR", event_name: "connector.connection_lost", description: "Lost TCP connection to 'Clinical Database' on 'ADT Inbound Processor'", attributes: { channel_id: CH_ADT, error: "Connection reset by peer" }, created_at: hoursAgo(8) },
      { id: uuid(), level: "INFO", event_name: "connector.reconnected", description: "Reconnected to 'Clinical Database' on 'ADT Inbound Processor'", attributes: { channel_id: CH_ADT, downtime_seconds: 45 }, created_at: hoursAgo(8) },
      { id: uuid(), level: "INFO", event_name: "channel.stats_snapshot", description: "Hourly statistics snapshot saved", attributes: { total_received: 8186, total_sent: 7707, total_errors: 18 }, created_at: hoursAgo(1) },
      { id: uuid(), level: "WARNING", event_name: "system.memory", description: "Heap usage at 78% — consider increasing max heap size", attributes: { heap_used_mb: 780, heap_max_mb: 1024 }, created_at: minutesAgo(30) },
      { id: uuid(), level: "INFO", event_name: "user.login", description: "User demo@healthbridge.io logged in", attributes: { ip_address: "192.168.1.100" }, created_at: minutesAgo(15) },
      { id: uuid(), level: "INFO", event_name: "channel.message_processed", description: "Processed 50 messages in the last hour across all channels", attributes: { adt: 12, lab: 28, orders: 6, fhir: 4 }, created_at: minutesAgo(5) },
    ];

    const { error: evtErr } = await supabase.from("events").insert(events);
    results.events = evtErr ? `Error: ${evtErr.message}` : `Created ${events.length} events`;

    // ══════════════════════════════════════════════════════════
    // 8. QUEUE ENTRIES
    // ══════════════════════════════════════════════════════════
    const queueEntries = [
      { id: uuid(), message_id: msgIds[7], channel_id: CH_FHIR, destination_id: DEST_FHIR_HTTP, status: "failed", attempts: 5, max_attempts: 5, next_retry_at: null, error_log: [{ message: "HTTP 503 Service Unavailable", timestamp: hoursAgo(18) }, { message: "Connection timeout after 15000ms", timestamp: hoursAgo(14) }], created_at: hoursAgo(20), completed_at: null },
      { id: uuid(), message_id: msgIds[17], channel_id: CH_FHIR, destination_id: DEST_FHIR_HTTP, status: "failed", attempts: 3, max_attempts: 10, next_retry_at: minutesAgo(-30), error_log: [{ message: "HTTP 502 Bad Gateway", timestamp: hoursAgo(2) }], created_at: hoursAgo(3), completed_at: null },
      { id: uuid(), message_id: msgIds[27], channel_id: CH_ORDERS, destination_id: DEST_ORDERS_LAB, status: "pending", attempts: 1, max_attempts: 5, next_retry_at: minutesAgo(-5), error_log: [{ message: "MLLP send timeout", timestamp: minutesAgo(10) }], created_at: minutesAgo(15), completed_at: null },
      { id: uuid(), message_id: msgIds[37], channel_id: CH_ADT, destination_id: DEST_ADT_DB, status: "pending", attempts: 0, max_attempts: 3, next_retry_at: minutesAgo(-1), error_log: null, created_at: minutesAgo(3), completed_at: null },
      { id: uuid(), message_id: msgIds[0], channel_id: CH_ADT, destination_id: DEST_ADT_FHIR, status: "completed", attempts: 2, max_attempts: 5, next_retry_at: null, error_log: [{ message: "HTTP 429 Too Many Requests", timestamp: hoursAgo(10) }], created_at: hoursAgo(11), completed_at: hoursAgo(10) },
      { id: uuid(), message_id: msgIds[2], channel_id: CH_LAB, destination_id: DEST_LAB_DB, status: "completed", attempts: 1, max_attempts: 3, next_retry_at: null, error_log: null, created_at: hoursAgo(8), completed_at: hoursAgo(8) },
      { id: uuid(), message_id: msgIds[5], channel_id: CH_ORDERS, destination_id: DEST_ORDERS_LAB, status: "completed", attempts: 3, max_attempts: 5, next_retry_at: null, error_log: [{ message: "MLLP timeout", timestamp: hoursAgo(6) }], created_at: hoursAgo(7), completed_at: hoursAgo(5) },
      { id: uuid(), message_id: msgIds[10], channel_id: CH_ADT, destination_id: DEST_ADT_DB, status: "completed", attempts: 1, max_attempts: 3, next_retry_at: null, error_log: null, created_at: hoursAgo(4), completed_at: hoursAgo(4) },
    ];

    const { error: queueErr } = await supabase.from("queue_entries").insert(queueEntries);
    results.queue_entries = queueErr ? `Error: ${queueErr.message}` : `Created ${queueEntries.length} queue entries`;

    return NextResponse.json({ success: true, results }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err), results }, { status: 500 });
  }
}
