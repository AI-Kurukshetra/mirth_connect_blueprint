import { Card } from "@/components/ui/card";

export default function ChannelDesignerLoading() {
  return (
    <div className="space-y-6">
      <Card className="p-6 sm:p-8">
        <div className="space-y-4">
          <div className="h-6 w-32 rounded-full bg-[rgba(17,32,42,0.08)] page-loader-shimmer" />
          <div className="h-14 w-full max-w-xl rounded-[24px] bg-[rgba(17,32,42,0.08)] page-loader-shimmer" />
          <div className="h-5 w-full max-w-3xl rounded-full bg-[rgba(17,32,42,0.08)] page-loader-shimmer" />
        </div>
      </Card>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_420px]">
        <Card className="min-h-[920px] bg-[rgba(255,252,246,0.76)] page-loader-shimmer" />
        <Card className="min-h-[920px] bg-[rgba(255,252,246,0.76)] page-loader-shimmer" />
      </div>
    </div>
  );
}
