package br.com.omega.payment_control.dto;

import java.time.LocalDateTime;

public record PagamentoHistoricoResponse(
        Long id,
        Long pagamentoId,
        String acao,
        String detalhes,
        String criadoPor,
        LocalDateTime dtEvento
) {}
