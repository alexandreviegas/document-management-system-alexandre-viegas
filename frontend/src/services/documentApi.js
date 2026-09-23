const API_PREFIX = '/api';

async function readError(response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const body = await response.json();
    return body.error || 'Não foi possível concluir a operação.';
  }

  const message = await response.text();
  return message || 'Não foi possível concluir a operação.';
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return response.json();
}

export function listDocuments() {
  return requestJson(`${API_PREFIX}/documents`);
}

export function uploadDocument(file, owner) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('owner', owner);

  return requestJson(`${API_PREFIX}/upload`, {
    method: 'POST',
    body: formData,
  });
}

export async function downloadDocument(documentId, fallbackName) {
  const response = await fetch(
    `${API_PREFIX}/documents/${encodeURIComponent(documentId)}/download`,
  );

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return {
    blob: await response.blob(),
    filename: getFilename(response.headers.get('content-disposition'), fallbackName),
  };
}

function getFilename(contentDisposition, fallbackName) {
  const match = contentDisposition?.match(/filename="([^"]+)"/i);
  return match?.[1] || fallbackName || 'documento';
}