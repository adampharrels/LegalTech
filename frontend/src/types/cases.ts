export type Issue = {
  id: string;
  name: string;
  slug: string;
};

export type LegalArea = {
  id: string;
  name: string;
  slug: string;
};

export type CaseIssue = {
  caseId: string;
  issueId: string;
  issue: Issue;
};

export type CaseLegalArea = {
  caseId: string;
  legalAreaId: string;
  legalArea: LegalArea;
};

export type CaseSummary = {
  id: string;
  slug: string;
  caseName: string;
  jurisdiction: string;
  country: string;
  courtName: string;
  courtLevel: string;
  statusPublic: string;
  statusInternal: string;
  materialityScore: string;
  filingDate: string | null;
  decisionDate?: string | null;
  summaryShort: string;
  summaryLong?: string | null;
  whyItMatters?: string | null;
  docketNumber?: string | null;
  issues: CaseIssue[];
  legalAreas: CaseLegalArea[];
};

export type CaseEvent = {
  id: string;
  eventDate: string;
  eventType: string;
  title: string;
  description: string | null;
};

export type CaseSource = {
  id: string;
  sourceType: string;
  title: string;
  url: string;
  publisher: string | null;
  publishedAt: string | null;
  isPrimary: boolean;
  notes: string | null;
};

export type RelatedCaseLink = {
  id: string;
  relationshipType: string;
  relatedCase: CaseSummary;
};

export type RelatedFromCaseLink = {
  id: string;
  relationshipType: string;
  case: CaseSummary;
};

export type CaseDetail = CaseSummary & {
  neutralCitation?: string | null;
  outcome?: string | null;
  isAiRelated: boolean;
  createdAt: string;
  lastUpdated: string;
  events: CaseEvent[];
  sources: CaseSource[];
  relatedTo: RelatedCaseLink[];
  relatedFrom: RelatedFromCaseLink[];
};
