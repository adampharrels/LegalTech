import type { LifecycleStageNode } from '@/types/cases';

export function formatStageDate(value: string) {
  return new Date(value).toLocaleDateString();
}

export default function LifecycleStageTree({
  nodes,
  emptyMessage,
  depth = 0,
}: {
  nodes: LifecycleStageNode[];
  emptyMessage?: string;
  depth?: number;
}) {
  if (nodes.length === 0) {
    return depth === 0 && emptyMessage ? (
      <p className="text-muted" style={{ fontSize: '0.875rem' }}>{emptyMessage}</p>
    ) : null;
  }

  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, paddingLeft: depth === 0 ? 0 : '1.25rem', borderLeft: depth === 0 ? 'none' : '1px solid var(--border-color)' }}>
      {nodes.map((node) => (
        <li key={node.id} style={{ marginTop: depth === 0 ? 0 : '0.75rem', marginBottom: '0.75rem' }}>
          <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
            <span style={{ width: '0.625rem', height: '0.625rem', borderRadius: '50%', background: 'var(--accent-primary)', display: 'inline-block' }} />
            <span style={{ fontWeight: 600 }}>{node.status}</span>
            <span className="text-muted" style={{ fontSize: '0.8125rem' }}>{formatStageDate(node.stageDate)}</span>
            {node.source === 'Newswire detector' && (
              <span style={{ padding: '0.1rem 0.4rem', background: 'rgba(148, 163, 184, 0.1)', color: 'var(--accent-primary)', borderRadius: 'var(--radius-sm)', fontSize: '0.7rem' }}>
                from newswire
              </span>
            )}
          </div>
          {node.notes && (
            <p className="text-muted" style={{ fontSize: '0.8125rem', marginTop: '0.25rem', marginLeft: '1.125rem', whiteSpace: 'pre-line' }}>
              {node.notes}
            </p>
          )}
          <LifecycleStageTree nodes={node.children} depth={depth + 1} />
        </li>
      ))}
    </ul>
  );
}
