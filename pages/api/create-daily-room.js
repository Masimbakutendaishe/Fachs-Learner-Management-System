export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { weekTitle, sessionDatetime } = req.body;

  try {
    const exp = sessionDatetime
      ? Math.floor(new Date(sessionDatetime).getTime() / 1000) + 60 * 60 * 4
      : Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7;

    const roomRes = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        privacy: "public",
        properties: {
          exp,
          enable_chat: true,
          enable_screenshare: true,
          eject_at_room_exp: true,
        },
      }),
    });

    const roomData = await roomRes.json();
    if (!roomRes.ok) throw new Error(roomData.error || roomData.info || "Daily.co rejected the room request");

    res.status(200).json({ roomUrl: roomData.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}