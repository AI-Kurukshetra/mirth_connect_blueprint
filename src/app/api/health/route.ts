export async function GET() {
  return Response.json({ ok: true, service: "medflow", at: new Date().toISOString() });
}

