# 🤖 Automação Instagram

Fonte: [Página original no Notion](https://boulder-penalty-f0f.notion.site/Automa-o-Instagram-37663851400e807eb74bee3cc7220571)

## Tutorial Passo a passo GRATUITO 👇🏼

[Sociedade IA 🤖](https://www.skool.com/sociedade-ia-3946/about)

IA para criadores 🤖 Sem guru, sem enrolação. Aprenda na prática automações do zero pra criar conteúdo sem complicação. Entra que é de graça!

---

Automatize suas ideias de conteúdo com IA — todo dia, sem esforço.
by @drisiano · DG Media · ia para criadores.

> 🍎 Esta é a versão MAC. Usa Windows? O guia adaptado tá aqui: [Clica Aqui](https://boulder-penalty-f0f.notion.site/p/37b63851400e800194fdeb88b758759a?pvs=25)

---

### O que você vai construir

Um sistema que roda todo dia às 8h e faz isso automaticamente:

1. Pega os posts que você salvou no Instagram
2. Envia para o Claude AI analisar
3. Gera ideias de Reels prontas no seu Notion

Sem abrir app. Sem pensar. As ideias chegam sozinhas.

Como o sistema funciona por dentro:

São 2 scripts em Python que trabalham em dupla:

- Script 1 (`instagram_saves_sync.py`) → é o “coletor”. Ele entra no seu Instagram usando seus cookies, pega todos os posts que você salvou e joga dentro de uma tabela no Notion. Só isso.
- Script 2 (`generate_ideas.py`) → é o “criativo”. Ele olha os posts novos que o Script 1 trouxe, manda cada um pro Claude AI e pede: “transforma isso numa ideia de Reel”. A ideia volta pronta com título, gancho e roteiro, e vai pra uma segunda tabela no Notion.

O crontab (o “despertador” do computador) roda o Script 1 às 8h e o Script 2 às 8h30, todo dia, sozinho.

---

### Pré-requisitos

- Python 3.8+ — é a linguagem que roda os scripts. Mac já vem instalado. Windows: baixe em python.org
- Conta no Notion — notion.so (gratuito). É onde os posts e as ideias vão ficar guardados
- Chave da API do Notion — é a “senha” que deixa o script escrever nas suas tabelas
- Cookies do Instagram (sessionid + csrftoken + ds_user_id) — é como o script “entra” na sua conta sem precisar de login
- Chave da API do Claude — console.anthropic.com — é o que dá acesso à IA que vai gerar as ideias

> ⚠️ Este tutorial é focado em Mac. Os comandos de Terminal (nano, mkdir, crontab) são do macOS. No Windows os caminhos e ferramentas são diferentes — dá pra adaptar, mas siga por sua conta.

---

### Etapa 1 — Criar as Databases no Notion

Pra que serve: aqui você cria as 2 “tabelas” onde tudo vai ser guardado. A primeira recebe os posts salvos do Instagram (matéria-prima). A segunda recebe as ideias prontas que o Claude gerar (produto final).

**Database 1: Post Salvos**

Crie uma página → Database - Full page → nome: Post Salvos

| Campo | Tipo |
| --- | --- |
| post_id | Title |
| caption | Text |
| media_url | URL |
| author | Text |
| profile_pic | URL |
| likes | Number |
| views | Number |
| tipo | Select |
| status | Select |
| saved | Date |

**Database 2: Ideias de Posts**

Repita o processo → nome: Ideias de Posts

| Campo | Tipo |
| --- | --- |
| titulo | Title |
| formato | Select |
| roteiro | Text |
| fonte | URL |
| data_geracao | Date |
| Hook | Text |
| status | Select |

⚠️ Os nomes dos campos precisam ser exatamente iguais aos da tabela (maiúsculas e minúsculas contam). Se escrever diferente, o script não encontra o campo e dá erro.

---

### Etapa 2 — Chaves de Acesso

Pra que serve: o script precisa de 3 “credenciais” pra funcionar — uma pra escrever no Notion, uma pra entrar no Instagram e uma pra usar a IA. Nesta etapa você coleta as três.

**Notion**

1. Acesse notion.so/my-integrations
2. Clique em New integration → nome: Instagram Saves Sync
3. Copie o token (começa com ntn_…)
4. Abra cada database → menu … no canto → Connections → selecione sua integração (esse passo é o que “autoriza” o script a mexer naquela tabela — se esquecer, dá erro de permissão)
5. Pegue os Database IDs da URL do browser — é o código longo que aparece entre a última barra `/` e o `?` na URL de cada database

**Claude AI**

1. Acesse console.anthropic.com
2. Clique em API Keys → Create Key
3. Copie a chave — ela aparece uma única vez

**Cookies do Instagram**

⚠️ Antes: o Safari vem com as ferramentas de desenvolvedor desativadas. Ative em: Safari → Ajustes → Avançado → marque “Mostrar recursos para desenvolvedores web”. Sem isso, a opção “Inspecionar Elemento” não aparece.

1. Abra o Instagram no Safari (logado na sua conta)
2. Botão direito → Inspecionar Elemento → Storage → Cookies → www.instagram.com
3. Copie os valores de: `sessionid`, `csrftoken`, `ds_user_id`
4. Guarde os três — nunca compartilhe com ninguém (com eles, qualquer pessoa entra na sua conta)

---

### Etapa 3 — Pasta do Projeto e Arquivo .env

Pra que serve: o arquivo `.env` é o “cofre” do projeto. É onde ficam todas as suas chaves e senhas, separadas do código. Assim, se você compartilhar o script com alguém, suas senhas não vão junto.

Abre o Terminal — Mac: Cmd+Space → digita “Terminal” → Enter

Cria a pasta do projeto:

```bash
mkdir ~/ig-saves-engine && cd ~/ig-saves-engine
```

O que esse comando faz: `mkdir` cria uma pasta chamada `ig-saves-engine` direto na sua pasta de usuário, e `cd` entra nela. Tudo do projeto vai morar aqui.

> ⚠️ A pasta fica na home (não no Desktop) de propósito: o macOS bloqueia automações de acessar o Desktop por segurança, e isso faria o agendamento da Etapa 6 falhar silenciosamente.

Cria o arquivo .env:

```bash
nano .env
```

O que esse comando faz: abre o editor de texto nano dentro do Terminal e cria o arquivo .env.

Cola isso dentro, trocando pelos seus valores:

```dotenv
NOTION_TOKEN=ntn_SUA_CHAVE
NOTION_DB_SAVES=ID_DA_DATABASE_SAVES
NOTION_DB_IDEAS=ID_DA_DATABASE_IDEAS
INSTAGRAM_SESSIONID=SEU_SESSIONID
INSTAGRAM_CSRFTOKEN=SEU_CSRFTOKEN
INSTAGRAM_DS_USER_ID=SEU_DS_USER_ID
ANTHROPIC_API_KEY=sk-ant-SUA_CHAVE
IG_USERNAME=SEU_USUARIO_INSTAGRAM
```

Salva com: Ctrl+O → Enter → Ctrl+X

Instala as dependências:

```bash
pip3 install notion-client anthropic requests python-dotenv --break-system-packages
```

O que esse comando faz: baixa as 4 “ferramentas” que os scripts usam — notion-client (conversa com o Notion), anthropic (conversa com o Claude), requests (conversa com o Instagram) e python-dotenv (lê o cofre .env).

---

### Etapa 4 — Script 1: instagram_saves_sync.py

Pra que serve: este é o script que puxa as informações do Instagram. Ele entra na sua conta usando os cookies, lista todos os posts que você salvou e grava cada um na database “Post Salvos” do Notion — com legenda, autor, likes, views e tipo (Reel ou Post). Ele também é esperto: antes de salvar, confere o que já existe no Notion pra nunca criar duplicata.

Cria o arquivo:

```bash
nano instagram_saves_sync.py
```

Cola o código inteiro:

```python
import os, requests
from notion_client import Client
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

notion  = Client(auth=os.environ['NOTION_TOKEN'])
DB_ID   = os.environ['NOTION_DB_SAVES']
SESSION = os.environ['INSTAGRAM_SESSIONID']
CSRF    = os.environ['INSTAGRAM_CSRFTOKEN']
DS      = os.environ['INSTAGRAM_DS_USER_ID']

HEADERS = {
    'Cookie': 'sessionid=' + SESSION + '; csrftoken=' + CSRF + '; ds_user_id=' + DS,
    'X-CSRFToken': CSRF,
    'User-Agent': 'Instagram 219.0.0.12.117 Android',
    'X-IG-App-ID': '936619743392459',
    'Accept': 'application/json',
}

def get_existing_ids():
    # Le TODOS os posts ja salvos no Notion (com paginacao) para evitar duplicatas
    ids = set()
    cursor = None
    while True:
        if cursor:
            res = notion.databases.query(database_id=DB_ID, start_cursor=cursor)
        else:
            res = notion.databases.query(database_id=DB_ID)
        for r in res['results']:
            try:
                ids.add(r['properties']['post_id']['title'][0]['text']['content'])
            except:
                pass
        if not res.get('has_more'):
            break
        cursor = res.get('next_cursor')
    return ids

def get_saved_posts():
    # Busca os posts salvos direto da API do Instagram
    url = 'https://www.instagram.com/api/v1/feed/saved/posts/'
    res = requests.get(url, headers=HEADERS)
    return res.json().get('items', [])

def save_to_notion(post):
    # Extrai os dados de cada post e grava na database do Notion
    media = post.get('media', post)
    media_id = str(media.get('pk', media.get('id', '')))
    user = media.get('user', {})
    author = user.get('username', '')
    profile_pic = user.get('profile_pic_url', '')
    caption = media.get('caption', {})
    caption_text = caption.get('text', '') if caption else ''
    thumbnail = media.get('image_versions2', {}).get('candidates', [{}])[0].get('url', '')
    likes = media.get('like_count', 0) or 0
    views = media.get('play_count', media.get('view_count', 0)) or 0
    media_type = media.get('media_type', 1)
    tipo = 'Reel' if media_type == 2 else 'Post'
    saved_date = datetime.now().strftime('%Y-%m-%d')

    notion.pages.create(
        parent={'database_id': DB_ID},
        properties={
            'post_id':     {'title':     [{'text': {'content': media_id}}]},
            'caption':     {'rich_text': [{'text': {'content': caption_text[:1990]}}]},
            'media_url':   {'url': thumbnail or 'https://instagram.com'},
            'author':      {'rich_text': [{'text': {'content': author}}]},
            'profile_pic': {'url': profile_pic or 'https://instagram.com'},
            'likes':       {'number': likes},
            'views':       {'number': views},
            'tipo':        {'select': {'name': tipo}},
            'status':      {'select': {'name': 'Novo'}},
            'saved':       {'date': {'start': saved_date}},
        }
    )

if __name__ == '__main__':
    existing = get_existing_ids()
    print('Ja existem ' + str(len(existing)) + ' posts no Notion')
    posts = get_saved_posts()
    total = 0
    for post in posts:
        media = post.get('media', post)
        media_id = str(media.get('pk', media.get('id', '')))
        if media_id in existing:
            continue
        save_to_notion(post)
        existing.add(media_id)
        total += 1
    print('Concluido! ' + str(total) + ' novos posts adicionados.')
```

Salva com: Ctrl+O → Enter → Ctrl+X

Agora testa o Script 1:

```bash
cd ~/ig-saves-engine
python3 instagram_saves_sync.py
```

O que esse comando faz: cd entra na pasta do projeto e python3 executa o script. É o momento da verdade — ele vai conectar no seu Instagram, puxar os posts salvos e gravar no Notion.

✅ Se funcionou, você vai ver no Terminal algo como: `Ja existem 0 posts no Notion` e depois `Concluido! 12 novos posts adicionados.` — abre a database “Post Salvos” no Notion e os posts vão estar lá.

❌ Se deu erro 403: os cookies estão errados ou expiraram — refaz a Etapa 2. Se deu erro de “could not find database”: o Database ID está errado ou você esqueceu de conectar a integração na database (Etapa 2, passo 4).

📌 Obs: as URLs de thumbnail do Instagram expiram depois de alguns dias — é normal as imagens “quebrarem” no Notion com o tempo. Os textos e dados continuam intactos.

---

### Etapa 5 — Script 2: generate_ideas.py

Pra que serve: este é o script que transforma os posts em ideias prontas. Ele pega os posts com status “Novo” na database (até 10 por vez), manda a legenda de cada um pro Claude AI e pede uma ideia de Reel no formato TITULO / FORMATO / GANCHO / ROTEIRO. Cada ideia é gravada na database “Ideias de Posts” já com status “gravar” — e o post original é marcado como “Processado” pra não ser usado de novo.

Cria o arquivo:

```bash
nano generate_ideas.py
```

Cola o código inteiro:

```python
import os
import anthropic
from notion_client import Client
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

notion   = Client(auth=os.environ['NOTION_TOKEN'])
DB_SAVES = os.environ['NOTION_DB_SAVES']
DB_IDEAS = os.environ['NOTION_DB_IDEAS']
client   = anthropic.Anthropic(api_key=os.environ['ANTHROPIC_API_KEY'])

def get_new_saves():
    # Busca ate 10 posts com status "Novo" na database de salvos
    res = notion.databases.query(
        database_id=DB_SAVES,
        filter={'property': 'status', 'select': {'equals': 'Novo'}}
    )
    return res['results'][:10]

def generate_idea(caption, author):
    # Envia a legenda do post pro Claude e pede uma ideia de Reel estruturada
    msg = client.messages.create(
        model='claude-sonnet-4-5',
        max_tokens=800,
        messages=[{'role': 'user', 'content':
            'Voce e um especialista em criacao de conteudo sobre IA para criadores.\n'
            'Post de @' + author + ' no Instagram:\n' + caption + '\n'
            'Baseado neste post, crie uma ideia de Reel para criadores brasileiros.\n'
            'Responda EXATAMENTE neste formato:\n'
            'TITULO: [titulo curto e chamativo]\n'
            'FORMATO: [Reel, Carrossel ou Post]\n'
            'GANCHO: [primeira frase do video, maxima 10 palavras]\n'
            'ROTEIRO: [roteiro em 4-5 passos numerados]'
        }]
    )
    return msg.content[0].text

def parse_idea(text):
    # Separa a resposta do Claude em 4 partes: titulo, formato, gancho e roteiro
    titulo = 'Ideia gerada'
    formato = 'Reel'
    gancho = ''
    roteiro = text
    for line in text.split('\n'):
        if line.startswith('TITULO:'):
            titulo = line.replace('TITULO:', '').strip()
        elif line.startswith('FORMATO:'):
            formato = line.replace('FORMATO:', '').strip()
        elif line.startswith('GANCHO:'):
            gancho = line.replace('GANCHO:', '').strip()
        elif line.startswith('ROTEIRO:'):
            roteiro = text[text.find('ROTEIRO:'):].replace('ROTEIRO:', '').strip()
    return titulo, formato, gancho, roteiro

def save_idea(titulo, formato, gancho, roteiro, source_id, media_url):
    # Grava a ideia pronta na database "Ideias de Posts"
    notion.pages.create(
        parent={'database_id': DB_IDEAS},
        properties={
            'titulo':       {'title':     [{'text': {'content': titulo[:200]}}]},
            'formato':      {'select':    {'name': formato}},
            'Hook':         {'rich_text': [{'text': {'content': gancho[:200]}}]},
            'roteiro':      {'rich_text': [{'text': {'content': roteiro[:1990]}}]},
            'fonte':        {'url': media_url or 'https://instagram.com'},
            'data_geracao': {'date': {'start': datetime.now().strftime('%Y-%m-%d')}},
            'status':       {'select': {'name': 'gravar'}}
        }
    )

def mark_status(page_id, status):
    # Atualiza o status do post original (Processado ou Erro)
    notion.pages.update(
        page_id=page_id,
        properties={'status': {'select': {'name': status}}}
    )

if __name__ == '__main__':
    saves = get_new_saves()
    print('Processando ' + str(len(saves)) + ' posts novos...')
    for s in saves:
        try:
            props = s['properties']
            cap = props['caption']['rich_text'][0]['text']['content']
            author = props.get('author', {}).get('rich_text', [{}])
            author = author[0]['text']['content'] if author else 'desconhecido'
            media_url = props.get('media_url', {}).get('url', '')
            source_id = props['post_id']['title'][0]['text']['content']
            idea = generate_idea(cap, author)
            titulo, formato, gancho, roteiro = parse_idea(idea)
            save_idea(titulo, formato, gancho, roteiro, source_id, media_url)
            mark_status(s['id'], 'Processado')
            print('Salvo: ' + titulo)
        except Exception as e:
            print('Erro: ' + str(e))
            try:
                mark_status(s['id'], 'Erro')
            except:
                pass
    print('Concluido!')
```

Salva com: Ctrl+O → Enter → Ctrl+X

📌 Obs: posts sem legenda (só foto/vídeo) são marcados como “Erro” automaticamente — isso é proposital, pra eles não ficarem travando a fila dos 10 posts por rodada.

Agora testa o Script 2:

```bash
python3 generate_ideas.py
```

O que esse comando faz: executa o gerador de ideias. Ele vai ler os posts “Novo” do Notion, mandar um por um pro Claude e gravar as ideias prontas.

✅ Se funcionou, o Terminal mostra `Processando X posts novos...` e depois uma linha `Salvo: [título]` pra cada ideia. Abre a database “Ideias de Posts” no Notion — suas ideias de Reel estão lá, com gancho e roteiro prontos.

---

### Etapa 6 — Agendar para Rodar Todo Dia

Pra que serve: até aqui você rodou tudo manualmente. Agora vamos ensinar o Mac a fazer isso sozinho, todo dia: às 8h ele puxa os posts do Instagram, às 8h30 ele gera as ideias. Você acorda e as ideias já estão no Notion.

Abre o agendador (crontab) já com o editor nano:

```bash
EDITOR=nano crontab -e
```

O que esse comando faz: abre a “agenda” de tarefas automáticas do Mac. O `EDITOR=nano` no início é importante — sem ele, o Mac abre um editor chamado vim, que é confuso pra quem nunca usou.

Cola estas 2 linhas:

```cron
0 8 * * * cd ~/ig-saves-engine && python3 instagram_saves_sync.py
30 8 * * * cd ~/ig-saves-engine && python3 generate_ideas.py
```

Traduzindo: `0 8 * * *` = todo dia às 8h00 em ponto. `30 8 * * *` = todo dia às 8h30. O `cd ~/ig-saves-engine &&` garante que o script rode de dentro da pasta certa e encontre o arquivo .env.

Salva com: Ctrl+O → Enter → Ctrl+X

Confirma que ficou agendado:

```bash
crontab -l
```

O que esse comando faz: lista tudo que está agendado. Se as 2 linhas aparecerem, está pronto.

⚠️ Importante: o Mac precisa estar ligado e acordado às 8h pra rodar. Se estiver dormindo, o cron não roda. Dica: Ajustes do Sistema → busca “Programar” → configura o Mac pra acordar às 7h55.

---

### ✅ Checklist Final

- [ ] 2 databases criadas no Notion com os campos exatos
- [ ] Integração do Notion conectada nas 2 databases
- [ ] Arquivo .env preenchido com as 6 chaves
- [ ] Script 1 testado — posts apareceram no Notion
- [ ] Script 2 testado — ideias apareceram no Notion
- [ ] Crontab agendado e confirmado com crontab -l

---

[Sociedade IA 🤖](https://www.skool.com/sociedade-ia-3946/about)

IA para criadores 🤖 Sem guru, sem enrolação. Aprenda na prática automações do zero pra criar conteúdo sem complicação. Entra que é de graça!

Dúvidas? Instagram: @drisiano

DG Media · ia para criadores

🍎 Esta é a versão MAC. Usa Windows? O guia adaptado tá aqui: [Clica Aqui](https://boulder-penalty-f0f.notion.site/p/37b63851400e800194fdeb88b758759a?pvs=25)
