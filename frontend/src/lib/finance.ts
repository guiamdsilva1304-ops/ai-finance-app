// CDI aproximado: SELIC 10,65% a.a. ÷ 12
export const CDI_TAXA_MENSAL = 0.008875;

/**
 * PMT (aporte mensal necessário para atingir FV em n meses com juros i)
 * PMT = FV × i / ((1 + i)^n − 1)
 *
 * @param fv          valor futuro restante (valor_alvo - valor_atual)
 * @param taxaMensal  taxa de juros mensal como decimal (ex.: 0.008875 = 0,8875%)
 * @param prazoMeses  número de meses até a meta
 */
export function calcularAporteMensal(
  fv: number,
  taxaMensal: number,
  prazoMeses: number
): number {
  if (fv <= 0 || prazoMeses <= 0) return 0;
  if (taxaMensal <= 0) return fv / prazoMeses;
  const i = taxaMensal;
  const n = prazoMeses;
  return (fv * i) / (Math.pow(1 + i, n) - 1);
}
