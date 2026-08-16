// app/consultorias/page.tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase-server';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

type Cliente = {
  id: string;
  nome: string;
  empresa: string | null;
  c1: boolean;
  c2: boolean;
  c3: boolean;
  c4: boolean;
  data_fechamento: string | null;
};

type ReuniaoRow = { pessoa_id: string; data: string };

type ColunaKey = 'C1' | 'C2' | 'C3' | 'C4' | 'ACOMP';

function definirEtapa(c: Cliente): ColunaKey {
  if (!c.c1) return 'C1';
  if (!c.c2) return 'C2';
  if (!c.c3) return 'C3';
  if (!c.c4) return 'C4';
  return 'ACOMP';
}

const COLUNAS: { key: ColunaKey; titulo: string; subtitulo: string }[] = [
  { key: 'C1', titulo: 'C1', subtitulo: 'Organização financeira' },
  { key: 'C2', titulo: 'C2', subtitulo: 'Seguro' },
  { key: 'C3', titulo: 'C3', subtitulo: 'Previdência' },
  { key: 'C4', titulo: 'C4', subtitulo: 'Consórcio' },
  { key: 'ACOMP', titulo: 'Acompanhamento', subtitulo: 'C1–C4 completos' },
];

function diasDesde(iso: string | null): string {
  if (!iso) return '—';
  const then = new Date(iso);
  const now = new Date();
  const days = Math.floor((now.getTime() - then.getTime()) / 86400000);
  if (days === 0) return 'hoje';
  if (days === 1) return 'ontem';
  return 'há ' + days + 'd';
}

function ateData(iso: string | null): string {
  if (!iso) return '';
  const [_, m, d] = iso.split('-');
  return d + '/' + m;
}

export default async function ConsultoriasPage() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: clientesRaw } = await supabase
    .from('pessoas')
    .select('id, nome, empresa, c1, c2, c3, c4, data_fechamento')
    .eq('user_id', user.id)
    .eq('fase', 'cliente')
    .order('nome');
  const clientes = (clientesRaw ?? []) as Cliente[];

  const ids = clientes.map(c => c.id);
  const hoje = new Date().toISOString().slice(0, 10);

  let reunioes: ReuniaoRow[] = [];
  let pendMap = new Map<string, number>();

  if (ids.length > 0) {
    const { data: rData } = await supabase
      .from('reunioes')
      .select('pessoa_id, data')
      .in('pessoa_id', ids);
    reunioes = (rData ?? []) as ReuniaoRow[];

    const { data: pData } = await supabase
      .from('pendencias')
      .select('pessoa_id')
      .in('pessoa_id', ids)
      .eq('status', 'aberta');
    for (const p of (pData ?? [])) {
      const pid = (p as any).pessoa_id as string;
      pendMap.set(pid, (pendMap.get(pid) || 0) + 1);
    }
  }

  const ultimaPorPessoa = new Map<string, string>();
  const proximaPorPessoa = new Map<string, string>();
  for (const r of reunioes) {
    if (r.data < hoje) {
      const cur = ultimaPorPessoa.get(r.pessoa_id);
      if (!cur || r.data > cur) ultimaPorPessoa.set(r.pessoa_id, r.data);
    } else {
      const cur = proximaPorPessoa.get(r.pessoa_id);
      if (!cur || r.data < cur) proximaPorPessoa.set(r.pessoa_id, r.data);
    }
  }

  const porColuna = new Map<ColunaKey, Cliente[]>();
  for (const col of COLUNAS) porColuna.set(col.key, []);
  for (const c of clientes) porColuna.get(definirEtapa(c))!.push(c);

  return (
    <div className="main">
      <Link href="/dashboard" className={styles.backLink}>← Voltar ao painel</Link>

      <div>
        <div className="sec-eyebrow">
          <span className="eyebrow-dot"></span>
          <span>Jornada</span>
        </div>
        <h1 className="sec-title">Consultorias</h1>
        <p className="sec-sub">
          {clientes.length === 0
            ? 'Nenhum cliente ativo ainda.'
            : clientes.length + ' ' + (clientes.length === 1 ? 'cliente ativo' : 'clientes ativos') + ' · agrupados pela próxima etapa'}
        </p>
      </div>

      <div className={styles.kanban}>
        {COLUNAS.map(col => {
          const items = porColuna.get(col.key) ?? [];
          return (
            <div key={col.key} className={styles.coluna}>
              <div className={styles.colunaHeader}>
                <div>
                  <div className={styles.colunaTitulo}>{col.titulo}</div>
                  <div className={styles.colunaSubtitulo}>{col.subtitulo}</div>
                </div>
                <span className={styles.colunaCount}>{items.length}</span>
              </div>

              <div className={styles.colunaLista}>
                {items.length === 0 ? (
                  <div className={styles.colunaVazia}>—</div>
                ) : items.map(c => {
                  const ultima = ultimaPorPessoa.get(c.id) ?? null;
                  const proxima = proximaPorPessoa.get(c.id) ?? null;
                  const pends = pendMap.get(c.id) ?? 0;

                  return (
                    <div key={c.id} className={styles.card}>
                      <div className={styles.cardNome}>{c.nome}</div>
                      {c.empresa && <div className={styles.cardEmpresa}>{c.empresa}</div>}
                      <div className={styles.cardMeta}>
                        <span>Últ.: {diasDesde(ultima)}</span>
                        {proxima && <span>· Próx: {ateData(proxima)}</span>}
                      </div>
                      {pends > 0 && (
                        <div className={styles.cardBadge}>
                          {pends} pendência{pends > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
