// app/hoje/page.tsx
import { getSupabaseServer } from '@/lib/supabase-server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

type PessoaRef = { id: string; nome: string };

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

type PendenciaAtrasada = {
  id: string;
  descricao: string;
  prazo: string | null;
  pessoa: PessoaRef | null;
};

type ProximoPassoSemana = {
  id: string;
  descricao: string;
  data_prevista: string | null;
  pessoa: PessoaRef | null;
};

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dia}`;
}

function hojeYMD(): string {
  return ymd(new Date());
}

function daquiADiasYMD(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return ymd(d);
}

function dataLegivel(): string {
  return new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function formatarPrazo(iso: string | null): string {
  if (!iso) return '';
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

export default async function HojePage() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const hoje = hojeYMD();
  const fimSemana = daquiADiasYMD(7);

  const { data: reunioesRaw } = await supabase
    .from('reunioes')
    .select('id, titulo, data, prep_notes, pessoa:pessoas!inner(id, nome, user_id)')
    .eq('pessoas.user_id', user.id)
    .eq('data', hoje)
    .order('data', { ascending: true });

  const reunioes = (reunioesRaw ?? []) as unknown as ReuniaoHoje[];

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
    .select('id, descricao, prazo, pessoa:pessoas!inner(id, nome, user_id)')
    .eq('pessoas.user_id', user.id)
    .eq('status', 'aberta')
    .lt('prazo', hoje)
    .order('prazo', { ascending: true });

  const pendencias = (pendenciasRaw ?? []) as unknown as PendenciaAtrasada[];

  const { data: passosRaw } = await supabase
    .from('proximos_passos')
    .select('id, descricao, data_prevista, pessoa:pessoas!inner(id, nome, user_id)')
    .eq('user_id', user.id)
    .eq('feito', false)
    .gte('data_prevista', hoje)
    .lte('data_prevista', fimSemana)
    .order('data_prevista', { ascending: true });

  const passos = (passosRaw ?? []) as unknown as ProximoPassoSemana[];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Hoje</h1>
        <p className={styles.subtitle}>{dataLegivel()}</p>
      </header>

      <div className={styles.grid}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            Reunioes de hoje
            <span className={styles.count}>{reunioes.length}</span>
          </h2>
          {reunioes.length === 0 ? (
            <p className={styles.empty}>Sem reunioes agendadas.</p>
          ) : (
            <ul className={styles.list}>
              {reunioes.map((r) => (
                <li key={r.id} className={styles.itemDestaque}>
                  <div className={styles.itemHeader}>
                    <strong>{r.titulo ?? 'Reuniao'}</strong>
                    <span className={styles.muted}>{r.pessoa?.nome ?? '-'}</span>
                  </div>
                  {r.prep_notes && (
                    <div className={styles.prep}>
                      <span className={styles.prepLabel}>Preparacao</span>
                      <p>{r.prep_notes}</p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            Pendencias atrasadas
            <span className={styles.count + (pendencias.length > 0 ? ' ' + styles.countAlert : '')}>
              {pendencias.length}
            </span>
          </h2>
          {pendencias.length === 0 ? (
            <p className={styles.empty}>Nada em atraso.</p>
          ) : (
            <ul className={styles.list}>
              {pendencias.map((p) => (
                <li key={p.id} className={styles.item}>
                  <div className={styles.itemHeader}>
                    <span>{p.descricao}</span>
                    <span className={styles.mutedRed}>venceu {formatarPrazo(p.prazo)}</span>
                  </div>
                  <div className={styles.muted}>{p.pessoa?.nome ?? '-'}</div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            Proximos 7 dias
            <span className={styles.count}>{passos.length}</span>
          </h2>
          {passos.length === 0 ? (
            <p className={styles.empty}>Sem proximos passos na semana.</p>
          ) : (
            <ul className={styles.list}>
              {passos.map((p) => (
                <li key={p.id} className={styles.item}>
                  <div className={styles.itemHeader}>
                    <span>{p.descricao}</span>
                    <span className={styles.muted}>{formatarPrazo(p.data_prevista)}</span>
                  </div>
                  <div className={styles.muted}>{p.pessoa?.nome ?? '-'}</div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            Atividades registradas hoje
            <span className={styles.count}>{atividades.length}</span>
          </h2>
          {atividades.length === 0 ? (
            <p className={styles.empty}>Nada registrado ainda.</p>
          ) : (
            <ul className={styles.list}>
              {atividades.map((a) => (
                <li key={a.id} className={styles.item}>
                  <div className={styles.itemHeader}>
                    <span className={styles.badge}>{a.tipo}</span>
                    <span className={styles.muted}>{a.pessoa?.nome ?? '-'}</span>
                  </div>
                  <div className={styles.itemBody}>{a.descricao}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
