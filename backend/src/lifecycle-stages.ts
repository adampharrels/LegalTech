/**
 * Pure logic for the case lifecycle stage tree: the fine-grained,
 * dated, branching procedural history of a case (Filed, Certified,
 * Trial, Judgment, Appeal, Settlement failed, Settled, Dismissed, Closed).
 * Kept separate from database access so it can be unit tested directly.
 */

// Keep in sync with LIFECYCLE_STAGE_TYPES in frontend/src/types/cases.ts.
export const LIFECYCLE_STAGE_TYPES = [
  'Filed',
  'Certified',
  'Trial',
  'Judgment',
  'Appeal',
  'Settlement failed',
  'Settled',
  'Dismissed',
  'Closed',
] as const;
export type LifecycleStageType = typeof LIFECYCLE_STAGE_TYPES[number];

// Case.caseLifecycleStatus keeps its existing five-value vocabulary (used by
// filters, the dashboard, and the case list badge). The latest-dated stage in
// the tree is mirrored onto this coarser field so nothing that already
// depends on it needs to change. A settlement that falls through sends the
// case back to active litigation, so it maps to Active rather than Dismissed.
const COARSE_STATUS_BY_STAGE: Record<LifecycleStageType, string> = {
  Filed: 'Active',
  Certified: 'Active',
  Trial: 'Active',
  Judgment: 'Active',
  Appeal: 'Active',
  'Settlement failed': 'Active',
  Settled: 'Settled',
  Dismissed: 'Dismissed',
  Closed: 'Closed',
};

export function isLifecycleStageType(value: unknown): value is LifecycleStageType {
  return typeof value === 'string' && (LIFECYCLE_STAGE_TYPES as readonly string[]).includes(value);
}

export function coarseStatusForStage(stage: LifecycleStageType): string {
  return COARSE_STATUS_BY_STAGE[stage];
}

export interface LifecycleStageRecord {
  id: string;
  parentId: string | null;
  status: string;
  stageDate: Date;
  notes: string | null;
  source: string;
  createdAt: Date;
}

export interface LifecycleStageNode extends LifecycleStageRecord {
  children: LifecycleStageNode[];
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Stage dates are compared by local calendar day. A manual stage comes from a
// date-only input (local midnight), while a newswire stage carries the
// article's full timestamp, so comparing raw timestamps would put a stage
// entered by hand on the same day "before" the newswire stage it follows.
// Local rather than UTC, because an Australian morning is the previous UTC day.
function stageDay(date: Date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / MS_PER_DAY;
}

/**
 * Parse a stage date from a request. A date-only "YYYY-MM-DD" (from a date
 * input) is local midnight, matching how stage days are compared; anything
 * else is parsed as given.
 */
export function parseStageDate(value: string) {
  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return dateOnly ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3])) : new Date(value);
}

/** Whether a stage dated `date` would be on an earlier day than `than`. */
export function isEarlierStageDay(date: Date, than: Date) {
  return stageDay(date) < stageDay(than);
}

// Stages are ordered by the day they happened, not the date they were
// entered, so back-filling an older stage doesn't make it look like the
// newest one. Same-day stages fall back to entry order.
function compareChronologically(a: LifecycleStageRecord, b: LifecycleStageRecord) {
  return stageDay(a.stageDate) - stageDay(b.stageDate) || a.createdAt.getTime() - b.createdAt.getTime();
}

/**
 * Assemble a flat list of stage rows (as read from the database, any order)
 * into a tree. Root stages (parentId null, or pointing at a row that isn't
 * in this list) come back newest first; each node's children are also
 * newest first, by stage date.
 */
export function buildLifecycleStageTree(stages: LifecycleStageRecord[]): LifecycleStageNode[] {
  const nodesById = new Map<string, LifecycleStageNode>();
  for (const stage of stages) {
    nodesById.set(stage.id, { ...stage, children: [] });
  }

  const roots: LifecycleStageNode[] = [];
  for (const stage of stages) {
    const node = nodesById.get(stage.id)!;
    const parent = stage.parentId ? nodesById.get(stage.parentId) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const newestFirst = (a: LifecycleStageNode, b: LifecycleStageNode) => compareChronologically(b, a);
  const sortRecursively = (nodes: LifecycleStageNode[]) => {
    nodes.sort(newestFirst);
    for (const node of nodes) {
      sortRecursively(node.children);
    }
  };
  sortRecursively(roots);

  return roots;
}

/**
 * The most recent stage by stage date, across all branches. This is the
 * stage mirrored onto Case.caseLifecycleStatus and offered as the default
 * parent for a new entry. Pass onOrBefore to find the latest stage a new
 * stage with that date can attach to without its parent post-dating it.
 * Returns null when there is no such stage.
 */
export function latestLifecycleStage(stages: LifecycleStageRecord[], onOrBefore?: Date): LifecycleStageRecord | null {
  const candidates = onOrBefore
    ? stages.filter((stage) => !isEarlierStageDay(onOrBefore, stage.stageDate))
    : stages;

  if (candidates.length === 0) {
    return null;
  }

  return candidates.reduce((latest, stage) => (compareChronologically(stage, latest) > 0 ? stage : latest));
}

/**
 * The coarse Case.caseLifecycleStatus implied by a case's stages, or null
 * when the case has no stages (leave the existing status alone).
 */
export function coarseStatusForStages(stages: LifecycleStageRecord[]): string | null {
  const latest = latestLifecycleStage(stages);
  return latest && isLifecycleStageType(latest.status) ? coarseStatusForStage(latest.status) : null;
}
