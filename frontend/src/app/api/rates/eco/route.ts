import { NextResponse } from "next/server";

export async function GET() {
  try {
    const [selicRes, ipcaRes, selicMetaRes] = await Promise.all([
      fetch("https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados/ultimos/1?formato=json"),
      fetch("https://api.bcb.gov.br/dados/serie/bcdata.sgs.13522/dados/ultimos/1?formato=json"),
      fetch("https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/12?formato=json"),
    ]);

    const selicData = selicRes.ok ? await selicRes.json() : null;
    const ipcaData = ipcaRes.ok ? await ipcaRes.json() : null;
    const selicMetaData = selicMetaRes.ok ? await selicMetaRes.json() : null;

    const selic_mensal = selicData?.[0]?.valor ? parseFloat(selicData[0].valor) : 1.19;
    const ipca_mensal = ipcaData?.[0]?.valor ? parseFloat(ipcaData[0].valor) : 0.56;
    const selic_meta = selicMetaData?.[selicMetaData.length - 1]?.valor ? parseFloat(selicMetaData[selicMetaData.length - 1].valor) : 14.75;

    const selic_anual = parseFloat(((Math.pow(1 + selic_mensal / 100, 12) - 1) * 100).toFixed(2));
    const ipca_anual = parseFloat(((Math.pow(1 + ipca_mensal / 100, 12) - 1) * 100).toFixed(2));

    return NextResponse.json({
      selic_mensal,
      selic_anual,
      selic_meta,
      ipca_mensal,
      ipca_anual,
      cdi: selic_mensal,
      ultima_atualizacao: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({
      selic_mensal: 1.19,
      selic_anual: 14.75,
      selic_meta: 14.75,
      ipca_mensal: 0.56,
      ipca_anual: 6.92,
      cdi: 1.19,
      ultima_atualizacao: new Date().toISOString(),
    });
  }
}
