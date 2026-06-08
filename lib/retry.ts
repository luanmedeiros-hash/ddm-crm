/**
 * fetch com retry para erros transitórios (rede ou 5xx/429).
 * Não repete em 4xx (exceto 429), pois são erros do cliente.
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  opts: { retries?: number; baseDelayMs?: number } = {},
): Promise<Response> {
  const retries = opts.retries ?? 2;
  const baseDelay = opts.baseDelayMs ?? 400;
  let ultimoErro: unknown;

  for (let tentativa = 0; tentativa <= retries; tentativa++) {
    try {
      const res = await fetch(url, init);
      // Repete só em erros transitórios do servidor
      if ((res.status >= 500 || res.status === 429) && tentativa < retries) {
        await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, tentativa)));
        continue;
      }
      return res;
    } catch (e) {
      // Erro de rede — repete
      ultimoErro = e;
      if (tentativa < retries) {
        await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, tentativa)));
        continue;
      }
      throw e;
    }
  }
  throw ultimoErro ?? new Error('fetchWithRetry: falha sem resposta');
}
