CREATE OR REPLACE FUNCTION pagamento_set_norm_fields()
RETURNS TRIGGER AS $$
BEGIN
    NEW.sede_norm := lower(NEW.sede);
    NEW.setor_norm := lower(NEW.setor);
    NEW.despesa_norm := lower(NEW.despesa);
    NEW.dotacao_norm := lower(NEW.dotacao);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pagamento_norm_fields ON pagamentos;
CREATE TRIGGER trg_pagamento_norm_fields
BEFORE INSERT OR UPDATE ON pagamentos
FOR EACH ROW
EXECUTE FUNCTION pagamento_set_norm_fields();
