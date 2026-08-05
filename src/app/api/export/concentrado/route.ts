import { requireUser } from "@/lib/auth";
import { buildConsolidatedWorkbook } from "@/lib/consolidated-export";

export async function GET() {
  await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const workbook = await buildConsolidatedWorkbook();
  const buffer = await workbook.xlsx.writeBuffer();
  const date = new Date().toISOString().slice(0, 10);

  return new Response(buffer, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Concentrado_Ejecutivo_PROpEx_${date}.xlsx"`
    }
  });
}
