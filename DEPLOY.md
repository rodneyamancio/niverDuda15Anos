# 🚀 Deploy — Ubuntu 24.04 com Docker + Nginx no host

Guia para colocar o portal no ar em um servidor que já roda outros projetos em Docker,
com Nginx instalado no host fazendo o HTTPS (certbot/Let's Encrypt).

Troque `festa.seudominio.com.br` pelo seu domínio real em todos os passos.

## 0. Pré-requisitos

- Servidor Ubuntu 24.04 com Docker + plugin compose (`docker compose version`)
- Nginx no host (`nginx -v`) e certbot (`certbot --version`; se faltar: `sudo apt install certbot python3-certbot-nginx`)
- Repositório do projeto no GitHub/GitLab
- DNS: registro **A** do domínio apontando para o IP do servidor (propague antes do passo 5)

## 1. Suba o código para o repositório remoto (no seu Mac)

```bash
cd ~/Documents/GitHub/niverDuda15Anos
git remote add origin git@github.com:SEU-USUARIO/niverDuda15Anos.git  # se ainda não tiver
git push -u origin main
```

## 2. Clone no servidor

```bash
ssh usuario@SEU-SERVIDOR
cd /opt   # ou onde você organiza seus projetos
sudo mkdir -p festa-duda && sudo chown $USER:$USER festa-duda
git clone git@github.com:SEU-USUARIO/niverDuda15Anos.git festa-duda
cd festa-duda
```

## 3. Crie o `.env` de produção

```bash
cp .env.production.example .env
nano .env
```

Preencha (os obrigatórios):

- `POSTGRES_PASSWORD` → `openssl rand -hex 16`
- `AUTH_SECRET` → `openssl rand -hex 32`
- `NEXT_PUBLIC_APP_URL` → `https://festa.seudominio.com.br` (é a URL que vai nos links dos convites!)
- `ADMIN_PASSWORD` e `SUPER_ADMIN_PASSWORD` → senhas fortes (podem ser trocadas depois em /admin/senha)
- Chaves do Resend/Twilio podem ficar vazias e ser configuradas depois na tela /admin/config

`APP_PORT=3010` é a porta local que o Nginx vai apontar — se já houver algo na 3010
(`ss -tlnp | grep 3010`), troque por outra livre.

## 4. Suba os containers

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

O compose de produção sobe 3 serviços em ordem: **db** (Postgres, sem porta exposta,
só na rede interna), **migrate** (roda `prisma migrate deploy` e termina) e **app**
(build de produção do Next, exposto só em `127.0.0.1:3010`).

Confira:

```bash
docker compose -f docker-compose.prod.yml logs migrate   # deve terminar sem erro
docker compose -f docker-compose.prod.yml logs -f app    # aguarde "Ready"
curl -I http://127.0.0.1:3010                            # deve responder 200
```

> Nota: acessar direto por `http://IP:3010` não permite login — o cookie de sessão
> exige HTTPS em produção. O login só funciona depois do Nginx + certificado (passo 5).

## 5. Nginx + HTTPS

Crie o site:

```bash
sudo nano /etc/nginx/sites-available/festa-duda
```

```nginx
server {
    listen 80;
    server_name festa.seudominio.com.br;

    location / {
        proxy_pass http://127.0.0.1:3010;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Os headers `X-Forwarded-*` são importantes: é deles que o log de auditoria tira o IP
real de quem acessa.

Ative e emita o certificado:

```bash
sudo ln -s /etc/nginx/sites-available/festa-duda /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d festa.seudominio.com.br
```

O certbot reescreve o site para HTTPS e renova sozinho.

## 6. Pós-deploy (checklist)

1. Abra `https://festa.seudominio.com.br/admin` e entre com a senha de super admin.
2. **/admin/senha**: troque as senhas do admin e do super admin (passam a valer as do banco).
3. **/admin/config**: confira nome/data/local da festa, cores, e cadastre as chaves do
   Resend e Twilio (ficam mascaradas). Confirme que a "URL pública do site" é a do domínio.
4. Cadastre os destinatários dos avisos de WhatsApp.
5. Cadastre um convidado de teste com seu próprio e-mail/celular, envie o convite e
   responda pelo link para validar o fluxo inteiro (envio, resposta, notificação, auditoria).

## 7. Atualizações futuras

No seu Mac: commit + push. No servidor:

```bash
cd /opt/festa-duda
./deploy.sh
```

O script faz `git pull`, rebuild, sobe com migrations e limpa imagens antigas.

## 8. Backup do banco (recomendado)

Backup diário às 3h da manhã, guardando 14 dias:

```bash
mkdir -p ~/backups/festa-duda
crontab -e
```

```cron
0 3 * * * docker compose -f /opt/festa-duda/docker-compose.prod.yml exec -T db pg_dump -U duda niver_duda | gzip > ~/backups/festa-duda/niver_duda_$(date +\%F).sql.gz && find ~/backups/festa-duda -name "*.sql.gz" -mtime +14 -delete
```

Para restaurar: `gunzip -c arquivo.sql.gz | docker compose -f docker-compose.prod.yml exec -T db psql -U duda niver_duda`

## Solução de problemas

- **Porta em uso ao subir**: mude `APP_PORT` no `.env` e no `proxy_pass` do Nginx.
- **502 no Nginx**: o app ainda está subindo ou caiu — `docker compose -f docker-compose.prod.yml logs app`.
- **Login não funciona**: acesse pelo domínio com HTTPS (cookie de sessão é `secure` em produção).
- **Migrations falharam**: `docker compose -f docker-compose.prod.yml logs migrate`; depois de corrigir, `docker compose -f docker-compose.prod.yml up -d --build` de novo.
- **Conflito com outros projetos**: este compose não expõe o Postgres e o app fica só em 127.0.0.1, então não disputa portas públicas com os demais projetos.
