"use client";

import { memo, type ReactNode } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

const iconMap: Record<string, ReactNode> = {
  fhir_converter: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  ),
  transform: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
      <path d="m8 15-4-4 4-4" />
      <path d="m16 17 4-4-4-4" />
    </svg>
  ),
  filter: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46" />
    </svg>
  ),
};

function TransformNode({ data, selected }: NodeProps) {
  const icon = iconMap[(data.subtype as string) || "transform"] || iconMap.transform;

  return (
    <div
      className={`
        min-w-[180px] rounded-lg shadow-lg border transition-all duration-200 bg-white
        ${selected ? "border-purple-400 shadow-purple-500/20 ring-2 ring-purple-500/20" : "border-slate-200 hover:border-purple-400/50"}
      `}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-white !left-[-6px] transition-all hover:!bg-purple-400 hover:!scale-125"
      />

      {/* Color accent bar */}
      <div className="h-1.5 rounded-t-lg bg-gradient-to-r from-purple-500 to-pink-400" />

      <div className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-purple-50 text-purple-500">
            {icon}
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-800">{data.label as string}</div>
            <div className="text-[10px] text-purple-500/70 font-medium uppercase tracking-wider">Transform</div>
          </div>
        </div>
        {typeof data.description === "string" && data.description && (
          <div className="mt-2 text-xs text-slate-500 leading-relaxed">{data.description}</div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-white !right-[-6px] transition-all hover:!bg-purple-400 hover:!scale-125"
      />
    </div>
  );
}

export default memo(TransformNode);
