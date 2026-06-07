import { Resend } from "resend";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type DigestMatch = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  source_url: string;
  overall: number;
  fit_summary: string | null;
};

function appUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "https://diana-job-huntress.vercel.app"
  );
}

function scoreColor(score: number) {
  if (score >= 8) return "#4CAF50";
  if (score >= 6) return "#FBBC05";
  return "#EF5350";
}

function renderHtml(candidateName: string, matches: DigestMatch[]) {
  const base = appUrl();
  const rows = matches
    .map(
      (m) => `
    <tr>
      <td style="padding:16px 0;border-bottom:1px solid #1a2340;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="vertical-align:top;">
              <a href="${base}/jobs/${m.id}" style="color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;">${m.title}</a>
              <div style="color:#8aa;font-size:13px;margin-top:2px;">${m.company}${m.location ? ` · ${m.location}` : ""}</div>
            </td>
            <td style="vertical-align:top;text-align:right;white-space:nowrap;">
              <span style="display:inline-block;background:${scoreColor(m.overall)}22;color:${scoreColor(m.overall)};font-weight:700;font-size:13px;padding:4px 10px;border-radius:999px;">${m.overall}/10</span>
            </td>
          </tr>
          ${
            m.fit_summary
              ? `<tr><td colspan="2" style="color:#a8b3cf;font-size:13px;line-height:1.5;padding-top:8px;">${m.fit_summary}</td></tr>`
              : ""
          }
          <tr><td colspan="2" style="padding-top:10px;">
            <a href="${base}/jobs/${m.id}" style="color:#4CAF50;font-size:13px;text-decoration:none;font-weight:600;">View &amp; apply →</a>
          </td></tr>
        </table>
      </td>
    </tr>`
    )
    .join("");

  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#0A0F1E;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0F1E;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#0F1629;border:1px solid #1a2340;border-radius:16px;padding:28px;">
        <tr><td>
          <div style="display:inline-block;background:#1B5E2033;border:1px solid #1B5E2055;border-radius:10px;padding:6px 12px;color:#4CAF50;font-weight:700;font-size:14px;">Diana</div>
          <h1 style="color:#ffffff;font-size:20px;margin:18px 0 4px;">Good news, ${candidateName} 👋</h1>
          <p style="color:#a8b3cf;font-size:14px;margin:0 0 8px;">Diana found <b style="color:#fff;">${matches.length}</b> strong ${matches.length === 1 ? "match" : "matches"} in today's scan.</p>
        </td></tr>
        <tr><td>
          <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
        </td></tr>
        <tr><td style="padding-top:20px;">
          <a href="${base}/dashboard" style="display:inline-block;background:#1B5E20;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 20px;border-radius:10px;">Open dashboard</a>
        </td></tr>
        <tr><td style="padding-top:18px;color:#5a6b8c;font-size:11px;">
          You're receiving this because daily digests are enabled. Manage this in Settings.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Send the daily digest of strong matches. Best-effort: returns false (rather
 * than throwing) when disabled, misconfigured, or there's nothing to send.
 */
export async function sendDigest(opts: {
  profileId: string;
  candidateName: string;
  matches: DigestMatch[];
}): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — skipping digest");
    return false;
  }

  const supabase = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: settings } = await supabase
    .from("settings")
    .select("digest_enabled, digest_recipient")
    .eq("profile_id", opts.profileId)
    .maybeSingle();

  if (!settings?.digest_enabled) return false;
  if (!settings.digest_recipient) return false;
  if (opts.matches.length === 0) return false;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.EMAIL_FROM || "Diana <onboarding@resend.dev>";

  const { error } = await resend.emails.send({
    from,
    to: settings.digest_recipient,
    subject: `Diana: ${opts.matches.length} new strong ${opts.matches.length === 1 ? "match" : "matches"}`,
    html: renderHtml(opts.candidateName, opts.matches),
  });

  if (error) {
    console.error("Resend error:", error);
    return false;
  }
  return true;
}
