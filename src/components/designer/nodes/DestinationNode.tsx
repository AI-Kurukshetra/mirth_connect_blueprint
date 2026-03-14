"use client";

import { memo, type ReactNode } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

const iconMap: Record<string, ReactNode> = {
  database_destination: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5V19A9 3 0 0 0 21 19V5" />
      <path d="M3 12A9 3 0 0 0 21 12" />
    </svg>
  ),
  http_destination: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" x2="4" y1="22" y2="15" />
    </svg>
  ),
  fhir_repository: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
      <path d="M18 14h-8" />
      <path d="M15 18h-5" />
      <path d="M10 6h8v4h-8V6Z" />
    </svg>
  ),
};

function DestinationNode({ data, selected }: NodeProps) {
  const icon = iconMap[(data.subtype as string) || "database_destination"] || iconMap.database_destination;

  return (
    <div
      className={`
        min-w-[180px] rounded-lg shadow-lg border transition-all duration-200 bg-white
        ${selected ? "border-emerald-400 shadow-emerald-500/20 ring-2 ring-emerald-500/20" : "border-slate-200 hover:border-emerald-400/50"}
      `}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-white !left-[-6px] transition-all hover:!bg-emerald-400 hover:!scale-125"
      />

      {/* Color accent bar */}
      <div className="h-1.5 rounded-t-lg bg-gradient-to-r from-emerald-500 to-teal-400" />

      <div className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-emerald-50 text-emerald-500">
            {icon}
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-800">{data.label as string}</div>
            <div className="text-[10px] text-emerald-500/70 font-medium uppercase tracking-wider">Destination</div>
          </div>
        </div>
        {typeof data.description === "string" && data.description && (
          <div className="mt-2 text-xs text-slate-500 leading-relaxed">{data.description}</div>
        )}
      </div>
    </div>
  );
}

export default memo(DestinationNode);
