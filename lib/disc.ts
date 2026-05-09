// ─── Perfis Comportamentais DISC ───────────────────────────────────────────
// Apenas o líder tem acesso a essas informações

export type PerfilDisc = 'D' | 'I' | 'S' | 'C';
export type PerfilPragmatico = 'Pragmático' | 'Expressivo' | 'Afável' | 'Analítico';

export interface PerfilComportamental {
  disc: PerfilDisc;
  pragmatico: PerfilPragmatico;
  /** Descrição curta do perfil */
  descricao: string;
  /** Pontos fortes comportamentais */
  fortes: string[];
  /** Pontos de atenção */
  atencao: string[];
  /** Como o líder deve conduzir o daily com esse perfil */
  conduta_daily: string[];
  /** Como apoiar em momentos de bloqueio */
  apoio_bloqueio: string[];
  /** Como dar feedback para esse perfil */
  feedback: string[];
  /** Motivadores principais */
  motivadores: string[];
}

// Mapa fixo: consultor → perfil
// Estes são perfis sugeridos e podem ser editados futuramente via Supabase
export const PERFIS_DISC: Record<string, PerfilComportamental> = {
  Bacco: {
    disc: 'D',
    pragmatico: 'Pragmático',
    descricao: 'Alta orientação a resultados, direto e competitivo. Gosta de autonomia e desafios claros.',
    fortes: ['Decisivo', 'Focado em resultado', 'Enfrenta objeções com confiança', 'Alta energia em negociações'],
    atencao: ['Pode ser impaciente com processos longos', 'Tende a pular etapas do funil', 'Dificuldade em ouvir feedbacks detalhados'],
    conduta_daily: [
      'Seja direto e objetivo — sem rodeios',
      'Apresente os números primeiro, depois o contexto',
      'Desafie com metas e pergunte "o que você vai fazer para bater essa meta hoje?"',
      'Evite microgerenciar — dê autonomia e cobre resultado',
    ],
    apoio_bloqueio: [
      'Apresente o problema como um desafio a superar, não como um problema seu',
      'Ofereça recurso ou remoção de obstáculo — ele quer resolver sozinho',
      'Pergunte: "O que você precisaria para destravar isso agora?"',
    ],
    feedback: [
      'Feedback direto, sem enrolação',
      'Foque no impacto nos resultados, não em comportamentos subjetivos',
      'Respeite o tempo dele — seja conciso e objetivo',
    ],
    motivadores: ['Autonomia', 'Metas desafiadoras', 'Reconhecimento público', 'Superação de recordes pessoais'],
  },

  Bottoni: {
    disc: 'I',
    pragmatico: 'Expressivo',
    descricao: 'Comunicativo, entusiasta e persuasivo. Constrói relacionamentos com facilidade e tem alto impacto em apresentações.',
    fortes: ['Ótimo rapport com clientes', 'Engaja facilmente', 'Criativo em abordagens', 'Influencia com entusiasmo'],
    atencao: ['Pode dispersar nas tarefas do dia', 'Tende a superestimar compromissos', 'Pode negligenciar registro de dados'],
    conduta_daily: [
      'Comece com algo positivo — ele responde bem ao reconhecimento',
      'Use storytelling: "Conta como foi essa reunião de ontem"',
      'Ajude a priorizar — ele tem muitas ideias, ancore em 1 ou 2 ações concretas',
      'Pergunte sobre o cliente pelo nome — ele memoriza detalhes relacionais',
    ],
    apoio_bloqueio: [
      'Escute com empatia — ele precisa sentir que você está do lado dele',
      'Ajude a enxergar a solução como uma "boa história para contar depois"',
      'Ofereça roleplay da abordagem com o cliente bloqueado',
    ],
    feedback: [
      'Inicie com pontos positivos genuínos antes de corrigir',
      'Enquadre o feedback como "oportunidade de brilhar mais"',
      'Evite críticas frias ou muito técnicas — use exemplos concretos e relacionais',
    ],
    motivadores: ['Reconhecimento da equipe', 'Variedade de situações', 'Liberdade criativa', 'Relação próxima com o líder'],
  },

  Danilo: {
    disc: 'S',
    pragmatico: 'Afável',
    descricao: 'Consistente, confiável e orientado ao time. Valoriza a harmonia e trabalha melhor em ambientes estáveis.',
    fortes: ['Alta consistência nas entregas', 'Ótimo ouvinte', 'Constrói confiança com clientes ao longo do tempo', 'Comprometido com o processo'],
    atencao: ['Pode ser passivo diante de conflitos ou objeções difíceis', 'Evita fazer pressão no cliente', 'Pode resistir a mudanças bruscas'],
    conduta_daily: [
      'Crie um ambiente seguro — sem pressão excessiva',
      'Pergunte sobre o relacionamento com o cliente, não só os números',
      'Valorize a consistência: "você está sendo muito regular, isso é diferencial"',
      'Ajude a treinar como fechar sem parecer agressivo',
    ],
    apoio_bloqueio: [
      'Reconheça o esforço antes de propor soluções',
      'Ofereça suporte concreto — ajuda para enviar mensagem, script de abordagem',
      'Evite pressionar — ele paralisa com excesso de cobrança',
    ],
    feedback: [
      'Feedback em particular, nunca na frente da equipe',
      'Inicie reconhecendo o esforço e a dedicação',
      'Seja gentil, mas claro — não deixe a mensagem ambígua por não querer magoar',
    ],
    motivadores: ['Estabilidade na rotina', 'Reconhecimento da dedicação', 'Bom relacionamento com a equipe', 'Sentir que contribui para o time'],
  },

  Davi: {
    disc: 'D',
    pragmatico: 'Pragmático',
    descricao: 'Orientado a resultado, determinado e autoconfiante. Age com rapidez e gosta de resolver problemas com soluções práticas.',
    fortes: ['Focado em volume e resultado', 'Proativo em abordagens', 'Não se intimida com objeções', 'Alta disciplina no funil'],
    atencao: ['Pode ser impulsivo em negociações', 'Dificuldade em aceitar processos mais lentos', 'Pode pressionar demais o cliente'],
    conduta_daily: [
      'Vá direto aos números e ações planejadas',
      'Ofereça desafios de meta — ele responde bem a benchmarks',
      'Pergunte "qual é o seu plano para fechar X essa semana?"',
      'Dê espaço para ele tomar decisões — evite microgerenciar',
    ],
    apoio_bloqueio: [
      'Ajude a ver o bloqueio como um obstáculo tático, não pessoal',
      'Proponha uma ação imediata — ele quer agir, não só analisar',
      'Ofereça suporte logístico (contato, reunião) quando necessário',
    ],
    feedback: [
      'Direto e baseado em dados',
      'Mostre o gap entre resultado atual e potencial — ele se motiva com isso',
      'Evite feedbacks vagos ou muito subjetivos',
    ],
    motivadores: ['Metas desafiadoras', 'Autonomia', 'Reconhecimento por resultados', 'Competição saudável com o time'],
  },

  Duarte: {
    disc: 'C',
    pragmatico: 'Analítico',
    descricao: 'Detalhista, preciso e criterioso. Precisa entender o "porquê" das coisas antes de agir com confiança.',
    fortes: ['Alta qualidade nas análises', 'Não comete erros por descuido', 'Prepara muito bem as reuniões', 'Argumentação sólida com clientes'],
    atencao: ['Pode paralisar por excesso de análise', 'Dificuldade em tomar decisão rápida', 'Pode ser percebido como lento pelo time'],
    conduta_daily: [
      'Traga dados e contexto — ele se sente inseguro sem informação suficiente',
      'Faça perguntas abertas: "O que você já analisou sobre esse cliente?"',
      'Ajude a definir um ponto de corte: "Com o que você tem hoje, qual seria o próximo passo?"',
      'Valorize a qualidade das análises que ele faz',
    ],
    apoio_bloqueio: [
      'Ajude a mapear o que falta e dê prazo para resolver',
      'Ofereça frameworks ou checklists para destravar a análise',
      'Valide o raciocínio dele antes de propor alternativas',
    ],
    feedback: [
      'Feedbacks com embasamento claro e exemplos concretos',
      'Evite feedbacks vagos como "você precisa melhorar o ritmo"',
      'Ele aceita bem críticas se forem lógicas e bem fundamentadas',
    ],
    motivadores: ['Precisão e qualidade', 'Sentir que entende o processo profundamente', 'Reconhecimento pela consistência', 'Ambiente previsível e organizado'],
  },

  Eric: {
    disc: 'I',
    pragmatico: 'Expressivo',
    descricao: 'Entusiasta, comunicativo e orientado a pessoas. Tem facilidade em criar conexão e costuma influenciar o humor do time.',
    fortes: ['Excelente em rapport inicial', 'Entusiasma o cliente no primeiro contato', 'Alta energia e positividade', 'Cria bom clima no time'],
    atencao: ['Pode se perder no relacionamento e esquecer o objetivo comercial', 'Procrastina tarefas administrativas', 'Pode superestimar o interesse do cliente'],
    conduta_daily: [
      'Comece com energia positiva — ele espelha o estado do líder',
      'Traga-o para a realidade com dados após o "aquecimento"',
      'Defina com ele 1 meta concreta para o dia — não várias',
      'Use humor e leveza, mas ancore sempre em resultado',
    ],
    apoio_bloqueio: [
      'Ajude a reformular o bloqueio como parte do processo, não como rejeição pessoal',
      'Ofereça um roteiro de abordagem para ele não improvisar em situações difíceis',
      'Valorize o esforço antes de corrigir a estratégia',
    ],
    feedback: [
      'Feedback leve e com foco no "o que fazer" ao invés do "o que errou"',
      'Inicie sempre reconhecendo o que está indo bem',
      'Feedbacks negativos devem ser curtos e seguidos de um plano de ação positivo',
    ],
    motivadores: ['Ambiente de time animado', 'Reconhecimento público', 'Relação próxima com o líder', 'Ver o impacto do trabalho nos clientes'],
  },

  Faria: {
    disc: 'S',
    pragmatico: 'Afável',
    descricao: 'Empático, paciente e confiável. Constrói relações duradouras e é muito valorizado por clientes que precisam de segurança.',
    fortes: ['Fidelização de clientes', 'Alta empatia nas reuniões', 'Comprometimento com acordos', 'Equilíbrio emocional'],
    atencao: ['Evita conflito, pode não fechar com firmeza', 'Dificuldade em dizer não ao cliente', 'Pode assumir mais do que consegue entregar'],
    conduta_daily: [
      'Valide o esforço e o relacionamento construído antes de falar de números',
      'Pergunte: "Como você se sentiu nessa reunião? O que você percebeu do cliente?"',
      'Ajude a praticar o fechamento — ele tende a adiar essa etapa',
      'Defina com ele o próximo passo com o cliente antes de encerrar o daily',
    ],
    apoio_bloqueio: [
      'Ofereça suporte relacional — ajude a pensar na abordagem como cuidado com o cliente, não pressão',
      'Ajude a escrever a mensagem ou script quando ele travar',
      'Reforce que fechar é uma forma de servir bem o cliente',
    ],
    feedback: [
      'Sempre em particular e com tom de cuidado',
      'Mostre que o feedback vem de um lugar de confiança',
      'Seja específico e gentil — ele leva críticas com seriedade',
    ],
    motivadores: ['Sentir que ajudou o cliente de verdade', 'Reconhecimento da equipe', 'Estabilidade e previsibilidade', 'Relação próxima e de confiança com o líder'],
  },

  Júlio: {
    disc: 'D',
    pragmatico: 'Pragmático',
    descricao: 'Determinado, competitivo e focado em fechar. Age com decisão e gosta de ser medido por resultados concretos.',
    fortes: ['Alta taxa de fechamento', 'Determinação em superar objeções', 'Não desiste facilmente', 'Foco em resultado financeiro'],
    atencao: ['Pode ser brusco com clientes mais sensíveis', 'Tende a queimar etapas do relacionamento', 'Pode pressionar o time quando está no limite'],
    conduta_daily: [
      'Apresente os números e vá direto ao plano do dia',
      'Pergunte: "Qual é a sua aposta pra fechar hoje?"',
      'Desafie com metas progressivas — ele responde bem à competição',
      'Monitore a qualidade do atendimento além da quantidade',
    ],
    apoio_bloqueio: [
      'Enquadre como um desafio tático que ele vai conseguir superar',
      'Ofereça apoio logístico rápido — ele não quer esperar',
      'Ajude a criar uma estratégia de abordagem mais assertiva',
    ],
    feedback: [
      'Feedback direto, baseado em dados e com foco no que pode fazer diferente',
      'Evite feedbacks longos — ele perde o foco',
      'Reconheça os resultados antes de apontar o comportamento',
    ],
    motivadores: ['Superar metas', 'Ser referência em resultado no time', 'Autonomia', 'Desafios difíceis'],
  },

  Mel: {
    disc: 'I',
    pragmatico: 'Expressivo',
    descricao: 'Comunicativa, carismática e criativa. Tem facilidade em criar empatia com clientes e costuma trazer energia positiva para o time.',
    fortes: ['Excelente comunicação', 'Alta empatia e escuta ativa', 'Criativa em abordagens', 'Cria conexão rápida com o cliente'],
    atencao: ['Pode se emocionar demais com rejeições', 'Procrastina tarefas repetitivas', 'Pode se dispersar com muitas oportunidades ao mesmo tempo'],
    conduta_daily: [
      'Inicie celebrando alguma conquista — ela se ilumina com reconhecimento',
      'Ajude a focar: "De tudo que você tem em aberto, qual é a prioridade hoje?"',
      'Use exemplos positivos de sucesso do próprio time para motivar',
      'Pergunte como ela está se sentindo — ela performa melhor quando está bem emocionalmente',
    ],
    apoio_bloqueio: [
      'Valide o sentimento antes de propor solução',
      'Reformule rejeições como aprendizado, não como fracasso pessoal',
      'Ofereça o suporte de um script ou roleplay para dar confiança',
    ],
    feedback: [
      'Sempre em particular e com muito cuidado no tom',
      'Inicie com reconhecimento genuíno',
      'Apresente o feedback como algo que vai potencializar os pontos fortes dela',
    ],
    motivadores: ['Reconhecimento público', 'Ambiente positivo no time', 'Ver que ajudou o cliente', 'Relação próxima e de confiança com o líder'],
  },

  Pedro: {
    disc: 'C',
    pragmatico: 'Analítico',
    descricao: 'Metódico, cuidadoso e orientado a processos. Gosta de entender o contexto antes de agir e entrega com alta qualidade.',
    fortes: ['Alta precisão nas análises', 'Organização no funil', 'Não improvisa — prepara bem as reuniões', 'Aprende rapidamente com feedbacks estruturados'],
    atencao: ['Pode demorar para iniciar ações', 'Excesso de perguntas antes de agir', 'Pode se sentir inseguro sem informação suficiente'],
    conduta_daily: [
      'Traga contexto e dados antes de cobrar ação',
      'Pergunte: "O que você já tem de informação sobre esse cliente para avançar?"',
      'Ajude a definir o threshold de informação: "Com isso, você consegue agir?"',
      'Valorize a qualidade do que ele preparou',
    ],
    apoio_bloqueio: [
      'Ajude a mapear a causa raiz do bloqueio com perguntas abertas',
      'Ofereça estrutura: "Vamos listar o que falta e o que já temos"',
      'Dê prazo curto e claro para ele voltar com uma resposta',
    ],
    feedback: [
      'Feedbacks com embasamento lógico e exemplos concretos',
      'Valorize a qualidade antes de apontar o ritmo',
      'Ele aceita bem críticas quando elas fazem sentido racionalmente',
    ],
    motivadores: ['Entender o processo em profundidade', 'Precisão e qualidade nas entregas', 'Ambiente previsível', 'Sentir que está crescendo com consistência'],
  },

  PH: {
    disc: 'S',
    pragmatico: 'Afável',
    descricao: 'Estável, leal e orientado ao relacionamento. Constrói confiança com clientes de forma gradual e é muito consistente.',
    fortes: ['Fidelização de clientes', 'Alta estabilidade emocional', 'Comprometimento com o time', 'Boa escuta ativa'],
    atencao: ['Pode evitar conflitos necessários com o cliente', 'Dificuldade em pressionar ou cobrar o cliente', 'Pode resistir a mudanças no processo'],
    conduta_daily: [
      'Comece perguntando sobre o relacionamento com os clientes — ele responde bem a isso',
      'Valorize a consistência e a confiabilidade',
      'Ajude a treinar a etapa de fechamento sem perder a naturalidade',
      'Defina com ele um próximo passo claro e simples',
    ],
    apoio_bloqueio: [
      'Ofereça suporte com script ou abordagem para ele não improvisar',
      'Ajude a enquadrar a cobrança com o cliente como "cuidado", não como pressão',
      'Reconheça o esforço antes de propor ajustes',
    ],
    feedback: [
      'Em particular, com tom de parceria',
      'Seja claro mas gentil — ele não responde bem a feedbacks duros',
      'Valorize sempre a consistência e o relacionamento construído',
    ],
    motivadores: ['Estabilidade', 'Reconhecimento pela dedicação', 'Bom clima no time', 'Sentir que contribui de forma relevante'],
  },

  Rafael: {
    disc: 'I',
    pragmatico: 'Expressivo',
    descricao: 'Animado, comunicativo e com facilidade em criar conexão. Alta energia e bom impacto em apresentações.',
    fortes: ['Ótimo primeiro impacto com clientes', 'Alta energia e disposição', 'Criativo em abordagens', 'Engaja facilmente o interlocutor'],
    atencao: ['Pode superestimar avanços com clientes', 'Procrastina documentação e registro', 'Pode se comprometer com mais do que consegue entregar'],
    conduta_daily: [
      'Celebre uma conquista recente antes de entrar em análise',
      'Pergunte: "O que você vai priorizar hoje para converter?"',
      'Ajude a transformar entusiasmo em ação concreta',
      'Monitore o que foi combinado com o cliente vs. o que foi registrado',
    ],
    apoio_bloqueio: [
      'Ofereça o bloqueio como um "puzzle" a resolver — ele curte desafios criativos',
      'Ajude a criar um roteiro de abordagem para dar estrutura',
      'Reconheça o esforço e proponha uma ação imediata',
    ],
    feedback: [
      'Comece sempre com reconhecimento genuíno',
      'Feedbacks curtos, com foco no próximo passo',
      'Evite feedbacks que soem como "você é desorganizado" — foque em comportamentos específicos',
    ],
    motivadores: ['Reconhecimento público', 'Ambiente positivo', 'Ver clientes felizes', 'Sentir que está evoluindo no time'],
  },

  Salgado: {
    disc: 'C',
    pragmatico: 'Analítico',
    descricao: 'Sistemático, criterioso e orientado a qualidade. Gosta de processos bem definidos e performa melhor com clareza de expectativas.',
    fortes: ['Alta qualidade nas análises e documentação', 'Segue o processo com disciplina', 'Argumentação técnica sólida com clientes', 'Confiável e consistente'],
    atencao: ['Pode travar em decisões por falta de informação "suficiente"', 'Pode ser percebido como lento ou burocrático', 'Dificuldade em improvisar'],
    conduta_daily: [
      'Apresente dados e contexto antes de cobrar ação',
      'Pergunte: "Qual é a sua análise do pipeline essa semana?"',
      'Ajude a definir um critério claro de quando avançar sem ter todas as informações',
      'Valorize a disciplina e o processo que ele segue',
    ],
    apoio_bloqueio: [
      'Mapeie o bloqueio juntos com estrutura: causa, impacto, alternativas',
      'Ofereça templates ou frameworks para destravar a análise',
      'Dê um prazo curto e claro para ele agir',
    ],
    feedback: [
      'Feedbacks embasados com dados e exemplos concretos',
      'Evite feedbacks vagos — ele precisa saber exatamente o que ajustar',
      'Ele responde bem a feedbacks que reconhecem a qualidade antes de apontar o ritmo',
    ],
    motivadores: ['Clareza de processo e expectativas', 'Reconhecimento pela qualidade', 'Ambiente previsível', 'Aprender e aprofundar o conhecimento'],
  },

  Shoji: {
    disc: 'S',
    pragmatico: 'Afável',
    descricao: 'Calmo, empático e orientado ao cliente. Constrói relacionamentos sólidos e é percebido como muito confiável.',
    fortes: ['Alta fidelização de clientes', 'Equilíbrio emocional mesmo em situações difíceis', 'Escuta ativa excepcional', 'Comprometimento de longo prazo'],
    atencao: ['Pode ser excessivamente passivo em fechamentos', 'Evita confronto mesmo quando necessário', 'Pode absorver o estresse do cliente como seu'],
    conduta_daily: [
      'Comece perguntando sobre os clientes — ele se engaja naturalmente por esse ângulo',
      'Valorize o relacionamento que ele constrói como diferencial competitivo',
      'Ajude a treinar firmeza gentil: como avançar sem perder a empatia',
      'Pergunte: "Qual é o próximo passo concreto com esse cliente?"',
    ],
    apoio_bloqueio: [
      'Reconheça a carga emocional que ele pode estar carregando',
      'Ofereça suporte com script ou roteiro de abordagem',
      'Ajude a separar o problema do cliente do problema dele — não é culpa dele',
    ],
    feedback: [
      'Sempre em particular, com cuidado real',
      'Inicie reconhecendo o quanto ele cuida dos clientes',
      'Seja específico e gentil — ele internaliza muito o que o líder diz',
    ],
    motivadores: ['Sentir que faz a diferença para o cliente', 'Ambiente harmonioso no time', 'Reconhecimento pela dedicação', 'Relação de confiança com o líder'],
  },
};

// Cores e rótulos por perfil DISC
export const DISC_CONFIG: Record<PerfilDisc, { cor: string; corBg: string; emoji: string; titulo: string; tagline: string }> = {
  D: { cor: '#ef4444', corBg: 'rgba(239,68,68,0.1)', emoji: '🔴', titulo: 'Dominante', tagline: 'Direto · Decisivo · Orientado a resultado' },
  I: { cor: '#f59e0b', corBg: 'rgba(245,158,11,0.1)', emoji: '🟡', titulo: 'Influente', tagline: 'Comunicativo · Entusiasta · Persuasivo' },
  S: { cor: '#22c55e', corBg: 'rgba(34,197,94,0.1)', emoji: '🟢', titulo: 'Estável', tagline: 'Paciente · Confiável · Orientado ao time' },
  C: { cor: '#3b82f6', corBg: 'rgba(59,130,246,0.1)', emoji: '🔵', titulo: 'Consciencioso', tagline: 'Analítico · Preciso · Orientado a processos' },
};

export const PRAGMATICO_CONFIG: Record<PerfilPragmatico, { cor: string; corBg: string; emoji: string }> = {
  'Pragmático':  { cor: '#ef4444', corBg: 'rgba(239,68,68,0.08)',  emoji: '⚡' },
  'Expressivo':  { cor: '#f59e0b', corBg: 'rgba(245,158,11,0.08)', emoji: '✨' },
  'Afável':      { cor: '#22c55e', corBg: 'rgba(34,197,94,0.08)',  emoji: '🤝' },
  'Analítico':   { cor: '#3b82f6', corBg: 'rgba(59,130,246,0.08)', emoji: '🔍' },
};
