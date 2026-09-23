import { useState } from "react";
import { downloadDocument } from "../services/documentApi";

export default function DownloadButton({ document }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState("");

  async function handleDownload() {
    setIsDownloading(true);
    setError("");

    try {
      const { blob, filename } = await downloadDocument(
        document.id,
        document.originalName,
      );
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(downloadError.message);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <span className="download-control">
      <button
        className="download-button"
        type="button"
        onClick={handleDownload}
        disabled={isDownloading}
        title={`Baixar ${document.originalName}`}
        aria-label={`Baixar ${document.originalName}`}
      >
        {isDownloading ? "..." : "↓"}
      </button>
      {error && (
        <span className="download-error" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}
