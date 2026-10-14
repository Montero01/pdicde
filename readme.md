 README — CDE Academy
Plataforma de treinamento corporativo (LMS) com gamificação, certificação digital e loja de prêmios.

📋 Índice
Visão Geral

Funcionalidades

Stack Técnica

Arquitetura

Estrutura do Banco de Dados

Estrutura do Projeto

Instalação e Configuração

Sistema de Pontos

Sistema de Certificados

Loja de Prêmios

Notificações

Perfis de Acesso

Roadmap

Licença e Uso Comercial

🎯 Visão Geral
A CDE Academy é uma plataforma de ensino corporativo (LMS — Learning Management System) desenvolvida para a CDE Blindex® / Casa dos Espelhos, com foco em treinamento interno de colaboradores, desenvolvimento contínuo e valorização profissional.

Diferente de LMSs genéricos de mercado (Moodle, TalentLMS, Docebo), a CDE Academy foi desenhada para:

Integração nativa com o PDI (Plano de Desenvolvimento Individual) da empresa

Gamificação real — pontos, ranking, conquistas e loja de prêmios

Certificação digital com validação por QR Code e código único

Segmentação por setor — Comercial, Produção e Administrativo

Zero fricção para o colaborador — login único via PDI, tema claro/escuro, responsiva

A plataforma foi projetada para ser multi-tenant e white-label, permitindo comercialização como produto SaaS para outras empresas.

✨ Funcionalidades
Para o Colaborador (Aluno)
🏠 Página inicial com destaque de curso e catálogo liberado

🏢 Seção "Nossa Empresa" — história, valores e cultura da CDE

💻 Meus Cursos — cursos em que está matriculado, com progresso em tempo real

📚 Catálogo de Cursos — cursos publicados e disponíveis

📊 Meu Desempenho — KPIs individuais (matriculados, concluídos, taxa de conclusão)

🎓 Certificados — histórico e download em PDF

🏆 Loja de Prêmios — resgate de recompensas com pontos acumulados

🔔 Notificações — avisos da equipe e comunicados oficiais

🌙 Tema claro/escuro — alternância persistente

🖼️ Avatar personalizado — upload de foto de perfil

Para o Professor / Gestor
⚙️ Gerenciar Cursos — CRUD completo de cursos

📦 Gerenciar Módulos — organização hierárquica de conteúdo

📝 Gerenciar Aulas — 5 tipos de conteúdo (PDF, Vídeo, Slides, Imagem, Texto)

❓ Editor de Questionários — múltiplas perguntas com alternativas

👥 Gerenciar Matrículas — matrícula/desmatrícula de colaboradores por curso

📈 Analytics — engajamento por curso, aluno e aula

⭐ Gerenciar Pontos — visualização, ranking e ajustes manuais auditáveis

🎁 Gerenciar Prêmios — cadastro, estoque e resgate para colaboradores

📢 Enviar Notificações — comunicados para todos os colaboradores

👁 Pré-visualização de aulas antes de publicar

Para a Diretoria
📊 Dashboard Executivo — visão estratégica com KPIs, gráficos e comparação trimestral

🏆 Ranking de colaboradores e setores

⚠️ Alertas inteligentes (pendências, adesão baixa, colaboradores sem metas)

✅ Destaques positivos automáticos

🛠 Stack Técnica
Camada	Tecnologia
Frontend	HTML5, CSS3 (Custom Properties), JavaScript ES6+ (vanilla)
Backend / BaaS	Supabase (PostgreSQL + Auth + Storage + RLS)
Autenticação	Supabase Auth (JWT compartilhado com PDI)
Armazenamento	Supabase Storage (bucket academy + bucket avatars)
Geração de PDF	jsPDF 2.5.1
Gráficos	Chart.js
QR Code	API pública qrserver.com
Hospedagem	GitHub Pages (estático)
CDN	jsDelivr (libs), Cloudflare (assets)
Por que vanilla JS? Performance extrema (bundle zero), manutenção simples, sem dependência de framework, sem build step. Ideal para um produto que precisa rodar em qualquer navegador corporativo (incluindo IE legado em algumas empresas).

🏗 Arquitetura
text
┌─────────────────────────────────────────────────────────────┐
│                     NAVEGADOR (Cliente)                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  index.html  +  app.js  +  style.css                  │  │
│  │  ├─ View Layer (renderização dinâmica via JS)         │  │
│  │  ├─ Auth Layer (Supabase Client SDK)                  │  │
│  │  └─ Cache Layer (estado em memória)                   │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS / JWT
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                       SUPABASE (BaaS)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  PostgreSQL  │  │  Auth (JWT)  │  │     Storage      │   │
│  │  + RLS       │  │              │  │  covers/ pdfs/   │   │
│  │              │  │              │  │  images/ prizes/ │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                       ▲
                       │ SSO / sessão compartilhada
                       │
┌─────────────────────────────────────────────────────────────┐
│                    PDI (sistema externo)                    │
│              https://montero01.github.io/pdicde/            │
└─────────────────────────────────────────────────────────────┘
Fluxo de autenticação:

Usuário faz login no PDI (sistema externo)

Sessão é persistida no localStorage com a chave cde-auth-session

Ao abrir a Academy, o boot() lê a sessão compartilhada

Se não houver sessão → redireciona para o PDI em 5s

Se houver → carrega perfil e libera a aplicação

🗄 Estrutura do Banco de Dados
Tabelas principais
profiles
Perfil do colaborador (compartilhada com PDI).

text
id, full_name, email, role, sector, position, avatar_url, is_master, is_professor
academy_courses
Cursos da plataforma.

text
id, title, description, workload_hours, sector, cover_url,
is_published, created_by, created_at
academy_modules
Módulos de um curso (agrupadores de aulas).

text
id, course_id, title, order_index
academy_lessons
Aulas com conteúdo multimídia.

text
id, module_id, title, content_type (pdf|video|slides|image|text),
content_url, content_text, has_quiz, order_index
academy_quizzes / academy_quiz_options
Questionários de fixação.

text
quizzes: id, lesson_id, question, order_index
options: id, quiz_id, option_text, is_correct, order_index
academy_enrollments
Matrículas.

text
id, user_id, course_id, status, assigned_by, assigned_at
academy_progress
Progresso por aula.

text
user_id, lesson_id, completed_at, quiz_score
academy_completions
Cursos concluídos + pontos ganhos + certificado.

text
user_id, course_id, certificate_code, points_awarded,
quiz_perfect, completed_at
academy_lesson_views
Telemetria de engajamento.

text
user_id, lesson_id, course_id, time_spent_seconds,
completed, last_seen_at
academy_notifications
Comunicados da equipe.

text
id, title, message, created_by, created_by_name, created_at
academy_notification_reads
Controle de leitura por usuário.

text
notification_id, user_id, read_at
academy_points_adjustments
Ajustes manuais de pontos (auditável).

text
id, user_id, points, reason, course_id,
created_by, created_by_name, created_at
academy_prizes
Catálogo de prêmios.

text
id, name, description, image_url, points_cost,
stock, is_active, created_by, created_at
academy_redemptions
Histórico de resgates.

text
id, user_id, prize_id, prize_name, points_spent,
status (pending|delivered|cancelled), notes,
created_by, created_by_name, created_at, delivered_at
certificates (compartilhada com PDI)
Certificados do PDI (usados no Dashboard Executivo).

text
user_id, points_awarded, status, submitted_at, validated_at
goals (compartilhada com PDI)
Metas do PDI.

text
user_id, max_points, goal_type
📁 Estrutura do Projeto
text
cde-academy/
├── index.html              # Estrutura da aplicação + modais
├── style.css               # Design system (CSS variables, dark/light)
├── app.js                  # Lógica completa da aplicação
├── README.md               # Este arquivo
└── assets/                 # (Opcional) imagens locais
Organização do app.js:

text
1.  CONFIG                  → URL Supabase, keys, constantes
2.  ESTADO                  → Variáveis globais
3.  AVATAR                  → Upload e aplicação de foto
4.  TEMA                    → Dark/light mode
5.  HELPERS                 → Utilitários (escapeHtml, initials, etc.)
6.  NAVEGAÇÃO               → switchView, toggleSidebar
7.  AUTH                    → boot, loadUser, logout
8.  DATA LOADING            → loadCourses, loadEnrollments, etc.
9.  VIEWS DO ALUNO          → renderHome, renderCatalog, etc.
10. NOSSA EMPRESA           → renderEmpresa
11. HELPERS DE RENDER       → renderCourseCard, etc.
12. MODAL DE CURSO          → openCourseModal
13. PLAYER DE AULA          → openLessonPlayer, quiz player
14. CERTIFICADO             → Geração de PDF com jsPDF
15. PAINEL DE GESTÃO        → CRUD de cursos/módulos/aulas
16. ANALYTICS               → renderAnalyticsView
17. DASHBOARD EXECUTIVO     → renderDashboard
18. GESTÃO DE PONTOS        → renderPointsManagement
19. NOTIFICAÇÕES            → loadNotifications, sendNotification
20. LOJA DE PRÊMIOS         → renderPrizesView, resgates
21. INIT                    → Bootstrap
⚙️ Instalação e Configuração
Pré-requisitos
Conta no Supabase (plano gratuito serve para testes)

Navegador moderno (Chrome, Edge, Firefox, Safari)

Servidor HTTP estático (GitHub Pages, Netlify, Vercel ou qualquer CDN)

Passo 1 — Clonar o repositório
bash
git clone https://github.com/seu-usuario/cde-academy.git
cd cde-academy
Passo 2 — Criar projeto no Supabase
Acesse app.supabase.com → New Project

Anote a URL e a anon key (Project Settings → API)

Passo 3 — Criar o schema do banco
Rode todo o SQL abaixo no SQL Editor do Supabase (na ordem apresentada):

sql
-- (Ver seções "Estrutura do Banco de Dados" para o schema completo)
-- Todo o SQL está documentado nas respostas desta conversa,
-- organizado por feature: cursos, pontos, notificações, prêmios.
Passo 4 — Criar buckets de Storage
No Supabase → Storage → New Bucket:

academy (privado, com policies de leitura pública para arquivos servidos)

avatars (público, para fotos de perfil)

Passo 5 — Configurar config.js
js
const SUPABASE_URL = 'https://SEU-PROJETO.supabase.co';
const SUPABASE_ANON_KEY = 'SUA-ANON-KEY';
const PDI_URL = 'https://url-do-pdi-do-cliente/';
const BUCKET = 'academy';
Passo 6 — Configurar RLS (Row Level Security)
Todas as tabelas usam RLS por padrão. As policies estão documentadas no SQL de cada feature.

Passo 7 — Deploy
bash
# GitHub Pages
git push origin main
# Settings → Pages → Branch: main / root

# Ou Netlify/Vercel
netlify deploy --prod
Passo 8 — Primeiro acesso
Faça login no PDI com um usuário master ou is_professor = true

Crie o primeiro curso em Gerenciar Cursos

Matricule colaboradores via Gerenciar Matrículas

🏅 Sistema de Pontos
Como o saldo é calculado
text
Saldo = PDI + Academy + Ajustes manuais − Resgates
Fonte	Regra	Tabela
PDI	Soma de points_awarded de certificados com status = 'approved'	certificates
Academy	+5 pts por curso concluído
+2 pts extras se todos os quizzes do curso tiverem nota 100%	academy_completions
Ajustes	Lançamentos manuais (positivos ou negativos)	academy_points_adjustments
Resgates	Subtração ao trocar pontos por prêmios	academy_redemptions
Exemplo prático
Colaborador conclui "Excel Básico" (com quiz) → +5 pts

Acerta todas as questões → +5 + 2 = 7 pts

Ganha ajuste manual de "+10 por meta batida" → +10 pts

Resgata um fone Bluetooth de 20 pts → −20 pts

Saldo final: 7 + 10 − 20 = −3 → bloqueado (não pode resgatar)

Gestão de pontos (Professor/Master/Diretoria)
Ver ranking completo com breakdown (PDI / Academy / Ajustes / Total)

Fazer ajuste manual com motivo obrigatório e auditável

Histórico de ajustes (autor, data, motivo, valor)

🎓 Sistema de Certificados
Ao concluir um curso
Sistema verifica se todas as aulas foram concluídas

Verifica se todos os quizzes tiveram nota 100% → define quiz_perfect

Calcula pontos (5 ou 7)

Gera código único no formato: CDE-XXXXX-YYYY

Registra em academy_completions

Abre modal de parabéns → download em PDF

PDF do certificado (2 páginas)
Página 1 — Certificado:

Faixa laranja/vermelha no topo e rodapé

Logo CDE em marca d'água (opacidade 5%)

Nome do aluno, cargo, setor

Título do curso, carga horária, data

Código do certificado

Assinatura institucional

QR Code para validação

Selo Blindex® vetorial (desenhado programaticamente com rotação 45°)

Página 2 — Conteúdo Programático:

Lista hierárquica de módulos e aulas

Ícones por tipo de conteúdo (PDF, Vídeo, Slides, Imagem, Texto)

Marcação de aulas com questionário

Numeração por módulo.aula (ex: 2.3)

Paginação automática

Validação
O QR Code contém:

text
CDE ACADEMY | Certificado: [código] | Curso: [título] | Aluno: [nome] | Data: [data]
🎁 Loja de Prêmios
Para o colaborador
Vê prêmios com custo em pontos

Indicador visual: "✅ Você já pode resgatar!" ou "Saldo insuficiente"

Histórico de resgates pessoais com status

Para o gestor
CRUD de prêmios (nome, descrição, imagem, custo, estoque, ativo/inativo)

Resgate assistido: escolhe o prêmio → escolhe o colaborador → vê saldo em tempo real → confirma

Sistema bloqueia resgates com saldo insuficiente automaticamente

Baixa de estoque automática

Status do resgate: pending → delivered → cancelled

Resgates cancelados devolvem os pontos automaticamente

🔔 Notificações
Modelo
Globais: toda a empresa vê (comunicados oficiais)

Remetente: Professor, Master ou Diretoria

Badge: contador de não lidas no ícone 🔔

Marcação automática de leitura ao abrir o modal

Casos de uso sugeridos
Lançamento de novos cursos

Campanhas de incentivo

Avisos de manutenção

Metas e prazos

Premiações e reconhecimento

👥 Perfis de Acesso
Perfil	Identificação	Permissões
Colaborador	role = 'employee' ou 'colaborador'	Ver cursos matriculados, fazer aulas, resgatar prêmios
Supervisor	role = 'supervisor'	Idem colaborador + matrícula de colaboradores (via PDI)
Professor	is_professor = true	Gestão de cursos, módulos, aulas, quizzes, matrículas, analytics, pontos, prêmios, notificações
Diretoria	role contém 'diretor' ou 'diretoria'	Idem Professor + Dashboard Executivo
Master	is_master = true ou role = 'master'	Acesso total
Como o perfil é determinado:

js
canManage = isProfessor || isMaster || isDiretor;
🗺 Roadmap
✅ Versão atual (v1.0)
☑ Autenticação via SSO com PDI
☑ CRUD completo de cursos, módulos e aulas
☑ 5 tipos de conteúdo (PDF, Vídeo, Slides, Imagem, Texto)
☑ Sistema de quizzes com nota mínima de 70%
☑ Certificação em PDF com QR Code
☑ Sistema de pontos com gamificação
☑ Dashboard Executivo (Diretoria)
☑ Analytics de engajamento
☑ Loja de prêmios com resgate assistido
☑ Notificações globais
☑ Tema claro/escuro
☑ Avatar personalizado
☑ Marca d'água e selo Blindex® vetorial
🚧 Em desenvolvimento (v1.5) — Preparação para comercialização
□ White-label: nome, logo e cores configuráveis por cliente
□ Externalização de config (config.json ou env vars)
□ Import/Export de cursos em JSON (viabiliza venda por "pacote de cursos")
□ Cadastro nativo de colaboradores (remoção da dependência do PDI)
□ Onboarding wizard para novos clientes
🔮 Próximas versões (v2+)
□ Multi-tenant com isolamento por tenant_id
□ Billing integrado (Stripe, Mercado Pago, Asaas)
□ Painel super-admin (você) para gerenciar todos os clientes
□ Domínio customizado por cliente
□ PWA (Progressive Web App) para uso mobile
□ API pública para integrações
□ Gamificação avançada (badges, streaks, missões)
□ Trilhas de aprendizado (sequência obrigatória entre cursos)
□ Relatórios exportáveis em CSV/Excel
□ Integração com Slack/Teams para notificações
💼 Licença e Uso Comercial
Modelo de comercialização
A plataforma foi projetada para ser comercializada em 3 formatos:

Modelo	Descrição	Faixa de preço sugerida
Venda única + manutenção	Instância dedicada por cliente	Setup R
8
k
–
25
k
+
R
8k–25k+R 800–2.500/mês
SaaS (assinatura)	Multi-tenant com billing	R$ 397–1.897/mês por faixa de usuários
Híbrido (recomendado)	Setup + mensalidade + cursos	R
12
k
s
e
t
u
p
+
R
12ksetup+R 1.200/mês + R$ 800/curso
Pacotes de cursos
Pacote	Conteúdo	Preço
Starter	10 cursos genéricos	R$ 4.000
Setorial	10 cursos por setor	R$ 6.000
Premium	20 cursos + 2 exclusivos	R$ 15.000
Full	40 cursos + 5 exclusivos + atualização anual	R$ 30.000
Propriedade Intelectual
Plataforma (código): propriedade do desenvolvedor

Cursos produzidos pelo cliente: propriedade do cliente

Cursos do catálogo base: propriedade do desenvolvedor (licenciados ao cliente)

LGPD
O cliente é o Controlador dos dados (dados de RH dos colaboradores)

O desenvolvedor é o Operador dos dados

Necessário contrato de tratamento de dados (DPA) com cada cliente

Backup automatizado recomendado (Supabase PITR no plano Pro)

Contrato recomendado deve cobrir
Escopo detalhado

SLA e suporte

LGPD e privacidade

Propriedade intelectual

Rescisão e portabilidade de dados

Reajuste anual (IPCA/IGP-M)

📞 Contato e Suporte
Desenvolvedor: [Seu nome]
E-mail: [seu-email@dominio.com]
Site: [cdeacademy.com.br]

<div align="center">
CDE Academy © 2026 — Sistema desenvolvido para
CDE Blindex® — Casa dos Espelhos

Feito com ☕ e dedicação no Amazonas 🌳

</div>
📎 Anexos
A. Variáveis de ambiente
js
SUPABASE_URL        // URL do projeto Supabase
SUPABASE_ANON_KEY   // Chave pública (anon)
PDI_URL             // URL do sistema PDI do cliente
BUCKET              // Nome do bucket principal ('academy')
B. Tipos de conteúdo suportados
Tipo	Ícone	Formatos aceitos
PDF	📄	Upload .pdf
Vídeo	🎬	YouTube, Vimeo, Google Drive (embed automático)
Slides	📊	Genially, Google Slides, Canva (URL de embed)
Imagem	🖼️	Upload .jpg, .png, .webp
Texto	📝	HTML básico
C. Códigos de status
Matrícula (academy_enrollments.status):

active — em andamento

completed — concluída

Resgate (academy_redemptions.status):

pending — aguardando entrega

delivered — entregue

cancelled — cancelado (pontos devolvidos)

Certificado PDI (certificates.status):

pending — aguardando validação

approved — aprovado (conta pontos)

D. Cores da marca
css
--cde-laranja:        #E87722
--cde-vermelho:       #C8102E
--cde-laranja-escuro: #B85A10
--verde:              #158A49
--roxo-medio:         #7C3AED
Fim do README.
Última atualização: 2026.
