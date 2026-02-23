# Changelog

Todas as mudancas relevantes deste projeto serao documentadas neste arquivo.

## [v1.1.0] - 2026-02-23

### Added
- Novo menu principal "MENU" para agrupar acoes da tela principal.
- Nova opcao "Criar Despesa" para associar despesas novas a setores existentes.
- Novo modal de configuracao de despesa no frontend.
- Endpoint backend para salvar configuracao de despesa por setor.

### Changed
- Opcao antiga de criacao de setor renomeada para "Criar Setor".
- Permissoes atualizadas:
  - Admin: pode criar setor e despesa.
  - RH: pode criar despesa.
- Filtros de periodo reorganizados:
  - Presets no menu suspenso (incluindo "Ano Atual" como padrao no login).
  - Opcao "Personalizado" para exibir data inicial/final.
- Lista de despesas no filtro com ordenacao alfabetica estavel.
- Fluxo de lancamentos simplificado:
  - Todo lancamento agora fica sempre com status `LANCADO`.
  - `dtPagamento` agora e interno e definido automaticamente com a data de criacao.

### Removed
- Acao "Marcar como Pago" na interface.
- Filtro por status na interface e na API.
- Campo de status no formulario de lancamento.
- Campo de data de pagamento no formulario de criacao/edicao.
- Endpoint de alteracao de status de pagamento.

### Notes
- Nao houve alteracao de estrutura de banco nesta release.
- Compatibilidade mantida com ambiente Railway em producao.
