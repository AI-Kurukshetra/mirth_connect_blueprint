import { NextRequest, NextResponse } from "next/server";
import { validateHL7 } from "@/lib/hl7/validator";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    let hl7Raw: string;

    try {
      const json = JSON.parse(body);
      hl7Raw = json.message || json.hl7 || json.raw || body;
    } catch {
      hl7Raw = body;
    }

    if (!hl7Raw || !hl7Raw.trim()) {
      return NextResponse.json(
        { error: "No HL7 message provided" },
        { status: 400 }
      );
    }

    const report = validateHL7(hl7Raw);

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Failed to validate HL7 message",
      },
      { status: 500 }
    );
  }
}
