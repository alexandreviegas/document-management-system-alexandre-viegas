# Especificação - Document Management System

## 1. Objetivo

Entregar uma aplicação web que permita a um usuário enviar, listar e baixar documentos, mantendo os arquivos no filesystem local e seus metadados em memória.

## 2. Escopo

### Dentro do escopo

- Upload de um documento por requisição.
- Listagem dos documentos registrados na execução atual da aplicação.
- Download de um documento pelo seu identificador.
- Associação simples de cada documento a um `owner` informado pelo cliente.
- Interface React para executar upload, visualizar a lista e iniciar downloads.
- API HTTP em Express, consumida pelo frontend por meio do prefixo `/api`.

### Fora do escopo

- Armazenamento externo, em nuvem ou em serviços de upload de terceiros.
- Banco de dados ou persistência dos metadados após o reinício do processo.
- Versionamento, edição, exclusão ou compartilhamento de documentos.
- Autenticação, autorização e gerenciamento real de usuários.
- Conversão, antivírus ou análise semântica do conteúdo dos arquivos.
- Paginação, busca avançada e filtros na primeira versão.

## 3. Requisitos funcionais

| ID    | Requisito                                           | Critério de aceite                                                                                                                    |
| ----- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| RF-01 | O usuário pode enviar um documento.                 | Uma requisição `POST /upload` válida grava o arquivo localmente e retorna seus metadados com status `201`.                            |
| RF-02 | O upload exige um arquivo e um dono.                | A requisição deve conter o campo multipart `file` e o campo textual `owner`, ambos não vazios.                                        |
| RF-03 | O sistema rejeita arquivos inválidos.               | Arquivo ausente, vazio ou maior que o limite configurado resulta em erro JSON sem criar um registro válido.                           |
| RF-04 | O sistema gera um identificador único.              | Cada documento criado recebe um `id` gerado pela aplicação, independente do nome original.                                            |
| RF-05 | O usuário pode listar os documentos.                | `GET /documents` retorna uma lista JSON com os metadados públicos dos documentos registrados.                                         |
| RF-06 | A listagem é determinística.                        | Os documentos são retornados do mais recente para o mais antigo por `uploadedAt`; em empate, o `id` é usado como critério secundário. |
| RF-07 | O usuário pode baixar um documento.                 | `GET /documents/:id/download` retorna o conteúdo binário do documento registrado.                                                     |
| RF-08 | O download preserva o nome original para o cliente. | A resposta de download usa `Content-Disposition: attachment` com o `originalName` armazenado.                                         |
| RF-09 | O sistema informa erros de forma consistente.       | Falhas de validação e de negócio retornam JSON no formato `{ "error": "mensagem" }`.                                                  |
| RF-10 | O frontend reflete o estado das operações.          | A interface apresenta estados de carregamento, sucesso, erro e lista vazia, e atualiza a listagem após upload bem-sucedido.           |

## 4. Requisitos não funcionais

| ID     | Requisito                                                                                                                                                      |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RNF-01 | Os arquivos devem ser gravados exclusivamente no filesystem local, usando `multer` com `diskStorage`, no diretório `backend/storage`.                          |
| RNF-02 | Os metadados devem ser mantidos em memória nesta fase. O reinício do processo perde os registros, mesmo que algum arquivo físico permaneça no diretório local. |
| RNF-03 | O backend deve seguir o fluxo `routes -> controllers -> services -> repositories`.                                                                             |
| RNF-04 | O frontend deve usar componentes funcionais React e `fetch`, consumindo a API por `/api`.                                                                      |
| RNF-05 | Configurações operacionais devem ser obtidas de variáveis de ambiente, com valores padrão documentados.                                                        |
| RNF-06 | O limite padrão de upload deve ser de 10 MiB (`10 * 1024 * 1024` bytes), configurável pela variável `MAX_FILE_SIZE_BYTES`.                                     |
| RNF-07 | Qualquer MIME type e extensão são aceitos na primeira versão, desde que o arquivo não esteja vazio e respeite o limite de tamanho.                             |
| RNF-08 | Nomes físicos de arquivos não podem ser derivados diretamente de entrada do usuário. O sistema deve gerar nomes seguros e únicos.                              |
| RNF-09 | A API deve retornar `Content-Type: application/json` para respostas JSON e evitar expor caminhos internos do filesystem.                                       |
| RNF-10 | O código deve permanecer em JavaScript, usando CommonJS no backend e ESM no frontend, conforme os projetos existentes.                                         |

## 5. Modelo de dados

### 5.1 Metadados públicos do documento

| Campo          | Tipo   | Obrigatório | Descrição                                                                                                                                              |
| -------------- | ------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`           | string | Sim         | Identificador único gerado pela aplicação. Não deve conter caminho de filesystem.                                                                      |
| `originalName` | string | Sim         | Nome original enviado pelo cliente, usado apenas como nome de apresentação no download.                                                                |
| `size`         | number | Sim         | Tamanho do arquivo em bytes. Deve ser maior que zero e compatível com o arquivo gravado.                                                               |
| `uploadedAt`   | string | Sim         | Data e hora do upload em formato ISO 8601 UTC.                                                                                                         |
| `owner`        | string | Sim         | Identificador textual do dono informado no campo multipart `owner`. Deve ser normalizado com remoção de espaços nas extremidades e não pode ser vazio. |

Exemplo de metadados retornados pela API:

```json
{
  "id": "8f1c2b9d-7f6d-4f0d-9c3a-2d5b8a0e1f44",
  "originalName": "relatorio.pdf",
  "size": 24576,
  "uploadedAt": "2026-09-23T14:30:00.000Z",
  "owner": "usuario-123"
}
```

### 5.2 Registro interno de armazenamento

O repository mantém, além dos metadados públicos, informações internas necessárias para localizar e entregar o arquivo:

| Campo         | Tipo   | Descrição                                                                                                       |
| ------------- | ------ | --------------------------------------------------------------------------------------------------------------- |
| `storedName`  | string | Nome físico gerado pela aplicação, sem confiança em entrada do usuário.                                         |
| `mimeType`    | string | MIME type recebido no upload, usado no `Content-Type` do download; se ausente, usar `application/octet-stream`. |
| `storagePath` | string | Caminho resolvido dentro de `backend/storage`, nunca retornado pela API.                                        |

Esses campos internos não fazem parte das respostas HTTP. O `id` deve mapear exatamente um registro interno e seu arquivo físico correspondente.

### 5.3 Ciclo de vida

1. O arquivo é recebido pelo `multer` e gravado no diretório local.
2. O service valida os dados e cria o registro de metadados.
3. O repository registra o documento em memória.
4. Se a criação do registro falhar depois da gravação física, o arquivo deve ser removido para evitar órfãos.
5. Após reinício do processo, os registros em memória deixam de existir; arquivos sem metadados recuperáveis não são listados nem baixáveis nesta fase.

## 6. Contratos de API

### Convenções gerais

- Os endpoints abaixo são expostos pelo backend sem o prefixo do proxy. O frontend os acessa como `/api/upload`, `/api/documents` e `/api/documents/:id/download`.
- Respostas JSON devem usar `Content-Type: application/json; charset=utf-8`.
- Erros JSON seguem o formato:

```json
{
  "error": "Descrição legível do erro"
}
```

- O backend não deve retornar stack trace, caminho absoluto ou detalhes internos do filesystem ao cliente.

### 6.1 `POST /upload`

Envia um documento e registra seus metadados.

**Entrada**

- Content-Type: `multipart/form-data`.
- Campo `file`: obrigatório, exatamente um arquivo.
- Campo `owner`: obrigatório, texto não vazio após trim.
- Qualquer MIME type e extensão são aceitos.
- Tamanho permitido: maior que zero e menor ou igual a `MAX_FILE_SIZE_BYTES`; padrão de 10 MiB.

Exemplo conceitual:

```text
file: relatorio.pdf
owner: usuario-123
```

**Sucesso**

- Status: `201 Created`.
- Corpo: objeto JSON com os metadados públicos criados.

**Erros**

| Situação                                            | Status                      | Mensagem esperada                                      |
| --------------------------------------------------- | --------------------------- | ------------------------------------------------------ |
| Multipart ausente, arquivo ausente ou `owner` vazio | `400 Bad Request`           | Indica que `file` e `owner` são obrigatórios.          |
| Arquivo vazio                                       | `400 Bad Request`           | Indica que o arquivo não pode estar vazio.             |
| Arquivo excede o limite                             | `413 Payload Too Large`     | Indica que o tamanho máximo foi excedido.              |
| Falha ao gravar ou registrar o documento            | `500 Internal Server Error` | Indica falha interna sem expor detalhes do filesystem. |

Em qualquer falha após a criação do arquivo físico, o backend deve tentar removê-lo antes de responder.

### 6.2 `GET /documents`

Lista os documentos registrados na memória do processo.

**Entrada**

- Sem corpo ou parâmetros obrigatórios.

**Sucesso**

- Status: `200 OK`.
- Corpo: array JSON direto de metadados públicos.
- Lista vazia: `[]` com status `200`.
- Ordenação: `uploadedAt` decrescente; em empate, `id` em ordem lexicográfica crescente.

Exemplo:

```json
[
  {
    "id": "8f1c2b9d-7f6d-4f0d-9c3a-2d5b8a0e1f44",
    "originalName": "relatorio.pdf",
    "size": 24576,
    "uploadedAt": "2026-09-23T14:30:00.000Z",
    "owner": "usuario-123"
  }
]
```

**Erros**

- Falha inesperada ao consultar o repository: `500 Internal Server Error` com o formato JSON padrão de erro.

### 6.3 `GET /documents/:id/download`

Entrega o conteúdo binário do documento identificado por `id`.

**Entrada**

- `id`: identificador não vazio presente na URL.
- Sem corpo obrigatório.

**Sucesso**

- Status: `200 OK`.
- Corpo: conteúdo binário do arquivo.
- `Content-Type`: MIME type registrado; usar `application/octet-stream` quando não houver MIME type disponível.
- `Content-Disposition`: `attachment; filename="<originalName>"`, usando o nome original armazenado e tratado para impedir injeção de cabeçalhos.
- `Content-Length`: tamanho do arquivo quando disponível.

**Erros**

| Situação                                                | Status                      | Resposta                                       |
| ------------------------------------------------------- | --------------------------- | ---------------------------------------------- |
| `id` não está registrado                                | `404 Not Found`             | JSON com mensagem de documento não encontrado. |
| Registro existe, mas arquivo físico não está disponível | `404 Not Found`             | JSON com mensagem de arquivo não encontrado.   |
| Falha inesperada na leitura                             | `500 Internal Server Error` | JSON com mensagem genérica de falha interna.   |

O endpoint nunca deve aceitar um caminho físico fornecido pelo cliente; somente o mapeamento interno do `id` pode determinar o arquivo entregue.

### 6.4 Endpoint de saúde existente

O endpoint `GET /health` permanece disponível como verificação simples do processo, sem fazer parte do fluxo de documentos. Seu comportamento atual não deve ser removido durante a implementação.

## 7. Decisões arquiteturais

### Backend

O backend seguirá uma Clean Architecture simples, com dependências apontando para dentro:

```text
routes -> controllers -> services -> repositories
```

- `routes/`: registra métodos e caminhos HTTP, conecta o middleware do `multer` ao upload e delega para controllers.
- `controllers/`: lê `req.file`, campos do formulário e parâmetros de rota, executa validação básica, chama services e traduz resultados para status e respostas HTTP.
- `services/`: implementa as regras de negócio, valida `owner`, tamanho e existência do documento, coordena o armazenamento e garante limpeza em falhas.
- `repositories/`: encapsula a coleção de metadados em memória e o acesso ao filesystem local. Não conhece HTTP.
- `app.js`: configura Express, middlewares, rotas e tratamento centralizado de erros, preservando `GET /health`.

O `multer` deve usar `diskStorage` e gravar somente em `backend/storage`. A geração do nome físico deve ocorrer no limite de infraestrutura, com identificador seguro e independente de `originalName`.

### Frontend

O frontend seguirá a organização existente:

- `services/`: funções `fetch` para upload, listagem e download.
- `components/`: componentes funcionais para formulário de upload, listagem e ação de download.
- `pages/`: composição da tela principal e controle do estado da página.
- `App.jsx`: ponto de entrada da experiência de documentos.

O frontend deve usar o proxy existente para encaminhar `/api` ao backend, tratar respostas não-2xx como erro e não duplicar regras de armazenamento ou negócio.

### Configuração

As configurações devem usar variáveis de ambiente, com defaults explícitos:

| Variável              | Default           | Uso                           |
| --------------------- | ----------------- | ----------------------------- |
| `PORT`                | `3000`            | Porta HTTP do backend.        |
| `STORAGE_DIR`         | `backend/storage` | Diretório local dos arquivos. |
| `MAX_FILE_SIZE_BYTES` | `10485760`        | Limite máximo de cada upload. |

O diretório de armazenamento deve existir ou ser criado na inicialização da infraestrutura, sem depender de serviço externo.

## 8. Plano de execução

Este plano descreve a implementação futura e não faz parte da execução desta tarefa.

1. **Preparar a infraestrutura local**: confirmar dependências existentes, criar ou garantir `backend/storage`, centralizar as variáveis `PORT`, `STORAGE_DIR` e `MAX_FILE_SIZE_BYTES` e manter o app exportável para testes.
2. **Implementar o repository**: criar a coleção em memória, o registro `id -> metadados + arquivo físico`, operações de criação, listagem e busca, além das rotinas de remoção em caso de falha.
3. **Implementar o service**: validar arquivo, `owner` e limite, gerar o identificador, coordenar gravação e registro, ordenar listagens e traduzir ausência de documento em resultado de negócio.
4. **Implementar controllers e rotas**: configurar `multer.diskStorage`, conectar os três endpoints, preservar `/health`, padronizar respostas e encaminhar erros de limite, validação, leitura e filesystem.
5. **Adicionar testes de backend**: usando `node:test`, cobrir upload válido, ausência de campos, arquivo vazio, limite, listagem vazia e ordenada, download válido, `id` inexistente, arquivo físico ausente e limpeza após falha. Cada teste deve limpar os arquivos criados.
6. **Implementar o serviço frontend**: adicionar chamadas `fetch` para upload multipart, listagem JSON e download binário, verificando status HTTP e mensagens de erro.
7. **Implementar a interface React**: criar formulário, lista, botão de download e estados de carregamento, sucesso, erro e ausência de documentos; atualizar a lista após upload.
8. **Validar a integração**: executar testes do backend, build do frontend e um fluxo manual com backend e frontend ativos, confirmando proxy `/api`, cabeçalhos de download e limpeza do diretório de teste.
9. **Revisar o escopo**: confirmar que a solução continua local, sem banco, autenticação, armazenamento externo ou versionamento, e atualizar esta especificação somente quando houver uma decisão de produto explícita.
