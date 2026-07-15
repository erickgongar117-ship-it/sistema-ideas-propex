import { PrismaClient } from "@prisma/client";
import { managerialEvaluationFactors } from "../src/lib/managerial-evaluation";

const prisma = new PrismaClient();

async function main() {
  for (const factor of managerialEvaluationFactors) {
    await prisma.pointRule.upsert({
      where: { id: factor.ruleId },
      update: { name: factor.ruleName, description: factor.description, points: factor.maxPoints },
      create: {
        id: factor.ruleId,
        name: factor.ruleName,
        description: factor.description,
        points: factor.maxPoints,
        active: true
      }
    });
  }
  console.log(`Reglas gerenciales listas: ${managerialEvaluationFactors.length}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
