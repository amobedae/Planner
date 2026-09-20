import { NotebookPen } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePlanner } from '../lib/PlannerContext';

type Props = {
  date: string;
};

export function NotesPanel({ date }: Props) {
  const { getNote, setNote } = usePlanner();
  const [value, setValue] = useState(getNote(date));

  useEffect(() => {
    setValue(getNote(date));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  return (
    <div className="rounded-2xl border border-line bg-paper-raised p-4">
      <div className="mb-2 flex items-center gap-2 text-ink-soft">
        <NotebookPen size={15} />
        <h3 className="text-sm font-semibold text-ink">Notes</h3>
      </div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => setNote(date, value)}
        placeholder="Capture thoughts, wins, or a line of gratitude for the day…"
        rows={5}
        className="w-full resize-none rounded-lg border border-line-soft bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand"
      />
    </div>
  );
}
