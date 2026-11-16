# Site BC Soluções (bcsolucoes2021.site)

Site estático (HTML + CSS) para verificação de domínio no Meta Business.

- `index.html`: página inicial com o CNPJ visível
- `politica-de-privacidade.html`
- `termos-e-condicoes.html`

## Antes de publicar

Dados da empresa conforme o Cartão CNPJ (43.959.802/0001-36).

## Publicar no Cloudflare Pages

1. Cloudflare > Workers & Pages > Create > Pages > Connect to Git, e escolha este repositório.
2. Build command: vazio. Build output directory: `site`.
3. Em Custom domains, adicione `bcsolucoes2021.site`.
4. No Meta Business: Configurações > Segurança da marca > Domínios > Adicionar. Escolha a verificação por registro TXT no DNS e crie o registro no Cloudflare (DNS > Records).
