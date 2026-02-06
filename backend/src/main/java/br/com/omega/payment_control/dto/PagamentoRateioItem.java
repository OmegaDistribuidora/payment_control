package br.com.omega.payment_control.dto;

import java.math.BigDecimal;

public record PagamentoRateioItem(
        String nome,
        BigDecimal valor
) {}
