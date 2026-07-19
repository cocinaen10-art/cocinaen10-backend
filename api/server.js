
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
app.get("/recipes/decision", async (req, res) => {
  try {
    console.log("DECISION INICIO");

    const ingredientes = req.query.ing || "huevos, pan";

    console.log("Ingredientes:", ingredientes);

    res.json({
      needsDecision: true,
      methods: [
        {
          id: "airfryer",
          name: "Freidora de aire",
          description: "Acabado crujiente con muy poco aceite."
        },
        {
          id: "oven",
          name: "Horno",
          description: "Cocina todos los ingredientes al mismo tiempo."
        },
        {
          id: "pan",
          name: "Sartén",
          description: "La opción más rápida para una comida casera."
        }
      ]
    });

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

    const ingredientes = req.query.ing || "huevos, pan";
    const method = req.query.method || "";

    console.log("================================");
    console.log("REQUEST /recipes");
    console.log("Ingredientes:", ingredientes);
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
        input: `Tengo estos ingredientes: ${ingredientes}.

Método de cocción elegido (código interno): ${method}

Equivalencias:

- airfryer = freidora de aire
- oven = horno
- pan = sartén

Debes utilizar EXCLUSIVAMENTE el método indicado por ese código.

Si el código es "airfryer", toda la receta debe hacerse en freidora de aire.

Si el código es "oven", toda la receta debe hacerse en horno.

Si el código es "pan", toda la receta debe hacerse en sartén.

No cambies de método durante la receta.

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
- ingredientes_extra
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
    "ingredientes_extra": [],
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

    console.log("RESPUESTA COMPLETA OPENAI:");
    console.log(JSON.stringify(data, null, 2));

    console.log("OUTPUT_TEXT:");
    console.log(data.output_text);

    console.log("JSON EXTRAIDO:");
    console.log(extraerJSONSeguro(data));

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
    console.log("CATEGOIA:", parsed.opcion_1);

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