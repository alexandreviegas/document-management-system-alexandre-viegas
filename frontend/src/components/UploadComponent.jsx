import { useState } from "react";
import { uploadDocument } from "../services/documentApi";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function UploadComponent({ onUploaded }) {
  const [file, setFile] = useState(null);
  const [owner, setOwner] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const normalizedOwner = owner.trim();

    if (!file) {
      setError("Selecione um documento para enviar.");
      return;
    }

    if (file.size === 0) {
      setError("O arquivo não pode estar vazio.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("O arquivo deve ter no máximo 10 MiB.");
      return;
    }

    if (!normalizedOwner) {
      setError("Informe o responsável pelo documento.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const document = await uploadDocument(file, normalizedOwner);
      setFile(null);
      setOwner("");
      event.target.reset();
      onUploaded(document);
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="upload-panel" onSubmit={handleSubmit}>
      <div className="section-heading">
        <div>
          <span className="eyebrow">Novo arquivo</span>
          <h2>Envie um documento</h2>
        </div>
        <span className="panel-mark">01</span>
      </div>

      <label className="file-dropzone">
        <span className="file-icon">+</span>
        <span>
          <strong>{file ? file.name : "Escolha um arquivo"}</strong>
          <small>
            {file ? formatFileSize(file.size) : "Qualquer formato, até 10 MiB"}
          </small>
        </span>
        <input
          type="file"
          onChange={(event) => {
            setFile(event.target.files?.[0] || null);
            setError("");
          }}
        />
      </label>

      <label className="field-label" htmlFor="owner">
        Responsável
        <input
          id="owner"
          name="owner"
          value={owner}
          onChange={(event) => setOwner(event.target.value)}
          placeholder="Ex.: equipe-financeiro"
        />
      </label>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <button className="primary-button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Enviando..." : "Enviar documento"}
        <span aria-hidden="true">↗</span>
      </button>
    </form>
  );
}

function formatFileSize(size) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
