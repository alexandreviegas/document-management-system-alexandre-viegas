import { useCallback, useEffect, useState } from "react";
import DocumentList from "./components/DocumentList";
import UploadComponent from "./components/UploadComponent";
import { listDocuments } from "./services/documentApi";
import "./App.css";

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDocuments = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      setDocuments(await listDocuments());
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  function handleUploaded(document) {
    setDocuments((currentDocuments) => [document, ...currentDocuments]);
  }

  return (
    <main className="app-shell">
      <header className="hero-header">
        <div>
          <span className="eyebrow">DMS / workspace</span>
          <h1>Documentos que encontram seu lugar.</h1>
          <p>
            Envie, organize e recupere os arquivos da sua sessão em um único
            espaço.
          </p>
        </div>
        <span className="status-badge">
          <i /> armazenamento local
        </span>
      </header>

      <div className="content-grid">
        <UploadComponent onUploaded={handleUploaded} />
        <DocumentList
          documents={documents}
          isLoading={isLoading}
          error={error}
          onRetry={loadDocuments}
        />
      </div>
    </main>
  );
}
