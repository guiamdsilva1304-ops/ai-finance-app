---
name: run-imoney
description: Build, run, and drive the iMoney frontend (Next.js). Use when asked to start the app, take a screenshot of a page, verify a UI change in the real app, check mobile layout (375px), or interact with the logged-in dashboard.
---

App web Next.js 14 dirigido por Playwright headless: suba o dev server e use
`.claude/skills/run-imoney/driver.cjs`, que loga com um usuário de teste,
navega, tira screenshot (viewport mobile 375px por padrão), mede overflow-x
e coleta erros de console.

Todos os caminhos abaixo são relativos a `frontend/`.

⚠️ **O dev server local aponta para o Supabase de PRODUÇÃO** (`.env.local`).
Cadastros, transações e eventos de analytics criados em teste são dados reais.
Use o usuário de teste existente; não crie contas descartáveis sem avisar o dono.

## Prerequisites

O Chromium do Playwright precisa destas libs de sistema (Debian 12; o
pacote `chromium` completo ainda reclama de 3 libs, mas o **headless shell**
fica com zero faltando — é ele que o driver usa):

```bash
sudo apt-get update
sudo apt-get install -y libatk1.0-0 libatk-bridge2.0-0 libdbus-1-3 libxcomposite1 \
  libxdamage1 libxfixes3 libxrandr2 libgbm1 libxkbcommon0 libasound2 libatspi2.0-0
```

(O `apt-get update` pode falhar no repo do yarn por GPG — ignore, os pacotes acima vêm do Debian.)

## Setup

```bash
# não toca no package.json (--no-save); o browser não é baixado porque já
# existe em ~/.cache/ms-playwright (chromium_headless_shell-*)
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm i --no-save playwright-core@1.60.0
```

Se `~/.cache/ms-playwright` não tiver um diretório `chromium_headless_shell-*`,
instale com `npx playwright@1.60.0 install chromium` (não verificado neste
container — aqui o cache já existia).

Credenciais (default embutido no driver — usuário de teste criado em 10/06/2026):

```bash
export IMONEY_EMAIL=claude.teste375@example.com   # opcional
export IMONEY_PASSWORD='Teste375!imoney'           # opcional
```

Se esse usuário tiver sido apagado do Supabase, crie outro pela própria UI:
`/login` → aba "Criar conta" → email/senha 2× → marcar checkbox `#consent` →
o app loga direto e cai em `/onboarding` (5 etapas; dá para pular a radiografia
com "Pular por agora").

## Run (agent path)

```bash
# dev server em background
npm run dev > /tmp/nextdev.log 2>&1 &
echo $! > /tmp/dev.pid
timeout 90 bash -c 'until curl -sf http://localhost:3000/login >/dev/null; do sleep 2; done'

# loga e screenshota uma rota (viewport 375×812 @2x)
node .claude/skills/run-imoney/driver.cjs /dashboard
node .claude/skills/run-imoney/driver.cjs /dashboard/assessor --name assessor --full
node .claude/skills/run-imoney/driver.cjs /login --no-login --name login

# parar (NÃO use `pkill -f 'next dev'` de dentro do Claude Code — o wrapper
# do shell contém esse texto na própria linha de comando e se mata junto)
kill $(cat /tmp/dev.pid)
```

| flag/env | efeito |
|---|---|
| `/rota` (1º arg) | página alvo (default `/dashboard`) |
| `--full` | screenshot full-page em vez da viewport |
| `--name x` | nome do arquivo (default derivado da rota) |
| `--no-login` | pula o login (páginas públicas) |
| `WIDTH=414` | muda a largura da viewport (default 375) |
| `BASE_URL` / `OUT_DIR` | server alvo / pasta de saída |

Screenshots → `/tmp/imoney-shots/<name>.png`. Logs do server → `/tmp/nextdev.log`.
O driver imprime overflow-x (com os elementos culpados) e os erros de console
(filtra o ruído do Amplitude). **Olhe o screenshot** — skeleton verde gigante no
lugar do SonhoHero = dashboard preso no loading (ver Gotchas).

Para fluxos além de navegar+screenshotar (preencher formulário, registrar
transação), copie o padrão do driver: `page.fill`/`page.click` com os waits
descritos em Gotchas. Selectors úteis verificados: form de transação abre com
`button.btn-primary` no topo de `/dashboard/transacoes`, campos
`input[maxlength="200"]` (descrição) e `input[type="number"]` (valor), tipo via
`button:has-text("Receita")`, submit `button[type="submit"]`.

## Run (human path)

```bash
npm run dev   # → http://localhost:3000. Ctrl-C para parar.
```

## Test

Não há suite de testes. O gate do projeto é o typecheck (o build ignora erros
de TS — `ignoreBuildErrors: true`):

```bash
npx tsc --noEmit
```

## Gotchas

- **Login engolido pela hidratação** — clicar em "Entrar" logo após o `load`
  não faz nada (React ainda não hidratou). Espere ~3s após o load antes de
  `fill`/`click`. O driver já faz isso.
- **Navegar logo após o login trava o dashboard no skeleton** — um `goto`
  imediato aborta o refresh de token do supabase-js ("Failed to fetch"), o
  `getSession()` volta null e o `load()` do dashboard retorna cedo deixando
  `loading=true` para sempre (skeleton verde no lugar do SonhoHero). Espere
  ~5s depois do `waitForURL('**/dashboard**')`. O driver já faz isso.
- **`next dev` compila rotas sob demanda** — a primeira visita a uma rota
  pode levar 5–10s. O driver espera 5s após cada navegação; para rotas
  pesadas use `waitForSelector` no elemento que interessa.
- **Mudanças em `next.config.js` (ex.: CSP) exigem restart do dev server** —
  hot reload não pega.
- **Onboarding tem hydration mismatch conhecido** — o overlay de dev mostra
  um badge vermelho "2 errors" no canto; é ruído de dev, não quebra o fluxo.
- **Emojis renderizam como caixas (tofu)** — o container não tem fonte de
  emoji. Cosmético; ignore nos screenshots.
- **Usuário novo é redirecionado para `/dashboard/diagnostico`** (quiz Score
  iMoney) ao final do onboarding — não estranhe não cair direto no dashboard.
- **`/dashboard/assessor` loga 406/400 do Supabase para usuário recém-criado**
  (maybeSingle sem linha) — ruído conhecido, a página funciona.
- **Screenshot full-page repete header e bottom-nav fixos** no meio da imagem —
  artefato do fullPage com elementos `position: fixed`.

## Troubleshooting

- **`error while loading shared libraries: libatk-1.0.so.0`**: faltam as libs
  do Prerequisites. Rode o `apt-get install` acima e use o headless shell
  (o driver resolve o binário sozinho em `~/.cache/ms-playwright`).
- **`Cannot find module 'playwright-core'`**: rode o `npm i --no-save` do
  Setup a partir de `frontend/` e execute o driver de lá (ele resolve o
  módulo pelo cwd).
- **`EADDRINUSE` ao subir o server**: já tem um `next dev` rodando —
  `kill $(cat /tmp/dev.pid)` (ou `pkill -f next-server`) e suba de novo.
- **Driver imprime "LOGIN FALHOU" com a tela de login intacta**: credencial
  errada ou usuário apagado. Verifique `IMONEY_EMAIL`/`IMONEY_PASSWORD` ou
  recrie a conta (ver Setup).
