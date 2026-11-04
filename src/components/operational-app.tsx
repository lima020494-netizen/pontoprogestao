import { useEffect, useState } from "react";

export function OperationalApp({ mode }: { mode: "gestor" | "quiosque" }) {
  const base = `/vip-ponto.html?v=20261104-revisao&modo=${mode}`;
  const [src, setSrc] = useState(base);
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    setSrc(`${base}${query.get("suporte") === "1" ? "&suporte=1" : ""}${window.location.hash}`);
  }, [base]);
  return <iframe src={src} title={mode === "gestor" ? "Gestor — Ponto Pro Gestão" : "Quiosque — Ponto Pro Gestão"} allow="bluetooth" className="operational-frame" />;
}