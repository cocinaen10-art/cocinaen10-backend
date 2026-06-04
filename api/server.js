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
function getImageForRecipe(nombre) {
  // Convertimos el texto a minúsculas para buscar sin importar mayúsculas
  const texto = nombre.toLowerCase();
  
  // 1. EVALUAMOS PRIMERO COMBINACIONES ESPECÍFICAS DE POLLO (Subcategorías inteligentes)
  if (texto.includes("pollo")) {
    if (texto.includes("sopa") || texto.includes("caldo")) {
      return getRandomItem(recipeImages.sopaPollo);
    }
    if (texto.includes("arroz") || texto.includes("paella")) {
      return getRandomItem(recipeImages.arrozPollo);
    }
    if (texto.includes("pasta") || texto.includes("macarrones") || texto.includes("tallarines")) {
      return getRandomItem(recipeImages.pastaPollo);
    }
    if (texto.includes("ensalada")) {
      return getRandomItem(recipeImages.ensaladaPollo);
    }
    // Si la receta tiene pollo pero no es ninguna de las anteriores (ej: pollo asado, pechugas)
    return getRandomItem(recipeImages.polloGenerico);
  }

  // 2. CATEGORÍA: PASTA GENÉRICA
  if (texto.includes("pasta") || texto.includes("macarrones") || texto.includes("spaghetti") || texto.includes("tallarines")) {
    return getRandomItem(recipeImages.pastaGenerica);
  }

  // 3. CATEGORÍA: SOPAS GENÉRICAS (sin pollo)
  if (texto.includes("sopa") || texto.includes("caldo") || texto.includes("crema")) {
    return "https://images.unsplash.com/photo-1608500218808-335ca0c8afc8";
  }

  // 4. CATEGORÍA: ARROZ GENÉRICO (sin pollo)
  if (texto.includes("arroz")) {
    return "https://images.unsplash.com/photo-1512058564366-18510be2db19";
  }

  // 5. CATEGORÍA: PIZZA
  if (texto.includes("pizza")) {
    return "https://images.unsplash.com/photo-1513104890138-7c749659a591";
  }

  // 6. CATEGORÍA: ENSALADA GENÉRICA (sin pollo)
  if (texto.includes("ensalada")) {
    return "https://images.unsplash.com/photo-1546793665-c74683f339c1";
  }

  // 7. CATEGORÍA: PESCADOS
  if (texto.includes("pescado") || texto.includes("salmon") || texto.includes("merluza")) {
    return "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2";
  }

  // 8. COMODÍN / IMAGEN DE RESPALDO (Si la IA inventa algo que no encaja en lo anterior)
  return getRandomItem(recipeImages.comodin);
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

Quiero 2 recetas REALISTAS, rápidas y prácticas.

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
      parsed.opcion_1.imagen =
  getImageForRecipe(parsed.opcion_1.nombre);

  parsed.opcion_2.imagen =
    getImageForRecipe(parsed.opcion_2.nombre);
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