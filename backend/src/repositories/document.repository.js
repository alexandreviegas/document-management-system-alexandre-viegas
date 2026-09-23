const path = require("node:path");

class DocumentRepository {
  constructor(storageDirectory) {
    this.documents = new Map();
    this.storageDirectory = path.resolve(storageDirectory);
  }

  save(document) {
    const storagePath = path.resolve(document.storagePath);
    const relativePath = path.relative(this.storageDirectory, storagePath);

    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
      const error = new Error("O arquivo está fora do diretório de storage.");
      error.statusCode = 500;
      throw error;
    }

    this.documents.set(document.id, document);
    return document;
  }

  findAll() {
    return Array.from(this.documents.values())
      .sort((first, second) => {
        const dateDifference =
          new Date(second.uploadedAt) - new Date(first.uploadedAt);
        return dateDifference || first.id.localeCompare(second.id);
      })
      .map(({ storagePath, storedName, mimeType, ...metadata }) => metadata);
  }

  findById(id) {
    return this.documents.get(id) || null;
  }

  remove(id) {
    const document = this.documents.get(id);
    this.documents.delete(id);
    return document || null;
  }
}

module.exports = DocumentRepository;
