# Guia de Hospedagem no Vercel - RINHA EVOLUTION

Esta aplicação foi otimizada para ser hospedada como um site estático no Vercel.

## Passos para Deploy

1. **Conecte seu Repositório**: No painel do Vercel, importe este repositório.
2. **Configuração de Build**:
   - **Framework Preset**: Other (ou deixe em branco, o Vercel detectará automaticamente).
   - **Build Command**: Deixe vazio.
   - **Output Directory**: `.` (diretório raiz).
3. **Variáveis de Ambiente**:
   Embora as chaves do Supabase estejam atualmente no arquivo `js/supabase.js` para funcionamento imediato sem build step, recomenda-se configurar as seguintes variáveis no painel do Vercel para referência futura ou se decidir usar um bundler:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`

## Estrutura de Arquivos Otimizada

- `index.html`: Ponto de entrada principal.
- `404.html`: Página de erro personalizada para rotas inválidas.
- `package.json`: Identifica o projeto para o Vercel.
- `vercel.json`: Gerencia redirecionamentos e rotas.

## Dicas de Segurança

- A `SUPABASE_ANON_KEY` é segura para ser exposta no lado do cliente.
- Nunca exponha a `SERVICE_ROLE_KEY` no código front-end ou em arquivos públicos.
