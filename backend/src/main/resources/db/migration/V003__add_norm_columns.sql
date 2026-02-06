ALTER TABLE pagamentos
    ADD COLUMN IF NOT EXISTS sede_norm VARCHAR(80),
    ADD COLUMN IF NOT EXISTS setor_norm VARCHAR(80),
    ADD COLUMN IF NOT EXISTS despesa_norm VARCHAR(120),
    ADD COLUMN IF NOT EXISTS dotacao_norm VARCHAR(120);

UPDATE pagamentos
SET sede_norm = lower(sede),
    setor_norm = lower(setor),
    despesa_norm = lower(despesa),
    dotacao_norm = lower(dotacao)
WHERE sede_norm IS NULL
   OR setor_norm IS NULL
   OR despesa_norm IS NULL
   OR dotacao_norm IS NULL;

CREATE INDEX IF NOT EXISTS idx_pagamentos_sede_norm
    ON pagamentos (sede_norm);

CREATE INDEX IF NOT EXISTS idx_pagamentos_setor_norm
    ON pagamentos (setor_norm);

CREATE INDEX IF NOT EXISTS idx_pagamentos_despesa_norm
    ON pagamentos (despesa_norm);

CREATE INDEX IF NOT EXISTS idx_pagamentos_dotacao_norm
    ON pagamentos (dotacao_norm);
