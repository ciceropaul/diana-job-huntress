/**
 * Applicant Tracking System (ATS) detection.
 *
 * The platform a job lives on determines how (and whether) we can auto-apply.
 * See docs/auto-apply-plan.md for the full strategy. This util classifies a
 * job's source_url so the UI can show the right "Apply" affordance and so a
 * future apply-agent can pick the right adapter.
 */

export type AtsPlatform =
  | "greenhouse"
  | "lever"
  | "ashby"
  | "workday"
  | "rippling"
  | "smartrecruiters"
  | "icims"
  | "workable"
  | "linkedin"
  | "aggregator"
  | "unknown";

export type Automatability = "high" | "medium" | "low" | "manual";

export type AtsInfo = {
  platform: AtsPlatform;
  label: string;
  /** How feasible reliable automated form-fill is today. */
  automatability: Automatability;
  /** Whether the platform exposes a public posting/apply API we could use. */
  hasPublicApi: boolean;
  note: string;
};

const TABLE: Record<AtsPlatform, Omit<AtsInfo, "platform">> = {
  greenhouse: {
    label: "Greenhouse",
    automatability: "high",
    hasPublicApi: true,
    note: "Predictable structured forms; public job board API. Strong auto-fill candidate.",
  },
  lever: {
    label: "Lever",
    automatability: "high",
    hasPublicApi: true,
    note: "Clean, consistent application forms; postings API. Strong auto-fill candidate.",
  },
  ashby: {
    label: "Ashby",
    automatability: "high",
    hasPublicApi: true,
    note: "Modern structured forms; public posting API. Strong auto-fill candidate.",
  },
  workday: {
    label: "Workday",
    automatability: "low",
    hasPublicApi: false,
    note: "Multi-step wizard, account creation, heavy anti-bot. Hard; human-in-loop.",
  },
  rippling: {
    label: "Rippling ATS",
    automatability: "medium",
    hasPublicApi: false,
    note: "Proprietary but reasonably standard forms. Automatable with a custom adapter.",
  },
  smartrecruiters: {
    label: "SmartRecruiters",
    automatability: "medium",
    hasPublicApi: true,
    note: "Has an apply API; forms vary by employer.",
  },
  icims: {
    label: "iCIMS",
    automatability: "low",
    hasPublicApi: false,
    note: "Enterprise, inconsistent, anti-bot. Human-in-loop.",
  },
  workable: {
    label: "Workable",
    automatability: "medium",
    hasPublicApi: true,
    note: "Fairly standard forms; apply API exists.",
  },
  linkedin: {
    label: "LinkedIn",
    automatability: "low",
    hasPublicApi: false,
    note: "Easy Apply is login-gated and ToS-restricted for automation.",
  },
  aggregator: {
    label: "Job board",
    automatability: "manual",
    hasPublicApi: false,
    note: "Aggregator/redirect — resolve to the underlying ATS before applying.",
  },
  unknown: {
    label: "Company site",
    automatability: "manual",
    hasPublicApi: false,
    note: "Unrecognized host — likely a bespoke careers page. Manual or custom adapter.",
  },
};

export function detectAts(sourceUrl: string | null | undefined): AtsInfo {
  const url = (sourceUrl ?? "").toLowerCase();
  let platform: AtsPlatform = "unknown";

  if (url.includes("greenhouse.io") || url.includes("gh_jid=")) platform = "greenhouse";
  else if (url.includes("lever.co")) platform = "lever";
  else if (url.includes("ashbyhq.com")) platform = "ashby";
  else if (url.includes("myworkdayjobs.com") || url.includes("workday")) platform = "workday";
  else if (url.includes("ats.rippling.com")) platform = "rippling";
  else if (url.includes("smartrecruiters.com")) platform = "smartrecruiters";
  else if (url.includes("icims.com")) platform = "icims";
  else if (url.includes("workable.com")) platform = "workable";
  else if (url.includes("linkedin.com")) platform = "linkedin";
  else if (
    url.includes("builtin") ||
    url.includes("wearecapable.org") ||
    url.includes("indeed.com") ||
    url.includes("ziprecruiter.com") ||
    url.includes("glassdoor.com")
  )
    platform = "aggregator";

  return { platform, ...TABLE[platform] };
}
