# Jarvis — your personal assistant

Jarvis is a personal AI assistant built into a daily planner. It keeps track of your
tasks, reminds you what to do and when, gives you a briefing every morning, and
helps you build habits. It runs as a **native app on Android and iOS** and as an
**installable web app**.

## What Jarvis does

- **Talk to it** by typing or with the mic: “Remind me to call mom tomorrow at 6pm”,
  “What’s on today?”, “Move dentist to Friday”, “Done call mom”, “Plan my day”.
- **Reminders**: real phone notifications before each timed task. You pick how
  early (at the time, 5 min, 1 hour, 1 day…).
- **Morning briefing & evening check-in**: a daily notification summarising your
  day, plus an evening nudge to wrap up and log habits. The times are configurable.
- **Daily briefing card**: what’s left, what’s next, overdue items (one tap moves
  them to today), and habits still to do. It can also read the briefing out loud.
- **Focus timer**: 15/25/50-minute sessions with a notification when it’s break time.
- **Habits** with streaks, plus **Day** and **Week** planner views.
- **Voice**: Jarvis can speak its replies and reminders.
- **Backup**: export and import all your data as a file.
- **Two brains**:
  - *Quick mode* (default) understands common planning commands, works offline,
    and costs nothing.
  - *AI mode*: paste an [Anthropic API key](https://console.anthropic.com/settings/keys)
    into **Settings**. Jarvis then uses Claude to understand anything you say, and it
    can still add, move, complete and delete tasks for you. The key is stored only
    on your device.

Everything is stored on your device. There is no account and no server.

## Installing it on your phone

### Android: real app (APK)
1. On GitHub, open **Actions → Build Android app**, pick the latest green run, and
   download **Jarvis-android-apk** at the bottom of the page.
2. Unzip it and open `app-debug.apk` on your phone. Allow “install unknown apps”
   when Android asks.
3. Open Jarvis and tap **Turn on notifications**.

### iPhone
- **Quickest (no Mac needed):** open the web app link (see *Web app* below) in
  **Safari**, tap **Share → Add to Home Screen**, then open Jarvis from the home
  screen and enable notifications. On the web, reminders fire only while Jarvis is
  open. For background reminders, use the native build below.
- **Native iOS app:** needs a Mac with Xcode. Run `npm install && npm run ios`,
  choose your iPhone in Xcode, and press Run (a free Apple ID works for your own
  phone). To publish on the App Store you need an Apple Developer account.

### Web app
The **Publish web app** workflow deploys to GitHub Pages on every push to `main`.
Enable it once under **Settings → Pages → Source: GitHub Actions**. Your app will
be at `https://<your-username>.github.io/<repo-name>/`. Android Chrome also offers
**Install app** from there.

## Development

```bash
npm install
npm run dev        # web dev server at http://localhost:5173
npm run build      # type-check + production build into dist/
npm run sync       # build and copy into the android/ and ios/ projects
npm run android    # open in Android Studio
npm run ios        # open in Xcode (macOS)
npm run assets     # regenerate app icons/splash from assets/
npm run lint
```

## Project structure

```
src/
  components/
    JarvisView.tsx      Assistant screen: briefing, chat, focus timer, reminders
    SettingsView.tsx    Name, reminder times, API key, voice, backup
    …                   Day / Week / Habits views, task form, navigation
  lib/
    jarvis/brain.ts     Offline “quick mode”: natural-language dates, commands, briefing
    jarvis/claude.ts    AI mode: Claude with planner tools (add/update/delete task, log habit, focus)
    jarvis/JarvisContext.tsx  Chat state, reminder engine, focus timer, notifications
    jarvis/speech.ts    Speech recognition + text-to-speech
    reminders.ts        Builds the reminder schedule; native local notifications / web fallback
    PlannerContext.tsx  Tasks, habits, notes (localStorage)
android/, ios/          Capacitor native projects
assets/                 Icon & splash sources
```
