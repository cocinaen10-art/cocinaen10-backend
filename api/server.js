const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// --- helper: extraer texto de respuesta OpenAI de forma robusta ---
function extractText(data) {
  // 1) campo oficial simplificado
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  // 2) recorrer estructura completa
  if (Array.isArray(data.output)) {
    const texts = [];
    for (const item of data.output) {
      if (Array.isArray(item.content)) {
        for (const c of item.content) {
          if (c && typeof c.text === "string") {
            texts.push(c.text);
          }
        }
      }
    }
    if (texts.length) return texts.join("\n").trim();
  }

  return null;
}

// --- ruta test ---
app.get("/", (req, res) => {
  res.send("Servidor activo");
});

// --- endpoint IA ---
app.get("/recipes", (req, res) => {
  res.json({ ok: true });
});

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: `Dame una receta sencilla usando ${ingrediente}. Solo nombre y pasos claros.`,
      }),
    });

    const data = await response.json();

    // si OpenAI devuelve error
    if (!response.ok) {
      console.error("OpenAI error:", data);
      return res.status(500).json({
        error: "Error en OpenAI",
        detalle: data.error?.message || "Desconocido",
      });
    }

    const texto = extractText(data);

    if (!texto) {
      console.error("Respuesta inesperada:", JSON.stringify(data, null, 2));
      return res.json({ receta: "No se pudo generar receta" });
    }

    return res.json({ receta: texto });

  } catch (error) {
    console.error("ERROR servidor:", error);
    return res.status(500).json({
      error: "Error interno",
      detalle: error.message,
    });
  }
});

// --- arranque ---
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor en puerto ${PORT}`);
});