"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
  type DragEvent,
  type ReactNode,
} from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes,
  ReactFlowProvider,
  BackgroundVariant,
  MarkerType,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import SourceNode from "@/components/designer/nodes/SourceNode";
import TransformNode from "@/components/designer/nodes/TransformNode";
import DestinationNode from "@/components/designer/nodes/DestinationNode";
import { createClient } from "@/lib/supabase/client";

// ---------------------------------------------------------------------------
// Node palette definitions
// ---------------------------------------------------------------------------
interface PaletteItem {
  type: string;
  nodeType: "source" | "transform" | "destination";
  label: string;
  description: string;
  subtype: string;
  icon: ReactNode;
}

const paletteItems: PaletteItem[] = [
  {
    type: "source",
    nodeType: "source",
    label: "HL7 Listener",
    description: "Receive HL7 v2.x messages via TCP/MLLP",
    subtype: "hl7_listener",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
    ),
  },
  {
    type: "source",
    nodeType: "source",
    label: "HTTP Source",
    description: "Receive data via HTTP/REST webhooks",
    subtype: "http_source",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
    ),
  },
  {
    type: "source",
    nodeType: "source",
    label: "File Source",
    description: "Read files from a directory path",
    subtype: "file_source",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14,2 14,8 20,8" /></svg>
    ),
  },
  {
    type: "transform",
    nodeType: "transform",
    label: "FHIR Converter",
    description: "Convert HL7v2 to FHIR R4 resources",
    subtype: "fhir_converter",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
    ),
  },
  {
    type: "transform",
    nodeType: "transform",
    label: "Transform",
    description: "Map and transform message fields",
    subtype: "transform",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" /><path d="m8 15-4-4 4-4" /><path d="m16 17 4-4-4-4" /></svg>
    ),
  },
  {
    type: "transform",
    nodeType: "transform",
    label: "Filter",
    description: "Filter messages by rules & conditions",
    subtype: "filter",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46" /></svg>
    ),
  },
  {
    type: "destination",
    nodeType: "destination",
    label: "Database Destination",
    description: "Write data to a SQL database",
    subtype: "database_destination",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5V19A9 3 0 0 0 21 19V5" /><path d="M3 12A9 3 0 0 0 21 12" /></svg>
    ),
  },
  {
    type: "destination",
    nodeType: "destination",
    label: "HTTP Destination",
    description: "Send data to an external HTTP endpoint",
    subtype: "http_destination",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" x2="4" y1="22" y2="15" /></svg>
    ),
  },
  {
    type: "destination",
    nodeType: "destination",
    label: "FHIR Repository",
    description: "Persist FHIR resources to a FHIR server",
    subtype: "fhir_repository",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" /><path d="M18 14h-8" /><path d="M15 18h-5" /><path d="M10 6h8v4h-8V6Z" /></svg>
    ),
  },
];

// ---------------------------------------------------------------------------
// Config panel field definitions per subtype
// ---------------------------------------------------------------------------
const configFields: Record<string, { key: string; label: string; type: string; placeholder?: string }[]> = {
  hl7_listener: [
    { key: "host", label: "Host", type: "text", placeholder: "0.0.0.0" },
    { key: "port", label: "Port", type: "number", placeholder: "2575" },
    { key: "encoding", label: "Encoding", type: "text", placeholder: "UTF-8" },
  ],
  http_source: [
    { key: "path", label: "Endpoint Path", type: "text", placeholder: "/api/webhook" },
    { key: "method", label: "HTTP Method", type: "text", placeholder: "POST" },
    { key: "auth_type", label: "Auth Type", type: "text", placeholder: "bearer" },
  ],
  file_source: [
    { key: "directory", label: "Directory", type: "text", placeholder: "/data/inbound" },
    { key: "pattern", label: "File Pattern", type: "text", placeholder: "*.hl7" },
    { key: "poll_interval", label: "Poll Interval (ms)", type: "number", placeholder: "5000" },
  ],
  fhir_converter: [
    { key: "source_format", label: "Source Format", type: "text", placeholder: "HL7v2" },
    { key: "target_version", label: "FHIR Version", type: "text", placeholder: "R4" },
    { key: "template", label: "Template", type: "text", placeholder: "ADT_A01" },
  ],
  transform: [
    { key: "mapping_script", label: "Mapping Script", type: "text", placeholder: "Enter mapping logic..." },
    { key: "output_format", label: "Output Format", type: "text", placeholder: "JSON" },
  ],
  filter: [
    { key: "condition", label: "Condition", type: "text", placeholder: 'msg.MSH.9 == "ADT^A01"' },
    { key: "action", label: "No-match Action", type: "text", placeholder: "drop" },
  ],
  database_destination: [
    { key: "connection_string", label: "Connection String", type: "text", placeholder: "postgresql://..." },
    { key: "table", label: "Table Name", type: "text", placeholder: "patients" },
    { key: "mode", label: "Write Mode", type: "text", placeholder: "upsert" },
  ],
  http_destination: [
    { key: "url", label: "URL", type: "text", placeholder: "https://api.example.com/data" },
    { key: "method", label: "HTTP Method", type: "text", placeholder: "POST" },
    { key: "headers", label: "Headers (JSON)", type: "text", placeholder: '{"Content-Type":"application/json"}' },
  ],
  fhir_repository: [
    { key: "fhir_server_url", label: "FHIR Server URL", type: "text", placeholder: "https://fhir.example.com/r4" },
    { key: "resource_type", label: "Resource Type", type: "text", placeholder: "Patient" },
    { key: "auth_token", label: "Auth Token", type: "text", placeholder: "Bearer ..." },
  ],
};

// ---------------------------------------------------------------------------
// Colour helpers for category badges in palette
// ---------------------------------------------------------------------------
const categoryColors: Record<string, { border: string; text: string; bg: string }> = {
  source: { border: "border-blue-200", text: "text-blue-600", bg: "bg-blue-50" },
  transform: { border: "border-purple-200", text: "text-purple-600", bg: "bg-purple-50" },
  destination: { border: "border-emerald-200", text: "text-emerald-600", bg: "bg-emerald-50" },
};

// ---------------------------------------------------------------------------
// Inner Flow component (needs to be inside ReactFlowProvider)
// ---------------------------------------------------------------------------
function DesignerFlow() {
  const params = useParams();
  const router = useRouter();
  const channelId = params.id as string;
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [channelName, setChannelName] = useState("Loading...");
  const [channelStatus, setChannelStatus] = useState<"running" | "stopped">("stopped");
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  const nodeTypes: NodeTypes = useMemo(
    () => ({
      source: SourceNode,
      transform: TransformNode,
      destination: DestinationNode,
    }),
    []
  );

  // ---- Load channel from Supabase ----
  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("channels")
          .select("*")
          .eq("id", channelId)
          .single();

        if (error) throw error;
        setChannelName(data.name || "Untitled Channel");
        setChannelStatus(data.status === "running" ? "running" : "stopped");

        const wf = data.workflow_definition as { nodes?: Node[]; edges?: Edge[] } | null;
        if (wf?.nodes) setNodes(wf.nodes);
        if (wf?.edges) setEdges(wf.edges);
      } catch (err) {
        console.error("Failed to load channel:", err);
        setChannelName("Error loading channel");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [channelId, setNodes, setEdges]);

  // ---- Save workflow to Supabase ----
  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("channels")
        .update({
          workflow_definition: { nodes, edges },
          name: channelName,
        })
        .eq("id", channelId);
      if (error) throw error;
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  }, [nodes, edges, channelName, channelId]);

  // ---- Toggle channel running state ----
  const handleToggle = useCallback(async () => {
    const next = channelStatus === "running" ? "stopped" : "running";
    setChannelStatus(next);
    try {
      const supabase = createClient();
      await supabase.from("channels").update({ status: next }).eq("id", channelId);
    } catch (err) {
      console.error("Toggle failed:", err);
      setChannelStatus(channelStatus);
    }
  }, [channelStatus, channelId]);

  // ---- Edge creation ----
  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            animated: true,
            style: { stroke: "#0d9488", strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#0d9488", width: 16, height: 16 },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  // ---- Drag & drop from palette ----
  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const raw = event.dataTransfer.getData("application/reactflow");
      if (!raw) return;

      const item: PaletteItem = JSON.parse(raw);
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });

      const newNode: Node = {
        id: `${item.subtype}-${Date.now()}`,
        type: item.nodeType,
        position,
        data: {
          label: item.label,
          subtype: item.subtype,
          description: item.description,
          config: {},
        },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [screenToFlowPosition, setNodes]
  );

  // ---- Node selection ----
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNode(node);
    },
    []
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // ---- Config panel value change ----
  const updateNodeConfig = useCallback(
    (key: string, value: string) => {
      if (!selectedNode) return;
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === selectedNode.id) {
            const updated = {
              ...n,
              data: {
                ...n.data,
                config: { ...(n.data.config as Record<string, string>), [key]: value },
              },
            };
            setSelectedNode(updated);
            return updated;
          }
          return n;
        })
      );
    },
    [selectedNode, setNodes]
  );

  // ---- Delete selected node ----
  const deleteSelectedNode = useCallback(() => {
    if (!selectedNode) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setSelectedNode(null);
  }, [selectedNode, setNodes, setEdges]);

  // ---- Palette drag start ----
  const onDragStart = (event: DragEvent, item: PaletteItem) => {
    const { icon, ...serializable } = item;
    event.dataTransfer.setData("application/reactflow", JSON.stringify(serializable));
    event.dataTransfer.effectAllowed = "move";
  };

  const selectedFields = selectedNode
    ? configFields[(selectedNode.data.subtype as string) || ""] || []
    : [];

  if (loading) {
    return (
      <div className="bg-[var(--hb-snow)] flex items-center justify-center -m-8" style={{ height: "calc(100vh - 4rem)", width: "calc(100% + 4rem)" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="inline-block w-6 h-6 border-2 border-[var(--hb-text-ghost)] border-t-[var(--hb-teal)] rounded-full animate-spin" />
          <span className="text-[var(--hb-text-tertiary)] text-sm">Loading channel designer...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--hb-snow)] flex flex-col overflow-hidden -m-8" style={{ height: "calc(100vh - 4rem)", width: "calc(100% + 4rem)" }}>
      {/* ===== Top Toolbar ===== */}
      <div className="h-14 border-b border-[var(--hb-border)] bg-[var(--hb-white)]/80 backdrop-blur-sm flex items-center justify-between px-4 z-20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/channels")}
            className="flex items-center gap-1.5 text-sm text-[var(--hb-text-tertiary)] hover:text-[var(--hb-text-primary)] transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
          </button>
          <div className="w-px h-6 bg-[var(--hb-border)]" />
          <input
            type="text"
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
            className="bg-transparent text-[var(--hb-text-primary)] font-semibold text-base outline-none border-b border-transparent hover:border-[var(--hb-border-bright)] focus:border-[var(--hb-teal)] transition-colors px-1 py-0.5 max-w-[300px]"
          />
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full font-[family-name:var(--font-jetbrains)] ${
            channelStatus === "running"
              ? "bg-emerald-50 text-[var(--hb-green)] border border-emerald-200"
              : "bg-[var(--hb-cloud)] text-[var(--hb-text-ghost)] border border-[var(--hb-border)]"
          }`}>
            {channelStatus}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {saveSuccess && (
            <span className="text-xs text-[var(--hb-green)] flex items-center gap-1 animate-pulse">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20,6 9,17 4,12" /></svg>
              Saved
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="hb-btn-ghost flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-[var(--hb-text-ghost)] border-t-[var(--hb-teal)] rounded-full animate-spin" />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17,21 17,13 7,13 7,21" /><polyline points="7,3 7,8 15,8" /></svg>
            )}
            Save
          </button>
          <button
            onClick={handleToggle}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors border ${
              channelStatus === "running"
                ? "bg-red-50 text-[var(--hb-red)] border-red-200 hover:bg-red-100"
                : "bg-emerald-50 text-[var(--hb-green)] border-emerald-200 hover:bg-emerald-100"
            }`}
          >
            {channelStatus === "running" ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
                Stop
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
                Start
              </>
            )}
          </button>
        </div>
      </div>

      {/* ===== Main content area ===== */}
      <div className="flex flex-1 overflow-hidden">
        {/* ---- Left sidebar: Node Palette ---- */}
        <div className="w-64 border-r border-[var(--hb-border)] bg-[var(--hb-white)] overflow-y-auto flex-shrink-0">
          <div className="p-4">
            <h2 className="text-[9px] font-bold text-[var(--hb-text-ghost)] uppercase tracking-[0.2em] mb-4 font-[family-name:var(--font-jetbrains)]">Node Palette</h2>

            {(["source", "transform", "destination"] as const).map((category) => {
              const colors = categoryColors[category];
              const items = paletteItems.filter((p) => p.nodeType === category);
              return (
                <div key={category} className="mb-5">
                  <div className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${colors.text} font-[family-name:var(--font-jetbrains)]`}>
                    {category === "source" ? "Sources" : category === "transform" ? "Transforms" : "Destinations"}
                  </div>
                  <div className="space-y-1.5">
                    {items.map((item) => (
                      <div
                        key={item.subtype}
                        draggable
                        onDragStart={(e) => onDragStart(e, item)}
                        className={`
                          flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-grab active:cursor-grabbing
                          transition-all hover:scale-[1.02] hover:shadow-md
                          ${colors.border} ${colors.bg} hover:border-opacity-80
                        `}
                      >
                        <div className={`flex-shrink-0 ${colors.text}`}>{item.icon}</div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-[var(--hb-text-primary)] truncate">{item.label}</div>
                          <div className="text-[10px] text-[var(--hb-text-ghost)] truncate">{item.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ---- Canvas ---- */}
        <div className="flex-1 relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            deleteKeyCode={["Backspace", "Delete"]}
            defaultEdgeOptions={{
              animated: true,
              style: { stroke: "#0d9488", strokeWidth: 2 },
              markerEnd: { type: MarkerType.ArrowClosed, color: "#0d9488", width: 16, height: 16 },
            }}
            proOptions={{ hideAttribution: true }}
            style={{ background: "#f8fafc" }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#cbd5e1" />
            <Controls
              className="!bg-white !border-slate-200 !rounded-lg !shadow-lg [&>button]:!bg-white [&>button]:!border-slate-200 [&>button]:!text-slate-500 [&>button:hover]:!bg-slate-50 [&>button:hover]:!text-slate-800 [&>button]:!rounded-md"
              position="bottom-left"
            />
            <MiniMap
              className="!bg-white !border-slate-200 !rounded-lg"
              nodeColor={(node) => {
                switch (node.type) {
                  case "source": return "#3b82f6";
                  case "transform": return "#a855f7";
                  case "destination": return "#10b981";
                  default: return "#94a3b8";
                }
              }}
              maskColor="rgba(248,250,252,0.7)"
              position="bottom-right"
            />

            {/* Empty state */}
            {nodes.length === 0 && (
              <Panel position="top-center">
                <div className="mt-32 text-center pointer-events-none select-none">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--hb-cloud)] border border-[var(--hb-border)] mb-4">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <line x1="12" y1="8" x2="12" y2="16" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--hb-text-secondary)] mb-1">Design Your Workflow</h3>
                  <p className="text-sm text-[var(--hb-text-ghost)] max-w-xs">
                    Drag nodes from the palette on the left and connect them to build your integration channel.
                  </p>
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>

        {/* ---- Right sidebar: Config Panel ---- */}
        <div
          className={`
            border-l border-[var(--hb-border)] bg-[var(--hb-white)] overflow-y-auto flex-shrink-0 transition-all duration-300 ease-in-out
            ${selectedNode ? "w-80 opacity-100" : "w-0 opacity-0 overflow-hidden"}
          `}
        >
          {selectedNode && (
            <div className="p-4 w-80">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[9px] font-bold text-[var(--hb-text-ghost)] uppercase tracking-[0.2em] font-[family-name:var(--font-jetbrains)]">Node Config</h2>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-[var(--hb-text-ghost)] hover:text-[var(--hb-text-secondary)] transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>

              {/* Node info */}
              <div className="rounded-lg border border-[var(--hb-border)] bg-[var(--hb-snow)] p-3 mb-4">
                <div className="text-sm font-semibold text-[var(--hb-text-primary)] mb-0.5">{selectedNode.data.label as string}</div>
                <div className="text-xs text-[var(--hb-text-tertiary)]">{selectedNode.data.description as string}</div>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full font-[family-name:var(--font-jetbrains)] ${
                    selectedNode.type === "source"
                      ? "bg-blue-50 text-blue-600"
                      : selectedNode.type === "transform"
                      ? "bg-purple-50 text-purple-600"
                      : "bg-emerald-50 text-emerald-600"
                  }`}>
                    {selectedNode.type}
                  </span>
                  <span className="text-[10px] text-[var(--hb-text-ghost)] font-[family-name:var(--font-jetbrains)]">{selectedNode.id}</span>
                </div>
              </div>

              {/* Config fields */}
              <div className="space-y-3">
                {selectedFields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-[10px] font-bold text-[var(--hb-text-tertiary)] uppercase tracking-[0.15em] mb-1 font-[family-name:var(--font-jetbrains)]">{field.label}</label>
                    <input
                      type={field.type}
                      value={((selectedNode.data.config as Record<string, string>) || {})[field.key] || ""}
                      onChange={(e) => updateNodeConfig(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="hb-input w-full text-sm"
                    />
                  </div>
                ))}
              </div>

              {/* Delete button */}
              <button
                onClick={deleteSelectedNode}
                className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-[var(--hb-red)] bg-red-50 border border-red-200 hover:bg-red-100 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3,6 5,6 21,6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                Delete Node
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page wrapper with ReactFlowProvider
// ---------------------------------------------------------------------------
export default function ChannelDesignerPage() {
  return (
    <ReactFlowProvider>
      <DesignerFlow />
    </ReactFlowProvider>
  );
}
