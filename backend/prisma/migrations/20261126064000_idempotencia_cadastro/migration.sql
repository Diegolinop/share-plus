ALTER TABLE "Grupo" ADD COLUMN "chave_idempotencia" TEXT;

CREATE UNIQUE INDEX "Grupo_administrador_id_chave_idempotencia_key"
  ON "Grupo"("administrador_id", "chave_idempotencia");
