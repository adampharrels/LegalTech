'use client';

import { useActionState } from 'react';
import { checkDraft } from '@/actions/check';
import { formatDate } from '@/lib/format';
import type { CheckOptions, CheckState, CitationResult, Level } from '@/types/check';

const LEVEL_LABELS: Record<Level, string> = { error: 'Problem', warning: 'Check', unknown: 'Unverified', ok: 'Found' };
const SUMMARY: Record<Level, (n: number) => string> = {
  error: (n) => `${n} problem${n === 1 ? '' : 's'}`,
  warning: (n) => `${n} to check`,
  unknown: (n) => `${n} unverified`,
  ok: (n) => `${n} found`,
};

function Result({ result }: { result: CitationResult }) {
  return (
    <li className="check-item">
      <div className="check-level">{LEVEL_LABELS[result.level]}</div>
      <div>
        <div className="check-citation">{result.written}</div>
        <ul className="check-findings">
          {result.findings.map((f) => <li key={f.message}>{f.message}</li>)}
        </ul>
        {result.source && (
          <p className="small"><a href={result.source.url} target="_blank" rel="noopener noreferrer">{result.source.title}</a></p>
        )}
        {result.paragraphs.map((p) => (
          <details key={p.number}>
            <summary>Paragraph [{p.number}]</summary>
            <blockquote className="check-paragraph">{p.text}</blockquote>
          </details>
        ))}
      </div>
    </li>
  );
}

function Report({ report, documentTypes }: { report: NonNullable<CheckState['report']>; documentTypes: Record<string, string> }) {
  const flagged = report.results.filter((r) => r.level !== 'ok');
  const found = report.results.filter((r) => r.level === 'ok');
  const summary = (['error', 'warning', 'unknown', 'ok'] as Level[])
    .filter((level) => report.counts[level] > 0)
    .map((level) => SUMMARY[level](report.counts[level]))
    .join(' · ');

  const print = () => {
    document.querySelectorAll('details').forEach((d) => { d.open = true; });
    window.print();
  };

  return (
    <section className="check-report">
      <div className="check-report-head">
        <div>
          <h2 className="title">{report.results.length === 0 ? 'No citations found' : summary}</h2>
          <p className="muted small">
            {[report.documentName, report.court, documentTypes[report.documentType]].filter(Boolean).join(' · ')}
            {' · '}checked {formatDate(report.checkedAt)} at {new Date(report.checkedAt).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })}
            {' · '}dataset up to {formatDate(report.cutoffDate)}
          </p>
        </div>
        <button type="button" className="btn-quiet no-print" onClick={print}>Print or save as PDF</button>
      </div>

      {flagged.length > 0 && <ol className="check-list">{flagged.map((r, i) => <Result key={i} result={r} />)}</ol>}
      {found.length > 0 && (
        <details open={flagged.length === 0}>
          <summary>{found.length} found and checked</summary>
          <ol className="check-list">{found.map((r, i) => <Result key={i} result={r} />)}</ol>
        </details>
      )}

      {report.checklist && (
        <>
          <h2 className="label">Before you file: {report.checklist.court}</h2>
          <p className="small muted">
            <a href={report.checklist.url} target="_blank" rel="noopener noreferrer">{report.checklist.note}</a>, since {report.checklist.since}.
            {report.checklist.basis && ` ${report.checklist.basis}`}
          </p>
          <ul className="checklist">
            {report.checklist.rules.map((rule) => (
              <li key={rule}><label><input type="checkbox" /> <span>{rule}</span></label></li>
            ))}
          </ul>
        </>
      )}

      <p className="small muted">
        This checks that authorities exist and match what the draft says. It can&apos;t tell you whether a case supports your argument: read the authorities before you file.
      </p>
    </section>
  );
}

export default function CheckForm({ options }: { options: CheckOptions }) {
  const [state, action, pending] = useActionState(checkDraft, {});

  return (
    <>
      {/* React resets a form after its action runs, so re-create it with the values just checked. */}
      <form action={action} className="check-form no-print" key={state.report?.checkedAt ?? state.error}>
        <div className="form-grid">
          <label className="field">
            <span>Court</span>
            <select name="court" defaultValue={state.court ?? ''}>
              <option value="">Other or not sure</option>
              {options.courts.map((court) => <option key={court}>{court}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Document</span>
            <select name="documentType" defaultValue={state.documentType ?? 'submissions'}>
              {Object.entries(options.documentTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>
        <label className="field">
          <span>Draft</span>
          <textarea name="text" rows={12} defaultValue={state.text} placeholder="Paste your draft here…" />
        </label>
        <label className="field">
          <span>Or upload a file</span>
          <input type="file" name="file" accept=".docx,.pdf,.txt" />
        </label>
        <div className="actions">
          <button type="submit" className="btn" disabled={pending}>{pending ? 'Checking…' : 'Check citations'}</button>
          <span className="small muted">Checked on this computer. Your draft isn&apos;t stored or sent anywhere, and no AI is used.</span>
        </div>
        {state.error && <p className="notice">{state.error}</p>}
      </form>

      {state.report && <Report report={state.report} documentTypes={options.documentTypes} />}
    </>
  );
}
