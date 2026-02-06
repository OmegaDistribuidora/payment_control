package br.com.omega.payment_control.dto;

import br.com.omega.payment_control.entity.StatusPagamento;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record PagamentoResponse(
        Long id,
        String codVld,
        String perfilCriador,
        String colaborador,
        String criadoPor,
        String ultEditadoPor,
        LocalDateTime dtSistema,
        LocalDate dtPagamento,
        LocalDate dtVencimento,
        LocalDateTime dtUltEdicao,
        StatusPagamento status,
        String sede,
        String setor,
        String despesa,
        String dotacao,
        String empresaFornecedor,
        String setorPagamento,
        BigDecimal valorTotal,
        String descricao,
        List<PagamentoRateioItem> rateios
) {}
