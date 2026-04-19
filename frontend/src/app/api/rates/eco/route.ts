import { NextResponse } from "next/server";

export async function GET() {
  try {
    const [selicMetaRes, ipcaMensalRes, ipca12mRes] = await Promise.all([
      fetch("https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json"),
      fetch("https://api.bcb.gov.br/dados/serie/bcdata.sgs.13522/dados/ultimos/1?formato=json"),
      fetch("https://api.bcb.gov.br/dados/serie/bcdata.sgs.13522/dados/ultimos/12?formato=json"),
    ]);

    const selicMetaData = selicMetaRes.ok ? await selicMetaRes.json() : null;
    const ipcaMensalData = ipcaMensalRes.ok ? await ipcaMensalRes.json() : null;
    const ipca12mData = ipca12mRes.ok ? await ipca12mRes.json() : null;

    const selic_meta = selicMetaData?.[0]?.valor ? parseFloat(selicMetaData[0].valor) : 14.75;
    const ipca_mensal = ipcaMensalData?.[0]?.valor ? parseFloat(ipcaMensalData[0].valor) : 0.56;

    const ipca_anual = ipca12mData
      ? parseFloat(
          (
            (ipca12mData.reduce((acc: number, d: { valor: string }) => acc * (1 + parseFloat(d.valor) / 100), 1) - 1) * 100
          ).toFixed(2)
        )
      : 6.92;

    const selic_anual = selic_meta;
    const selic_mensal = parseFloat(((Math.pow(1 + selic_meta / 100, 1 / 12) - 1) * 100).toFixed(4));
    const juro_real = parseFloat(((1 + selic_anual / 100) / (1 + ipca_anual / 100) - 1) * 100).toFixed(2);

    return NextResponse.json({
      selic_mensal,
      selic_anual,
      selic_meta,
      ipca_mensal,
      ipca_anual,
      juro_real: parseFloat(juro_real),
      cdi: selic_mensal,
      ultima_atualizacao: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({
      selic_mensal: 1.15,
      selic_anual: 14.75,
      selic_meta: 14.75,
      ipca_mensal: 0.56,
      ipca_anual: 5.48,
      juro_real: 8.79,
      cdi: 1.15,
      ultima_atualizacao: new Date().toISOString(),
    });
  }
}
