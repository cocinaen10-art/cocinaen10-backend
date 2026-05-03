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
app.get("/recipes", (req, res) => {
  res.json({ ok: true });
});

// Arranque
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor en puerto ${PORT}`);
});