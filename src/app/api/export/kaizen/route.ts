import { requireKaizenAccess } from "@/lib/module-access";
import { buildKaizenWorkbook } from "@/lib/portfolio-export";

export async function GET() {
  await requireKaizenAccess();
  const workbook = await buildKaizenWorkbook();
  const buffer = await workbook.xlsx.writeBuffer();
  const date = new Date().toISOString().slice(0, 10);
  return new Response(buffer, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="Concentrado_Kaizen_PROpEx_${date}.xlsx"` } });
}
