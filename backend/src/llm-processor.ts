import { GoogleGenAI, Type, Schema } from '@google/genai';
import { CaseData } from './case-ingestor';
import dotenv from 'dotenv';

dotenv.config();

const ai = new GoogleGenAI(process.env.GEMINI_API_KEY ? { apiKey: process.env.GEMINI_API_KEY } : {});

export interface LLMAnalysisResult {
  isAiRelated: boolean;
  summaryShort: string;
  summaryLong: string;
  whyItMatters: string;
  issues: string[];
  legalAreas: string[];
}

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    isAiRelated: {
      type: Type.BOOLEAN,
      description: "True if the case materially involves Artificial Intelligence, machine learning, algorithms, or automated decision-making.",
    },
    summaryShort: {
      type: Type.STRING,
      description: "A 1-2 sentence summary of the case and its relevance to AI.",
    },
    summaryLong: {
      type: Type.STRING,
      description: "A detailed 1-2 paragraph summary of the case facts, issues, and AI relevance.",
    },
    whyItMatters: {
      type: Type.STRING,
      description: "A short explanation of why this case is important for AI law and policy.",
    },
    issues: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "An array of issue slugs from the taxonomy (e.g., 'copyright-training-data', 'privacy-data-protection', 'defamation', 'employment-hiring', 'discrimination-bias', 'consumer-protection', 'product-liability', 'deepfakes-impersonation', 'fraud-deception', 'hallucinated-citations-false-authorities', 'automated-decision-making', 'platform-content-moderation', 'contract-licensing', 'competition-antitrust', 'evidence-admissibility-of-ai-output'). Use only the exact slugs that apply.",
    },
    legalAreas: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "An array of legal area slugs from the taxonomy (e.g., 'intellectual-property', 'privacy-law', 'employment-law', 'consumer-law', 'tort', 'contract', 'administrative-law', 'anti-discrimination-law', 'procedural-law-legal-ethics', 'constitutional-public-law'). Use only the exact slugs that apply.",
    },
  },
  required: ["isAiRelated", "summaryShort", "summaryLong", "whyItMatters", "issues", "legalAreas"],
};

export async function analyzeCaseWithLLM(caseData: CaseData): Promise<LLMAnalysisResult | null> {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY is not set. Skipping LLM analysis.');
    return null;
  }

  try {
    const prompt = `
You are an expert legal analyst specializing in Artificial Intelligence law.
Analyse the following court case data and determine its relevance to AI.
Extract structured summaries and tag it according to the provided taxonomy.

Case Name: ${caseData.caseName}
Citation: ${caseData.citation}
Court: ${caseData.court}
Summary/Snippet: ${caseData.summary || 'N/A'}
Full Text: ${caseData.fullText || 'N/A'}
    `.trim();

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
        temperature: 0.1,
      }
    });

    if (response.text) {
      const result = JSON.parse(response.text) as LLMAnalysisResult;
      return result;
    }
    return null;
  } catch (error) {
    console.error('LLM Analysis failed:', error instanceof Error ? error.message : String(error));
    return null;
  }
}
