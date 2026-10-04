import { Bell, Download, ExternalLink, KeyRound, Moon, Sun, Upload, User, Volume2 } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { canSpeak, speak } from '../lib/jarvis/speech';
import { usePlanner } from '../lib/PlannerContext';
import { isNative, notificationPermission, requestNotificationPermission } from '../lib/reminders';
import { useSettings } from '../lib/SettingsContext';
import { useTheme } from '../lib/ThemeContext';

function Row({ icon, title, hint, children }: { icon: ReactNode; title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-b border-line py-4 last:border-0 sm:flex-row sm:items-center">
      <div className="flex flex-1 items-start gap-3">
        <span className="mt-0.5 text-brand">{icon}</span>
        <div>
          <p className="text-sm font-medium text-ink">{title}</p>
          {hint && <p className="text-xs text-ink-faint">{hint}</p>}
        </div>
      </div>
      <div className="sm:w-64">{children}</div>
    </div>
  );
}

const input = 'w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none';

export function SettingsView() {
  const { settings, updateSettings } = useSettings();
  const { theme, toggleTheme } = useTheme();
  const { tasks, habits, notes, categories } = usePlanner();
  const [perm, setPerm] = useState('…');
  const [keyDraft, setKeyDraft] = useState(settings.apiKey);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void notificationPermission().then(setPerm);
  }, []);

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ tasks, habits, notes, categories, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `jarvis-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importData = async (file: File) => {
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data.tasks)) throw new Error('Not a Jarvis backup file');
      if (!confirm('Replace all current tasks, habits and notes with this backup?')) return;
      localStorage.setItem('daylight.tasks', JSON.stringify(data.tasks));
      localStorage.setItem('daylight.habits', JSON.stringify(data.habits ?? []));
      localStorage.setItem('daylight.notes', JSON.stringify(data.notes ?? []));
      if (Array.isArray(data.categories)) localStorage.setItem('daylight.categories', JSON.stringify(data.categories));
      location.reload();
    } catch (err) {
      alert(`Couldn’t import: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section className="rounded-2xl border border-line bg-paper-raised px-5">
        <h2 className="pt-5 font-display text-lg font-semibold text-ink">About you</h2>
        <Row icon={<User size={18} />} title="Your name" hint="Jarvis uses it to greet you.">
          <input className={input} value={settings.userName} onChange={(e) => updateSettings({ userName: e.target.value })} placeholder="What should Jarvis call you?" />
        </Row>
      </section>

      <section className="rounded-2xl border border-line bg-paper-raised px-5">
        <h2 className="pt-5 font-display text-lg font-semibold text-ink">Reminders</h2>
        <Row
          icon={<Bell size={18} />}
          title="Notifications"
          hint={
            perm === 'granted'
              ? 'On — Jarvis can remind you.'
              : perm === 'unsupported'
                ? 'This browser can’t show notifications. Install the app for reminders.'
                : isNative
                  ? 'Off — allow them so reminders reach you.'
                  : 'Browser reminders only fire while Jarvis is open. Install the phone app for background reminders.'
          }
        >
          <button
            disabled={perm === 'granted' || perm === 'unsupported'}
            onClick={async () => {
              await requestNotificationPermission();
              setPerm(await notificationPermission());
            }}
            className="w-full rounded-lg bg-brand py-2 text-sm font-medium text-brand-ink disabled:opacity-50"
          >
            {perm === 'granted' ? 'Enabled' : 'Enable notifications'}
          </button>
        </Row>
        <Row icon={<Sun size={18} />} title="Morning briefing" hint="A rundown of your day, every morning.">
          <TimeToggle value={settings.morningBriefing} fallback="07:30" onChange={(v) => updateSettings({ morningBriefing: v })} />
        </Row>
        <Row icon={<Moon size={18} />} title="Evening check-in" hint="A nudge to wrap up and log habits.">
          <TimeToggle value={settings.eveningReview} fallback="20:30" onChange={(v) => updateSettings({ eveningReview: v })} />
        </Row>
        <Row icon={<Bell size={18} />} title="Default task reminder" hint="For new tasks that have a time.">
          <select className={input} value={settings.defaultRemindMinutes} onChange={(e) => updateSettings({ defaultRemindMinutes: Number(e.target.value) })}>
            {[0, 5, 10, 15, 30, 60].map((m) => (
              <option key={m} value={m}>
                {m === 0 ? 'At the time' : `${m} minutes before`}
              </option>
            ))}
          </select>
        </Row>
        <Row icon={<Bell size={18} />} title="Focus session length">
          <select className={input} value={settings.focusMinutes} onChange={(e) => updateSettings({ focusMinutes: Number(e.target.value) })}>
            {[15, 20, 25, 30, 45, 50, 60, 90].map((m) => (
              <option key={m} value={m}>
                {m} minutes
              </option>
            ))}
          </select>
        </Row>
      </section>

      <section className="rounded-2xl border border-line bg-paper-raised px-5">
        <h2 className="pt-5 font-display text-lg font-semibold text-ink">Jarvis’s brain</h2>
        <Row
          icon={<KeyRound size={18} />}
          title="Anthropic API key (optional)"
          hint="Without a key Jarvis runs in quick mode: it understands common commands and works offline. With a key it uses Claude to understand anything you say. The key stays on this device."
        >
          <div className="space-y-2">
            <input
              type="password"
              autoComplete="off"
              className={input}
              value={keyDraft}
              onChange={(e) => setKeyDraft(e.target.value)}
              placeholder="sk-ant-…"
            />
            <div className="flex gap-2">
              <button onClick={() => updateSettings({ apiKey: keyDraft.trim() })} className="flex-1 rounded-lg bg-brand py-2 text-sm font-medium text-brand-ink">
                Save
              </button>
              {settings.apiKey && (
                <button
                  onClick={() => {
                    setKeyDraft('');
                    updateSettings({ apiKey: '' });
                  }}
                  className="rounded-lg border border-line px-3 py-2 text-sm text-ink-soft"
                >
                  Remove
                </button>
              )}
            </div>
            <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-brand hover:underline">
              Get a key <ExternalLink size={11} />
            </a>
          </div>
        </Row>
        <Row icon={<Volume2 size={18} />} title="Speak replies" hint={canSpeak ? 'Jarvis reads replies and reminders out loud.' : 'Not supported on this device.'}>
          <div className="flex gap-2">
            <Toggle checked={settings.voice} disabled={!canSpeak} onChange={(v) => updateSettings({ voice: v })} />
            {canSpeak && (
              <button onClick={() => speak('Hello. I am Jarvis, at your service.')} className="text-xs text-brand hover:underline">
                Test voice
              </button>
            )}
          </div>
        </Row>
      </section>

      <section className="rounded-2xl border border-line bg-paper-raised px-5">
        <h2 className="pt-5 font-display text-lg font-semibold text-ink">App</h2>
        <Row icon={theme === 'light' ? <Moon size={18} /> : <Sun size={18} />} title="Theme">
          <button onClick={toggleTheme} className="w-full rounded-lg border border-line py-2 text-sm text-ink-soft hover:border-brand hover:text-brand">
            Switch to {theme === 'light' ? 'dark' : 'light'} mode
          </button>
        </Row>
        <Row icon={<Download size={18} />} title="Backup" hint="Your data lives only on this device. Export it to keep a copy or move to another phone.">
          <div className="flex gap-2">
            <button onClick={exportData} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-line py-2 text-sm text-ink-soft hover:border-brand hover:text-brand">
              <Download size={14} /> Export
            </button>
            <button onClick={() => fileRef.current?.click()} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-line py-2 text-sm text-ink-soft hover:border-brand hover:text-brand">
              <Upload size={14} /> Import
            </button>
            <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && void importData(e.target.files[0])} />
          </div>
        </Row>
      </section>
    </div>
  );
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-40 ${checked ? 'bg-brand' : 'bg-line'}`}
    >
      <span className={`absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );
}

function TimeToggle({ value, fallback, onChange }: { value: string | null; fallback: string; onChange: (v: string | null) => void }) {
  return (
    <div className="flex items-center gap-3">
      <Toggle checked={value !== null} onChange={(on) => onChange(on ? fallback : null)} />
      <input type="time" disabled={value === null} value={value ?? fallback} onChange={(e) => onChange(e.target.value || fallback)} className={`${input} disabled:opacity-40`} />
    </div>
  );
}
