import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { buildIdeasWorkbook } from "../src/lib/export";

async function main() {
  const workbook = await buildIdeasWorkbook();
  const date = new Date().toISOString().slice(0, 10);
  const outputDir = path.join(process.cwd(), "exports");
  const outputPath = path.join(outputDir, `Ideas_Mejora_PROpEx_${date}.xlsx`);
  await mkdir(outputDir, { recursive: true });
  const buffer = await workbook.xlsx.writeBuffer();
  await writeFile(outputPath, Buffer.from(buffer));
  console.log(`Exportacion generada: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
