package br.com.omega.payment_control.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "pagamento_rateio", indexes = {
        @Index(name = "idx_rateio_pagamento_id", columnList = "pagamento_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PagamentoRateio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "pagamento_id", insertable = false, updatable = false)
    private Long pagamentoId;

    @Column(nullable = false, length = 255)
    private String nome;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal valor;
}
