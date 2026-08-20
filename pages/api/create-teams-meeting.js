import { createAdminClient } from "../../lib/supabase/admin";
import { createServerClient } from "@supabase/ssr";

async function getGraphToken() {
  const res = await fetch(`https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.AZURE_CLIENT_ID,
      client_secret: process.env.AZURE_CLIENT_SECRET,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || "Could not authenticate with Microsoft");
  return data.access_token;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => Object.entries(req.cookies).map(([name, value]) => ({ name, value })),
        setAll: () => {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  const { subject, startDateTime, endDateTime, institutionId } = req.body;
  const admin = createAdminClient();

  const { data: institution } = await admin
    .from("institutions")
    .select("teams_organizer_email")
    .eq("id", institutionId)
    .single();

  if (!institution?.teams_organizer_email) {
    return res.status(400).json({ error: "This institution hasn't set a Teams organizer email yet. Set it in Institution Settings." });
  }

  try {
    const token = await getGraphToken();

    const meetingRes = await fetch(
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(institution.teams_organizer_email)}/onlineMeetings`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject,
          startDateTime,
          endDateTime,
        }),
      }
    );

    const meetingData = await meetingRes.json();
    if (!meetingRes.ok) {
      throw new Error(meetingData.error?.message || "Microsoft Graph rejected the meeting request");
    }

    res.status(200).json({ joinUrl: meetingData.joinWebUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}