const express = require("express");
const cors = require("cors");
const app = express();
const recipeImages = require("../data/recipeImages");

app.use(cors());
app.use(express.json());

// 🔹 API KEY (una sola)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// 🔹 Ruta tAest
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
    "lechuga",
    "patata",
    "atun",
    "zanahoria",
    "pimiento",
    "jamon",
    "bacon",
    "nata",
    "mantequilla",
    "champinones",
    "maiz",
    "lomo",
    "salchichas",
    "pepino",
    "calabacin",
    "berenjena",
    "lentejas",
    "garbanzos",
    "judias",
    "salmon",
    "merluza",
    "gambas",
    "jamon york",
    "puerro",
    "alubias rojas",

  ];

  const resultados = ingredientes.filter(
    i => i.startsWith(q)
  );

  res.json(resultados);
});

// 🔹 FUNCIÓN UNIVERSAL (clave)
function extraerJSONSeguro(data) {
  let raw = data.output_text;

  if (!raw && data.output && data.output[0]?.content) {
    raw = data.output[0].content
      .map(c => c.text || "")
      .join("");
  }

  if (!raw) return null;

  raw = raw.replace(/```json/g, "").replace(/```/g, "").trim();

  const inicio = raw.indexOf("{");
  const fin = raw.lastIndexOf("}");

  if (inicio === -1 || fin === -1) return null;

  return raw.substring(inicio, fin + 1);
}
function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

const recipeImages = {
  pollo: [
    "https://images.unsplash.com/photo-1604503468506-a8da13d82791",
    "https://images.unsplash.com/photo-1587593810167-a84920ea0781",
    "https://images.unsplash.com/photo-1527477396000-e27163b481c2",
  ],
};
function getImageForRecipe(nombre) {

  const texto = nombre.toLowerCase();
  if (
  texto.includes("salteado")
) {
  return "https://images.unsplash.com/photo-1512058564366-18510be2db19";
}
  
  if (
    texto.includes("pasta")
  ) {
    return getRandomItem(recipeImages.pasta);
  }

  if (
    texto.includes("arroz")
  ) {
    return "https://images.unsplash.com/photo-1512058564366-18510be2db19";
  }

  if (
    texto.includes("pizza")
  ) {
    return "https://images.unsplash.com/photo-1513104890138-7c749659a591";
  }

  if (
    texto.includes("ensalada")
  ) {
    return "https://images.unsplash.com/photo-1546793665-c74683f339c1";
  }

  if (
    texto.includes("pescado") ||
    texto.includes("salmon") ||
    texto.includes("merluza")
  ) {
    return "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2";
  }
  if (
    texto.includes("pollo")
  ) {
    return getRandomItem(recipeImages.pollo);
  }
    return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c";
  }

// 🔹 RECETAS (Modo ingredientes)
app.get("/recipes", async (req, res) => {
  try {
    console.log("RECETA INICIO");

    const ingredientes = req.query.ing || "huevos, pan";

    console.log("OPENAI REQUEST");

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: `Tengo estos ingredientes: ${ingredientes}.

Quiero 1 receta REALISTA, rápida y práctica.

La receta debe parecer escrita por alguien que cocina en casa.

IMPORTANTE:
- NO uses frases genéricas
- NO digas "según las instrucciones del paquete"
- NO digas "al gusto"
- NO des consejos vagos
- Da cantidades y tiempos concretos cuando tenga sentido
- Usa pasos cortos y claros
- Cocina simple y realista
- Máximo 5 pasos
- La receta debe sentirse rápida, útil y humana

Devuelve SOLO JSON:
{
  "opcion_1": {
    "nombre": "",
    "tiempo": "",
    "coste": "",
    "por_que": "",
    "ingredientes_usados": [],
    "ingredientes_extra": [],
    "pasos": []
  }
}`
      })
    });

    console.log("OPENAI RESPONSE");

    const data = await response.json();

    const limpio = extraerJSONSeguro(data);

    if (!limpio) {
      return res.json({ error: "No se pudo extraer JSON" });
    }

    let parsed;

    try {
      parsed = JSON.parse(limpio);
    } catch (e) {
      return res.json({ error: "JSON inválido", raw: limpio });
    }

    console.log("RESPUESTA ENVIADA");

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
        input: `Quiero una receta basada en: ${idea}.

Devuelve SOLO JSON:
{
  "nombre": "",
  "tiempo": "",
  "coste": "",
  "ingredientes": [],
  "pasos": []
}`
      })
    });

    console.log("OPENAI RESPONSE");

    const data = await response.json();

    const limpio = extraerJSONSeguro(data);

    if (!limpio) {
      return res.json({ error: "No se pudo extraer JSON" });
    }

    let parsed;

    try {
      parsed = JSON.parse(limpio);
    } catch (e) {
      return res.json({ error: "JSON inválido", raw: limpio });
    }

    res.json(parsed);

    console.log("RESPUESTA ENVIADA");

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