import QRCode from "qrcode";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { baseUrlFromRequest } from "@/lib/url";

type QrContext = {
  params: Promise<{ code: string }>;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest, context: QrContext) {
  const { code } = await context.params;
  const area = await prisma.area.findFirst({ where: { code: code.toUpperCase(), active: true } });
  if (!area) {
    return new Response("Area no encontrada", { status: 404 });
  }

  const url = `${baseUrlFromRequest(request.nextUrl.origin)}/captura/${area.code}`;
  const buffer = await QRCode.toBuffer(url, {
    type: "png",
    width: 900,
    margin: 2,
    color: {
      dark: "#17202a",
      light: "#ffffff"
    }
  });
  const download = request.nextUrl.searchParams.get("download");

  return new Response(new Blob([new Uint8Array(buffer)]), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store, max-age=0, must-revalidate",
      "CDN-Cache-Control": "no-store",
      "Vercel-CDN-Cache-Control": "no-store",
      "X-QR-Target": url,
      ...(download ? { "Content-Disposition": `attachment; filename="QR-${area.code}.png"` } : {})
    }
  });
}
