# 🎉 Portal — 15 Anos da Duda

Portal do aniversário de 15 anos com **Save the Date**: os convidados recebem um link exclusivo
por e-mail e/ou WhatsApp e respondem se pretendem ir. Preparado para receber a feature de **RSVP**
(confirmação final) no futuro.

## Stack

- **Front + Backend:** Next.js (App Router, TypeScript, Tailwind) com API Routes em Node
- **Banco:** PostgreSQL + Prisma ORM
- **E-mail:** [Resend](https://resend.com)
- **WhatsApp:** [Twilio](https://www.twilio.com/whatsapp)

## Como rodar (tudo em Docker)

Pré-requisito: Docker Desktop aberto.

### 1. Configure o ambiente (só na primeira vez)

```bash
cp .env.example .env
```

Edite o `.env`:

- `ADMIN_PASSWORD` — senha do painel admin
- `AUTH_SECRET` — gere com `openssl rand -hex 32`
- `NEXT_PUBLIC_EVENT_*` — nome, data, local da festa
- `RESEND_API_KEY` / `EMAIL_FROM` — credenciais do Resend
- `TWILIO_*` — credenciais do Twilio (WhatsApp)

### 2. Suba tudo

```bash
docker compose up -d
```

Isso sobe o **Postgres** e o **app Next.js** (modo dev, com hot reload). Na primeira vez
demora alguns minutos (npm install + migrations dentro do container). Acompanhe com:

```bash
docker compose logs -f app
```

Quando aparecer `Ready`, acesse:

- Painel admin: http://localhost:3000/admin
- Convite (exemplo): http://localhost:3000/convite/TOKEN_DO_CONVIDADO

Comandos úteis: `docker compose down` (para tudo), `docker compose restart app`
(reinicia o app), `docker compose down -v` (apaga também o banco — cuidado!).

O código fica montado dentro do container: edite os arquivos normalmente e o
hot reload atualiza o site sozinho.

### Deploy (produção)

O `Dockerfile` na raiz gera a imagem de produção (`next build` + saída standalone):

```bash
docker build -t niver-duda .
docker run -p 3000:3000 --env-file .env -e DATABASE_URL="postgresql://..." niver-duda
```

## Fluxo

1. No **painel admin** (`/admin`), cadastre os convidados com nome, e-mail e/ou celular.
2. Clique em **✉️ E-mail** ou **💬 WhatsApp** para enviar o Save the Date para um convidado,
   ou use **"Enviar para todos os pendentes"**. Cada mensagem contém o link exclusivo do convidado.
3. O convidado abre o link (`/convite/[token]`) e responde **"Sim, pretendo ir"** ou
   **"Não poderei ir"** (pode mudar a resposta depois).
4. O painel mostra as estatísticas em tempo real e o histórico de envios.
5. O botão 🔗 copia o link do convite, útil para enviar manualmente por qualquer canal.

## Configurando os provedores

### Resend (e-mail)

1. Crie uma conta em https://resend.com e gere uma API key (`RESEND_API_KEY`).
2. Sem domínio verificado, os e-mails só chegam para o endereço da sua conta e o remetente deve
   ser `onboarding@resend.dev`. Para enviar aos convidados de verdade, verifique um domínio em
   *Domains* e use `EMAIL_FROM="Festa da Duda <convite@seudominio.com>"`.

### Twilio (WhatsApp)

1. Crie uma conta em https://www.twilio.com e pegue `TWILIO_ACCOUNT_SID` e `TWILIO_AUTH_TOKEN`.
2. **Para testar:** use o *WhatsApp Sandbox* (Messaging → Try it out). Cada convidado de teste
   precisa mandar a mensagem `join <código>` para o número do sandbox antes de receber.
   `TWILIO_WHATSAPP_FROM` é o número do sandbox (ex: `+14155238886`).
3. **Para produção:** registre um remetente WhatsApp próprio (WhatsApp Senders) com templates
   aprovados pela Meta — mensagens iniciadas pela empresa exigem template aprovado.

### Link nas mensagens

Em produção, defina `NEXT_PUBLIC_APP_URL` com a URL pública do site (ex: `https://festadaduda.com.br`)
para que os links enviados funcionem fora da sua máquina.

## Estrutura

```
prisma/schema.prisma          # Modelos: Guest, MessageLog (com enums p/ RSVP futuro)
src/config/event.ts           # Dados da festa (via .env)
src/lib/auth.ts               # Sessão admin (cookie assinado)
src/lib/send.ts               # Envio e-mail (Resend) + WhatsApp (Twilio) + log
src/lib/messages.ts           # Textos/templates das mensagens
src/app/convite/[token]/      # Página pública do Save the Date
src/app/admin/                # Login + painel dos organizadores
src/app/api/                  # API: auth, guests (CRUD + envio), invite (resposta)
```

## Próxima feature: RSVP

O schema já tem `rsvpStatus`/`rsvpAt` no convidado e `MessageKind.RSVP` no log de mensagens.
A ideia é reaproveitar o mesmo link/token do convidado para a confirmação final
(com acompanhantes, restrições alimentares etc.).
