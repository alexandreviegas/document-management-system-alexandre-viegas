const fs = require('node:fs');

class DocumentRepository {
  constructor() {
    this.documents = new Map();
  }

  save(document) {
    this.documents.set(document.id, document);
    return document;
  }

  findAll() {
    return Array.from(this.documents.values())
      .sort((first, second) => {
        const dateDifference = new Date(second.uploadedAt) - new Date(first.uploadedAt);
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

  fileExists(document) {
    return Boolean(document && fs.existsSync(document.storagePath));
  }
}

module.exports = DocumentRepository;