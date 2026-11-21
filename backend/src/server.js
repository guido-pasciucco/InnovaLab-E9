require("dotenv").config({
  path: require("node:path").join(__dirname, "..", ".env")
});

const app = require("./app");

const port = process.env.PORT || 3000;

app.listen(port, "0.0.0.0", () => {
  console.log(`API escuchando en el puerto ${port}`);
  console.log("Ctrl + C para finalizar.");
});
