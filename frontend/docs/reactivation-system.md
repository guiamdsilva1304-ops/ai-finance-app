# Reactivation Email Trail System

Behavioral segmented email trails that fire based on user actions (not fixed dates).

## Architecture

```
/api/cron/reactivation (daily at 09h UTC / 12h BRT)
  │
  ├── Phase 1: Advance active campaigns
  │     For each active campaign:
  │       1. Check exit condition → mark 'exited' if met
  │       2. Check if next email is due (started_at + offset days)
  │       3. Send + log if due
  │
  └── Phase 2: Enroll new users
        For each user WITHOUT an active campaign:
          1. Evaluate triggers in priority order (4 > 3 > 2 > 1)
          2. Create campaign + send email #1 for first eligible trail
```

**Key constraint: one active trail per user at a time.** A user in any active trail won't be enrolled in another until they exit.

**Emails are sent directly via Resend** (not through the existing `/api/cron/emails` queue) and logged to `email_queue` as audit trail.

---

## Trails

| Slug | Trigger | Emails | Exit |
|------|---------|--------|------|
| `quase-la` | Goal ≥ 70% AND no transactions in 7 days | 1 (D+0) | Any new transaction |
| `free-engajado` | ≥5 AI messages in 14 days AND plan = free | 2 (D+0, D+3) | Upgrades to Pro |
| `meta-orfa` | Goal created 5+ days ago AND no transactions since | 2 (D+0, D+5) | Any transaction recorded |
| `sumiu` | No login for 7+ days | 3 (D+0, D+7, D+14) | User logs in again |

---

## Adding a new trail

### Step 1 — Add the slug to the DB constraint

In Supabase SQL Editor:
```sql
ALTER TABLE reactivation_campaigns
  DROP CONSTRAINT reactivation_campaigns_trilha_slug_check;

ALTER TABLE reactivation_campaigns
  ADD CONSTRAINT reactivation_campaigns_trilha_slug_check
  CHECK (trilha_slug IN ('sumiu','meta-orfa','free-engajado','quase-la','your-new-trail'));
```

### Step 2 — Create email templates

Create `/src/lib/emails/reactivation/your-trail.ts`:
```typescript
import { baseHtml, ctaButton, card, htmlToText, EmailResult } from './_base'

export interface YourTrailParams {
  nome: string
  userId: string
  // add any context fields your emails need
}

export function yourTrailEmail1({ nome, userId }: YourTrailParams): EmailResult {
  const subject = 'Your subject line (max 50 chars, no leading emoji)'
  const content = `
<tr><td style="padding:36px 32px 32px">
  <h1 style="margin:0 0 16px;color:#1a3a1a;font-family:Nunito,-apple-system,system-ui,sans-serif;font-size:22px;font-weight:900;line-height:1.3">Headline here</h1>
  <p style="margin:0 0 14px;color:#374151;font-size:15px;font-family:Nunito,-apple-system,system-ui,sans-serif;line-height:1.7">Body text.</p>
  ${ctaButton('CTA label →', 'https://imoney.ia.br/dashboard')}
</td></tr>`
  const html = baseHtml({ preheader: 'Preheader text', content, userId, trailSlug: 'your-trail' })
  return { subject, html, text: htmlToText(content) }
}
```

### Step 3 — Add trigger function

In `/src/lib/reactivation/triggers.ts`, add:
```typescript
export async function checkYourTrail(supabase: SupabaseClient, userId: string): Promise<TriggerResult> {
  // query DB, return { eligible: true/false, ...contextData }
}
```

### Step 4 — Wire into the cron

In `/src/app/api/cron/reactivation/route.ts`:

1. Add `'your-trail'` to the `TrailSlug` type union.
2. Add email offsets to `TRAIL_OFFSETS`:
   ```typescript
   'your-trail': [0, 5], // D+0 and D+5
   ```
3. Add to `TRAIL_PRIORITY` in the desired position.
4. Add email building in `buildEmail()`:
   ```typescript
   if (trail === 'your-trail') {
     return emailNumber === 1 ? yourTrailEmail1(p) : null
   }
   ```
5. Add exit condition in `checkExitCondition()`.
6. Add trigger evaluation in the `for (const trail of TRAIL_PRIORITY)` loop.

### Step 5 — Update `vercel.json` if needed

The existing cron at `0 12 * * *` already handles all trails. No change needed unless you want a different schedule.

---

## Email design conventions

- Max-width: 600px
- Header background: `#1a3a1a`
- CTA button: `#00C853`, border-radius 8px, white text, bold
- Card background: `#E8F5E9`, border-radius 10px
- Font: Nunito with `-apple-system, system-ui, sans-serif` fallback
- Subject: max 50 chars, no leading emoji, 1 emoji in middle/end OK
- Always include preheader text (shown in inbox preview)
- Footer: address + unsubscribe link (required by anti-spam laws)

## Voice guidelines (CRITICAL)

Use: sonho, meta, conquista, jornada, realização, juntos, vamos  
Avoid: erro, falhou, culpa, algoritmo, machine learning, any jargon  
Pro framing: never "pay for more access" — always "invest in your dream"  
Tone: aspirational, warm, encouraging, slightly humorous. Never cold or corporate.
