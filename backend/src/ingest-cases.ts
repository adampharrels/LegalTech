/**
 * Case Ingestion CLI Tool
 * Fetches Australian legal signals from official sources and queues them for triage
 * Run: npx ts-node src/ingest-cases.ts
 */

import { CaseIngestor, convertToCandidateFormat, getMatchedKeywords, type CaseData } from './case-ingestor';
import { LLM_MODEL_NAME, LLM_PROMPT_VERSION, analyzeCaseWithLLM, type LLMAnalysisResult } from './llm-processor';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function hasSpecificCitation(citation: string | null | undefined) {
  return Boolean(citation && /\[\d{4}\]\s+[A-Z]+\s+\d+/i.test(citation));
}

function duplicateFiltersForCase(caseData: CaseData) {
  return [
    ...(hasSpecificCitation(caseData.citation) ? [{ neutralCitation: caseData.citation }] : []),
    ...(caseData.url ? [{ sources: { some: { url: caseData.url } } }] : []),
  ];
}

function duplicateFiltersForCandidate(caseData: CaseData) {
  return [
    ...(hasSpecificCitation(caseData.citation) ? [{ neutralCitation: caseData.citation }] : []),
    ...(caseData.url ? [{ sourceUrl: caseData.url }] : []),
  ];
}

function buildReviewerNotes(caseData: CaseData, llmResult: LLMAnalysisResult | null) {
  const matchedKeywords = getMatchedKeywords(caseData);
  const keywordNote = `Matched keywords: ${matchedKeywords.length ? matchedKeywords.join(', ') : 'none'}.`;

  if (!llmResult) {
    return [
      keywordNote,
      'Passed keyword filter. LLM screening was unavailable, so this candidate needs human relevance review.',
    ].join('\n');
  }

  return [
    keywordNote,
    `LLM screened by ${LLM_MODEL_NAME} (${LLM_PROMPT_VERSION}).`,
    `Suggested issues: ${llmResult.issues.length ? llmResult.issues.join(', ') : 'none'}.`,
    `Suggested tracking domains: ${llmResult.legalAreas.length ? llmResult.legalAreas.join(', ') : 'none'}.`,
    `Why it matters: ${llmResult.whyItMatters || caseData.summary || 'Not provided.'}`,
  ].join('\n');
}

async function main() {
  try {
    const ingestor = new CaseIngestor();
    const cases = await ingestor.fetchAllNewCases();

    if (cases.length === 0) {
      console.log('No new legal signals found. Official sources may be temporarily unavailable.');
      console.log('   Please try again later or review the source adapters.');
      return;
    }

    console.log(`\nScreening ${cases.length} legal signals for the triage queue...\n`);

    let queuedCount = 0;
    let skippedCount = 0;

    for (const caseData of cases) {
      try {
        const matchedKeywords = getMatchedKeywords(caseData);

        if (matchedKeywords.length === 0) {
          console.log(`   Skipped (Pass 1 - Keyword Filter): ${caseData.caseName}`);
          skippedCount++;
          continue;
        }

        console.log(`   Passed keyword filter, analysing with LLM: ${caseData.caseName}`);
        const llmResult = await analyzeCaseWithLLM(caseData);

        if (llmResult && !llmResult.isAiRelated) {
          console.log(`   Skipped (Pass 2 - LLM Filter): ${caseData.caseName}`);
          skippedCount++;
          continue;
        }

        const existingCaseFilters = duplicateFiltersForCase(caseData);
        const existingCase = existingCaseFilters.length > 0
          ? await prisma.case.findFirst({ where: { OR: existingCaseFilters } })
          : null;

        if (existingCase) {
          console.log(`   Already accepted as a case: ${caseData.caseName}`);
          skippedCount++;
          continue;
        }

        const existingCandidateFilters = duplicateFiltersForCandidate(caseData);
        const existingCandidate = existingCandidateFilters.length > 0
          ? await prisma.caseCandidate.findFirst({
            where: {
              candidateStatus: { notIn: ['Rejected'] },
              OR: existingCandidateFilters,
            },
          })
          : null;

        if (existingCandidate) {
          console.log(`   Already queued for triage: ${caseData.caseName}`);
          skippedCount++;
          continue;
        }

        const candidateHints = {
          aiRelevanceStatus: llmResult ? 'Relevant' : 'Unknown',
          materialityLevel: llmResult ? 'High' : 'Medium',
          matchedKeywords,
          llmScreeningStatus: llmResult ? 'Relevant' : 'Unavailable',
          llmScreeningReason: llmResult?.whyItMatters || 'LLM screening unavailable; queued after keyword match.',
          duplicateCheckResult: 'No accepted case or open candidate matched by citation or source URL.',
          fetchedAt: caseData.fetchedAt || new Date(),
          reviewerNotes: buildReviewerNotes(caseData, llmResult),
          ...(llmResult?.summaryShort ? { summaryShort: llmResult.summaryShort } : {}),
          ...(llmResult?.summaryLong ? { summaryLong: llmResult.summaryLong } : {}),
        };

        const candidateData = convertToCandidateFormat(caseData, candidateHints);

        await prisma.caseCandidate.create({ data: candidateData });

        console.log(`   Queued for triage: ${caseData.caseName}`);
        queuedCount++;
      } catch (error) {
        console.error(
          `   Error queueing candidate: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('Ingestion Complete:');
    console.log(`   New candidates queued: ${queuedCount}`);
    console.log(`   Signals skipped: ${skippedCount}`);
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
