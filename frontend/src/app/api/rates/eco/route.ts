import { NextResponse } from "next/server";

export async function GET() {
  try {
    const [selicRes, ipcaRes] = await Promise.all([
      fetch("https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados/ultimos/1?formato=json"),
      fetch("https://api.bcb.gov.br/dados/serie/bcdata.sgs.13522/dados/ultimos/1?formato=json"),
    ]);

    const selicData = selicRes.ok ? await selicRes.json() : null;
    const ipcaData = ipcaRes.ok ? await ipcaRes.json() : null;

    const selic_mensal = selicData?.[0]?.valor ? parseFloat(selicData[0].valor) : 1.19;
    const ipca_mensal = ipcaData?.[0]?.valor ? parseFloat(ipcaData[0].valor) : 0.56;
    const selic_anual = parseFloat(((1 + selic_mensal / 100) ** 12 - 1) * 100).toFixed(2);

    return NextResponse.json({
      selic_mensal,
      selic_anual: parseFloat(selic_anual),
      ipca_mensal,
      cdi: selic_mensal,
    });
  } catch {
    return NextResponse.json({
      selic_mensal: 1.19,
      selic_anual: 14.75,
      ipca_mensal: 0.56,
      cdi: 1.19,
    });
  }
}
