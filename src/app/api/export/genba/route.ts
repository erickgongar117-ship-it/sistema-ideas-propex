import { requireGenbaAccess } from "@/lib/module-access";
import { buildGenbaWorkbook } from "@/lib/portfolio-export";

export async function GET() {
  const { user, canManage } = await requireGenbaAccess();
  const workbook = await buildGenbaWorkbook(canManage ? {} : {
    OR: [{ coordinatorId: user.id }, { activities: { some: { ownerId: user.id } } }]
  });
  const buffer = await workbook.xlsx.writeBuffer();
  const date = new Date().toISOString().slice(0, 10);
  return new Response(buffer, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="Concentrado_GENBA_PROpEx_${date}.xlsx"` } });
}
