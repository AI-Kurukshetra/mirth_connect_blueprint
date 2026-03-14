import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { requireRole } from "@/lib/authz";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

const seedChannelRows = [
  {
    channel_id: "CH-001",
    name: "ADT Feed - Epic to Lab",
    description: "Receives inpatient ADT traffic from Epic and fans out to the lab platform plus the FHIR repository.",
    source_type: "MLLP",
    destination_type: "REST",
    message_format: "HL7v2",
    status: "active",
    enabled: true,
    retry_count: 3,
    retry_interval: 60,
    source_connector_type: "hl7_listener",
    source_connector_properties: { host: "0.0.0.0", port: 2575, mode: "mllp" },
    source_filter: { script: 'return msg.MSH[9][1].toString() === "ADT";' },
    source_transformer: { script: 'channelMap.put("patientId", msg.PID[3][1].toString()); return msg;' },
    preprocessor_script: 'return message.trim();',
    postprocessor_script: 'return;',
  },
  {
    channel_id: "CH-003",
    name: "FHIR Patient Sync",
    description: "Publishes patient updates from operational systems into the MedFlow FHIR repository and downstream REST subscribers.",
    source_type: "HTTP",
    destination_type: "REST",
    message_format: "FHIR_R4",
    status: "active",
    enabled: true,
    retry_count: 5,
    retry_interval: 90,
    source_connector_type: "http_listener",
    source_connector_properties: { path: "/fhir/patient-sync", method: "POST" },
    source_filter: null,
    source_transformer: null,
    preprocessor_script: null,
    postprocessor_script: null,
  },
  {
    channel_id: "CH-006",
    name: "Pharmacy Dispense Feed",
    description: "Handles medication dispense events and queues retries for downstream pharmacy handoff failures.",
    source_type: "MLLP",
    destination_type: "TCP",
    message_format: "HL7v2",
    status: "error",
    enabled: true,
    retry_count: 4,
    retry_interval: 75,
    source_connector_type: "hl7_listener",
    source_connector_properties: { host: "0.0.0.0", port: 2577, mode: "mllp" },
    source_filter: null,
    source_transformer: { script: 'return message;' },
    preprocessor_script: null,
    postprocessor_script: null,
  },
] as const;

export async function POST() {
  const access = await requireRole(["admin"]);
  if (!access.ok) {
    return NextResponse.json({ error: access.message }, { status: access.status });
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Supabase service role credentials are required to run the seed route." },
      { status: 500 },
    );
  }

  const supabase = createServiceClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const results: Record<string, string> = {};

  try {
    const { data: channels, error: channelError } = await supabase
      .from("channels")
      .upsert(seedChannelRows, { onConflict: "channel_id" })
      .select("id, channel_id, name");

    if (channelError || !channels) {
      return NextResponse.json({ error: channelError?.message || "Failed to seed channels." }, { status: 500 });
    }

    results.channels = `Upserted ${channels.length} channels`;

    const channelMap = new Map(channels.map((channel) => [channel.channel_id, channel]));

    const destinationRows = [
      {
        channel_id: channelMap.get("CH-001")?.id,
        name: "Clinical database",
        sort_order: 0,
        enabled: true,
        connector_type: "database_writer",
        connector_properties: { connection: "postgresql://clinicaldb", table: "patient_admissions" },
        filter: null,
        transformer: { script: 'return JSON.stringify({ patientId: channelMap.get("patientId") });' },
        response_transformer: null,
        queue_enabled: true,
        retry_count: 3,
        retry_interval_ms: 30000,
        rotate_queue: false,
        queue_thread_count: 1,
        inbound_data_type: "HL7v2",
        outbound_data_type: "JSON",
      },
      {
        channel_id: channelMap.get("CH-001")?.id,
        name: "FHIR repository",
        sort_order: 1,
        enabled: true,
        connector_type: "fhir_repository",
        connector_properties: { endpoint: "internal-fhir-repo", method: "upsert" },
        filter: null,
        transformer: { script: 'return message;' },
        response_transformer: null,
        queue_enabled: true,
        retry_count: 5,
        retry_interval_ms: 60000,
        rotate_queue: true,
        queue_thread_count: 2,
        inbound_data_type: "HL7v2",
        outbound_data_type: "FHIR_R4",
      },
      {
        channel_id: channelMap.get("CH-003")?.id,
        name: "HIE REST subscriber",
        sort_order: 0,
        enabled: true,
        connector_type: "http_sender",
        connector_properties: { url: "https://hie.example.com/fhir", method: "POST" },
        filter: null,
        transformer: null,
        response_transformer: null,
        queue_enabled: true,
        retry_count: 4,
        retry_interval_ms: 45000,
        rotate_queue: false,
        queue_thread_count: 1,
        inbound_data_type: "FHIR_R4",
        outbound_data_type: "FHIR_R4",
      },
      {
        channel_id: channelMap.get("CH-006")?.id,
        name: "Pharmacy TCP sender",
        sort_order: 0,
        enabled: true,
        connector_type: "tcp_sender",
        connector_properties: { host: "pharmacy.internal", port: 4100, mode: "mllp" },
        filter: null,
        transformer: null,
        response_transformer: null,
        queue_enabled: true,
        retry_count: 4,
        retry_interval_ms: 30000,
        rotate_queue: false,
        queue_thread_count: 1,
        inbound_data_type: "HL7v2",
        outbound_data_type: "HL7v2",
      },
    ].filter((row) => row.channel_id);

    const seededChannelIds = channels.map((channel) => channel.id);
    const { error: destinationDeleteError } = await supabase
      .from("destinations")
      .delete()
      .in("channel_id", seededChannelIds);

    if (destinationDeleteError) {
      return NextResponse.json({ error: destinationDeleteError.message }, { status: 500 });
    }

    const { error: destinationInsertError } = await supabase.from("destinations").insert(destinationRows);
    if (destinationInsertError) {
      return NextResponse.json({ error: destinationInsertError.message }, { status: 500 });
    }
    results.destinations = `Inserted ${destinationRows.length} destinations`;

    const messageRows = [
      {
        message_id: "MSG-SEED-001",
        channel_id: channelMap.get("CH-001")?.id,
        source_system: "Epic EHR",
        destination_system: "Clinical database",
        message_type: "ADT^A01",
        message_format: "HL7v2",
        status: "sent",
        raw_payload: "MSH|^~\\&|EPIC|HOSP|LAB|DB|202603141200||ADT^A01|MSG-SEED-001|P|2.5.1\rPID|1||MRN1001^^^HOSP^MR||DOE^JANE",
        transformed_payload: '{"patientId":"MRN1001","resourceType":"Patient"}',
        error_message: null,
        retry_attempts: 0,
        processing_time_ms: 48,
        connector_name: "FHIR repository",
        data_type: "HL7V2",
        direction: "outbound",
        raw_content: "MSH|^~\\&|EPIC|HOSP|LAB|DB|202603141200||ADT^A01|MSG-SEED-001|P|2.5.1\rPID|1||MRN1001^^^HOSP^MR||DOE^JANE",
        transformed_content: '{"patientId":"MRN1001","resourceType":"Patient"}',
        encoded_content: '{"patientId":"MRN1001","resourceType":"Patient"}',
        sent_content: '{"patientId":"MRN1001","resourceType":"Patient"}',
        response_content: '{"status":"accepted"}',
        error_content: null,
        connector_map: {},
        channel_map: { patientId: "MRN1001" },
        response_map: { status: "accepted" },
        custom_metadata: { seededBy: "api-seed-v2", destinationCount: 2 },
        created_at: hoursAgo(2),
      },
      {
        message_id: "MSG-SEED-002",
        channel_id: channelMap.get("CH-003")?.id,
        source_system: "Patient admin service",
        destination_system: "HIE REST subscriber",
        message_type: "Patient",
        message_format: "FHIR_R4",
        status: "sent",
        raw_payload: '{"resourceType":"Patient","id":"pat-seed-1"}',
        transformed_payload: '{"resourceType":"Patient","id":"pat-seed-1","active":true}',
        error_message: null,
        retry_attempts: 0,
        processing_time_ms: 71,
        connector_name: "HIE REST subscriber",
        data_type: "FHIR",
        direction: "outbound",
        raw_content: '{"resourceType":"Patient","id":"pat-seed-1"}',
        transformed_content: '{"resourceType":"Patient","id":"pat-seed-1","active":true}',
        encoded_content: '{"resourceType":"Patient","id":"pat-seed-1","active":true}',
        sent_content: '{"resourceType":"Patient","id":"pat-seed-1","active":true}',
        response_content: '{"status":"201 Created"}',
        error_content: null,
        connector_map: {},
        channel_map: { syncMode: "patient" },
        response_map: { status: "created" },
        custom_metadata: { seededBy: "api-seed-v2", destinationCount: 1 },
        created_at: hoursAgo(1),
      },
      {
        message_id: "MSG-SEED-003",
        channel_id: channelMap.get("CH-006")?.id,
        source_system: "Epic EHR",
        destination_system: "Pharmacy TCP sender",
        message_type: "RDS^O13",
        message_format: "HL7v2",
        status: "error",
        raw_payload: "MSH|^~\\&|EPIC|HOSP|PHARM|EXT|202603141145||RDS^O13|MSG-SEED-003|P|2.5.1",
        transformed_payload: null,
        error_message: "Connection refused after queued retry attempts.",
        retry_attempts: 3,
        processing_time_ms: 123,
        connector_name: "Pharmacy TCP sender",
        data_type: "HL7V2",
        direction: "outbound",
        raw_content: "MSH|^~\\&|EPIC|HOSP|PHARM|EXT|202603141145||RDS^O13|MSG-SEED-003|P|2.5.1",
        transformed_content: null,
        encoded_content: null,
        sent_content: null,
        response_content: null,
        error_content: "Connection refused after queued retry attempts.",
        connector_map: {},
        channel_map: { seededBy: "api-seed-v2" },
        response_map: {},
        custom_metadata: { seededBy: "api-seed-v2", destinationCount: 1 },
        created_at: minutesAgo(35),
      },
    ].filter((row) => row.channel_id);

    const { data: messages, error: messageError } = await supabase
      .from("messages")
      .upsert(messageRows, { onConflict: "message_id" })
      .select("id, message_id");

    if (messageError || !messages) {
      return NextResponse.json({ error: messageError?.message || "Failed to seed messages." }, { status: 500 });
    }
    results.messages = `Upserted ${messages.length} messages`;

    const messageMap = new Map(messages.map((message) => [message.message_id, message.id]));

    const fhirRows = [
      {
        resource_type: "Patient",
        resource_id: "pat-seed-1",
        version: 1,
        resource_data: {
          resourceType: "Patient",
          id: "pat-seed-1",
          active: true,
          name: [{ family: "Doe", given: ["Jane"] }],
          gender: "female",
          birthDate: "1985-03-15",
          meta: { versionId: "1", lastUpdated: hoursAgo(1) },
        },
        source_message_id: messageMap.get("MSG-SEED-002") ?? null,
      },
      {
        resource_type: "Encounter",
        resource_id: "enc-seed-1",
        version: 1,
        resource_data: {
          resourceType: "Encounter",
          id: "enc-seed-1",
          status: "in-progress",
          subject: { reference: "Patient/pat-seed-1" },
          meta: { versionId: "1", lastUpdated: hoursAgo(2) },
        },
        source_message_id: messageMap.get("MSG-SEED-001") ?? null,
      },
    ];

    const { error: fhirError } = await supabase
      .from("fhir_resources")
      .upsert(fhirRows, { onConflict: "resource_type,resource_id" });

    if (fhirError) {
      return NextResponse.json({ error: fhirError.message }, { status: 500 });
    }
    results.fhir_resources = `Upserted ${fhirRows.length} resources`;

    const transformationRows = [
      {
        transformation_id: "TRF-001",
        name: "HL7v2 ADT to FHIR Patient",
        description: "Maps ADT intake into a Patient resource envelope.",
        language: "javascript",
        script: 'function transform(message, maps) { return { resourceType: "Patient", id: maps.channelMap.patientId || "demo" }; }',
        input_format: "HL7v2",
        output_format: "FHIR_R4",
        version: 1,
        is_active: true,
        test_result: "pass",
      },
      {
        transformation_id: "TRF-002",
        name: "ORU Result Normalizer",
        description: "Normalizes ORU payloads before downstream distribution.",
        language: "javascript",
        script: 'function transform(message) { return { resourceType: "Observation", status: "final", payload: message }; }',
        input_format: "HL7v2",
        output_format: "FHIR_R4",
        version: 1,
        is_active: true,
        test_result: "untested",
      },
      {
        transformation_id: "TRF-003",
        name: "JSON to HL7v2 Mapper",
        description: "Builds an HL7-compatible envelope from JSON intake.",
        language: "javascript",
        script: 'function transform(message) { return "MSH|^~\\&|JSON|MEDFLOW|DEST|TARGET|" + new Date().toISOString(); }',
        input_format: "JSON",
        output_format: "HL7v2",
        version: 1,
        is_active: true,
        test_result: "untested",
      },
    ];

    const { data: transformations, error: transformationsError } = await supabase
      .from("transformations")
      .upsert(transformationRows, { onConflict: "transformation_id" })
      .select("id, transformation_id");

    if (transformationsError || !transformations) {
      return NextResponse.json({ error: transformationsError?.message || "Failed to seed transformations." }, { status: 500 });
    }
    results.transformations = `Upserted ${transformations.length} transformations`;

    const transformationMap = new Map(transformations.map((row) => [row.transformation_id, row.id]));

    const validationRuleRows = [
      {
        rule_id: "VAL-001",
        name: "HL7v2 Required Fields",
        description: "Ensures key MSH and PID fields are present.",
        message_format: "HL7v2",
        rule_type: "required_fields",
        rule_definition: { required: ["MSH.3", "MSH.4", "MSH.9", "PID.3"] },
        is_active: true,
        severity: "error",
      },
      {
        rule_id: "VAL-002",
        name: "FHIR Patient Schema",
        description: "Validates minimum Patient identity structure.",
        message_format: "FHIR_R4",
        rule_type: "schema",
        rule_definition: { resourceType: "Patient", required: ["id", "name"] },
        is_active: true,
        severity: "error",
      },
      {
        rule_id: "VAL-003",
        name: "Message Size Guardrail",
        description: "Warns when payload size approaches platform limits.",
        message_format: "HL7v2",
        rule_type: "custom",
        rule_definition: { max_size_bytes: 102400 },
        is_active: true,
        severity: "warning",
      },
    ];

    const { data: validationRules, error: validationRulesError } = await supabase
      .from("validation_rules")
      .upsert(validationRuleRows, { onConflict: "rule_id" })
      .select("id, rule_id");

    if (validationRulesError || !validationRules) {
      return NextResponse.json({ error: validationRulesError?.message || "Failed to seed validation rules." }, { status: 500 });
    }
    results.validation_rules = `Upserted ${validationRules.length} validation rules`;

    const validationRuleMap = new Map(validationRules.map((row) => [row.rule_id, row.id]));

    await supabase
      .from("channels")
      .update({
        transformation_id: transformationMap.get("TRF-001") ?? null,
        validation_rule_id: validationRuleMap.get("VAL-001") ?? null,
      })
      .eq("channel_id", "CH-001");

    await supabase
      .from("channels")
      .update({
        transformation_id: transformationMap.get("TRF-002") ?? null,
        validation_rule_id: validationRuleMap.get("VAL-002") ?? null,
      })
      .eq("channel_id", "CH-003");

    const routingRuleRows = [
      {
        rule_id: "RR-001",
        name: "Route ADT Intake to FHIR Sync",
        description: "Routes admission traffic into the FHIR sync lane.",
        channel_id: channelMap.get("CH-001")?.id,
        priority: 1,
        condition_type: "message_type",
        condition_field: "MSH.9",
        condition_operator: "equals",
        condition_value: "ADT^A01",
        action: "route_to",
        destination_channel_id: channelMap.get("CH-003")?.id ?? null,
        is_active: true,
      },
      {
        rule_id: "RR-002",
        name: "Filter Test Traffic",
        description: "Stops test-mode traffic from reaching production destinations.",
        channel_id: channelMap.get("CH-001")?.id,
        priority: 2,
        condition_type: "field_value",
        condition_field: "MSH.11",
        condition_operator: "equals",
        condition_value: "T",
        action: "filter",
        destination_channel_id: null,
        is_active: true,
      },
      {
        rule_id: "RR-003",
        name: "Archive Failed Pharmacy Retries",
        description: "Archives pharmacy traffic after repeated downstream failures.",
        channel_id: channelMap.get("CH-006")?.id,
        priority: 1,
        condition_type: "source",
        condition_field: "destination_system",
        condition_operator: "contains",
        condition_value: "Pharmacy",
        action: "archive",
        destination_channel_id: null,
        is_active: true,
      },
    ].filter((row) => row.channel_id);

    const { data: routingRules, error: routingRulesError } = await supabase
      .from("routing_rules")
      .upsert(routingRuleRows, { onConflict: "rule_id" })
      .select("id, rule_id");

    if (routingRulesError || !routingRules) {
      return NextResponse.json({ error: routingRulesError?.message || "Failed to seed routing rules." }, { status: 500 });
    }
    results.routing_rules = `Upserted ${routingRules.length} routing rules`;

    const alertRows = [
      {
        alert_id: "ALT-001",
        name: "High Error Rate Alert",
        description: "Warns operators when message failures exceed the allowed threshold.",
        trigger_type: "error_rate",
        threshold_value: 5,
        threshold_operator: "gt",
        notification_channel: "email",
        notification_target: "admin@medflow.local",
        cooldown_minutes: 15,
        is_active: true,
      },
      {
        alert_id: "ALT-002",
        name: "High Latency Alert",
        description: "Triggers when processing latency crosses the response budget.",
        trigger_type: "latency",
        threshold_value: 500,
        threshold_operator: "gt",
        notification_channel: "webhook",
        notification_target: "https://hooks.medflow.local/ops",
        cooldown_minutes: 10,
        is_active: true,
      },
    ];

    const { data: alerts, error: alertsError } = await supabase
      .from("alerts")
      .upsert(alertRows, { onConflict: "alert_id" })
      .select("id, alert_id");

    if (alertsError || !alerts) {
      return NextResponse.json({ error: alertsError?.message || "Failed to seed alerts." }, { status: 500 });
    }
    results.alerts = `Upserted ${alerts.length} alerts`;

    const alertHistoryRows = alerts
      .filter((alert) => alert.alert_id === "ALT-001")
      .map((alert) => ({
        alert_id: alert.id,
        triggered_at: minutesAgo(90),
        trigger_value: 7.2,
        message: "Seeded historical trigger for dashboard and alerts testing.",
        notified: true,
        notified_at: minutesAgo(89),
      }));

    if (alertHistoryRows.length > 0) {
      const { error: alertHistoryError } = await supabase.from("alert_history").insert(alertHistoryRows);
      results.alert_history = alertHistoryError ? `Skipped: ${alertHistoryError.message}` : `Inserted ${alertHistoryRows.length} alert history rows`;
    }

    const metricRows = [
      {
        recorded_at: hoursAgo(4),
        messages_total: 842,
        messages_success: 826,
        messages_failed: 16,
        avg_latency_ms: 67.1,
        throughput_per_min: 2.8,
        cpu_usage_pct: 34.9,
        memory_usage_pct: 48.5,
        active_channels: 3,
      },
      {
        recorded_at: hoursAgo(2),
        messages_total: 913,
        messages_success: 901,
        messages_failed: 12,
        avg_latency_ms: 63.4,
        throughput_per_min: 3.1,
        cpu_usage_pct: 37.2,
        memory_usage_pct: 50.1,
        active_channels: 3,
      },
      {
        recorded_at: minutesAgo(20),
        messages_total: 228,
        messages_success: 221,
        messages_failed: 7,
        avg_latency_ms: 58.8,
        throughput_per_min: 2.2,
        cpu_usage_pct: 29.7,
        memory_usage_pct: 44.8,
        active_channels: 3,
      },
    ];

    const { error: metricsError } = await supabase.from("performance_metrics").insert(metricRows);
    if (metricsError) {
      results.performance_metrics = `Skipped: ${metricsError.message}`;
    } else {
      results.performance_metrics = `Inserted ${metricRows.length} metrics`;
    }

    const errorLogRows = [
      {
        message_id: messageMap.get("MSG-SEED-003") ?? null,
        channel_id: channelMap.get("CH-006")?.id ?? null,
        error_code: "SEED-NET-001",
        error_type: "network",
        error_message: "Connection refused after queued retry attempts.",
        resolved: false,
      },
    ];

    const { error: errorLogError } = await supabase.from("error_logs").insert(errorLogRows);
    if (errorLogError) {
      results.error_logs = `Skipped: ${errorLogError.message}`;
    } else {
      results.error_logs = `Inserted ${errorLogRows.length} error logs`;
    }

    const auditRows = [
      {
        action: "seed.runtime.messages",
        entity_type: "seed",
        entity_id: "api-seed-v2",
        details: { seededBy: "api-seed-v2", channelCount: channels.length, messageCount: messages.length },
      },
    ];

    const { error: auditError } = await supabase.from("audit_logs").insert(auditRows);
    if (auditError) {
      results.audit_logs = `Skipped: ${auditError.message}`;
    } else {
      results.audit_logs = `Inserted ${auditRows.length} audit logs`;
    }

    return NextResponse.json({ success: true, results }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err), results },
      { status: 500 },
    );
  }
}

