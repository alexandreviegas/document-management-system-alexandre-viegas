const fs = require("node:fs/promises");

class DocumentService {
  constructor(documentRepository) {
    this.documentRepository = documentRepository;
  }

  createDocument(file, owner) {
    if (!file) {
      throw this.createError("O campo file é obrigatório.", 400);
    }

    const normalizedOwner = typeof owner === "string" ? owner.trim() : "";
    if (!normalizedOwner) {
      this.removeUploadedFile(file);
      throw this.createError("O campo owner é obrigatório.", 400);
    }

    if (file.size <= 0) {
      this.removeUploadedFile(file);
      throw this.createError("O arquivo não pode estar vazio.", 400);
    }

    const document = {
      id: file.filename,
      originalName: file.originalname,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      owner: normalizedOwner,
      storedName: file.filename,
      mimeType: file.mimetype || "application/octet-stream",
      storagePath: file.path,
    };

    try {
      return this.documentRepository.save(document);
    } catch (error) {
      this.removeUploadedFile(file);
      throw error;
    }
  }

  listDocuments() {
    return this.documentRepository.findAll();
  }

  async getDocumentForDownload(id) {
    const document = this.documentRepository.findById(id);
    if (!document) {
      throw this.createError("Documento não encontrado.", 404);
    }

    if (!this.documentRepository.fileExists(document)) {
      throw this.createError("Arquivo do documento não encontrado.", 404);
    }

    const stats = await fs.stat(document.storagePath);
    return { document, size: stats.size };
  }

  removeUploadedFile(file) {
    if (file?.path) {
      fs.unlink(file.path).catch(() => {});
    }
  }

  createError(message, statusCode) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
  }
}

module.exports = DocumentService;
