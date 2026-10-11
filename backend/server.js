const express = require("express");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`API escuchando en el puerto ${port}`);
  console.log(`Ctrl + C para finalizar.`);
});