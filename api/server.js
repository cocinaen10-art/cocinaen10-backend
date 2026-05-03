app.get("/recipes", async (req, res) => {
  const ingrediente = req.query.ing || "genérico";

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: `Dame una receta sencilla usando ${ingrediente}. Solo nombre y pasos.`
      })
    });

    const data = await response.json();

    const texto =
      data.output?.[0]?.content?.[0]?.text ||
      "No se pudo generar receta";

    res.json({ receta: texto });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});