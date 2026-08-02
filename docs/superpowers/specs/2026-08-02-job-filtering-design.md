# Job Filtering: Eligibility Exclusion + Indeed Prioritization

Date: 2026-08-02
Status: Approved

## Problem

The job search automation (`workflows/local/job-application-assistant.workflow.ts`) surfaces two issues in the digest email:

1. Some selected jobs require work authorization tied to a specific country (e.g. "must be authorized to work in the US", "US citizens only") that the candidate (Turkey-based, no visa sponsorship) cannot satisfy. These currently pass through unfiltered.
2. Jobs from Indeed are not prioritized over other sources (LinkedIn, ZipRecruiter, direct ATS links) in the digest, even though Indeed is the preferred/most trusted source.

Country display in the digest (`Ülke: Belirtilmemiş`) is explicitly out of scope — deprioritized by the user.

## Design

### 1. Eligibility exclusion (in `AgentJobsSelection`)

Add a new rule to the `AgentJobsSelection` system message (`job-application-assistant.workflow.ts:891`), following the same pattern as the existing tech-stack-fit rule (rule 5):

> If a job's description explicitly restricts eligibility to a specific country/region or citizenship as a hard requirement (e.g. "must be authorized to work in the US", "US citizens only", "must reside in EU/EEA"), exclude it entirely from the `jobs` output array. Do not exclude jobs that merely mention a company's HQ location or an optional/preferred location without a hard eligibility restriction.

This reuses the same description-reading pass the agent already does to populate the `country` field — no new node, no new data source.

### 2. Indeed prioritization (in `BuildSelectedJobsSource`)

Change the code node (`job-application-assistant.workflow.ts:694`) from a plain `.map()` to a stable sort (Indeed-tagged jobs first, original relative order preserved otherwise) before mapping to `{ job }` items:

```js
const jobs = $input.first().json.output.jobs;
const sorted = [...jobs].sort((a, b) => {
  const aIndeed = a.applySite === 'Indeed' ? 0 : 1;
  const bIndeed = b.applySite === 'Indeed' ? 0 : 1;
  return aIndeed - bIndeed;
});
return sorted.map((job) => ({ job }));
```

`Array.prototype.sort` in V8 (n8n's JS runtime) is stable, so relative order among non-Indeed and among Indeed jobs is preserved. This order flows through the loop into `AggregateJobApplications` and `BuildDigestEmail`, so Indeed jobs appear first in the digest email.

### Out of scope
- Country/eligibility display improvements in the digest email.
- Any change to how `country` is extracted or displayed.
- Hard-filtering to Indeed-only (explicitly rejected — deprioritize, don't exclude).

## Testing

1. Push the workflow (`n8nac push ... --verify`).
2. Trigger a run, inspect the `AgentJobsSelection` execution output — confirm no jobs with explicit country/citizenship restrictions appear in `jobs`.
3. Inspect `BuildSelectedJobsSource` output — confirm Indeed-sourced jobs are ordered first.
4. Confirm the digest email reflects the same ordering.
