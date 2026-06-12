const REF_KEY = "imoney_ref";

// Lê ?ref= da URL e guarda no localStorage (chamado na landing do bolão)
export function captureRefFromUrl() {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref");
  if (ref && /^[A-Z0-9]{7}$/.test(ref.toUpperCase())) {
    localStorage.setItem(REF_KEY, ref.toUpperCase());
  }
}

// Salva manualmente (quando o usuário digita o código num input)
export function saveRefManual(code: string) {
  if (typeof window === "undefined") return;
  const c = code.trim().toUpperCase();
  if (/^[A-Z0-9]{7}$/.test(c)) localStorage.setItem(REF_KEY, c);
}

// Recupera o código guardado (chamado no signup)
export function getStoredRef(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REF_KEY);
}

export function clearStoredRef() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(REF_KEY);
}
