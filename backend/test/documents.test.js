const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { after, before, test } = require('node:test');

const app = require('../src/app');
const DocumentRepository = require('../src/repositories/document.repository');

const storageDirectory = path.resolve(__dirname, '../storage');
let server;
let baseUrl;
const createdFiles = new Set();

before(async () => {
  server = await new Promise((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await Promise.all(
    Array.from(createdFiles, (filePath) => fs.rm(filePath, { force: true })),
  );
});

test('faz upload, lista e baixa um documento', async () => {
  const content = 'conteudo de teste';
  const form = new FormData();
  form.append('file', new Blob([content], { type: 'text/plain' }), 'teste.txt');
  form.append('owner', ' equipe ');

  const uploadResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: form,
  });
  assert.equal(uploadResponse.status, 201);
  const metadata = await uploadResponse.json();
  assert.equal(metadata.owner, 'equipe');
  assert.equal(metadata.originalName, 'teste.txt');
  assert.equal(metadata.size, Buffer.byteLength(content));
  createdFiles.add(path.join(storageDirectory, metadata.id));

  const listResponse = await fetch(`${baseUrl}/documents`);
  assert.equal(listResponse.status, 200);
  assert.deepEqual((await listResponse.json())[0], metadata);

  const downloadResponse = await fetch(
    `${baseUrl}/documents/${metadata.id}/download`,
  );
  assert.equal(downloadResponse.status, 200);
  assert.equal(await downloadResponse.text(), content);
  assert.match(
    downloadResponse.headers.get('content-disposition'),
    /attachment; filename="teste\.txt"/,
  );
  assert.equal(downloadResponse.headers.get('x-content-type-options'), 'nosniff');
});

test('rejeita multipart inválido e limpa o arquivo sem owner', async () => {
  const filesBefore = new Set(await fs.readdir(storageDirectory));
  const invalidFieldForm = new FormData();
  invalidFieldForm.append(
    'unexpected',
    new Blob(['conteudo'], { type: 'text/plain' }),
    'unexpected.txt',
  );
  const invalidFieldResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: invalidFieldForm,
  });
  assert.equal(invalidFieldResponse.status, 400);

  const missingOwnerForm = new FormData();
  missingOwnerForm.append(
    'file',
    new Blob(['sem dono'], { type: 'text/plain' }),
    'sem-dono.txt',
  );
  const missingOwnerResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: missingOwnerForm,
  });
  assert.equal(missingOwnerResponse.status, 400);
  assert.deepEqual(new Set(await fs.readdir(storageDirectory)), filesBefore);
});

test('retorna 404 para documento inexistente', async () => {
  const response = await fetch(
    `${baseUrl}/documents/id-inexistente/download`,
  );
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), {
    error: 'Documento não encontrado.',
  });
});

test('rejeita caminho de arquivo fora do storage', () => {
  const repository = new DocumentRepository(storageDirectory);

  assert.throws(
    () =>
      repository.save({
        id: 'fora-do-storage',
        storagePath: path.resolve(storageDirectory, '../outside.txt'),
      }),
    /fora do diretório de storage/,
  );
});
