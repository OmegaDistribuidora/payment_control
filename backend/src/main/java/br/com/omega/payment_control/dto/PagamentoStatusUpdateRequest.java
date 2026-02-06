package br.com.omega.payment_control.dto;

import br.com.omega.payment_control.entity.StatusPagamento;
import jakarta.validation.constraints.NotNull;

public record PagamentoStatusUpdateRequest(
        @NotNull StatusPagamento status
) {}
