class DocumentController {
  constructor(documentService) {
    this.documentService = documentService;
    this.upload = this.upload.bind(this);
    this.list = this.list.bind(this);
    this.download = this.download.bind(this);
  }

  upload(req, res, next) {
    try {
      const document = this.documentService.createDocument(
        req.file,
        req.body.owner,
      );
      const { storagePath, storedName, mimeType, ...metadata } = document;
      res.status(201).json(metadata);
    } catch (error) {
      next(error);
    }
  }

  list(req, res, next) {
    try {
      res.json(this.documentService.listDocuments());
    } catch (error) {
      next(error);
    }
  }

  async download(req, res, next) {
    try {
      const { document, size } =
        await this.documentService.getDocumentForDownload(req.params.id);
      res.set({
        "Content-Type": document.mimeType,
        "Content-Disposition": `attachment; filename="${this.escapeFilename(document.originalName)}"`,
        "Content-Length": size,
      });
      res.sendFile(document.storagePath, (error) => {
        if (error && !res.headersSent) {
          next(error);
        }
      });
    } catch (error) {
      next(error);
    }
  }

  escapeFilename(filename) {
    return filename.replace(/[\\"\r\n]/g, "_");
  }
}

module.exports = DocumentController;
