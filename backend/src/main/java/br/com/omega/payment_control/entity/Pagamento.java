package br.com.omega.payment_control.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.BatchSize;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "pagamentos", indexes = {
        @Index(name = "idx_pagamentos_criado_por", columnList = "criado_por"),
        @Index(name = "idx_pagamentos_dt_pagamento", columnList = "dt_pagamento"),
        @Index(name = "idx_pagamentos_dt_vencimento", columnList = "dt_vencimento"),
        @Index(name = "idx_pagamentos_sede", columnList = "sede"),
        @Index(name = "idx_pagamentos_setor", columnList = "setor"),
        @Index(name = "idx_pagamentos_despesa", columnList = "despesa"),
        @Index(name = "idx_pagamentos_dotacao", columnList = "dotacao"),
        @Index(name = "idx_pagamentos_status", columnList = "status"),
        @Index(name = "idx_pagamentos_setor_pagamento", columnList = "setor_pagamento")
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Pagamento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name="cod_vld", unique = true, length = 40)
    private String codVld;

    @Column(name="perfil_criador", length = 20)
    private String perfilCriador;

    @CreatedBy
    @Column(name="criado_por", nullable = false, length = 80, updatable = false)
    private String criadoPor;

    @LastModifiedBy
    @Column(name="ult_editado_por", length = 80)
    private String ultEditadoPor;

    @CreatedDate
    @Column(name="dt_sistema", nullable = false, updatable = false)
    private LocalDateTime dtSistema;

    @Column(name="dt_pagamento")
    private LocalDate dtPagamento;

    @Column(name = "dt_vencimento")
    private LocalDate dtVencimento;

    @LastModifiedDate
    @Column(name="dt_ult_edicao", nullable = false)
    private LocalDateTime dtUltEdicao;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatusPagamento status = StatusPagamento.LANCADO;

    @Column(nullable = false, length = 80)
    private String sede;

    @Column(name = "sede_norm", length = 80)
    private String sedeNorm;

    @Column(length = 120)
    private String colaborador;

    @Column(nullable = false, length = 80)
    private String setor;

    @Column(name = "setor_norm", length = 80)
    private String setorNorm;

    @Column(nullable = false, length = 120)
    private String despesa;

    @Column(name = "despesa_norm", length = 120)
    private String despesaNorm;

    @Column(nullable = false, length = 120)
    private String dotacao;

    @Column(name = "dotacao_norm", length = 120)
    private String dotacaoNorm;
    @Column(name="empresa_fornecedor", length = 255)
    private String empresaFornecedor;

    @Column(name = "setor_pagamento", length = 80)
    private String setorPagamento;

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @BatchSize(size = 50)
    @JoinColumn(name = "pagamento_id")
    private List<PagamentoRateio> rateios = new ArrayList<>();

    @Column(name="valor_total", nullable = false, precision = 12, scale = 2)
    private BigDecimal valorTotal;

    @Column(columnDefinition = "text")
    private String descricao;
}
