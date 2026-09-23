const crypto = require("node:crypto");
const path = require("node:path");
const fs = require("node:fs");
const express = require("express");
const multer = require("multer");

const DocumentRepository = require("../repositories/document.repository");
const DocumentService = require("../services/document.service");
const DocumentController = require("../controllers/document.controller");

const storageDirectory = process.env.STORAGE_DIR
  ? path.resolve(process.env.STORAGE_DIR)
  : path.resolve(__dirname, "../../storage");
const maximumFileSize = Number(
  process.env.MAX_FILE_SIZE_BYTES || 10 * 1024 * 1024,
);

fs.mkdirSync(storageDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: storageDirectory,
  filename: (req, file, callback) => callback(null, crypto.randomUUID()),
});

const upload = multer({
  storage,
  limits: { fileSize: maximumFileSize },
});

const repository = new DocumentRepository();
const service = new DocumentService(repository);
const controller = new DocumentController(service);
const router = express.Router();

router.post("/upload", upload.single("file"), controller.upload);
router.get("/documents", controller.list);
router.get("/documents/:id/download", controller.download);

module.exports = router;
