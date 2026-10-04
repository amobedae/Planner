import type { View } from '../types';
import { NAV_ITEMS } from './Sidebar';

/** Phone-style tab bar, shown below the `lg` breakpoint. */
export function BottomNav({ view, onViewChange }: { view: View; onViewChange: (v: View) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper-raised/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
      <div className="mx-auto flex max-w-lg">
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onViewChange(key)}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${view === key ? 'text-brand' : 'text-ink-faint'}`}
            aria-current={view === key ? 'page' : undefined}
          >
            <Icon size={20} strokeWidth={view === key ? 2.4 : 1.8} />
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}
