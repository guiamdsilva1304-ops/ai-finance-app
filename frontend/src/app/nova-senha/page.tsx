import { redirect } from "next/navigation";

// Rota legada — redirecionada para a rota canônica
export default function NovaSenhaPage() {
  redirect("/redefinir-senha");
}
