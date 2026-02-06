-- Add indexes to improve filter performance.
-- Apply manually on PostgreSQL.

CREATE INDEX IF NOT EXISTS idx_pagamentos_dt_vencimento
    ON pagamentos (dt_vencimento);

CREATE INDEX IF NOT EXISTS idx_pagamentos_setor_pagamento
    ON pagamentos (setor_pagamento);
