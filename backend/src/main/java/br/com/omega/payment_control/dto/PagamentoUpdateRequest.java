package br.com.omega.payment_control.dto;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record PagamentoUpdateRequest(
        @NotNull LocalDate dtPagamento,
        @NotNull LocalDate dtVencimento,
        @NotBlank @Size(max = 80) String sede,
        @NotBlank @Size(max = 120) String colaborador,
        @NotBlank @Size(max = 80) String setor,
        @NotBlank @Size(max = 120) String despesa,
        @NotBlank @Size(max = 120) String dotacao,
        @Size(max = 255) String empresaFornecedor,
        @NotBlank @Size(max = 80) String setorPagamento,
        @NotNull @Positive @Digits(integer = 10, fraction = 2) BigDecimal valorTotal,
        @Size(max = 1000) String descricao,
        List<PagamentoRateioItem> rateios
) {}
