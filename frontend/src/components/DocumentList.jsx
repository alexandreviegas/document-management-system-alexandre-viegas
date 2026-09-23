import DownloadButton from './DownloadButton';

export default function DocumentList({ documents, isLoading, error, onRetry }) {
  return (
    <section className="documents-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Arquivo vivo</span>
          <h2>Seus documentos</h2>
        </div>
        <span className="document-count">{documents.length.toString().padStart(2, '0')}</span>
      </div>

      {isLoading && <p className="empty-state">Carregando documentos...</p>}

      {!isLoading && error && (
        <div className="empty-state error-state">
          <p>{error}</p>
          <button className="text-button" type="button" onClick={onRetry}>Tentar novamente</button>
        </div>
      )}

      {!isLoading && !error && documents.length === 0 && (
        <p className="empty-state">Nenhum documento foi enviado nesta sessão.</p>
      )}

      {!isLoading && !error && documents.length > 0 && (
        <div className="document-list">
          {documents.map((document) => (
            <article className="document-row" key={document.id}>
              <div className="document-type" aria-hidden="true">DOC</div>
              <div className="document-details">
                <strong title={document.originalName}>{document.originalName}</strong>
                <span>{document.owner} · {formatDate(document.uploadedAt)} · {formatFileSize(document.size)}</span>
              </div>
              <DownloadButton document={document} />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function formatDate(date) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
  }).format(new Date(date));
}

function formatFileSize(size) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}