/**
 * Case Ingestion CLI Tool
 * Fetches real Australian court cases from official RSS feeds
 * Run: npx ts-node src/ingest-cases.ts
 */

import { CaseIngestor, convertToDBFormat } from './case-ingestor';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const ingestor = new CaseIngestor();
    const cases = await ingestor.fetchAllNewCases();

    if (cases.length === 0) {
      console.log('No new cases found. RSS feeds may be temporarily unavailable.');
      console.log('   Please try again later or contact the court services directly.');
      return;
    }

    console.log(`\nImporting ${cases.length} cases into database...\n`);

    let importedCount = 0;
    let skippedCount = 0;

    for (const caseData of cases) {
      try {
        const dbCase = convertToDBFormat(caseData);

        // Check if already exists
        const exists = await prisma.case.findUnique({
          where: { slug: dbCase.slug },
        });

        if (!exists) {
          await prisma.case.create({
            data: {
              slug: dbCase.slug,
              caseName: dbCase.caseName,
              neutralCitation: dbCase.neutralCitation,
              jurisdiction: dbCase.jurisdiction,
              country: dbCase.country,
              courtName: dbCase.courtName,
              courtLevel: dbCase.courtLevel,
              statusPublic: dbCase.statusPublic,
              statusInternal: dbCase.statusInternal,
              materialityScore: dbCase.materialityScore,
              filingDate: dbCase.filingDate,
              summaryShort: dbCase.summaryShort,
              summaryLong: dbCase.summaryLong,
              whyItMatters: dbCase.whyItMatters,
              isAiRelated: dbCase.isAiRelated,
            },
          });

          console.log(`   Imported: ${dbCase.caseName}`);
          importedCount++;
        } else {
          console.log(`   Already in database: ${dbCase.caseName}`);
          skippedCount++;
        }
      } catch (error) {
        console.error(
          `   Error importing case: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('Import Complete:');
    console.log(`   New cases imported: ${importedCount}`);
    console.log(`   Cases skipped (already in DB): ${skippedCount}`);
    console.log(`   Total processed: ${cases.length}`);
    console.log('='.repeat(60) + '\n');
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
