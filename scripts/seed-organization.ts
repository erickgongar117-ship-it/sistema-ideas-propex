import { ensureOrganizationStructure } from "../src/lib/organization";
import { prisma } from "../src/lib/prisma";

async function main() {
  await ensureOrganizationStructure();
  const [plants, units, captureAreas] = await Promise.all([
    prisma.plant.count(),
    prisma.orgUnit.count(),
    prisma.orgUnit.count({ where: { qrEnabled: true, captureAreaId: { not: null } } })
  ]);
  console.log(`Estructura lista: ${plants} plantas, ${units} unidades, ${captureAreas} areas con QR.`);
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
