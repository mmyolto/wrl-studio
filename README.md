# Wantok Radio Light Studio

The staff web app for **Wantok Radio Light 93.9 FM — PNG Christian Broadcasting Network**: listener
records and salvation follow-up, toksave, weekly show prep (with interviews), schedule changes, tasks,
Shareathon pledges & gifts, issue reporting and management reports.

Built with **React 18 + TypeScript + Tailwind CSS 4 (Vite)** on **Firebase** (Authentication + Cloud
Firestore). There is no custom server: the app runs in the browser and the security rules in
[`firestore.rules`](firestore.rules) decide who can see and change what. It runs on Firebase's free
**Spark** plan, works on phones from 320 px wide up to desktop, and installs as an app (PWA) with
offline support.

*Designed and built by Melvin Yolto.*

---

## Quick start (Windows, studio computer)

| File | What it does |
|---|---|
| `SETUP-AND-RUN.bat` | First time: installs packages and Firebase tools, signs in to Firebase, publishes the database rules, starts the app |
| `START-APP.bat` | Every day: starts the app at <http://localhost:5173> |
| `DEPLOY-RULES.bat` | After an update: publishes the latest `firestore.rules` to Firebase |
| `PUSH-TO-GITHUB.bat` | Uploads the project to your GitHub repository (and later, any changes) |

## Setting up from a fresh copy (e.g. cloned from GitHub)

Requires **Node.js 20+**.

1. **Create the Firebase project** (one time) at <https://console.firebase.google.com>:
   * **Authentication** → *Sign-in method* → enable **Email/Password** (keep sign-up enabled — the app
     uses it when an administrator adds staff; people who sign up on their own get no access).
   * **Firestore Database** → create in **production mode**, location close to PNG
     (e.g. `australia-southeast1`).
   * **Project settings** → *Your apps* → add a **Web app** and copy its config values.
2. **Add your Firebase config** — copy `src/lib/firebase-config.example.ts` to
   `src/lib/firebase-config.ts` and paste the values in. (Or use a `.env` file — see `.env.example`.)
   Both are git-ignored, so your project's keys never go to GitHub.
3. **Point the tools at your project** — `.firebaserc` holds the project id (`wrl-studio`); change it if
   yours differs.
4. Install, publish the rules and run:

   ```bash
   npm install
   npm install -g firebase-tools
   firebase login
   npm run deploy:rules   # publishes firestore.rules — required
   npm run dev            # http://localhost:5173
   ```

The first time the app opens it shows **“Welcome — let’s set up the studio”**: create the first
**Administrator** there (this screen then closes for good) and add the rest of the team from
**Staff & access**.

### Scripts

| Command | |
|---|---|
| `npm run dev` | start the development server |
| `npm run typecheck` | TypeScript check |
| `npm run build` | type-check and build to `dist/` |
| `npm run deploy` | build and deploy hosting + rules to Firebase (live at `https://<project-id>.web.app`) |
| `npm run deploy:rules` | publish only the security rules |

A `Dockerfile` + `nginx.conf` are included if you prefer to self-host the built `dist/` folder.

**Optional — automatic checks on GitHub:** in your repository click *Add file → Create new file*, name it
`.github/workflows/ci.yml`, paste the following and commit. GitHub will then type-check and build the app
on every upload.

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
```

---

## Roles

| Role | Can do |
|---|---|
| **Administrator** | Everything, plus Staff & access and the Archive (restore deleted records) |
| **General Manager** | All records (view), receives toksave, reports, show prep tracker, team progress, all tasks, all pledges & gifts, manage issues |
| **Program Director** | All records (add/edit/delete), receives toksave, refer & flag, show prep + tracker & reviews, reports, team progress, assign tasks, all pledges & gifts, manage issues |
| **Ministry Chaplain** | All records (add/edit), salvation follow-up, receives “flagged for prayer” alerts, reports, assign tasks |
| **Announcer** | Own records + anything referred to them, flag for prayer, weekly show prep, report schedule changes, record pledges & gifts, report issues |

**Tasks:** the Administrator, General Manager, Program Director and Ministry Chaplain can assign a task
(title, details, priority, due date) to any individual staff member. The person gets a notification,
moves it from *To do* → *In progress* → *Done* and can add progress notes; the person who assigned it is
notified of every change and can edit, reassign or delete it. The Administrator and General Manager can
see all tasks.

**Pledges & gifts (Shareathon):** every staff member can register a listener's **pledge**, **cash gift** or
**in-kind gift** (same details as the paper Shareathon form). Each entry gets the next reference number
(`WRL26 - 0001`, `WRL26 - 0002` …) — numbers never repeat, even when several announcers save at once
(this needs an internet connection). Payments can be added against a pledge until it is fully paid, a
receipt PDF can be downloaded for the giver, and totals (pledged, received, still to collect, in-kind)
are shown in Kina. Announcers see the entries they recorded; the Administrator, General Manager and
Program Director see everything; only the Administrator can delete an entry.

**Toksave:** when a listener record's category is *Toksave*, it is sent straight to the Program Director
and the General Manager the moment it is saved (also when an existing record is changed to Toksave). They
get a notification and a “new toksave” card on their Overview, which clears once they open it.

**Interviews in show prep:** the show prep form has a *This show has an interview this week* tick box.
When it's ticked the presenter must give the interviewee's full name, position, contact number, interview
day, air time and topic (organisation, format — in studio / by phone / pre-recorded / outside broadcast —
and notes are optional). Several interviewees can be added. The details appear in the show prep, the
tracker, the notification to management and the PDF.

**Schedule changes:** when a national or organisational programme (Independence Day coverage, a
Shareathon, a church conference…) replaces the normal on-air schedule, the Administrator, General Manager,
Program Director or an announcer uses *Show prep not used* / *Report a change* to record the day(s),
hours and shows affected. Management are notified straight away and can mark it *Noted*; everyone sees a
banner on the Overview and show prep pages for changes today or in the coming week.

Everyone can report an issue, receive notifications and set their availability (on leave / sick /
unavailable). People who are away don't get show prep reminders and can't be sent referrals.

## Staff accounts

* **Add staff** creates the login and profile in one step (the admin stays signed in).
* **Password resets** — the key icon sends Firebase's reset email; staff can also use
  *Forgot password?* on the sign-in screen.
* **Removing someone** — use *Disable*. They are signed out immediately and can't get back in, while
  their records keep their name. To delete the login completely, also delete the user under
  Firebase console → Authentication.

## Project structure

```
src/
  lib/          config, Firebase init, types, constants, permissions, stats, PDF, CSV, rules check
  services/     every Firestore write (records, show prep, schedule changes, tasks, gifts, users…)
  context/      AuthContext (sign-in + profile), DataContext (live data), NavContext
  components/   ui/ (buttons, fields, modal, toasts…), charts/, layout/ (shell, bell, dialogs)
  features/     overview, records, showprep (+ tracker), schedule, tasks, giving, reports, team,
                tickets, users, archive
  pages/        sign-in, first-run setup, status screens
public/         PWA manifest, service worker, icons
firestore.rules security rules — the real permission system
firebase.json   hosting + rules deploy config
```

### Data model (Firestore collections)

| Collection | Contents |
|---|---|
| `users/{uid}` | name, email, role, availability, disabled |
| `records` | listener records (contact, location, category, prayer details, follow-up status) |
| `archive` | copies of deleted records and earlier versions of edited records |
| `showPreps` | weekly show prep plans and review notes |
| `tickets` | reported issues |
| `tasks` | tasks assigned to individual staff, with their activity history |
| `gifts` | Shareathon pledges, cash gifts and in-kind gifts, with payments |
| `scheduleChanges` | days when national / organisational programmes replace the schedule (show prep not used) |
| `counters` | the running reference number for each year's pledges and gifts |
| `notifications` | in-app notifications (live — no refresh needed) |
| `meta/setup` | marks first-run setup as complete |

## Changing things later

* Lists such as provinces, prayer categories and contact methods are in `src/lib/constants.ts`.
* Colours and font are at the top of `src/index.css`.
* If you change who may do what, update **both** `src/lib/permissions.ts` (what the UI shows) and
  `firestore.rules` (what the database allows), then run `npm run deploy:rules` (or double-click
  **DEPLOY-RULES.bat** on Windows). Also bump `RULES_VERSION` in `src/lib/rulesCheck.ts` and the matching
  version in `firestore.rules`: if Firebase is running older rules than the app expects, every user sees a
  red banner telling the Administrator to run DEPLOY-RULES.bat.
