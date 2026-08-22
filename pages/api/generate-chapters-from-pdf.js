export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { fileUrl } = req.body;
  if (!fileUrl) return res.status(400).json({ error: "No file provided" });

  try {
    const pdfRes = await fetch(fileUrl);
    if (!pdfRes.ok) throw new Error("Could not download the uploaded file");
    const buffer = Buffer.from(await pdfRes.arrayBuffer());

    const pdfParse = (await import("pdf-parse")).default;
    const parsed = await pdfParse(buffer);
    const text = parsed.text.slice(0, 20000);

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
        max_tokens: 3000,
        messages: [{
          role: "user",
          content: `Split this learner guide material into logical chapters a learner can read one at a time. Each chapter needs a short title and its own content (a rewritten, well-organized summary of that section, not the raw text verbatim). Aim for 4-8 chapters depending on the material's length. Respond with ONLY a JSON array like [{"title": "...", "content": "..."}], nothing else, no markdown formatting.\n\nMaterial:\n${text}`,
        }],
      }),
    });

    const aiData = await aiRes.json();
    if (!aiRes.ok) throw new Error(aiData.error?.message || "AI request failed");

    const raw = aiData.choices?.[0]?.message?.content || "[]";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const chapters = JSON.parse(cleaned);

    res.status(200).json({ chapters });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}