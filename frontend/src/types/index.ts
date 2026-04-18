export interface Transaction {
  id: string; user_id: string; descricao: string;
  valor: number; categoria: Categoria;
  tipo: "gasto" | "receita"; date: string;
  source?: "manual" | "pluggy"; created_at: string;
}
export type Categoria = "Moradia"|"Alimentação"|"Transporte"|"Saúde"|"Educação"|"Lazer"|"Vestuário"|"Outros";
export const CATEGORIAS: Categoria[] = ["Moradia","Alimentação","Transporte","Saúde","Educação","Lazer","Vestuário","Outros"];
export interface Meta {
  id: string; user_id: string; nome: string;
  valor_alvo: number; valor_atual: number;
  prazo_meses: number; criada_em: string; concluida: boolean;
}
export interface Investment {
  id: string; user_id: string; nome: string; tipo: string;
  valor_original: number; moeda: string; valor_brl: number;
  pais: string; corretora?: string; notas?: string; updated_at: string;
}
export interface ExchangeRate {
  code: string; name: string; emoji: string;
  rate: number; pct_change: number; high: number; low: number;
}
