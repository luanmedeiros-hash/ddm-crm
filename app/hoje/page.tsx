// app/hoje/page.tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase-server';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

type PessoaRef = { id: string; nome: string; fase?: string | null };

type ReuniaoHoje = {
  id: string;
  titulo: string | null;
  data: string;
  prep_notes: string | null;
  pessoa: PessoaRef | null;
};

type AtividadeHoje = {
  id: string;
  tipo: string;
  descricao: string;
  data_atividade: string;
  pessoa: PessoaRef | null;
};

type PendenciaRow = {
  id: string;
  descricao: string;
  prazo: string | null;
  responsavel: 'consultor' | 'cliente';
  pessoa_id: string;
  pessoa: PessoaRef | null;
};

type PassoRow = {
  id: string;
  descricao: string;
  data_prevista: string | null;
  responsavel: 'consultor' | 'cliente';
  pessoa_id: string;
  pessoa: PessoaRef | null;
};

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + dia;
}
function hojeYMD(): string { return ymd(new Date()); }
function daquiADiasYMD(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return ymd(d);
}
function dataLegivel(): string {
  return new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}
function formatarPrazo(iso: string | null): string {
  if (!iso) return '';
  const [ano, mes, dia] = iso.split('-');
  return dia + '/' + mes + '/' + ano;
}

export default async function HojePage() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const hoje = hojeYMD();
  const fimSemana = daquiADiasYMD(7);

  // Reuniões de hoje
  const { data: reunioesRaw } = await supabase
    .from('reunioes')
    .select('id, titulo, data, prep_notes, pessoa:pessoas!inner(id, nome, fase, user_id)')
    .eq('pessoas.user_id', user.id)
    .eq('data', hoje)
    .order('data', { ascending: true });
  const reunioesHoje = (reunioesRaw ?? []) as unknown as ReuniaoHoje[];

  // Ids das pessoas com reunião hoje
  const idsHoje = reunioesHoje.map(r => r.pessoa?.id).filter(Boolean) as string[];

  // Pendências e próximos passos DOS clientes de hoje (uma query cada)
  let pendHoje: PendenciaRow[] = [];
  let passHoje: PassoRow[] = [];
  if (idsHoje.length > 0) {
    const { data: pH } = await supabase
      .from('pendencias')
      .select('id, descricao, prazo, responsavel, pessoa_id')
      .in('pessoa_id', idsHoje)
      .eq('status', 'aberta');
    pendHoje = (pH ?? []) as unknown as PendenciaRow[];

    const { data: nH } = await supabase
      .from('proximos_passos')
      .select('id, descricao, data_prevista, responsavel, pessoa_id')
      .in('pessoa_id', idsHoje)
      .eq('feito', false);
    passHoje = (nH ?? []) as unknown as PassoRow[];
  }

  function tarefasDo(pessoaId: string, quem: 'consultor' | 'cliente') {
    const a = pendHoje
      .filter(p => p.pessoa_id === pessoaId && p.responsavel === quem)
      .map(p => ({ id: 'p_' + p.id, descricao: p.descricao, data: p.prazo }));
    const b = passHoje
      .filter(p => p.pessoa_id === pessoaId && p.responsavel === quem)
      .map(p => ({ id: 'n_' + p.id, descricao: p.descricao, data: p.data_prevista }));
    return [...a, ...b];
  }

  // Restantes (mesmas queries de antes)
  const { data: atividadesRaw } = await supabase
    .from('atividades')
    .select('id, tipo, descricao, data_atividade, pessoa:pessoas!inner(id, nome, user_id)')
    .eq('user_id', user.id)
    .gte('data_atividade', hoje + 'T00:00:00')
    .lte('data_atividade', hoje + 'T23:59:59')
    .order('data_atividade', { ascending: false });
  const atividades = (atividadesRaw ?? []) as unknown as AtividadeHoje[];

  const { data: pendenciasRaw } = await supabase
    .from('pendencias')
    .select('id, descricao, prazo, responsavel, pessoa:pessoas!inner(id, nome, user_id)')
    .eq('pessoas.user_id', user.id)
    .eq('status', 'aberta')
    .lt('prazo', hoje)
    .order('prazo', { ascending: true });
  const pendencias = (pendenciasRaw ?? []) as unknown as PendenciaRow[];

  const { data: passosRaw } = await supabase
    .from('proximos_passos')
    .select('id, descricao, data_prevista, responsavel, pessoa:pessoas!inner(id, nome, user_id)')
    .eq('user_id', user.id)
    .eq('feito', false)
    .gte('data_prevista', hoje)
    .lte('data_prevista', fimSemana)
    .order('data_prevista', { ascending: true });
  const passos = (passosRaw ?? []) as unknown as PassoRow[];

  return (
    <div className="main">
      <Link href="/dashboard" className={styles.backLink}>← Voltar ao painel</Link>

      <div>
        <div className="sec-eyebrow">
          <span className="eyebrow-dot"></span>
          <span>Sua manhã</span>
        </div>
        <h1 className="sec-title">Hoje</h1>
        <p className="sec-sub" style={{ textTransform: 'capitalize' }}>{dataLegivel()}</p>
      </div>

      {reunioesHoje.length > 0 && (
        <div className={styles.heroBlock}>
          <div className={styles.heroEyebrow}>Prioridade agora</div>
          <h2 className={styles.heroTitle}>
            {reunioesHoje.length === 1 ? '1 reunião hoje' : reunioesHoje.length + ' reuniões hoje'}
          </h2>

          <div className={styles.heroList}>
            {reunioesHoje.map(r => {
              const pid = r.pessoa?.id || '';
              const minhas = tarefasDo(pid, 'consultor');
              const dele = tarefasDo(pid, 'cliente');

              return (
                <div key={r.id} className={styles.heroCard}>
                  <div className={styles.heroCardTitle}>{r.pessoa?.nome ?? '—'}</div>
                  <div className={styles.heroCardSub}>
                    {r.pessoa?.fase && <span className={styles.faseTag}>{r.pessoa.fase}</span>}
                    {r.titulo && <span>{r.titulo}</span>}
                  </div>

                  {r.prep_notes && (
                    <div className={styles.heroPrep}>
                      <div className={styles.heroPrepLabel}>Preparação</div>
                      <p>{r.prep_notes}</p>
                    </div>
                  )}

                  <div className={styles.heroTarefas}>
                    <div>
                      <div className={styles.tarefasLabel}>Suas tarefas ({minhas.length})</div>
                      {minhas.length === 0 ? (
                        <div className={styles.tarefaVazia}>—</div>
                      ) : (
                        <ul className={styles.tarefaList}>
                          {minhas.map(t => (
                            <li key={t.id}>
                              {t.descricao}
                              {t.data && <span className={styles.tarefaData}> · {formatarPrazo(t.data)}</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div>
                      <div className={styles.tarefasLabel}>Tarefas dele ({dele.length})</div>
                      {dele.length === 0 ? (
                        <div className={styles.tarefaVazia}>—</div>
                      ) : (
                        <ul className={styles.tarefaList}>
                          {dele.map(t => (
                            <li key={t.id}>
                              {t.descricao}
                              {t.data && <span className={styles.tarefaData}> · {formatarPrazo(t.data)}</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className={styles.grid}>
        <div className="card">
          <div className="card-head">
            <h3>Pendências atrasadas</h3>
            {pendencias.length > 0
              ? <span className="pill critico">{pendencias.length}</span>
              : <span className="nav-badge count">0</span>}
          </div>
          {pendencias.length === 0 ? (
            <div className="empty-state">Nada em atraso.</div>
          ) : (
            <div className={styles.rows}>
              {pendencias.map(p => (
                <div key={p.id} className="alert-row crit">
                  <div className="alert-head">
                    <span className="alert-title">{p.descricao}</span>
                    <span className="alert-tag">venceu {formatarPrazo(p.prazo)}</span>
                  </div>
                  <div className="alert-who">
                    {p.pessoa?.nome ?? '—'} · {p.responsavel === 'consultor' ? 'Você' : 'Cliente'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-head">
            <h3>Próximos 7 dias</h3>
            <span className="nav-badge count">{passos.length}</span>
          </div>
          {passos.length === 0 ? (
            <div className="empty-state">Sem próximos passos na semana.</div>
          ) : (
            <div className={styles.rows}>
              {passos.map(p => (
                <div key={p.id} className="alert-row info">
                  <div className="alert-head">
                    <span className="alert-title">{p.descricao}</span>
                    <span className="alert-tag">{formatarPrazo(p.data_prevista)}</span>
                  </div>
                  <div className="alert-who">
                    {p.pessoa?.nome ?? '—'} · {p.responsavel === 'consultor' ? 'Você' : 'Cliente'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-head">
            <h3>Atividades registradas hoje</h3>
            <span className="nav-badge count">{atividades.length}</span>
          </div>
          {atividades.length === 0 ? (
            <div className="empty-state">Nada registrado ainda.</div>
          ) : (
            <ul className={styles.list}>
              {atividades.map(a => (
                <li key={a.id} className={styles.activityItem}>
                  <div className={styles.itemHead}>
                    <span className={styles.tipoTag}>{a.tipo}</span>
                    <span className={styles.itemPerson}>{a.pessoa?.nome ?? '—'}</span>
                  </div>
                  <div className={styles.itemBody}>{a.descricao}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
