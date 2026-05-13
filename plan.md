# Vantari — Plano de Desenvolvimento

## Status atual

Aplicação funcional em produção: https://vantari-app.vercel.app

Módulos existentes:
- [x] Auth / Login
- [x] Dashboard Analytics
- [x] Leads
- [x] Scoring
- [x] E-mail Marketing
- [x] Landing Pages
- [x] IA Marketing
- [x] Integrações
- [x] Settings / Admin
- [x] Onboarding Wizard

---

## Próximos passos sugeridos

### Infraestrutura
- [x] Inicializar repositório Git para controle de versão
- [ ] Adicionar variáveis de ambiente (`.env`) para URLs de API e chaves
- [ ] Configurar domínio customizado no Vercel

### Qualidade de código
- [x] Renomear `vantari-email-marketing (1).jsx` — espaço no nome causa problemas
- [x] Padronizar nomenclatura dos arquivos (remover sufixos `-v2` e consolidar versões)
- [x] Implementar code splitting com `React.lazy` / `Suspense` (bundle principal: 1.075MB → 229KB)

### Funcionalidades
- [x] Adicionar rota `/settings` para o módulo `vantari-settings-admin.jsx`
- [x] Adicionar rota `/onboarding` com wizard de 4 fases
- [x] Card de progresso de onboarding na aba Workspace de Configurações
- [ ] Implementar autenticação real (atualmente apenas UI)
- [ ] Conectar módulos a uma API/backend

### UX
- [x] Adicionar estado de loading entre navegações
- [x] Tratar erros de rota (página 404)
- [x] Navegação funcional em todas as páginas via `useNavigate`
- [x] Corrigir sidebar dupla (cada página gerencia seu próprio layout)
- [x] Corrigir tela branca na página de Integrações (bug com ícones Lucide + forwardRef)
- [x] Adicionar sidebar com navegação na página de Configurações
- [ ] Tornar layout responsivo para mobile
