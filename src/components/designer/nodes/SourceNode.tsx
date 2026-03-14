"use client";

import { memo, type ReactNode } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

const iconMap: Record<string, ReactNode> = {
  hl7_listener: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
  http_source: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  file_source: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14,2 14,8 20,8" />
    </svg>
  ),
};

function SourceNode({ data, selected }: NodeProps) {
  const icon = iconMap[(data.subtype as string) || "hl7_listener"] || iconMap.hl7_listener;

  return (
    <div
      className={`
        min-w-[180px] rounded-lg shadow-lg border transition-all duration-200 bg-white
        ${selected ? "border-blue-400 shadow-blue-500/20 ring-2 ring-blue-500/20" : "border-slate-200 hover:border-blue-400/50"}
      `}
    >
      {/* Color accent bar */}
      <div className="h-1.5 rounded-t-lg bg-gradient-to-r from-blue-500 to-cyan-400" />

      <div className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-blue-50 text-blue-500">
            {icon}
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-800">{data.label as string}</div>
            <div className="text-[10px] text-blue-500/70 font-medium uppercase tracking-wider">Source</div>
          </div>
        </div>
        {typeof data.description === "string" && data.description && (
          <div className="mt-2 text-xs text-slate-500 leading-relaxed">{data.description}</div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white !right-[-6px] transition-all hover:!bg-blue-400 hover:!scale-125"
      />
    </div>
  );
}

export default memo(SourceNode);
