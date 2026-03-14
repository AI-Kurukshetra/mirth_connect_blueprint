import { NextRequest, NextResponse } from "next/server";
import { parseHL7, hl7ToJSON } from "@/lib/hl7/parser";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    let hl7Raw: string;

    // Accept both raw text and JSON with a "message" field
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

    const parsed = parseHL7(hl7Raw);
    const json = hl7ToJSON(parsed);

    return NextResponse.json({
      success: true,
      data: json,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Failed to parse HL7 message",
      },
      { status: 400 }
    );
  }
}
