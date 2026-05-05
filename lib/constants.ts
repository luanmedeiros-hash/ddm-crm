export const CONSULTORES = [
  'Bruno','Danilo','Davi','Duarte','Eric',
  'Faria','Júlio','Luan','Mel','Pedro','PH','Salgado','Shoji'
]

export const ETAPAS = ['AA','CA','SA','EA','AF','CF','SF','EF','AP','PP','REC']
export const ETAPAS_INDICE = ['AA','AP','PP','REC']

export const SIGNIFICADOS: Record<string, string> = {
  AA:'Análise Agendada', CA:'Cobrança Agendada', SA:'Sem resposta Agendada',
  EA:'Encerrada Agendada', AF:'Análise Feita', CF:'Cobrança Feita',
  SF:'Sem resposta Feita', EF:'Encerrada Feita',
  AP:'Análise Paga', PP:'Pontos de Produção', REC:'Recomendação'
}

export const METAS_BASE: Record<string, number> = {
  AA:3,CA:2,SA:1,EA:1,AF:3,CF:2,SF:1,EF:1,AP:2,PP:4,REC:2
}

export const TIPOS_BLOQUEIO = [
  'Sem bloqueio','Cliente não responde','Falta documento',
  'Falta retorno interno','Dúvida técnica','Preciso do gestor',
  'Proposta travada','Reunião remarcada','Outro'
]

export function calcIndice(regs: any[]): number {
  if (!regs.length) return 0
  const scores = ETAPAS_INDICE.map(et => {
    const meta = regs.reduce((s: number, r: any) => s + (r[`${et}_meta`] || 0), 0)
    const real = regs.reduce((s: number, r: any) => s + (r[`${et}_real`] || 0), 0)
    return meta > 0 ? Math.min((real / meta) * 100, 150) : 0
  })
  return scores.reduce((a, b) => a + b, 0) / ETAPAS_INDICE.length
}

export function classificar(reg: any): string {
  if (reg.confianca <= 2 || reg.bloqueio !== 'Sem bloqueio' || reg.ajuda) return 'Crítico'
  if (calcIndice([reg]) < 50) return 'Atenção'
  return 'Normal'
}
