// lib/mensagens.ts
// Biblioteca de templates de mensagem (WhatsApp/email) por etapa da jornada.
// Placeholders: {nome}, {consultor}, {data}, {hora}

export interface TemplateMensagem {
  id: string;
  categoria: string;
  titulo: string;
  texto: string;
}

export const CATEGORIAS_MENSAGEM = [
  'Agendamento',
  'Lembrete',
  'Follow-up',
  'Pós-reunião',
  'Relacionamento',
] as const;

export const TEMPLATES_MENSAGEM: TemplateMensagem[] = [
  // ── Agendamento ──
  {
    id: 'agendar-analise',
    categoria: 'Agendamento',
    titulo: 'Convite para Análise',
    texto: `Olá, {nome}! Tudo bem? 😊\n\nAqui é o {consultor}, da W1 Consultoria. Gostaria de agendar uma reunião de *Análise* para entendermos juntos a sua situação financeira atual e seus objetivos.\n\nÉ uma conversa sem compromisso, de aproximadamente 1 hora. Qual o melhor dia e horário para você?`,
  },
  {
    id: 'confirmar-reuniao',
    categoria: 'Agendamento',
    titulo: 'Confirmação de reunião',
    texto: `Oi, {nome}! Confirmando nossa reunião para *{data} às {hora}*.\n\nQualquer imprevisto, me avise com antecedência que reorganizamos. Até lá! 👍`,
  },

  // ── Lembrete ──
  {
    id: 'lembrete-vespera',
    categoria: 'Lembrete',
    titulo: 'Lembrete (véspera)',
    texto: `Olá, {nome}! Passando para lembrar da nossa reunião amanhã, *{data} às {hora}*.\n\nVai ser um ótimo papo! Caso precise remarcar, é só me avisar. Até amanhã! 😊`,
  },
  {
    id: 'lembrete-dia',
    categoria: 'Lembrete',
    titulo: 'Lembrete (no dia)',
    texto: `Bom dia, {nome}! Tudo certo para a nossa reunião de hoje às *{hora}*?\n\nEstou à disposição. Até mais tarde! 🙌`,
  },

  // ── Follow-up ──
  {
    id: 'followup-sem-resposta',
    categoria: 'Follow-up',
    titulo: 'Sem resposta',
    texto: `Oi, {nome}! Tudo bem?\n\nNão consegui falar com você nos últimos dias. Continuo à disposição para seguirmos com o seu planejamento financeiro quando fizer sentido para você.\n\nQual o melhor momento para retomarmos? 😊`,
  },
  {
    id: 'followup-proxima-etapa',
    categoria: 'Follow-up',
    titulo: 'Agendar próxima etapa',
    texto: `Olá, {nome}! Espero que esteja tudo bem.\n\nChegamos no momento de avançar para a próxima etapa do seu planejamento. Podemos agendar nossa próxima reunião? Tenho disponibilidade nesta semana.\n\nMe diga o melhor dia! 📅`,
  },

  // ── Pós-reunião ──
  {
    id: 'pos-analise',
    categoria: 'Pós-reunião',
    titulo: 'Agradecimento pós-Análise',
    texto: `{nome}, foi um prazer conversar com você hoje! 🙏\n\nComo combinamos, vou preparar o material com base no que discutimos e retornamos em breve para os próximos passos.\n\nQualquer dúvida nesse meio tempo, estou à disposição!`,
  },
  {
    id: 'pos-contrato',
    categoria: 'Pós-reunião',
    titulo: 'Boas-vindas (fechamento)',
    texto: `{nome}, seja muito bem-vindo(a)! 🎉\n\nFico muito feliz em ter você como cliente. A partir de agora vamos construir juntos o seu planejamento financeiro com acompanhamento próximo.\n\nQualquer necessidade, conte comigo!`,
  },

  // ── Relacionamento ──
  {
    id: 'acompanhamento',
    categoria: 'Relacionamento',
    titulo: 'Check-in de acompanhamento',
    texto: `Olá, {nome}! Tudo bem? 😊\n\nPassando para saber como você está e se há algo novo que devemos considerar no seu planejamento. Que tal marcarmos um café (presencial ou online) para colocarmos a conversa em dia?`,
  },
  {
    id: 'aniversario',
    categoria: 'Relacionamento',
    titulo: 'Aniversário',
    texto: `{nome}, feliz aniversário! 🎂🎉\n\nDesejo um ano repleto de saúde, conquistas e realizações. Conte sempre comigo para cuidar do seu futuro financeiro. Um grande abraço!`,
  },
];

export function preencherTemplate(
  texto: string,
  dados: { nome?: string; consultor?: string; data?: string; hora?: string },
): string {
  return texto
    .replace(/\{nome\}/g, dados.nome || 'cliente')
    .replace(/\{consultor\}/g, dados.consultor || 'seu consultor')
    .replace(/\{data\}/g, dados.data || '___')
    .replace(/\{hora\}/g, dados.hora || '___');
}

/** Monta link wa.me a partir de um telefone BR e do texto. */
export function linkWhatsApp(telefone: string | null, texto: string): string | null {
  if (!telefone) return null;
  const digits = telefone.replace(/\D/g, '');
  if (digits.length < 10) return null;
  const comDDI = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${comDDI}?text=${encodeURIComponent(texto)}`;
}
