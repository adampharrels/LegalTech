import { getCheckOptions } from '@/actions/check';
import CheckForm from '@/components/CheckForm';
import { formatDate } from '@/lib/format';

export default async function CheckPage() {
  const options = await getCheckOptions();

  return (
    <>
      <div className="page-head">
        <h1>Check a draft</h1>
        <p className="lede">Before you file, find citations an AI may have invented: cases that don&apos;t exist, wrong pinpoints, misquotes and overturned decisions.</p>
      </div>

      {options.dataset ? (
        <p className="small muted no-print">
          Checked against {options.dataset.decisions.toLocaleString('en-AU')} Federal Court, High Court and NSW decisions, and Commonwealth, NSW, Qld, WA, SA and Tas legislation, up to {formatDate(options.dataset.cutoffDate)}.
          From the <a href="https://huggingface.co/datasets/isaacus/open-australian-legal-corpus" target="_blank" rel="noopener noreferrer">Open Australian Legal Corpus</a> (Isaacus, CC BY 4.0).
        </p>
      ) : (
        <p className="notice">The citation index isn&apos;t installed yet. In <code>backend</code>, run <code>npm run corpus:download</code>.</p>
      )}

      <CheckForm options={options} />
    </>
  );
}
