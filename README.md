# Newsletter - Engenharia de Software

Projeto estático para Vercel com:

- site público sem login
- painel `/admin/` com login e senha
- edição pelo front
- persistência do conteúdo no GitHub
- rebuild automático via Vercel

## Repositório configurado

- `IgorSebastiann/Newsletter-Engenharia-de-Software_CatolicaSC`

## Arquivos principais

- `index.html`: site público
- `styles.css`: visual público
- `script.js`: renderização pública
- `content/site.json`: conteúdo da newsletter
- `admin/index.html`: tela de login e editor
- `admin/admin.css`: visual do admin
- `admin/admin.js`: editor do admin
- `api/`: login, sessão e salvamento no GitHub

## Variáveis de ambiente na Vercel

Configure:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`
- `GITHUB_CONTENT_TOKEN`
- `GITHUB_CONTENT_BRANCH` opcional, padrão `main`

## Token do GitHub

Use um fine-grained personal access token limitado a este repositório.

Para atualizar `content/site.json`, a integração usa o endpoint `PUT /repos/{owner}/{repo}/contents/{path}` da API do GitHub. Pelas docs oficiais, isso exige permissões de repositório adequadas para conteúdo, e em alguns cenários permissões adicionais podem ser necessárias.

Fontes:

- Decap/backends overview sobre OAuth proxy e backends GitHub: https://decapcms.org/docs/backends-overview/
- GitHub OAuth app web flow: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
- GitHub fine-grained token permissions: https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens

## Fluxo

1. O admin entra em `/admin/`.
2. Faz login com usuário e senha.
3. Edita o conteúdo.
4. Salva.
5. A função serverless atualiza `content/site.json` no GitHub.
6. A Vercel faz novo deploy.
