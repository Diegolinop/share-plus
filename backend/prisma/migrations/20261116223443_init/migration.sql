-- CreateTable
CREATE TABLE "Usuario" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "papel" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Assinatura" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "servico" TEXT NOT NULL,
    "valor_total_centavos" INTEGER NOT NULL CONSTRAINT "Assinatura_valor_total_centavos_check" CHECK (typeof("valor_total_centavos") = 'integer' AND "valor_total_centavos" BETWEEN 1 AND 2147483647),
    "periodicidade" TEXT NOT NULL,
    "dia_vencimento" INTEGER NOT NULL CONSTRAINT "Assinatura_dia_vencimento_check" CHECK (typeof("dia_vencimento") = 'integer' AND "dia_vencimento" BETWEEN 1 AND 31),
    "vagas" INTEGER NOT NULL CONSTRAINT "Assinatura_vagas_check" CHECK (typeof("vagas") = 'integer' AND "vagas" BETWEEN 1 AND 2147483647)
);

-- CreateTable
CREATE TABLE "Grupo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "assinatura_id" INTEGER NOT NULL,
    "administrador_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    CONSTRAINT "Grupo_assinatura_id_fkey" FOREIGN KEY ("assinatura_id") REFERENCES "Assinatura" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Grupo_administrador_id_fkey" FOREIGN KEY ("administrador_id") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Participacao" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "grupo_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    CONSTRAINT "Participacao_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "Grupo" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Participacao_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Grupo_assinatura_id_key" ON "Grupo"("assinatura_id");

-- CreateIndex
CREATE INDEX "Grupo_administrador_id_idx" ON "Grupo"("administrador_id");

-- CreateIndex
CREATE INDEX "Participacao_usuario_id_idx" ON "Participacao"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "Participacao_grupo_id_usuario_id_key" ON "Participacao"("grupo_id", "usuario_id");
