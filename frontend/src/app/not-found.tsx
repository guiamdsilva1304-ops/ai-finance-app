import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f0fdf4 0%, #fff 60%)", fontFamily: "'Nunito',sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", textAlign: "center" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;900&display=swap');`}</style>
      <div style={{ fontSize: 72, marginBottom: 16 }}>🧭</div>
      <h1 style={{ fontSize: 80, fontWeight: 900, color: "#1D9E75", margin: "0 0 8px", lineHeight: 1 }}>404</h1>
      <h2 style={{ fontSize: 24, fontWeight: 800, color: "#0d2414", margin: "0 0 12px" }}>Página não encontrada</h2>
      <p style={{ fontSize: 16, color: "#6b9e80", maxWidth: 380, lineHeight: 1.7, margin: "0 0 32px" }}>
        A bússola perdeu o norte! Esta página não existe ou foi movida.
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <Link href="/" style={{ background: "#1D9E75", color: "#fff", padding: "14px 28px", borderRadius: 12, textDecoration: "none", fontWeight: 800, fontSize: 15 }}>
          Ir para o início →
        </Link>
        <Link href="/dashboard" style={{ background: "#fff", color: "#1D9E75", padding: "14px 28px", borderRadius: 12, textDecoration: "none", fontWeight: 800, fontSize: 15, border: "2px solid #e4f5e9" }}>
          Abrir o dashboard
        </Link>
      </div>
    </div>
  );
}
