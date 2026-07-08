import { prisma } from "../src/lib/prisma";
import { markOverdueIdeas } from "../src/lib/workflow";

async function main() {
  const count = await markOverdueIdeas();
  console.log(`Recordatorios procesados. Ideas vencidas actualizadas: ${count}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
