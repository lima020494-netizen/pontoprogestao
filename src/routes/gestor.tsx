import { createFileRoute } from "@tanstack/react-router";
import { OperationalApp } from "@/components/operational-app";

export const Route = createFileRoute("/gestor")({
  head: () => ({ meta: [
    { title: "Painel do Gestor — Ponto Pro Gestão" },
    { name: "description", content: "Acesso à gestão da empresa com sessão autenticada." },
    { name: "robots", content: "noindex" },
    { property: "og:title", content: "Painel do Gestor — Ponto Pro Gestão" },
    { property: "og:description", content: "Gestão de frequência, colaboradores e espelhos de ponto da empresa." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <OperationalApp mode="gestor" />,
});