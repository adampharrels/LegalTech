import { formatDateParts } from '@/lib/format';

export default function EntryDate({ value }: { value: string | null | undefined }) {
  const parts = formatDateParts(value);
  return (
    <div className="entry-date">
      {parts ? <>{parts[0]}<br />{parts[1]}</> : 'Undated'}
    </div>
  );
}
