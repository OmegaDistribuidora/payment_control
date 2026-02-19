package br.com.omega.payment_control.reference;

import br.com.omega.payment_control.reference.ReferenceDtos.ColaboradorItem;
import br.com.omega.payment_control.reference.ReferenceDtos.DespesaItem;
import br.com.omega.payment_control.reference.ReferenceDtos.ReferenceBundle;
import br.com.omega.payment_control.reference.ReferenceDtos.ReferenceItem;
import br.com.omega.payment_control.reference.ReferenceDtos.SetorConfigRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/referencias")
public class ReferenceController {

    private final ReferenceService service;

    public ReferenceController(ReferenceService service) {
        this.service = service;
    }

    @GetMapping("/setores")
    public List<ReferenceItem> listarSetores() {
        return service.listarSetores();
    }

    @GetMapping("/todas")
    public ReferenceBundle listarTodas() {
        return service.listarTudo();
    }

    @GetMapping("/dspcentros")
    public List<ReferenceItem> listarDspCentros() {
        return service.listarDspCentros();
    }

    @GetMapping("/despesas")
    public List<DespesaItem> listarDespesas(@RequestParam(required = false) Integer codMt) {
        return service.listarDespesas(codMt);
    }

    @GetMapping("/empresas")
    public List<ReferenceItem> listarEmpresas() {
        return service.listarEmpresas();
    }

    @GetMapping("/fornecedores")
    public List<ReferenceItem> listarFornecedores() {
        return service.listarFornecedores();
    }

    @GetMapping("/sedes")
    public List<ReferenceItem> listarSedes() {
        return service.listarSedes();
    }

    @GetMapping("/dotacoes")
    public List<ReferenceItem> listarDotacoes() {
        return service.listarDotacoes();
    }

    @GetMapping("/colaboradores")
    public List<ColaboradorItem> listarColaboradores() {
        return service.listarColaboradores();
    }

    @PostMapping("/cache/clear")
    public void limparCache() {
        service.clearCache();
    }

    @PostMapping("/setores/config")
    public ReferenceBundle salvarSetorConfig(@RequestBody @Valid SetorConfigRequest request) {
        return service.salvarSetorConfig(request);
    }
}
