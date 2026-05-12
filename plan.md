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
- [ ] Settings / Admin (arquivo existe, não está roteado)

---

## Próximos passos sugeridos

### Infraestrutura
- [x] Inicializar repositório Git para controle de versão
- [ ] Adicionar variáveis de ambiente (`.env`) para URLs de API e chaves
- [ ] Configurar domínio customizado no Vercel

### Qualidade de código
- [x] Renomear `vantari-email-marketing (1).jsx` — espaço no nome causa problemas
- [x] Padronizar nomenclatura dos arquivos (remover sufixos `-v2` e consolidar versões)
- [ ] Implementar code splitting com `React.lazy` / `Suspense` (bundle atual ~1.2MB)

### Funcionalidades
- [ ] Adicionar rota `/settings` para o módulo `vantari-settings-admin.jsx`
- [ ] Implementar autenticação real (atualmente apenas UI)
- [ ] Conectar módulos a uma API/backend

### UX
- [ ] Adicionar estado de loading entre navegações
- [ ] Tratar erros de rota (página 404)
- [ ] Tornar layout responsivo para mobile
