package br.com.omega.payment_control.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "pagamento_historico", indexes = {
        @Index(name = "idx_hist_pagamento_id", columnList = "pagamento_id"),
        @Index(name = "idx_hist_dt_evento", columnList = "dt_evento")
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PagamentoHistorico {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "pagamento_id", nullable = false)
    private Long pagamentoId;

    @Column(nullable = false, length = 30)
    private String acao;

    @Column(columnDefinition = "text")
    private String detalhes;

    @CreatedBy
    @Column(name = "criado_por", length = 80, updatable = false)
    private String criadoPor;

    @CreatedDate
    @Column(name = "dt_evento", nullable = false, updatable = false)
    private LocalDateTime dtEvento;
}
