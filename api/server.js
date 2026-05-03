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
Crea una receta usando SOLO estos ingredientes o añadiendo como máximo 2 ingredientes básicos extra.
Receta simple, práctica y rápida.
Devuelve nombre y pasos.`
      })
    });

    const data = await response.json();

    const texto = data.output?.[0]?.content?.[0]?.text || "No se pudo generar receta";

return res.json({ receta: texto });

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