# NEXORA product

NEXORA is a Turkish social-AI platform for ages 13–18. It turns social-media use from passive, algorithm-driven consumption into healthy, productive digital citizenship.

It does **not** ban or block. It runs **Ölç → Anla → Koçla → Üret** (Measure → Understand → Coach → Create).

## Problem

- Youth social-media use collapses into passive consumption, social comparison, and attention fragmentation.
- Parents and teachers see *time spent*, not *what kind of content* or *what the pattern means*.
- Existing parental-control tools punish and limit. They do not teach media literacy or reward creation.

## Solution

1. **Ölç:** With explicit consent, collect **category-level summaries only** (browser extension domain→category minutes, optional self-report). Never raw URLs, messages, search queries, or page content.
2. **Anla:** An explainable **Feed Health Score** (0–100 + three reasons) from category minutes, diversity, and goals — rules, not an LLM.
3. **Koçla:** A supervised Turkish LLM (Trendyol-LLM) produces age-appropriate micro-tasks and weekly tips from summaries only.
4. **Üret:** Badges, tasks, and visibility reward creation in science, arts, sports, culture, entrepreneurship, and national memory.

## MVP proof

A 5–7 minute jury demo of one path:

**Expo youth → parent consent → category summaries → score → Trendyol-LLM coach → parent/teacher weekly report.**

## Roles

| Role | Product name | Primary surface | MVP |
|---|---|---|---|
| `youth` | Genç | Expo app | Required |
| `parent` | Veli | Web panel | Required |
| `teacher` | Öğretmen | Web panel | Required |
| `admin` | Yönetici / koordinatör | Web admin | Optional, minimal |

Least privilege: each role sees only the aggregates it needs. Parents and teachers never see raw URLs or hostnames — category trends only.

## Personas

### Deniz — youth (primary), 15

Lise student. Daily Instagram, YouTube, TikTok. Needs to understand habits without being judged, feel in control, and make creation visible.

**Pain:** long didactic copy; feeling surveilled; punishment; secret data collection.

**Success:** understands a weekly score change, finishes a self-chosen micro-task, earns a “valuable content” badge.

**Product rules for Deniz**

- Score is not a “good/bad child” label.
- Show what is collected and who can see it.
- Youth controls goals and share level.
- Coach copy is short, age-appropriate, actionable, non-judgmental.
- Core mobile tasks complete in 1–3 minutes.

**Journey:** join → parent consent → data-source choice → first analysis → score explanation → micro-task → create → badge → optional family/teacher share.

### Ece — parent (secondary), 42

Worried about her child’s digital life; does not want constant control to damage the relationship.

**Needs:** trends instead of history, early context (not diagnosis), joint suggestions.

**Success:** understands the weekly summary in under 10 minutes and sets a conflict-free shared goal.

**Product rules for Ece**

- No full URL, message, or search query.
- Risk language must not diagnose; include uncertainty and a path to professional support.
- Consent is detailed, revocable, per data category.
- Reports answer both “what happened?” and “what can we do together?”

### Mert — teacher / counselor (secondary)

Tracks 30–50 students. Needs class-level trends, who might need support, and shared goals — not raw per-student dumps.

**Success:** reads a class week in minutes and picks a media-literacy activity.

**Product rules for Mert**

- Default view is aggregated class insight.
- Student-level detail is consent- and role-gated.
- The system supports judgment; it does not decide for the teacher.
- WCAG 2.1 AA and keyboard access are baseline.

### Selin — school coordinator (support)

Manages users, classes, consents, retention, audit.

**Success:** tracks a consent-revoke or account-deletion request end to end.

MVP: admin is optional. Do not block the demo on a full admin console.

## Goals (MVP)

- One working end-to-end demo path with defined empty/error states.
- Privacy-by-default visible on every critical screen (“Ham URL yok”).
- Explainable Feed Health Score v0.5 (0–100 + 3 reasons).
- Trendyol-LLM coach with a **fixed** output schema.
- Real minimal extension: domain-level category counts + summary POST.

## Non-goals (MVP)

- Real Instagram / YouTube / TikTok feed APIs.
- Payments, micro-incentives, ads.
- Pilot school field tests (SUS / TAM-3).
- Full-scale fine-tune.
- Production Kubernetes.
- BERTurk classifier service, pg-boss workers, local Ollama/llama.cpp (Phase B+).

## North-star metric (pilot, not MVP demo)

**Weekly valuable-action rate among active youth ≥ 30%.**

A valuable action is: complete a micro-task, set a shared goal, or create content in science / arts / sports / culture / entrepreneurship / national memory.

MVP still designs for time-to-first-value **≤ 10 minutes** (register → understandable score + recommendation).

## KPI subset that constrains MVP engineering

| KPI | Target | Why it is in MVP docs |
|---|---|---|
| Time to first value | ≤ 10 min | Demo path length |
| Raw URL/content to central system | 0 | Hard privacy constraint |
| Youth processed without parent consent | 0 | Activation gate |
| Harmful-content filter recall (coach) | ≥ 0.95 later; MVP = schema + safe fallback | No unsafe coach JSON |
| Age-appropriateness | ≥ 95% later; MVP = policy + canned fallback | Safe language |
| Critical E2E flows | 100% on consent, report, role, delete-path stub | Test bar |
| P95 API (non-LLM) | ≤ 500 ms | LLM routes reported separately |

Full KPI tables stay in Notion. Do not build analytics dashboards in Phase A.

## Voice

- Turkish in the product UI.
- Non-judgmental. No diagnosis. No “iyi çocuk / kötü çocuk”.
- Short. Youth screens: one idea per screen.
- Parent/teacher: “ne oldu?” + “birlikte ne yapabiliriz?”
