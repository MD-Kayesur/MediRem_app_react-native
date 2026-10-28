# Medication Reminder App: Complete React Native + Expo + EAS Implementation Blueprint

**Product requirements • Architecture • Data model • Screens • API • Notifications • Security • Testing • EAS builds • Release • Progress tracking**  
**Recommended stack:** React Native + Expo + TypeScript + EAS | NestJS + PostgreSQL + Prisma • Android-first

---

## 0. Purpose and How to Use This Guide
This updated document replaces the earlier Flutter-oriented plan. The chosen mobile stack is **React Native with Expo, TypeScript, and EAS Build/Submit**. The backend remains **NestJS, PostgreSQL, and Prisma**. The product is **Android-first**, with iOS considered after the core workflow is reliable.

- Follow the phases in order; do not start every feature at once.
- Build a local-first prototype and verify reminder behavior before adding server-side complexity.
- Use a Git issue/board for tasks and keep this document updated weekly.
- Treat the 50 MB APK and installed-storage targets as separate measurements; neither is guaranteed by framework choice alone.
- Package versions and platform requirements change. Check current official Expo documentation before installing or upgrading dependencies.

### Recommended Project Decisions
| Decision | Recommendation | Reason |
| :--- | :--- | :--- |
| **Mobile platform** | Android first | Focus testing and release effort |
| **Mobile framework** | React Native + Expo + TypeScript | Reuse React/TypeScript experience |
| **Build/release** | EAS Build; EAS Submit later if needed | Cloud builds and managed signing workflow |
| **Navigation** | Expo Router | File-based routing suited to Expo projects |
| **Server state** | TanStack Query | API caching, loading/error states, mutations |
| **Local UI state** | React hooks; add Zustand only if needed | Avoid unnecessary state architecture early |
| **Forms** | React Hook Form + Zod | Typed validation and reusable forms |
| **Local persistence**| SQLite via `expo-sqlite`; `SecureStore` for secrets | Separate data storage from credentials |
| **Notifications** | `expo-notifications` (local); FCM/Push (remote later) | Local reminders first; remote layer later |
| **Backend** | NestJS + Prisma + PostgreSQL | Typed APIs, relational data, migrations |
| **Testing** | Jest/Vitest, React Native Testing Library | Test logic, UI, and server authorization |

---

## 1. Product Vision & Safety Boundary
Create an accessible medication-management companion that helps people organize schedules, receive reminders, record their own dose actions, and optionally share selected information with a trusted caregiver. It is not a prescribing tool, diagnostic system, emergency service, or guarantee that a dose was taken.

### Target Users
- Older adults who need readable screens and simple interactions.
- People who manage several medicines or recurring routines.
- Busy users who want a daily checklist and refill estimate.
- Family caregivers who are explicitly invited and given limited permissions.

### Core Product Principles
- **Simple:** One clear Today screen and a small number of actions.
- **Accurate:** Notification delivery and user-confirmed dose status are different events.
- **Safe:** No dose recommendations, no instructions to double a missed dose, and no diagnosis.
- **Private:** Minimum data, secure access, clear consent, and caregiver access that can be revoked.
- **Transparent:** Disclose Android notification limitations and distinguish 'unconfirmed' from 'missed'.
- **Accessible:** Large tap targets, high contrast, scalable text, screen-reader labels, and plain language.

---

## 2. Scope & Release Plan

### MVP 0.1 — Must Have
- [x] Onboarding and landing screens with clear value props.
- [ ] Create/edit/pause/archive medication profiles.
- [ ] Medication name, dose description, optional instructions/photo, and starting quantity.
- [ ] Daily and selected weekdays schedules, with local time and timezone handling.
- [x] Today dashboard sorted by scheduled time.
- [ ] Local notifications for upcoming doses via `expo-notifications`.
- [x] Taken, Skipped, and Snooze action handlers.
- [ ] Dose history and progress ring calculated from recorded actions.
- [ ] Settings for notification permission status, timezone/language, and privacy basics.
- [ ] Local SQLite data persistence.

### MVP 0.2 — After Core Reminders Pass Testing
- [ ] NestJS account/auth API and synchronization.
- [ ] PostgreSQL persistence and server-side authorization.
- [ ] Refill estimates based on user-provided quantity and recorded events.
- [ ] Account data export and deletion flow.
- [ ] Error reporting and release monitoring.

### Beta 0.3 — Optional Caregiver Features
- [ ] Caregiver invitations and explicit patient consent.
- [ ] Permission-limited caregiver view and revocation.
- [ ] Push/SMS alerts with privacy-safe content, cost controls, and opt-in.

### Explicitly Out of Scope Initially
- AI diagnosis, prescribing, medication interaction decisions, or dose recommendations.
- Automatic prescription/photo OCR as a source of truth.
- Automatic contact with doctors or emergency services.
- Clinician dashboard or public social network.

---

## 3. Screen Specifications (Based on UI Mockups)
1. **Splash Screen:** MediRem logo, "Your Health, Our Reminder", branded loader.
2. **Onboarding 1:** "Never Miss Your Medication" — phone notification illustration.
3. **Onboarding 2:** "Keep Your Meds Organized" — pill bottle, dosage, photo upload.
4. **Onboarding 3:** "Family Support When It Matters" — caregiver support, "Get Started".
5. **Login / Register:** Patient vs. Caregiver account switch.
6. **Today Dashboard:**
   - Greeting & notification bell.
   - Circular progress ring (`2/4 doses taken`, percentage).
   - Time-slotted schedule cards: Morning (08:00 AM), Afternoon (01:00 PM), Evening (07:00 PM), Night (10:00 PM).
   - Immediate "Take" / "Taken" status toggle.
7. **Medication Management:** Add/Edit medication, pill photo, dosage frequency, refill alerts.
8. **Dose History & Profile:** Weekly compliance ring, detailed chronological log.

