# RINHA EVOLUTION: MVP Mobile

Este projeto é um jogo de batalha baseado em turnos (MVP) desenvolvido em HTML, CSS (Tailwind via CDN) e JavaScript puro.

## 🚀 Como Rodar Localmente

Como o projeto não possui dependências de build (Node.js, Webpack, etc.), você pode executá-lo de forma muito simples:

### Opção 1: Abrir diretamente
Basta abrir o arquivo `index.html` no seu navegador favorito.

### Opção 2: Servidor Local (Recomendado)
Para evitar bloqueios de CORS ou comportamentos inesperados, use um servidor estático simples.
Se tiver Node.js instalado:

```bash
npx serve .
```

Ou com Python:

```bash
python3 -m http.server
```

Acesse `http://localhost:3000` (ou a porta indicada).

## ☁️ Hospedagem na Vercel

O projeto já está configurado para deploy na Vercel através do arquivo `vercel.json`.

### Método 1: Vercel CLI (Rápido)

1. Instale a CLI da Vercel:
   ```bash
   npm i -g vercel
   ```

2. Na raiz do projeto, execute:
   ```bash
   vercel
   ```

3. Siga as instruções no terminal. Use as configurações padrão.

### Método 2: Git + Vercel Dashboard

1. Envie este código para um repositório Git (GitHub, GitLab, Bitbucket).
2. Acesse [vercel.com](https://vercel.com) e clique em **"Add New Project"**.
3. Importe o repositório.
4. A Vercel detectará automaticamente a configuração.
5. Clique em **Deploy**.

## 🛠️ Estrutura

- `index.html`: Arquivo único contendo toda a lógica, estilos e marcação.
- `vercel.json`: Configuração de rotas e comportamento SPA.

## ⚠️ Notas Técnicas

- O jogo utiliza `localStorage` para salvar o progresso.
- As bibliotecas (Tailwind, FontAwesome) são carregadas via CDN. Certifique-se de estar conectado à internet.
