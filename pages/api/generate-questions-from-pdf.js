export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { fileUrl, activityType } = req.body;
  if (!fileUrl) return res.status(400).json({ error: "No file provided" });

  try {
    const pdfRes = await fetch(fileUrl);
    if (!pdfRes.ok) throw new Error("Could not download the uploaded file");
    const buffer = Buffer.from(await pdfRes.arrayBuffer());

    const pdfParse = (await import("pdf-parse")).default;
    const parsed = await pdfParse(buffer);
    const text = parsed.text.slice(0, 15000);

    if (!text.trim()) {
      return res.status(400).json({ error: "Could not extract any text from this PDF, it may be a scanned image." });
    }

    const aiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: `You are helping a facilitator create ${activityType} questions from their course material below. Read it and generate 4-6 clear, specific questions a learner should be able to answer after reading this material. Respond with ONLY a JSON array of question strings, nothing else, no markdown formatting.\n\nMaterial:\n${text}`,
        }],
      }),
    });

    const aiData = await aiRes.json();
    if (!aiRes.ok) throw new Error(aiData.error?.message || "AI request failed");

    const raw = aiData.choices?.[0]?.message?.content || "[]";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const questions = JSON.parse(cleaned);

    res.status(200).json({ questions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}