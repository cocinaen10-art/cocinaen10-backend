const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const {
  app,
  aplicarPreferencias,
  leerPreferencias,
  cantidadesDeIngredientesValidas,
} = require("./server");

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

test("filtra exclusiones, alergias y dieta vegana", () => {
  const preferences = leerPreferencias({
    avoid: "tomate",
    allergies: "cacahuete",
    diet: "vegan",
  });

  assert.deepEqual(
    aplicarPreferencias(
      ["pollo", "tomate", "arroz", "queso", "cacahuete"],
      preferences,
    ),
    ["arroz"],
  );
});

test("decision calcula metodos solo con ingredientes compatibles", async () => {
  const url = new URL("/recipes/decision", baseUrl);
  url.searchParams.set("ing", "pollo,tomate,arroz");
  url.searchParams.set("avoid", "tomate");
  url.searchParams.set("diet", "vegan");

  const response = await fetch(url);
  const body = await response.json();
  const methodIds = body.methods.map((method) => method.id);

  assert.equal(response.status, 200);
  assert.deepEqual(methodIds, ["pot", "pan"]);
});

test("decision reconoce huevo, calamares y pan rallado como ingredientes de sarten", async () => {
  const url = new URL("/recipes/decision", baseUrl);
  url.searchParams.set("ing", "calamares,huevo,panrallado");

  const response = await fetch(url);
  const body = await response.json();
  const methodIds = body.methods.map((method) => method.id);

  assert.equal(response.status, 200);
  assert.deepEqual(methodIds, ["pan"]);
});

test("valida cantidades concretas sin permitir ingredientes nuevos", () => {
  assert.equal(
    cantidadesDeIngredientesValidas(
      [
        { nombre: "arroz", cantidad: "160 g" },
        { nombre: "agua", cantidad: "320 ml" },
      ],
      ["arroz"],
    ),
    true,
  );
  assert.equal(
    cantidadesDeIngredientesValidas(
      [{ nombre: "cebolla", cantidad: "1 unidad" }],
      ["arroz"],
    ),
    false,
  );
});
