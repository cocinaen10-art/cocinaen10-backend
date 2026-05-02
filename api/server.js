const express = require("express");
const cors = require("cors");

const app = express();

// ✅ CORS robusto (clave para FlutterFlow + ngrok)
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

// 🔧 Extraer JSON de texto (Gemini a veces mete basura)
function extractJSON(text) {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? match[0] : null;
  } catch {
    return null;
  }
}

// 🔧 Endpoint principal
app.post("/generateRecipe", async (req, res) => {
  try {
    const { ingredients, diet } = req.body;
    const time = parseInt(req.body.time);

    // ✅ Validación fuerte
    if (!ingredients || !diet || isNaN(time)) {
      return res.status(400).json({
        error: "Datos inválidos",
        received: req.body
      });
    }

    const ingredientsList = Array.isArray(ingredients)
      ? ingredients
      : ingredients.split(",");

    const prompt = `
Eres un generador de recetas para una app móvil.

Devuelve SOLO JSON válido.

Ingredientes: ${ingredientsList.join(", ")}
Tiempo: ${time}
Dieta: ${diet}

Formato:
{
  "recipe_name": "",
  "prep_time": "",
  "difficulty": "",
  "used_ingredients": [],
  "extra_ingredients": [],
  "steps": [
    {
      "step": 1,
      "instruction": "",
      "time": ""
    }
  ],
  "tips": ""
}
`;

    // ✅ Llamada a Gemini con API KEY desde .env
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=AIzaSyBBGqQP1fYpY_pNgaZJE8mq5vfb9199F1E`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ]
        })
      }
    );

    const data = await response.json();

    // 🔍 DEBUG (muy importante si falla)
    console.log("Gemini RAW:", JSON.stringify(data, null, 2));

    const rawText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return res.status(500).json({
        error: "Gemini no devolvió texto",
        data
      });
    }

    let jsonString = extractJSON(rawText);

    if (!jsonString) {
      return res.status(500).json({
        error: "No se pudo extraer JSON",
        rawText
      });
    }

    // limpiar markdown ```json
    jsonString = jsonString
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    let parsed;

    try {
      parsed = JSON.parse(jsonString);
    } catch (e) {
      return res.status(500).json({
        error: "JSON inválido",
        jsonString
      });
    }

    return res.json(parsed);

  } catch (error) {
    console.error("ERROR:", error);
    return res.status(500).json({
      error: "Error interno",
      message: error.message
    });
  }
});

// 🔧 Ruta test para comprobar conexión
app.get("/", (req, res) => {
  res.send("Servidor activo");
});

// 🔧 Arranque
app.listen(3000, () => {
  console.log("Servidor funcionando en http://localhost:3000");
});