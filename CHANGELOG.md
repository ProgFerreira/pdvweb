# Changelog

Todas as mudanças relevantes do **PDV Galetos** são documentadas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o versionamento segue [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [1.1.0] - 2026-06-10

### Adicionado
- **Fidelidade no PDV**: resgate de pontos como desconto na finalização do pedido (100 pts = R$1,00); exibição de saldo com badge roxo; campo "Usar todos" e input manual
- **NFC-e via Focus NFe**: integração real com a API Focus NFe (emissão, consulta e cancelamento); configuração completa em `/configuracoes`; campo `nfcePdfUrl` para link do DANFE
- **Testes automatizados**: suite com 27 testes cobrindo `utils`, `rate-limit` e `permissions`
- **Script de backup**: `npm run db:backup` gera dump comprimido (.sql.gz) mantendo os últimos 7 backups

### Corrigido
- **Segurança `/print`**: token embute `tenantId` — impede acesso cross-tenant; `generateMetadata` não expõe dados sem autenticação
- **Encoding corrompido**: acentos em `relatorios/page.tsx` e `configuracoes/page.tsx` corrigidos
- **TypeScript**: 8 erros pré-existentes corrigidos em `contas-pagar`, `notas-fiscais-compra`, `auth`
- **Contas a pagar**: `category` obrigatória no form; filtro `status.in` tipado como `PayableStatus[]`

### Melhorado
- **Rate limiting**: 10 req/min em `/api/auth`, 60 req/min em `/api/vendas`
- **Usuários**: botão excluir com confirmação, toggle ativo com switch acessível, variantes de Badge tipadas
- **Relatórios**: export CSV para CMV adicionado; KPI "Cancelados" no relatório de vendas
- **Painel de Cozinha**: filtro por setor (Grelha, Acompanhamentos, Bebidas, Sobremesas, Geral); etiqueta de setor nos itens; `kitchenSector` incluído na API de vendas
- **PDV**: polling de caixa a cada 60s; banner vermelho quando caixa fecha com carrinho ativo
- **Dashboard**: coluna "Ticket Médio" adicionada ao ranking de operadores
- **Promoções**: CRUD completo (editar + excluir); validação de sobreposição de período e escopo; tabela com vigência e status
- **Upload NF**: validação por magic number (PDF, JPEG, PNG, WebP, XML); suporte a XML de NF-e
- **`AUTH_SECRET`**: validação no boot em produção (tamanho mínimo + bloqueio de segredos padrão)
- **Configurações**: seção NFC-e completa (CNPJ, IE, CRT, série, ambiente, token Focus NFe)

---

## [1.0.0] - 2026-06-09

Primeira versão estável do sistema de ponto de venda para galeteria.

### Adicionado

#### Plataforma e infraestrutura

- Aplicação web com **Next.js 15**, **React 19**, **TypeScript**, **Prisma** e **MySQL**
- Autenticação com **NextAuth v5** (login por e-mail e senha)
- Arquitetura **multi-tenant** (suporte a múltiplas unidades/lojas)
- Validação de dados com **Zod** em formulários e APIs
- UI Kit portável (`ui-kit/`) com componentes reutilizáveis e CSS compilado
- Scripts de banco: `db:push`, `db:seed`, `db:seed-demo` e `db:studio`
- Testes unitários com **Vitest** (permissões)
- Seed inicial com tenant, categorias, produtos, mesas, usuários e fornecedor de exemplo

#### Segurança e permissões

- Controle de acesso por papéis (**RBAC**): Administrador, Gerente, Caixa, Atendente e Cozinha
- Permissões granulares no formato `modulo.acao` (ex.: `pdv.vender`, `caixa.operar`)
- Permissões persistidas no banco (`permissions` + `role_permissions`)
- Menu lateral e rotas filtrados conforme o papel do usuário
- Senhas com hash **bcrypt**
- Exclusão lógica de usuários, clientes, fornecedores e produtos
- Trilha de **auditoria** com registro de ações, recurso, dados anteriores/novos, IP e user-agent

#### Dashboard

- KPIs do dia: faturamento, pedidos, ticket médio e pedidos em aberto
- Gráfico de vendas dos últimos 7 dias
- Distribuição por forma de pagamento
- Ranking de produtos mais vendidos
- Alerta de produtos com estoque baixo

#### PDV (Ponto de Venda)

- Interface de venda com busca de produtos por nome/código
- **Múltiplas sessões de caixa** simultâneas (abas de atendimento)
- Tipos de pedido: **balcão**, **retirada** e **delivery próprio**
- Vinculação a cliente cadastrado ou venda para visitante
- Carrinho com quantidade, observações por item, desconto, acréscimo e isenção de taxa de serviço
- Pagamento com múltiplas formas: dinheiro, PIX, débito, crédito e vale/refeição
- Cálculo automático de troco
- Histórico de compras do cliente no PDV
- Impressão de comanda/pedido em layout dedicado (`/print/pedido/[id]`)
- Integração fiscal **NFC-e** preparada (stub para provedor externo via `FISCAL_PROVIDER_URL`)

#### Caixa

- Abertura de caixa com valor inicial
- Operação de caixa com totais por forma de pagamento
- Movimentações manuais de entrada e saída
- Fechamento com conferência de dinheiro e diferença de caixa
- Histórico de caixas com filtros, detalhes, edição e exclusão (conforme permissão)

#### Fila de pedidos e cozinha (KDS)

- Fila operacional com status: Aguardando → Em preparo → Pronto → Entregue
- Painel de cozinha em tela cheia (`/painel`) para exibição em TV/monitor
- SLA configurável por loja (alerta visual quando o pedido ultrapassa o tempo)
- Notificações sonoras para novos pedidos na fila
- Cancelamento de pedido com motivo obrigatório
- Setores de cozinha por categoria (grelha, acompanhamentos, bebidas, sobremesas)
- Impressão direta da fila

#### Vendas

- Listagem de vendas com filtros por período, status e busca
- Detalhamento de itens, pagamentos e dados de entrega
- Atualização de status do pedido

#### Estoque

- Controle de estoque com Kardex (histórico de movimentações)
- Tipos de movimento: venda, cancelamento, entrada, ajuste, perda e compra
- Baixa automática de estoque ao confirmar venda
- Estorno de estoque ao cancelar pedido
- Alerta de estoque mínimo no dashboard

#### Cadastros

- **Produtos**: código, código de barras, preço, custo, estoque, NCM, CFOP, CST, imagem e fornecedor
- **Categorias**: cor, setor de cozinha e ativação
- **Clientes**: CPF, telefone, endereço completo e observações
- **Fornecedores**: documento, contato, tipo de fornecimento
- **Mesas**: número, capacidade e status (livre, ocupada, reservada)
- **Promoções**: desconto percentual ou valor fixo por produto/categoria com período de vigência
- **Usuários**: CRUD com papéis e ativação/desativação
- Conta de **fidelidade** (pontos por cliente) no modelo de dados

#### Compras e financeiro

- Ordens de compra com status rascunho, confirmada e cancelada
- Geração automática de contas a pagar a partir de compras
- **Contas a pagar** com categorias (fornecedor, aluguel, salário, imposto, serviço, outros)
- Pagamento total ou parcial de contas
- **Notas fiscais de compra** com upload de arquivo (PDF/imagem), fornecedor, valor e status

#### Relatórios

- Relatório de **vendas** por período e status
- Relatório de **produtos** (quantidade, receita, custo e lucro estimado)
- Relatório de **CMV** (custo da mercadoria vendida, lucro bruto e margem)
- Exportação dos relatórios em **CSV**

#### Configurações da loja

- Nome da loja, logo, endereço e telefone
- Taxa de serviço (%)
- Tempo SLA da fila de pedidos (minutos)
- Rodapé para impressão e horário de funcionamento

#### Interface

- Layout responsivo com sidebar recolhível e menu mobile
- Componentes padronizados (botões, inputs, tabelas, modais, toasts)
- Topbar com informações da sessão do usuário

### Segurança

- Validação de entrada no backend em todas as APIs
- Proteção de rotas de API com verificação de sessão e permissão
- Isolamento de dados por tenant em consultas ao banco
- Token de impressão para acesso controlado às páginas de impressão

### Documentação

- `README.md` com instalação, credenciais de desenvolvimento, scripts e checklist de deploy
- `ui-kit/README.md` com instruções de reutilização do kit de interface

---

## Tipos de alteração

| Tipo        | Descrição                                      |
|-------------|------------------------------------------------|
| `Adicionado` | Novas funcionalidades                          |
| `Alterado`   | Mudanças em funcionalidades existentes         |
| `Corrigido`  | Correções de bugs                              |
| `Removido`   | Funcionalidades removidas                      |
| `Segurança`  | Correções ou melhorias de segurança            |
| `Obsoleto`   | Funcionalidades que serão removidas em breve   |

## Como manter este arquivo

Ao publicar uma nova versão:

1. Crie uma nova seção no topo (abaixo deste bloco de instruções), com data e número da versão.
2. Agrupe as mudanças por tipo (`Adicionado`, `Alterado`, `Corrigido`, etc.).
3. Atualize a versão em `package.json` e em `lib/version.ts` (exibida na sidebar e na tela de login).
