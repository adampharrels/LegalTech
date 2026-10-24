/**
 * Pure logic for the case lifecycle stage tree: the fine-grained,
 * dated, branching procedural history of a case (Filed, Certified,
 * Trial, Judgment, Settled, Dismissed, Closed). Kept separate from
 * database access so it can be unit tested directly.
 */

export const LIFECYCLE_STAGE_TYPES = ['Filed', 'Certified', 'Trial', 'Judgment', 'Settled', 'Dismissed', 'Closed'] as const;
export type LifecycleStageType = typeof LIFECYCLE_STAGE_TYPES[number];

// Case.caseLifecycleStatus keeps its existing five-value vocabulary (used by
// filters, the dashboard, and the case list badge). Adding a stage to the
// tree mirrors that stage onto this coarser field so nothing that already
// depends on it needs to change.
const COARSE_STATUS_BY_STAGE: Record<LifecycleStageType, string> = {
  Filed: 'Active',
  Certified: 'Active',
  Trial: 'Active',
  Judgment: 'Active',
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

/**
 * Assemble a flat list of stage rows (as read from the database, any order)
 * into a tree. Root stages (parentId null, or pointing at a row that isn't
 * in this list) come back newest-created first; each node's children are
 * also newest-created first.
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

  const byNewestCreated = (a: LifecycleStageNode, b: LifecycleStageNode) => b.createdAt.getTime() - a.createdAt.getTime();
  const sortRecursively = (nodes: LifecycleStageNode[]) => {
    nodes.sort(byNewestCreated);
    for (const node of nodes) {
      sortRecursively(node.children);
    }
  };
  sortRecursively(roots);

  return roots;
}

/**
 * The stage that should be offered as the default parent for a new entry:
 * whichever stage was most recently created for the case, across all
 * branches. Returns null when the case has no stages yet.
 */
export function latestLifecycleStage(stages: LifecycleStageRecord[]): LifecycleStageRecord | null {
  if (stages.length === 0) {
    return null;
  }

  return stages.reduce((latest, stage) => (stage.createdAt.getTime() > latest.createdAt.getTime() ? stage : latest));
}
