const app = require("./app");

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`API escuchando en el puerto ${port}`);
  console.log("Ctrl + C para finalizar.");
});
