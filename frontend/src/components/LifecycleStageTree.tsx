import type { LifecycleStageNode } from '@/types/cases';
import { formatDate } from '@/lib/format';

export default function LifecycleStageTree({ nodes, emptyMessage }: { nodes: LifecycleStageNode[]; emptyMessage?: string }) {
  if (nodes.length === 0) {
    return emptyMessage ? <p className="muted">{emptyMessage}</p> : null;
  }

  return (
    <ul className="tree">
      {nodes.map((node) => (
        <li key={node.id}>
          <span className="tree-stage">{node.status}</span>
          <span className="small muted"> · {formatDate(node.stageDate)}{node.source === 'Newswire detector' ? ' · from newswire' : ''}</span>
          {node.notes && <div className="small muted" style={{ whiteSpace: 'pre-line', maxWidth: '64ch' }}>{node.notes}</div>}
          {node.children.length > 0 && <LifecycleStageTree nodes={node.children} />}
        </li>
      ))}
    </ul>
  );
}
