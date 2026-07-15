import { buildIdeasWorkbook } from "@/lib/export";
import { requireUser } from "@/lib/auth";

export async function GET() {
  await requireUser(["ADMIN", "MEJORA_CONTINUA"]);
  const workbook = await buildIdeasWorkbook();
  const buffer = await workbook.xlsx.writeBuffer();
  const date = new Date().toISOString().slice(0, 10);

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Ideas_Mejora_PROpEx_${date}.xlsx"`
    }
  });
}
