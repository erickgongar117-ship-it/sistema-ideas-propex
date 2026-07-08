import QRCode from "qrcode";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { appBaseUrl } from "@/lib/url";

type QrContext = {
  params: Promise<{ code: string }>;
};

export async function GET(request: NextRequest, context: QrContext) {
  const { code } = await context.params;
  const area = await prisma.area.findFirst({ where: { code: code.toUpperCase(), active: true } });
  if (!area) {
    return new Response("Area no encontrada", { status: 404 });
  }

  const url = `${appBaseUrl()}/captura/${area.code}`;
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
      "Cache-Control": "public, max-age=3600",
      ...(download ? { "Content-Disposition": `attachment; filename="QR-${area.code}.png"` } : {})
    }
  });
}
