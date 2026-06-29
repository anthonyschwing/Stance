# Humind — Airtable + Make + Claude Platform Architecture

**Pattern:** Orchestrator with Specialists  
**Version:** 1.0  
**Stack:** Airtable (data + memory) · Make (runtime orchestration) · Claude Sonnet 4.6 (AI reasoning)

---

## 1. System Overview

```
╔══════════════════════════════════════════════════════════════════════╗
║  DATA INGESTION LAYER                                                ║
║  Forms · Airtable manual entry · Webhooks · Future integrations     ║
╚══════════════════════════╤═══════════════════════════════════════════╝
                           │ record created → ai_status: "pending"
                           ▼
╔══════════════════════════════════════════════════════════════════════╗
║  MAKE — ORCHESTRATOR SCENARIO                                        ║
║                                                                      ║
║  [Watch] Airtable: pending records                                  ║
║      │                                                               ║
║      ▼                                                               ║
║  [Claude] ROUTER — classify record type + urgency                   ║
║      │                                                               ║
║      ├──► onboarding    → Scenario: humind-onboarding               ║
║      ├──► performance   → Scenario: humind-performance-review       ║
║      ├──► recruiting    → Scenario: humind-candidate-eval           ║
║      ├──► engagement    → Scenario: humind-engagement-analysis      ║
║      ├──► hr_request    → Scenario: humind-request-router           ║
║      └──► analytics     → Scenario: humind-people-analytics         ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
                           │ each specialist scenario:
                           ▼
╔══════════════════════════════════════════════════════════════════════╗
║  MAKE — SPECIALIST SCENARIOS (one per HR domain)                    ║
║                                                                      ║
║  [Get] Employee context from Airtable Memory                        ║
║      │                                                               ║
║      ▼                                                               ║
║  [Claude] SPECIALIST AGENT — analyze + generate output              ║
║      │                                                               ║
║      ▼                                                               ║
║  [Claude] EVALUATOR — validate quality (high-stakes outputs only)   ║
║      │                                                               ║
║      ▼                                                               ║
║  [Make Router] Branch on action_type                                ║
║      ├──► update_record     → Airtable: update                      ║
║      ├──► notify            → Slack / Email                         ║
║      ├──► trigger_workflow  → Make: call another scenario           ║
║      └──► escalate          → Notify HR manager + flag              ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
                           │
                           ▼
╔══════════════════════════════════════════════════════════════════════╗
║  AIRTABLE — DATA + MEMORY LAYER                                     ║
║  Employees · HR Records · Workflow States · Memory · Audit Log      ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## 2. Airtable Schema

### Table: `hr_records` (primary intake table)

| Field | Type | Purpose |
|-------|------|---------|
| `record_id` | Auto number | Primary key |
| `record_type` | Single select | `onboarding` / `performance` / `recruiting` / `engagement` / `hr_request` / `analytics` |
| `employee_id` | Link → employees | Associated employee (optional) |
| `raw_input` | Long text | Free-text or form data — Claude's primary input |
| `source` | Single select | `form` / `manual` / `slack` / `webhook` / `integration` |
| `priority` | Single select | `urgent` / `high` / `standard` / `low` |
| `ai_status` | Single select | `pending` / `processing` / `done` / `error` / `escalated` |
| `ai_type_detected` | Single select | What the router classified this as |
| `ai_summary` | Long text | Claude's structured summary |
| `ai_recommendations` | Long text | Action recommendations (JSON array) |
| `ai_score` | Number | Relevance/urgency score 0–100 |
| `ai_action_taken` | Single select | `updated` / `notified` / `escalated` / `workflow_triggered` |
| `workflow_state_id` | Link → workflow_states | Stateful workflow tracking |
| `processed_at` | Date/time | Set by Make on completion |
| `error_log` | Long text | Populated if ai_status = "error" |

### Table: `employees`

| Field | Type | Purpose |
|-------|------|---------|
| `employee_id` | Auto number | Primary key |
| `full_name` | Single line | |
| `email` | Email | |
| `department` | Single select | Engineering / Sales / HR / etc. |
| `role` | Single line | Job title |
| `manager_email` | Email | For escalation routing |
| `start_date` | Date | For tenure calculations |
| `status` | Single select | `active` / `onboarding` / `offboarding` / `inactive` |
| `ai_profile_summary` | Long text | Claude-generated employee profile (updated periodically) |
| `engagement_score` | Number | Running engagement score |
| `last_review_date` | Date | |
| `linked_records` | Link → hr_records | All HR records for this employee |
| `memory_context` | Long text | Serialized context blob passed to Claude for continuity |

### Table: `workflow_states`

| Field | Type | Purpose |
|-------|------|---------|
| `state_id` | Auto number | Primary key |
| `workflow_type` | Single select | Which specialist scenario owns this |
| `current_step` | Single line | Step name within the workflow |
| `status` | Single select | `active` / `waiting` / `completed` / `failed` |
| `context_snapshot` | Long text | JSON snapshot of state at last checkpoint |
| `created_at` | Date/time | |
| `updated_at` | Date/time | |
| `linked_record` | Link → hr_records | |
| `linked_employee` | Link → employees | |
| `next_action_at` | Date/time | For time-based resume (e.g., 30-day check-in) |

### Table: `ai_memory` (Claude's persistent context)

| Field | Type | Purpose |
|-------|------|---------|
| `memory_id` | Auto number | Primary key |
| `scope` | Single select | `employee` / `department` / `global` |
| `scope_id` | Single line | ID of the employee or department |
| `key` | Single line | Memory key (e.g., `performance_trend`) |
| `value` | Long text | Memory value (structured text or JSON) |
| `confidence` | Number | 0–1, how reliable this memory is |
| `last_updated` | Date/time | |
| `expires_at` | Date/time | Optional TTL |

### Table: `audit_log`

| Field | Type | Purpose |
|-------|------|---------|
| `log_id` | Auto number | |
| `timestamp` | Date/time | |
| `record_id` | Link → hr_records | |
| `action` | Single line | What happened |
| `claude_model` | Single line | Model version used |
| `tokens_used` | Number | Approx token count for cost tracking |
| `scenario_name` | Single line | Which Make scenario ran |

---

## 3. Make Scenario Map

### Scenario 1: `humind-orchestrator` (always-on)

```
Trigger: Airtable "Watch Records" — hr_records, filter: ai_status = "pending"
Interval: every 15 minutes (or Airtable webhook for real-time)

[1] Airtable: Get Record (full fields)
[2] Airtable: Search Records in ai_memory for employee context
[3] Tools: Set Variable — build router payload
[4] HTTP → Claude API (ROUTER call)
[5] JSON: Parse response
[6] Airtable: Update hr_records → ai_status = "processing", ai_type_detected
[7] Make Router:
    ├─ onboarding    → HTTP: call Scenario 2 webhook
    ├─ performance   → HTTP: call Scenario 3 webhook
    ├─ recruiting    → HTTP: call Scenario 4 webhook
    ├─ engagement    → HTTP: call Scenario 5 webhook
    ├─ hr_request    → HTTP: call Scenario 6 webhook
    └─ analytics     → HTTP: call Scenario 7 webhook
[Error] → Airtable: ai_status = "error", error_log = {{error.message}}
```

### Scenario 2–7: `humind-{domain}` (specialist, webhook-triggered)

Each follows this template:
```
Trigger: Webhook (called by orchestrator, receives record_id + context)

[1] Airtable: Get Record by record_id
[2] Airtable: Get Employee record + memory_context
[3] Airtable: Search ai_memory for scope = "employee", scope_id = employee_id
[4] Tools: Set Variable — assemble full context
[5] HTTP → Claude API (SPECIALIST call — domain-specific prompt)
[6] JSON: Parse response → {summary, recommendations, actions, score, memory_update}
[7] Airtable: Update employee.memory_context (append new memory)
[8] Airtable: Upsert ai_memory record (key/value)
[9] Make Router on action_type:
    ├─ "update_only"       → [10a] Airtable: Update hr_record
    ├─ "notify_manager"    → [10b] Email/Slack + Airtable update
    ├─ "trigger_workflow"  → [10c] HTTP: call next scenario + Airtable update
    └─ "escalate"          → [10d] Slack urgent + Airtable: ai_status = "escalated"
[11] Airtable: Update hr_records → ai_status = "done", processed_at = now
[12] Airtable: Create audit_log record
[Error] → Airtable: ai_status = "error", error_log
```

### Scenario 8: `humind-memory-refresh` (scheduled, daily)

```
Trigger: Schedule — daily at 06:00

[1] Airtable: List all active employees
[2] For each employee:
    [2a] Get last 30 days of linked hr_records
    [2b] Get current ai_memory entries for this employee
    [3]  HTTP → Claude API (PROFILE UPDATE call)
    [4]  Airtable: Update employee.ai_profile_summary
    [5]  Airtable: Update employee.engagement_score
    [6]  Airtable: Purge ai_memory entries where expires_at < today
```

---

## 4. Claude Call Templates

### Call A: ROUTER

```json
{
  "model": "claude-sonnet-4-6",
  "max_tokens": 256,
  "temperature": 0,
  "system": "You are the Humind HR routing agent. Classify incoming HR records and return structured JSON only. No prose.",
  "messages": [{
    "role": "user",
    "content": "Classify this HR record and return JSON:\n{\n  \"type\": <\"onboarding\"|\"performance\"|\"recruiting\"|\"engagement\"|\"hr_request\"|\"analytics\">,\n  \"priority\": <\"urgent\"|\"high\"|\"standard\"|\"low\">,\n  \"urgency_score\": <0-100>,\n  \"routing_reason\": <one sentence>\n}\n\nRecord:\nSource: {{source}}\nEmployee: {{employee_name}} ({{department}})\nContent: {{raw_input}}"
  }]
}
```

### Call B: ONBOARDING SPECIALIST

```json
{
  "model": "claude-sonnet-4-6",
  "max_tokens": 1500,
  "temperature": 0,
  "system": "You are Humind's onboarding AI agent. Analyze new employee onboarding data and generate a structured plan and checklist. Return JSON only.",
  "messages": [{
    "role": "user",
    "content": "Analyze this onboarding record and return JSON:\n{\n  \"summary\": <2-3 sentence overview>,\n  \"onboarding_checklist\": [<list of action items with owner and deadline>],\n  \"risk_flags\": [<any gaps or missing info>],\n  \"buddy_requirements\": <string or null>,\n  \"action_type\": <\"update_only\"|\"notify_manager\"|\"trigger_workflow\">,\n  \"memory_update\": {\"key\": \"onboarding_status\", \"value\": <summary for future context>},\n  \"score\": <onboarding readiness 0-100>\n}\n\nEmployee context:\n{{employee_memory_context}}\n\nOnboarding record:\n{{raw_input}}"
  }]
}
```

### Call C: PERFORMANCE REVIEW SPECIALIST

```json
{
  "model": "claude-sonnet-4-6",
  "max_tokens": 2000,
  "temperature": 0,
  "system": "You are Humind's performance analytics AI. Analyze performance data and generate HR-grade insights. Be objective, specific, and actionable. Return JSON only.",
  "messages": [{
    "role": "user",
    "content": "Analyze this performance record and return JSON:\n{\n  \"summary\": <2-3 sentence executive summary>,\n  \"strengths\": [<list of observed strengths>],\n  \"development_areas\": [<specific growth opportunities>],\n  \"recommendations\": [<HR actions to take>],\n  \"trend\": <\"improving\"|\"stable\"|\"declining\"|\"insufficient_data\">,\n  \"flight_risk_score\": <0-100, higher = more risk>,\n  \"action_type\": <\"update_only\"|\"notify_manager\"|\"escalate\">,\n  \"memory_update\": {\"key\": \"performance_trend\", \"value\": <summary>},\n  \"score\": <overall performance 0-100>\n}\n\nEmployee history:\n{{employee_memory_context}}\n\nCurrent review data:\n{{raw_input}}"
  }]
}
```

### Call D: CANDIDATE EVALUATION SPECIALIST

```json
{
  "model": "claude-sonnet-4-6",
  "max_tokens": 1500,
  "temperature": 0,
  "system": "You are Humind's recruiting AI. Evaluate candidates against role requirements and Humind's hiring criteria. Return JSON only.",
  "messages": [{
    "role": "user",
    "content": "Evaluate this candidate and return JSON:\n{\n  \"summary\": <2-3 sentence overview>,\n  \"fit_score\": <0-100>,\n  \"strengths\": [<relevant qualifications>],\n  \"gaps\": [<missing requirements>],\n  \"recommendation\": <\"advance\"|\"hold\"|\"reject\">,\n  \"suggested_interview_questions\": [<3-5 targeted questions>],\n  \"action_type\": <\"update_only\"|\"notify_manager\"|\"trigger_workflow\">,\n  \"memory_update\": {\"key\": \"candidate_evaluation\", \"value\": <summary>}\n}\n\nRole requirements:\n{{role_context}}\n\nCandidate data:\n{{raw_input}}"
  }]
}
```

### Call E: ENGAGEMENT ANALYSIS SPECIALIST

```json
{
  "model": "claude-sonnet-4-6",
  "max_tokens": 1500,
  "temperature": 0,
  "system": "You are Humind's employee engagement AI. Analyze pulse survey and engagement data to surface patterns and risks. Return JSON only.",
  "messages": [{
    "role": "user",
    "content": "Analyze this engagement data and return JSON:\n{\n  \"summary\": <2-3 sentence overview>,\n  \"engagement_score\": <0-100>,\n  \"key_themes\": [<top sentiment themes>],\n  \"risk_signals\": [<burnout, disengagement, or attrition indicators>],\n  \"department_insights\": <string or null>,\n  \"recommended_actions\": [<HR interventions>],\n  \"action_type\": <\"update_only\"|\"notify_manager\"|\"escalate\">,\n  \"memory_update\": {\"key\": \"engagement_trend\", \"value\": <summary>},\n  \"score\": <engagement_score>\n}\n\nEmployee history:\n{{employee_memory_context}}\n\nSurvey / engagement data:\n{{raw_input}}"
  }]
}
```

### Call F: PEOPLE ANALYTICS SPECIALIST

```json
{
  "model": "claude-sonnet-4-6",
  "max_tokens": 2000,
  "temperature": 0,
  "system": "You are Humind's people analytics AI. Generate data-driven HR insights, trends, and strategic recommendations from workforce data. Return JSON only.",
  "messages": [{
    "role": "user",
    "content": "Analyze this workforce data and return JSON:\n{\n  \"headline_insight\": <1 sentence key finding>,\n  \"summary\": <3-4 sentence narrative>,\n  \"metrics\": [{\"name\": <metric name>, \"value\": <value>, \"trend\": <\"up\"|\"down\"|\"stable\">}],\n  \"patterns\": [<observed workforce patterns>],\n  \"risks\": [<HR risks identified>],\n  \"strategic_recommendations\": [<priority-ordered recommendations>],\n  \"action_type\": <\"update_only\"|\"notify_manager\"|\"trigger_workflow\">\n}\n\nWorkforce data:\n{{raw_input}}"
  }]
}
```

### Call G: EVALUATOR (quality gate for high-stakes outputs)

Applied before writing `recommendation` or `escalate` action types:

```json
{
  "model": "claude-sonnet-4-6",
  "max_tokens": 256,
  "temperature": 0,
  "system": "You are a quality reviewer for HR AI outputs. Check if the provided analysis meets Humind's quality bar. Return JSON only.",
  "messages": [{
    "role": "user",
    "content": "Review this AI-generated HR output and return JSON:\n{\n  \"pass\": <true|false>,\n  \"quality_score\": <0-100>,\n  \"issues\": [<list of problems if any>],\n  \"override_action_type\": <null | \"update_only\" if quality too low to escalate>\n}\n\nQuality criteria:\n- Recommendations must be specific and actionable\n- No hallucinated employee data\n- Tone is professional and objective\n- All required JSON fields are present and non-empty\n\nOutput to review:\n{{specialist_output}}"
  }]
}
```

---

## 5. Workflow State Machine

```
                    ┌─────────┐
                    │ PENDING │  ← record created / form submitted
                    └────┬────┘
                         │ Make picks up
                         ▼
                  ┌──────────────┐
                  │  PROCESSING  │  ← router + specialist running
                  └──────┬───────┘
           ┌─────────────┼─────────────┐
           ▼             ▼             ▼
        ┌──────┐   ┌──────────┐  ┌─────────┐
        │ DONE │   │ESCALATED │  │  ERROR  │
        └──────┘   └──────────┘  └────┬────┘
                                       │ retry ×2
                                       ▼
                                  ┌─────────┐
                                  │ ERROR   │  (permanent, needs human review)
                                  └─────────┘
```

Time-based resume (via `workflow_states.next_action_at`):
- Onboarding: 7-day check-in → re-trigger onboarding scenario
- Performance: 90-day follow-up → re-trigger performance scenario
- Engagement: 30-day resurvey reminder → trigger form resend

---

## 6. Handoff Contracts

Every Make HTTP call to Claude includes this envelope:

```json
{
  "workflow_id": "humind-v1",
  "scenario": "{{scenario_name}}",
  "record_id": "{{record_id}}",
  "employee_id": "{{employee_id}}",
  "call_type": "{{router|specialist|evaluator}}",
  "context": {
    "employee_memory": "{{employee_memory_context}}",
    "department": "{{department}}",
    "tenure_days": "{{tenure_days}}"
  },
  "constraints": {
    "response_format": "json_only",
    "max_tokens": 2000,
    "temperature": 0
  },
  "budget_tokens": 2000,
  "timeout_seconds": 45
}
```

---

## 7. Error Handling Matrix

| Failure | Retry | Airtable | Notification |
|---------|-------|----------|-------------|
| Claude API timeout (>45s) | ×2 exponential | `error` after 3 | — |
| Non-JSON response | ×1 with stricter prompt | `error` + log raw | — |
| Evaluator rejects output | ×1 regeneration | keep `processing` | — |
| Evaluator rejects twice | none | `escalated` | Slack HR manager |
| Unknown route type | none | `error` | Slack HR ops |
| Airtable write fails | ×2 | scenario log only | Slack HR ops |
| `flight_risk_score` > 80 | n/a | `escalated` | Slack HR manager (immediate) |

---

## 8. Setup Checklist

### Phase 1 — Airtable
- [ ] Create all 5 tables: `hr_records`, `employees`, `workflow_states`, `ai_memory`, `audit_log`
- [ ] Add native Airtable automation: new `hr_records` row → set `ai_status = "pending"`
- [ ] Configure linked fields between tables
- [ ] Create views: "Pending AI", "Escalated", "Done Today", per-domain views

### Phase 2 — Make
- [ ] Create `humind-orchestrator` scenario with Airtable trigger
- [ ] Store `ANTHROPIC_API_KEY` as a Make connection (HTTP custom connection)
- [ ] Create Scenario 2–7 with webhook triggers
- [ ] Create Scenario 8 (daily memory refresh, scheduled)
- [ ] Configure error handlers on every scenario

### Phase 3 — Claude Prompts
- [ ] Test each prompt template against real sample data
- [ ] Confirm JSON parse works for each response shape
- [ ] Add `required` field validation in Make JSON parser
- [ ] Tune `max_tokens` per call type after initial tests

### Phase 4 — Notifications
- [ ] Connect Slack to Make (or Email)
- [ ] Define escalation recipients per department
- [ ] Set up flight risk Slack alert channel

### Phase 5 — Monitoring
- [ ] Build Airtable view: tokens_used per day (from `audit_log`)
- [ ] Set Make scenario execution alerts (failure rate > 5%)
- [ ] Weekly digest: records processed, escalation rate, avg score per type

---

## 9. Cost & Scale Estimates

| Call type | Avg input tokens | Avg output tokens | Calls/day (100 records) |
|-----------|-----------------|-------------------|-------------------------|
| Router | ~300 | ~80 | 100 |
| Specialist | ~800 | ~600 | 100 |
| Evaluator (high-stakes only, ~30%) | ~900 | ~150 | 30 |
| Memory refresh (per employee) | ~1200 | ~400 | 50 |

**Estimated daily token usage:** ~430,000 tokens → ~$0.65/day at Sonnet pricing (100 employees, 100 daily records).

---

## 10. Future Integrations (extension points)

| System | Make connector | What it feeds |
|--------|---------------|--------------|
| Google Forms / Typeform | Native | `hr_records.raw_input` |
| Slack | Native | HR request capture, notifications |
| HRIS (BambooHR, Workday) | Webhook/API | `employees` sync |
| ATS (Greenhouse, Lever) | Webhook | `recruiting` record creation |
| Google Calendar | Native | Onboarding meeting scheduling |
| Notion | Native | Knowledge base for HR policies |
| DocuSign | Native | Offer letter / contract triggers |
