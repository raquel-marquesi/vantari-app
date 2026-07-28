// Estado compartilhado (via localStorage) de "menu recolhido" da sidebar.
//
// Contexto: cada página do app renderiza sua própria cópia da sidebar
// (padrão do projeto, ver CLAUDE.md). Antes deste hook, cada página tinha
// seu próprio `useState(false)` local pro collapse — resultado: se você
// recolhia o menu numa página e clicava em outro item, a sidebar da
// página seguinte "estalava" de volta pro tamanho expandido (o estado não
// era compartilhado), dando a sensação de itens "tremendo"/mudando de
// lugar a cada navegação.
//
// Este hook centraliza a leitura/escrita em localStorage, então o estado
// de collapse agora sobrevive à troca de página.
import { useState, useEffect } from "react";

const KEY = "vantari_sidebar_collapsed";

function readInitial() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(readInitial);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, collapsed ? "1" : "0");
    } catch {
      /* localStorage indisponível (ex: modo privado) — segue só em memória */
    }
  }, [collapsed]);
  return [collapsed, setCollapsed];
}
