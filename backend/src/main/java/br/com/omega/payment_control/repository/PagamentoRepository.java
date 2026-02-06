package br.com.omega.payment_control.repository;

import br.com.omega.payment_control.entity.Pagamento;
import br.com.omega.payment_control.entity.StatusPagamento;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Optional;

public interface PagamentoRepository extends JpaRepository<Pagamento, Long> {

    Page<Pagamento> findByCriadoPor(String criadoPor, Pageable pageable);

    @EntityGraph(attributePaths = "rateios")
    Optional<Pagamento> findByIdAndCriadoPor(Long id, String criadoPor);

    @EntityGraph(attributePaths = "rateios")
    Optional<Pagamento> findById(Long id);

    @Query("""
        select p from Pagamento p
        where (:isPrivilegiado = true or p.criadoPor = :criadoPor)
          and (
                :de is null
                or (p.dtVencimento is not null and p.dtVencimento >= :de)
                or (p.dtVencimento is null and p.dtPagamento >= :de)
              )
          and (
                :ate is null
                or (p.dtVencimento is not null and p.dtVencimento <= :ate)
                or (p.dtVencimento is null and p.dtPagamento <= :ate)
              )

          and (:sede is null or p.sedeNorm = :sede)
          and (:setor is null or p.setorNorm = :setor)
          and (:despesa is null or p.despesaNorm = :despesa)
          and (:dotacao is null or p.dotacaoNorm = :dotacao)

          and (:status is null or p.status = :status)

          and (
                :q is null
                or lower(p.despesa) like :q
                or lower(p.descricao) like :q
              )
        """)
    Page<Pagamento> buscarMeusComFiltros(
            @Param("criadoPor") String criadoPor,
            @Param("isPrivilegiado") boolean isPrivilegiado,
            @Param("de") LocalDate de,
            @Param("ate") LocalDate ate,
            @Param("sede") String sede,
            @Param("setor") String setor,
            @Param("despesa") String despesa,
            @Param("dotacao") String dotacao,
            @Param("status") StatusPagamento status,
            @Param("q") String q,
            Pageable pageable
    );
}
