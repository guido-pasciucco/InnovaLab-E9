const express = require("express");
const { HttpError } = require("../errors/HttpError");
const { getCurrentLotbaBlocklist } = require("../services/blocklists.service");

const router = express.Router();
const CONTENT_CACHE_CONTROL = "public, max-age=60";

router.get("/lotba/current", async (req, res, next) => {
  const rawClientHash = req.query.hash;
  if (
    rawClientHash !== undefined &&
    (typeof rawClientHash !== "string" ||
      !/^[a-f0-9]{64}$/i.test(rawClientHash))
  ) {
    return res.status(400).json({
      error: "invalid_blocklist_hash",
      message: "La huella debe ser SHA-256 hexadecimal."
    });
  }

  try {
    const clientHash = rawClientHash?.toLowerCase();
    const result = await getCurrentLotbaBlocklist(clientHash);
    return res
      .status(200)
      .set("Cache-Control", CONTENT_CACHE_CONTROL)
      .json(result);
  } catch (error) {
    if (error instanceof HttpError) {
      return res
        .status(error.status)
        .set("Cache-Control", "no-store")
        .json({ error: error.code, message: error.message });
    }

    return next(error);
  }
});

module.exports = router;
