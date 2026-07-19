
const express = require("express");
const cors = require("cors");
const app = express();
const recipeImages = require("../data/recipeImages");

app.use(cors());
app.use(express.json());

// 🔹 API KEY (una sola)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

console.log("OPENAI_API_KEY:", OPENAI_API_KEY ? "CARGADA" : "NO CARGADA");

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

  if (!raw && Array.isArray(data.output)) {
    raw = data.output
      .flatMap(o => o.content || [])
      .map(c => c.text?.trim?.() || c.text || "")
      .join("\n");
  }

  if (!raw) return null;

  raw = raw.replace(/```json/gi, "").replace(/```/g, "").trim();

  const inicio = raw.indexOf("{");
  const fin = raw.lastIndexOf("}");

  if (inicio === -1 || fin === -1) return null;

  return raw.substring(inicio, fin + 1);
}
function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

const cookingMethods = [
  {
    id: "no_cook",
    name: "Sin cocción",
    description: "Para preparar una ensalada o un plato frío al momento.",
    keywords: ["lechuga", "pepino", "tomate", "maiz", "atun", "queso", "jamon york"],
  },
  {
    id: "airfryer",
    name: "Freidora de aire",
    description: "Para ingredientes que quedan bien dorados y crujientes.",
    keywords: ["pollo", "patata", "salchichas", "lomo", "bacon", "calabacin", "berenjena", "zanahoria", "garbanzos", "pimiento", "gambas"],
  },
  {
    id: "oven",
    name: "Horno",
    description: "Para asar y cocinar los ingredientes de forma uniforme.",
    keywords: ["pollo", "patata", "salchichas", "lomo", "bacon", "calabacin", "berenjena", "zanahoria", "pimiento", "tomate", "puerro", "salmon", "merluza", "gambas", "queso"],
  },
  {
    id: "pan",
    name: "Sartén",
    description: "La opción rápida para saltear, dorar o hacer una tortilla.",
    keywords: ["huevos", "pan", "queso", "pollo", "arroz", "pasta", "cebolla", "ajo", "patata", "atun", "zanahoria", "pimiento", "jamon", "bacon", "nata", "mantequilla", "champinones", "maiz", "lomo", "salchichas", "calabacin", "berenjena", "lentejas", "garbanzos", "judias", "salmon", "merluza", "gambas", "jamon york", "puerro", "alubias rojas", "tomate", "leche", "aceite"],
  },
];

function normalizarIngredientes(texto) {
  return texto.split(",").map((ingrediente) => ingrediente.trim().toLowerCase()).filter(Boolean);
}

function metodosCompatibles(ingredientes) {
  return cookingMethods
    .filter((method) => ingredientes.some((ingredient) => method.keywords.includes(ingredient)))
    .map(({ keywords, ...method }) => method);
}

function getImageForRecipe(categoria) {

  try {
    const texto = (categoria || "").toLowerCase();

    // 🔴 PRIORIDAD 1: pollo
    if (texto.includes("pollo")) {
      return getRandomItem(recipeImages.pollo);
    }

    // 🔴 PRIORIDAD 2: pescado
    if (
      texto.includes("salmon") ||
      texto.includes("merluza") ||
      texto.includes("pescado")
    ) {
      return "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2";
    }

    // 🔴 PRIORIDAD 3: pasta
    if (texto.includes("pasta") || texto.includes("espagueti")) {
      return getRandomItem(recipeImages.pasta);
    }

    // 🔴 PRIORIDAD 4: arroz
    if (texto.includes("arroz")) {
      return getRandomItem(recipeImages.arroz);
    }

    // 🔴 PRIORIDAD 5: ensalada
    if (texto.includes("ensalada")) {
      return "https://images.unsplash.com/photo-1546793665-c74683f339c1";
    }

    // 🔴 fallback seguro
    return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c";

  } catch (e) {
    return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c";
  }
}

function optimizarImagen(url) {
  const imageUrl = new URL(url);
  imageUrl.searchParams.set("auto", "format");
  imageUrl.searchParams.set("fit", "crop");
  imageUrl.searchParams.set("w", "900");
  imageUrl.searchParams.set("q", "80");
  return imageUrl.toString();
}
app.get("/recipes/decision", async (req, res) => {
  try {
    const ingredientes = normalizarIngredientes(req.query.ing || "");
    if (ingredientes.length === 0) {
      return res.status(400).json({ error: "Añade al menos un ingrediente." });
    }

    const methods = metodosCompatibles(ingredientes);
    res.json({ needsDecision: methods.length > 1, methods });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error al decidir el método de cocción."
    });
  }
});
// 🔹 RECETAS (Modo ingredientes)
app.get("/recipes", async (req, res) => {
  try {
    console.log("RECETA INICIO");

    const ingredientes = normalizarIngredientes(req.query.ing || "");
    const method = req.query.method || "";

    if (ingredientes.length === 0) {
      return res.status(400).json({ error: "Añade al menos un ingrediente." });
    }

    const compatibleMethods = metodosCompatibles(ingredientes);
    if (!compatibleMethods.some((item) => item.id === method)) {
      return res.status(400).json({
        error: "Ese método no es compatible con los ingredientes elegidos.",
      });
    }

    console.log("================================");
    console.log("REQUEST /recipes");
    console.log("Ingredientes:", ingredientes.join(", "));
    console.log("Método:", method);
    console.log("URL:", req.originalUrl);
    console.log("================================");

    console.log("OPENAI REQUEST");
    console.log("Método recibido:", method);
    console.log("URL:", req.originalUrl);

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: `Tengo estos ingredientes: ${ingredientes.join(", ")}.

Método de cocción elegido (código interno): ${method}

Equivalencias:

- airfryer = freidora de aire
- oven = horno
- pan = sartén
- no_cook = sin cocción

Debes utilizar EXCLUSIVAMENTE el método indicado por ese código.

Si el código es "airfryer", toda la receta debe hacerse en freidora de aire.

Si el código es "oven", toda la receta debe hacerse en horno.

Si el código es "pan", toda la receta debe hacerse en sartén.

Si el código es "no_cook", crea una receta fría y no uses ningún aparato de cocción.

No cambies de método durante la receta.

Quiero 1 receta REALISTA, rápida y práctica.

La receta debe parecer escrita por alguien que cocina en casa.

DESPENSA BÁSICA SIEMPRE DISPONIBLE:
- Puedes usar aceite, sal, vinagre, agua y pimienta cuando sean necesarios
  para que la receta sea realista. No hace falta que aparezcan en la lista del usuario.
- No añadas ningún otro ingrediente que no esté en la lista del usuario.
- En "ingredientes_usados", escribe solo los nombres exactos de los
  ingredientes recibidos por el usuario. Nunca incluyas los básicos de cocina,
  aunque los hayas usado en los pasos.
- NO uses frases genéricas
- NO digas "según las instrucciones del paquete"
- NO digas "al gusto"
- NO des consejos vagos
- Da cantidades y tiempos concretos cuando tenga sentido
- Usa pasos cortos y claros
- Cocina simple y realista
- Máximo 5 pasos
- La receta debe sentirse rápida, útil y humana
- Añade también una categoria de la receta: huevo, pollo, pasta, arroz, pescado o ensalada.

Devuelve SOLO JSON EXACTO, sin excepciones.

OBLIGATORIO:

El JSON debe incluir SIEMPRE estos campos:

- nombre
- categoria
- tiempo
- personas
- dificultad
- coste
- por_que
- ingredientes_usados
- pasos
- truco

Reglas:

- "categoria" solo puede ser:
  huevo | pollo | pasta | arroz | pescado | ensalada | otros

- "personas" es obligatorio.
  Debe ser un número entero que indique las raciones reales de la receta.

Ejemplos válidos:
1
2
4
6

Nunca escribas "persona" ni "personas".
Devuelve únicamente el número.

- "dificultad" es obligatoria.
  Solo puede contener uno de estos valores:
  Fácil
  Media
  Difícil

No omitas ningún campo del JSON.

Todos los campos son obligatorios.

Si no conoces un valor, genera el valor más razonable según la receta.

Nunca elimines un campo del JSON.

Formato exacto:

{
  "opcion_1": {
    "nombre": "",
    "categoria": "",
    "tiempo": "",
    "personas": 0,
    "dificultad": "",
    "coste": "",
    "por_que": "",
    "ingredientes_usados": [],
    "pasos": [],
    "truco": ""
  }
}

El campo "categoria" es OBLIGATORIO y debe ser uno de estos valores:
huevo, pollo, pasta, arroz, pescado, ensalada.`,

      })
    });

    console.log("OPENAI RESPONSE");

    const data = await response.json();

    if (!response.ok) {
      console.error("Error de OpenAI:", data.error?.message || response.status);
      return res.status(502).json({ error: "No se pudo crear la receta." });
    }

    const limpio = extraerJSONSeguro(data);

    if (!limpio) {
      return res.status(502).json({ error: "No se pudo crear una receta válida." });
    }

    let parsed;

    try {
      parsed = JSON.parse(limpio);
    } catch (e) {
      return res.status(502).json({ error: "No se pudo crear una receta válida." });
    }
    const recipe = parsed.opcion_1;
    if (!recipe || !Array.isArray(recipe.ingredientes_usados)) {
      return res.status(502).json({ error: "La receta recibida no tiene un formato válido." });
    }

    const usaIngredienteNoDisponible = recipe.ingredientes_usados.some((ingredient) =>
      !ingredientes.includes(String(ingredient).trim().toLowerCase()),
    );

    if (usaIngredienteNoDisponible) {
      return res.status(502).json({ error: "La receta incluía ingredientes no disponibles." });
    }

    console.log("RESPUESTA ENVIADA");

    res.json(parsed);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error generando receta" });
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
    console.log("JSON LIMPIO:");
    console.log(limpio);

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
