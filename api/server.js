const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// Ruta test
app.get("/", (req, res) => {
  res.send("Servidor activo");
});

// Ruta control (la importante ahora)
app.get("/recipes", async (req, res) => {
  try {
    const ingredientes = req.query.ing || "huevos, pan";

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",

input: `Tengo estos ingredientes: ${ingredientes}.

Crea una receta práctica y rápida.

Devuelve SOLO JSON válido con este formato:
{
  "nombre": "",
  "ingredientes_usados": [],
  "ingredientes_extra": [],
  "pasos": []
}

Reglas:
- Usa principalmente los ingredientes dados
- Puedes añadir máximo 2 ingredientes básicos extra
- Pasos claros y numerados
- No escribas nada fuera del JSON`
      })
    });

    const data = await response.json();

    const raw = data.output?.[0]?.content?.[0]?.text || "";

// limpiar ```json
const limpio = raw
  .replace(/```json/g, "")
  .replace(/```/g, "")
  .trim();

let parsed;

try {
  parsed = JSON.parse(limpio);
} catch (e) {
  return res.json({ error: "JSON inválido", raw: limpio });
}

return res.json(parsed);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error llamando a OpenAI" });
  }
});

// Arranque
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor en puerto ${PORT}`);
});