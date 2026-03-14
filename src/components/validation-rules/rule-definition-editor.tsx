"use client";

import dynamic from "next/dynamic";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <div className="h-[320px] animate-pulse rounded-[28px] border border-line-strong bg-[linear-gradient(135deg,rgba(17,32,42,0.92),rgba(73,99,138,0.92))]" />,
});

export function RuleDefinitionEditor({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-line-strong bg-[linear-gradient(145deg,rgba(17,32,42,0.96),rgba(73,99,138,0.92))] shadow-[0_24px_70px_rgba(17,32,42,0.18)]">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-white/70">
        <span>Rule definition</span>
        <span>json</span>
      </div>
      <MonacoEditor
        height="320px"
        language="json"
        options={{
          automaticLayout: true,
          fontSize: 13,
          minimap: { enabled: false },
          padding: { top: 14 },
          scrollBeyondLastLine: false,
          tabSize: 2,
        }}
        theme="vs-dark"
        value={value}
        onChange={(nextValue) => onChange(nextValue ?? "")}
      />
    </div>
  );
}
