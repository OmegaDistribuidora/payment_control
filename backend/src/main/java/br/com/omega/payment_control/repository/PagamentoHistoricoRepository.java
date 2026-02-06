package br.com.omega.payment_control.repository;

import br.com.omega.payment_control.entity.PagamentoHistorico;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PagamentoHistoricoRepository extends JpaRepository<PagamentoHistorico, Long> {

    List<PagamentoHistorico> findByPagamentoIdOrderByDtEventoDesc(Long pagamentoId);
}
