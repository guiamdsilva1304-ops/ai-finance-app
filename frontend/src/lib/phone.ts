// Telefones no formato wa_id da Meta: só dígitos, com DDI 55.
// Ex: "5521999999999" (13 dígitos) ou "552199999999" (12, sem o nono dígito).

export function normalizarTelefoneBR(input: string): string | null {
  let d = input.replace(/\D/g, "").replace(/^0+/, "");
  if (!d.startsWith("55") && (d.length === 10 || d.length === 11)) d = "55" + d;
  if (!d.startsWith("55") || d.length < 12 || d.length > 13) return null;
  return d;
}

// A Meta pode entregar o wa_id sem o nono dígito em números antigos.
// Gera as duas variantes para a busca no banco cobrir os dois formatos.
export function variantesTelefoneBR(waId: string): string[] {
  const variantes = new Set([waId]);
  if (waId.startsWith("55")) {
    const ddd = waId.slice(2, 4);
    const num = waId.slice(4);
    if (num.length === 9 && num.startsWith("9")) variantes.add(`55${ddd}${num.slice(1)}`);
    if (num.length === 8) variantes.add(`55${ddd}9${num}`);
  }
  return [...variantes];
}
