// lib/prompts-relatorio.ts
// Prompts de geração de relatório a partir de transcrição de reunião.
// Cada tipo de reunião tem seu próprio formato de relatório.

export type TipoReuniao = 'analise' | 'c1' | 'c2' | 'c3' | 'c4' | 'acompanhamento';

export const TIPO_REUNIAO_LABEL: Record<TipoReuniao, string> = {
  analise:        'Análise',
  c1:             'C1 — Organização Financeira',
  c2:             'C2 — Seguro',
  c3:             'C3 — Previdência',
  c4:             'C4 — Consórcio',
  acompanhamento: 'Acompanhamento',
};

// Produto que é apresentado em cada reunião Cx
export const PRODUTO_POR_REUNIAO: Partial<Record<TipoReuniao, string>> = {
  c2: 'Seguro de Vida',
  c3: 'Previdência',
  c4: 'Consórcio',
};

export const TIPOS_REUNIAO: TipoReuniao[] = ['analise', 'c1', 'c2', 'c3', 'c4', 'acompanhamento'];

const PROMPT_ANALISE = `Você é um assistente especializado em planejamento financeiro pessoal.
Abaixo está a transcrição de uma reunião de Análise — primeira reunião com um novo contato.
Preencha o relatório completo com base no que foi dito.
Se alguma informação não foi mencionada, escreva "(não mencionado)".
Seja detalhado, objetivo e use linguagem profissional.

Preencha o relatório no seguinte formato:

RELATÓRIO — ANÁLISE
Cliente: [extrair do contexto]
Data: [extrair da transcrição ou hoje]
Consultor: [extrair da transcrição]

1. COMO FOI A ANÁLISE
- Local: [onde aconteceu — presencial, online, endereço se mencionado]
- Data e horário: [quando foi]
- Participantes: [uma pessoa, casal, sócios — quem estava presente]
- Impressões gerais durante a conversa: [clima, receptividade, abertura do contato]

2. LADO PESSOAL DO CONTATO
- Moradia: [própria, alugada, com família — cidade, bairro se mencionado]
- Veículo: [tem carro, qual, financiado ou quitado]
- Família: [estado civil, filhos, idades]
- Pais: [situação, dependentes financeiros]
- Hobbies e interesses: [o que gosta de fazer]
- Locais que frequenta: [restaurantes, academias, viagens, clubes]
- Formação: [escolaridade, cursos, faculdade]

3. LADO PROFISSIONAL DO CONTATO
- Onde trabalha: [empresa, setor, cargo]
- Tempo na empresa/área: [quanto tempo]
- Experiência profissional: [histórico relevante]
- Satisfação com o trabalho: [gosta, não gosta, neutro]
- Responsabilidades: [o que faz no dia a dia]
- Possibilidade de crescimento: [promoções, planos, perspectiva]
- Regime de contratação: [CLT, autônomo, sócio, empresário]
- Renda mensal aproximada: R$ [___]
- Planos futuros profissionais: [mudar de área, abrir empresa, aposentar]

4. SITUAÇÃO FINANCEIRA ATUAL
- Renda mensal: R$ [___]
- Gastos fixos estimados: R$ [___]
- Gastos variáveis estimados: R$ [___]
- Fluxo de caixa atual: R$ [___]
- Patrimônio declarado: [imóveis, investimentos, veículos, outros]
- Dívidas: [financiamentos, cartão, empréstimos — valores se mencionados]
- Investimentos atuais: [onde investe, quanto, se investe]

5. OBJETIVOS DO CONTATO
Objetivo 1: [descrever com detalhes — onde quer chegar, prazo, valor]
- Razão: [por que quer isso]
- Prazo: [quando quer alcançar]
- Valor envolvido: R$ [___]

Objetivo 2: [descrever com detalhes]
- Razão: [por que quer isso]
- Prazo: [quando quer alcançar]
- Valor envolvido: R$ [___]

Objetivo 3: [descrever com detalhes]
- Razão: [por que quer isso]
- Prazo: [quando quer alcançar]
- Valor envolvido: R$ [___]

6. VALOR DE POUPAR E FLUXO DE CAIXA
- Valor que pode poupar mensalmente: R$ [___]
- Pode começar imediatamente? [sim/não — justificativa]
- Consegue manter no longo prazo? [sim/não — justificativa]
- Por que esse valor? [explicação do contato]
- Bate com o fluxo de caixa declarado? [sim/não — observações]

7. PERFIL E COMPORTAMENTO DO CONTATO
- Estilo de vida: [simples, sofisticado, equilibrado]
- Perfil de decisão: [impulsivo, cauteloso, analítico, indeciso]
- Perfil de consumo: [consumista, contido, equilibrado]
- Perfil de investimento: [conservador, moderado, arrojado]
- Influenciabilidade: [decide sozinho ou é influenciado por quem]
- Conhecimento do mercado financeiro: [nenhum, básico, intermediário, avançado]
- Observações: [outros aspectos relevantes observados]

8. COMO FOI O ABS
- O que achou da proposta: [reação geral]
- Percepção de valor: [achou caro, barato, justo]
- Decisão: [decide sozinho ou com quem]
- Expectativa com a consultoria: [o que espera obter]
- O que precisa para decidir imediatamente: [o que falta para fechar]
- Dúvidas levantadas: [objeções e perguntas]
- Nível de comprometimento percebido: [alto, médio, baixo — justificativa]

9. COMO FOI A RECOMENDAÇÃO
- Quantidade de contatos indicados: [número]
- Todos com telefone: [sim/não — quantos sem]
- Reação ao pedido de indicação: [receptivo, resistente, neutro]
- Descrição dos contatos indicados: [nomes, perfil, relação com o contato]
- Deadline para mais indicações: [data combinada]
- Potencial dos contatos: [alto, médio, baixo]
- Mínimo de 7 com telefone atingido: [sim/não]
- Indicações encaminhadas para BP: [número]
- Ligou na hora (MUAPD): [sim/não — o que aconteceu]

10. DOCUMENTOS E INFORMAÇÕES PENDENTES
- Apólices de seguro: [pendente/entregue]
- CNPJ dos fundos de investimento: [pendente/entregue]
- Saldos de investimentos: [pendente/entregue]
- Declaração de IR: [pendente/entregue]
- Informações sobre dívidas: [pendente/entregue]
- Outros: [___]

11. PONTO DE EQUILÍBRIO — O QUE MOTIVA A DECISÃO
- Principal razão para decidir: [o que mais pesa para ele]
- O que mais o motiva: [emoção, razão, família, futuro, segurança, outro]
- Ponto de virada identificado: [___]

12. PERCEPÇÕES DA ANÁLISE
- Assuntos de maior interesse: [___]
- Pontualidade: [chegou no horário, atrasou, antecipou]
- Pontos negativos observados: [resistências, desconfortos, alertas]
- Hobbies confirmados: [___]
- O que mais gosta na vida: [___]
- Maior medo identificado: [___]
- Big point emocional: [principal gatilho emocional da reunião]
- Canal de comunicação (V/A/C): [Visual / Auditivo / Cinestésico — justificativa]

13. CARACTERÍSTICAS FÍSICAS E SAÚDE
- Descrição física e apresentação: [aparência, estilo]
- Problemas de saúde recentes: [se mencionou algo]
- Observações: [___]

14. PAGAMENTO DA ANÁLISE
- Valor fechado: R$ [___]
- Forma de pagamento: [à vista, cartão, PIX, parcelado]
- Pagou na hora: [sim/não]
- Foi dado desconto: [sim/não — valor original e desconto]
- Deadline do desconto: [data combinada se aplicável]

PRÓXIMOS PASSOS
- Cliente: [o que ficou de fazer e até quando]
- Consultor: [o que você ficou de fazer]
- Próxima reunião: Etapa C1 — Organização Financeira
- Data sugerida: [___]`;

const PROMPT_C1 = `Você é um assistente especializado em planejamento financeiro pessoal.
Abaixo está a transcrição de uma reunião C1 — Organização Financeira.
Preencha o relatório completo com base no que foi dito.
Se alguma informação não foi mencionada, escreva "(não mencionado)".
Use linguagem profissional e objetiva.

Preencha o relatório no seguinte formato:

RELATÓRIO — C1 — ORGANIZAÇÃO FINANCEIRA
Cliente: [extrair do contexto]
Data: [extrair da transcrição ou hoje]
Consultor: [extrair da transcrição]

1. OBJETIVO DA REUNIÃO
Estruturar a organização financeira do cliente, analisando receitas, despesas,
fluxo de caixa e patrimônio líquido.

2. DIAGNÓSTICO
- Receitas mensais: R$ [___]
- Gastos fixos: R$ [___]
- Gastos variáveis: R$ [___]
- Fluxo de caixa atual: R$ [___]
- Patrimônio líquido: R$ [___]
- Objetivos declarados: [___]

3. PONTOS DE ATENÇÃO
[Liste os principais pontos identificados na transcrição — seja específico]

4. TAREFAS
[Liste todas as tarefas mencionadas ou acordadas na reunião, incluindo:]
- Criar rotina mensal de revisão de fluxo de caixa
- Implementar planilha/Notion para acompanhamento
- Reduzir gastos em [categoria] em R$ [___]
- Definir meta de reserva inicial de [___ meses de gastos fixos]
- Responder o e-mail de NPS
- [Outras tarefas mencionadas na transcrição]

5. PRÓXIMOS PASSOS
- Cliente: [o que ficou de fazer + prazo]
- Consultor: [o que você ficou de fazer]
- Próxima reunião: Etapa C2 — Proteção Financeira
- Data sugerida: [___]`;

const PROMPT_C2 = `Você é um assistente especializado em planejamento financeiro pessoal.
Abaixo está a transcrição de uma reunião C2 — Proteção Financeira.
Preencha o relatório completo com base no que foi dito.
Se alguma informação não foi mencionada, escreva "(não mencionado)".
Use linguagem profissional e objetiva.

Preencha o relatório no seguinte formato:

RELATÓRIO — C2 — PROTEÇÃO FINANCEIRA
Cliente: [extrair do contexto]
Data: [extrair da transcrição ou hoje]
Consultor: [extrair da transcrição]

1. OBJETIVO DA REUNIÃO
Garantir segurança financeira por meio de reserva de emergência,
seguros e planejamento sucessório.

2. DIAGNÓSTICO
- Reserva de emergência atual: R$ [___]
- Apólices vigentes: [vida, saúde, bens — detalhar cada uma]
- Cobertura de invalidez: R$ [___]
- Patrimônio segurado: [___]
- Situação sucessória: [testamento, inventário, herdeiros declarados]

3. PONTOS DE ATENÇÃO
[Liste os principais pontos identificados na transcrição — seja específico,
incluindo lacunas de proteção, coberturas insuficientes, ausência de planejamento]

4. TAREFAS
[Liste todas as tarefas mencionadas ou acordadas, incluindo:]
- Constituir ou reforçar reserva de emergência
- Revisar apólices e adequar valores de cobertura
- Planejar sucessão patrimonial
- [Outras tarefas mencionadas na transcrição]

5. PRÓXIMOS PASSOS
- Cliente: [o que ficou de fazer + prazo]
- Consultor: [o que você ficou de fazer]
- Próxima reunião: Etapa C3 — Acúmulo de Capital
- Data sugerida: [___]`;

const PROMPT_C3 = `Você é um assistente especializado em planejamento financeiro pessoal.
Abaixo está a transcrição de uma reunião C3 — Acúmulo de Capital.
Preencha o relatório completo com base no que foi dito.
Se alguma informação não foi mencionada, escreva "(não mencionado)".
Use linguagem profissional e objetiva.

Preencha o relatório no seguinte formato:

RELATÓRIO — C3 — ACÚMULO DE CAPITAL
Cliente: [extrair do contexto]
Data: [extrair da transcrição ou hoje]
Consultor: [extrair da transcrição]

1. OBJETIVO DA REUNIÃO
Construir patrimônio de longo prazo por meio de investimentos alinhados
ao perfil de risco e objetivos do cliente.

2. DIAGNÓSTICO
- Aportes mensais: R$ [___]
- Perfil de risco: [conservador / moderado / arrojado]
- Alocação atual: [descrever onde está investido hoje]
- Previdência contratada: [PGBL / VGBL / nenhuma — detalhes]
- Retorno médio anual atual: [___%]

3. PONTOS DE ATENÇÃO
[Liste os principais pontos identificados na transcrição — seja específico,
incluindo diversificação, concentração em ativos, taxas, eficiência fiscal]

4. TAREFAS
[Liste todas as tarefas mencionadas ou acordadas, incluindo:]
- Definir metas de investimento de curto, médio e longo prazo
- Rebalancear carteira conforme perfil de risco
- Migrar previdência para plano mais eficiente (se aplicável)
- [Outras tarefas mencionadas na transcrição]

5. PRÓXIMOS PASSOS
- Cliente: [o que ficou de fazer + prazo]
- Consultor: [o que você ficou de fazer]
- Próxima reunião: Etapa C4 — Expansão Patrimonial
- Data sugerida: [___]`;

const PROMPT_C4 = `Você é um assistente especializado em planejamento financeiro pessoal.
Abaixo está a transcrição de uma reunião C4 — Expansão Patrimonial.
Preencha o relatório completo com base no que foi dito.
Se alguma informação não foi mencionada, escreva "(não mencionado)".
Use linguagem profissional e objetiva.

Preencha o relatório no seguinte formato:

RELATÓRIO — C4 — EXPANSÃO PATRIMONIAL
Cliente: [extrair do contexto]
Data: [extrair da transcrição ou hoje]
Consultor: [extrair da transcrição]

1. OBJETIVO DA REUNIÃO
Planejar aquisição de bens e diversificação avançada, garantindo
sustentabilidade e crescimento do patrimônio.

2. DIAGNÓSTICO
- Bens atuais: [imóveis, veículos, participações societárias, outros]
- Dívidas vinculadas a bens: R$ [___]
- Exposição internacional: [___%  — onde e quanto]
- Investimentos alternativos: [fundos, FIIs, private equity, outros]
- Estrutura societária/holding: [existe, em planejamento, não tem]

3. PONTOS DE ATENÇÃO
[Liste os principais pontos identificados na transcrição — seja específico,
incluindo concentração de ativos, ausência de diversificação internacional,
falta de estrutura jurídica, riscos identificados]

4. TAREFAS
[Liste todas as tarefas mencionadas ou acordadas, incluindo:]
- Planejar aquisição de bens de forma escalonada
- Incluir investimentos internacionais e alternativos
- Avaliar criação de holding para blindagem e governança
- [Outras tarefas mencionadas na transcrição]

5. PRÓXIMOS PASSOS
- Cliente: [o que ficou de fazer + prazo]
- Consultor: [o que você ficou de fazer]
- Próxima reunião: Revisão geral do planejamento
- Data sugerida: [___]`;

const PROMPT_ACOMPANHAMENTO = `Você é um assistente especializado em planejamento financeiro pessoal.
Abaixo está a transcrição de uma reunião de Acompanhamento — reunião periódica com cliente ativo.
Gere um resumo estruturado da reunião.

RELATÓRIO — ACOMPANHAMENTO
Cliente: [extrair do contexto]
Data: [extrair da transcrição ou hoje]
Consultor: [extrair da transcrição]

1. SITUAÇÃO ATUAL DO CLIENTE
[Resumo da situação financeira atual]

2. PRODUTOS / PLANOS EM ANDAMENTO
[Produtos ativos e status de cada um]

3. PRINCIPAIS PONTOS DISCUTIDOS
[Tópicos mais relevantes da reunião]

4. SATISFAÇÃO E FEEDBACKS
[O que o cliente expressou sobre os produtos e atendimento]

5. PRÓXIMAS AÇÕES
[O que ficou acordado para os próximos dias]

6. OBSERVAÇÕES
[Qualquer ponto adicional relevante]
`;

const PROMPTS: Record<TipoReuniao, string> = {
  analise:        PROMPT_ANALISE,
  c1:             PROMPT_C1,
  c2:             PROMPT_C2,
  c3:             PROMPT_C3,
  c4:             PROMPT_C4,
  acompanhamento: PROMPT_ACOMPANHAMENTO,
};

/**
 * Monta o prompt final combinando o template do tipo de reunião
 * com a transcrição colada pelo consultor.
 */
export function montarPrompt(tipo: TipoReuniao, transcricao: string): string {
  const base = PROMPTS[tipo];
  return `${base}

=== TRANSCRIÇÃO ===
${transcricao}
===================`;
}
