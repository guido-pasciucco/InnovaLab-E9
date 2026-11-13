function errorHandler(error, req, res, next) {
  console.error("Error no controlado en la API:", error);
  return res.status(500).json({
    error: "internal_error",
    message: "Ocurrió un error interno."
  });
}

module.exports = { errorHandler };
