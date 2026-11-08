/*
 * What each court requires of AI use, by document type, for the checklist
 * shown with a citation check. Paraphrased from each practice note with its
 * paragraph numbers; the checklist always links to the note itself.
 */

export const DOCUMENT_TYPES = {
  submissions: 'Written submissions',
  affidavit: 'Affidavit, witness statement or character reference',
  expert: 'Expert report',
  other: 'Other document',
} as const;

export type DocumentType = keyof typeof DOCUMENT_TYPES;

export interface CourtRules {
  court: string;
  note: string;
  url: string;
  since: string;
  /** Where the summary comes from, when it isn't the note itself. */
  basis?: string;
  rules: { appliesTo: DocumentType[] | 'all'; text: string }[];
}

export const COURT_RULES: CourtRules[] = [
  {
    court: 'Federal Court of Australia',
    note: 'Generative AI Practice Note (GPN-AI)',
    url: 'https://www.fedcourt.gov.au/law-and-practice/practice-documents/practice-notes/gpn-ai',
    since: '16 Apr 2026',
    basis: 'Summarised from law firm commentary on the note; read the note before relying on it.',
    rules: [
      { appliesTo: 'all', text: 'Whoever prepared a court document must first confirm it is reliable and accurate. False or misleading material is unacceptable, whether a person or AI produced it.' },
      { appliesTo: 'all', text: 'Only enter privileged, confidential or suppressed information into Gen AI in ways consistent with the orders, undertakings and duties that protect it.' },
      { appliesTo: ['submissions', 'other'], text: 'The responsible lawyer must personally verify that each authority exists and supports the proposition it is cited for.' },
      { appliesTo: ['affidavit', 'expert'], text: 'If AI was used to summarise, analyse or generate material informing the evidence or opinion, disclose at the start of the document where and how.' },
      { appliesTo: ['expert'], text: "The report must reflect the expert's own reasoning and opinions." },
    ],
  },
  {
    court: 'Supreme Court of NSW',
    note: 'Practice Note SC Gen 23',
    url: 'https://supremecourt.nsw.gov.au/documents/Practice-and-Procedure/Practice-Notes/general/current/PN_SC_Gen_23.pdf',
    since: '3 Feb 2025',
    rules: [
      { appliesTo: 'all', text: "Don't put suppressed material, Harman-protected or subpoenaed material, or material under a statutory publication ban into a Gen AI tool unless it stays within a controlled environment, is used only for this proceeding and isn't used for training. [9A]" },
      { appliesTo: ['submissions'], text: 'If Gen AI was used, verify in the body of the submissions that every citation, authority and legislative reference exists, is accurate and is relevant, and do the same for references to evidence. [16]' },
      { appliesTo: ['submissions'], text: "That verification must not be done solely with a Gen AI tool. This checker doesn't use Gen AI, but you still need to read the authorities. [17]" },
      { appliesTo: ['affidavit'], text: "Gen AI must not be used to generate the content, or to alter, embellish, strengthen, dilute or rephrase the witness's evidence. Preparatory work is allowed. [10]–[12]" },
      { appliesTo: ['affidavit'], text: "Include a disclosure that Gen AI was not used to generate the content, or any annexure or exhibit the deponent prepared for the proceedings. The note doesn't prescribe wording. [13]–[14]" },
      { appliesTo: ['affidavit'], text: 'Using Gen AI for an annexure or exhibit needs leave, given only in exceptional cases. [15]' },
      { appliesTo: ['expert'], text: 'Gen AI must not be used to draft or prepare any part of an expert report without prior leave. [20]–[21]' },
      { appliesTo: ['expert'], text: 'With leave, the report must say which parts used Gen AI and which program and version, and annex a record of how it was used, such as the prompts. [22]' },
      { appliesTo: ['expert'], text: "Draw these requirements to the expert's attention when instructing them. [24]" },
    ],
  },
];

export function checklistFor(court: string, documentType: DocumentType) {
  const rules = COURT_RULES.find((r) => r.court === court);
  return rules && { ...rules, rules: rules.rules.filter((r) => r.appliesTo === 'all' || r.appliesTo.includes(documentType)).map((r) => r.text) };
}
