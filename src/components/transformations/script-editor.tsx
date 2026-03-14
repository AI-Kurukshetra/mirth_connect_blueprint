"use client";

import dynamic from "next/dynamic";

import type { TransformationLanguage } from "@/types/database";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <div className="h-[360px] animate-pulse rounded-[28px] border border-line-strong bg-[linear-gradient(135deg,rgba(17,32,42,0.92),rgba(0,116,122,0.94))]" />,
});

const languageMap: Record<TransformationLanguage, string> = {
  javascript: "javascript",
  xslt: "xml",
  groovy: "groovy",
  python: "python",
};

export function ScriptEditor({
  language,
  onChange,
  value,
}: {
  language: TransformationLanguage;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-line-strong bg-[linear-gradient(145deg,rgba(17,32,42,0.96),rgba(0,116,122,0.92))] shadow-[0_24px_70px_rgba(17,32,42,0.18)]">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-white/70">
        <span>Transformation script</span>
        <span>{language}</span>
      </div>
      <MonacoEditor
        height="360px"
        language={languageMap[language]}
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
