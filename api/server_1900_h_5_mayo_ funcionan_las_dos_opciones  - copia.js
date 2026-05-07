const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// 🔹 API KEY (UNA SOLA VEZ)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// 🔹 Ruta test
app.get("/", (req, res) => {
  res.send("Servidor activo");
});

// 🔹 Ingredientes (buscador)
app.get("/ingredients", (req, res) => {
  const q = (req.query.q || "").toLowerCase();

  const ingredientes = [
    "huevos",
    "pan",
    "queso",
    "leche",
    "aceite",
    "tomate",
    "pollo",
    "arroz",
    "pasta",
    "cebolla",
    "ajo",
    "lechuga"
  ];

  const resultados = ingredientes.filter(i => i.includes(q));

  res.json(resultados);
});

// 🔹 RECETAS (Modo ingredientes)
app.get("/recipes", async (req, res) => {
  try {
    const ingredientes = req.query.ing || "huevos, pan";

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: `Tengo estos ingredientes: ${ingredientes}.

Quiero 2 recetas REALISTAS, rápidas y prácticas para una persona normal.

Condiciones IMPORTANTES:
- Usa principalmente los ingredientes dados
- Puedes añadir máximo 2 ingredientes básicos extra (sal, aceite, etc.)
- NO inventes ingredientes raros
- Las recetas deben ser cosas que alguien haría en casa de verdad
- Prioriza simplicidad y rapidez

Devuelve SOLO JSON válido con este formato:
{
  "opcion_1": {
    "nombre": "",
    "tiempo": "",
    "coste": "",
    "por_que": "",
    "ingredientes_usados": [],
    "ingredientes_extra": [],
    "pasos": []
  },
  "opcion_2": {
    "nombre": "",
    "tiempo": "",
    "coste": "",
    "por_que": "",
    "ingredientes_usados": [],
    "ingredientes_extra": [],
    "pasos": []
  }
}

Reglas:
- Tiempo en minutos (ej: "10 min")
- Coste: bajo, medio o alto
- "por_que": explica por qué elegir esa receta
- Pasos claros, cortos y prácticos
- No escribas nada fuera del JSON`
      })
    });

    const data = await response.json();

    let raw = data.output_text;

    if (!raw && data.output && data.output[0]?.content) {
      raw = data.output[0].content
        .map(c => c.text || "")
        .join("");
    }

    const limpio = raw
      ?.replace(/```json/g, "")
      ?.replace(/```/g, "")
      ?.trim();

    let parsed;

    try {
      parsed = JSON.parse(limpio);
    } catch (e) {
      return res.json({ error: "JSON inválido", raw: limpio });
    }

    res.json(parsed);

  } catch (error) {
    console.error(error);
    res.json({ error: "Error generando receta" });
  }
});

// 🔹 RECETAS POR IDEA
app.get("/recipes-idea", async (req, res) => {
  try {
    const idea = req.query.q || "receta fácil";

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: `Quiero una receta basada en esta idea: ${idea}.

Devuelve SOLO JSON válido con este formato:
{
  "nombre": "",
  "tiempo": "",
  "coste": "",
  "ingredientes": [],
  "pasos": []
}

Reglas:
- Ingredientes realistas y fáciles de conseguir
- Receta práctica, no gourmet
- Pasos claros y ordenados
- Tiempo en minutos
- No escribas nada fuera del JSON`
      })
    });

    const data = await response.json();

    let raw = data.output_text;

    if (!raw && data.output && data.output[0]?.content) {
      raw = data.output[0].content
        .map(c => c.text || "")
        .join("");
    }

    const limpio = raw
      ?.replace(/```json/g, "")
      ?.replace(/```/g, "")
      ?.trim();

    const parsed = JSON.parse(limpio);

    res.json(parsed);

  } catch (error) {
    console.error(error);
    res.json({ error: "Error generando receta por idea" });
  }
});

// 🔹 Arranque
const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Servidor en puerto ${PORT}`);
});