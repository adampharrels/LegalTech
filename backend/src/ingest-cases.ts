/**
 * Case Ingestion CLI Tool
 * Fetches Australian legal signals from official sources and queues them for triage
 * Run: npx ts-node src/ingest-cases.ts
 */

import { CaseIngestor, convertToCandidateFormat, getMatchedKeywords, type CaseData } from './case-ingestor';
import { LLM_MODEL_NAME, LLM_RELEVANCE_PROMPT_VERSION, classifyCaseRelevanceWithLLM, type LLMRelevanceResult } from './llm-processor';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
type ScreeningMethod = 'llm' | 'heuristic';

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

function heuristicRelevance(caseData: CaseData, matchedKeywords: string[]): LLMRelevanceResult {
  const hasStrongMatch = matchedKeywords.length > 0;

  return {
    aiRelevant: hasStrongMatch,
    confidence: hasStrongMatch ? 0.72 : 0.65,
    reason: hasStrongMatch
      ? `Keyword evidence suggests possible AI relevance: ${matchedKeywords.join(', ')}.`
      : 'No AI keyword evidence detected and LLM classification was unavailable.',
    aiRole: hasStrongMatch ? 'OTHER_AI' : 'NOT_AI',
  };
}

function buildReviewerNotes(
  caseData: CaseData,
  relevance: LLMRelevanceResult,
  matchedKeywords: string[],
  screeningMethod: ScreeningMethod
) {
  const keywordNote = `Matched keywords: ${matchedKeywords.length ? matchedKeywords.join(', ') : 'none'}.`;
  const screeningNote = screeningMethod === 'llm'
    ? `Relevance screened by ${LLM_MODEL_NAME} (${LLM_RELEVANCE_PROMPT_VERSION}).`
    : 'Relevance screened by heuristic fallback; LLM classification was unavailable.';

  return [
    keywordNote,
    screeningNote,
    `AI relevant: ${relevance.aiRelevant ? 'yes' : 'no'} (${Math.round(relevance.confidence * 100)}%).`,
    `AI role: ${relevance.aiRole}.`,
    `Reason: ${relevance.reason || caseData.summary || 'Not provided.'}`,
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
    let archivedCount = 0;
    let skippedCount = 0;

    for (const caseData of cases) {
      try {
        const matchedKeywords = getMatchedKeywords(caseData);

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
              OR: existingCandidateFilters,
            },
          })
          : null;

        if (existingCandidate) {
          console.log(`   Already seen as a candidate (${existingCandidate.candidateStatus}): ${caseData.caseName}`);
          skippedCount++;
          continue;
        }

        console.log(`   Classifying AI relevance: ${caseData.caseName}`);
        const llmRelevance = await classifyCaseRelevanceWithLLM(caseData);
        const relevance = llmRelevance || heuristicRelevance(caseData, matchedKeywords);
        const screeningMethod: ScreeningMethod = llmRelevance ? 'llm' : 'heuristic';
        const classifierStatus = llmRelevance
          ? (relevance.aiRelevant ? 'Relevant' : 'Not relevant')
          : (matchedKeywords.length > 0 ? 'Heuristic review needed' : 'Heuristic archived');

        const candidateHints = {
          aiRelevanceStatus: relevance.aiRelevant ? 'Relevant' : 'Not relevant',
          materialityLevel: relevance.aiRelevant && relevance.confidence >= 0.8 ? 'High' : relevance.aiRelevant ? 'Medium' : 'Low',
          matchedKeywords,
          llmScreeningStatus: classifierStatus,
          llmScreeningReason: relevance.reason,
          aiRelevant: relevance.aiRelevant,
          relevanceScore: relevance.confidence,
          relevanceReason: relevance.reason,
          aiRole: relevance.aiRole,
          duplicateCheckResult: 'No accepted case or prior candidate matched by citation or source URL.',
          fetchedAt: caseData.fetchedAt || new Date(),
          reviewerNotes: buildReviewerNotes(caseData, relevance, matchedKeywords, screeningMethod),
        };

        const candidateData = convertToCandidateFormat(caseData, candidateHints);

        await prisma.caseCandidate.create({
          data: {
            ...candidateData,
            candidateStatus: relevance.aiRelevant ? 'Needs human triage' : 'Archived',
            rejectionReason: relevance.aiRelevant ? null : 'Not AI-related',
            reviewedAt: relevance.aiRelevant ? null : new Date(),
          },
        });

        if (relevance.aiRelevant) {
          console.log(`   Queued for triage: ${caseData.caseName}`);
          queuedCount++;
        } else {
          console.log(`   Archived non-AI candidate: ${caseData.caseName}`);
          archivedCount++;
        }
      } catch (error) {
        console.error(
          `   Error queueing candidate: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('Ingestion Complete:');
    console.log(`   New candidates queued: ${queuedCount}`);
    console.log(`   Non-AI candidates archived: ${archivedCount}`);
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
