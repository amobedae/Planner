import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useJarvis } from '../lib/jarvis/JarvisContext';
import { JarvisOrb } from './JarvisOrb';

export function Toasts() {
  const { toasts, dismissToast } = useJarvis();
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-line bg-paper-raised p-3 shadow-lift"
            role="status"
          >
            <JarvisOrb size={32} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">{t.title}</p>
              <p className="text-xs text-ink-soft">{t.body}</p>
            </div>
            <button onClick={() => dismissToast(t.id)} className="p-1 text-ink-faint hover:text-ink" aria-label="Dismiss">
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
