const fs = require("node:fs/promises");

class DocumentService {
  constructor(documentRepository) {
    this.documentRepository = documentRepository;
  }

  async createDocument(file, owner) {
    if (!file) {
      throw this.createError("O campo file é obrigatório.", 400);
    }

    const normalizedOwner = typeof owner === "string" ? owner.trim() : "";
    if (!normalizedOwner) {
      await this.removeUploadedFile(file);
      throw this.createError("O campo owner é obrigatório.", 400);
    }

    if (file.size <= 0) {
      await this.removeUploadedFile(file);
      throw this.createError("O arquivo não pode estar vazio.", 400);
    }

    const document = {
      id: file.filename,
      originalName: file.originalname,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      owner: normalizedOwner,
      storedName: file.filename,
      mimeType: this.normalizeMimeType(file.mimetype),
      storagePath: file.path,
    };

    try {
      return this.documentRepository.save(document);
    } catch (error) {
      await this.removeUploadedFile(file);
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

    let stats;
    try {
      stats = await fs.stat(document.storagePath);
    } catch (error) {
      if (error.code === "ENOENT") {
        throw this.createError("Arquivo do documento não encontrado.", 404);
      }

      throw error;
    }

    if (!stats.isFile()) {
      throw this.createError("Arquivo do documento não encontrado.", 404);
    }

    return { document, size: stats.size };
  }

  async removeUploadedFile(file) {
    if (file?.path) {
      try {
        await fs.unlink(file.path);
      } catch (error) {
        if (error.code !== "ENOENT") {
          throw error;
        }
      }
    }
  }

  createError(message, statusCode) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
  }

  normalizeMimeType(mimeType) {
    const isValidMimeType =
      typeof mimeType === "string" &&
      /^[\w!#$&^_.+-]+\/[\w!#$&^_.+-]+$/.test(mimeType);

    return isValidMimeType ? mimeType : "application/octet-stream";
  }
}

module.exports = DocumentService;
