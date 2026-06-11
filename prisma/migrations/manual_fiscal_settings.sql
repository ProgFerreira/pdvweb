-- Migração: campos fiscais (NFC-e via Focus NFe) em settings
-- Execute: npx dotenv -e .env.local -- prisma db push
ALTER TABLE `settings`
  ADD COLUMN `fiscalEnabled`    TINYINT(1)   NOT NULL DEFAULT 0          AFTER `stoneTerminalSerial`,
  ADD COLUMN `fiscalCnpj`       VARCHAR(20)  NULL                        AFTER `fiscalEnabled`,
  ADD COLUMN `fiscalIE`         VARCHAR(20)  NULL                        AFTER `fiscalCnpj`,
  ADD COLUMN `fiscalCRT`        VARCHAR(5)   NULL                        AFTER `fiscalIE`,
  ADD COLUMN `fiscalSerie`      INT          NULL                        AFTER `fiscalCRT`,
  ADD COLUMN `fiscalAmbiente`   VARCHAR(20)  NULL DEFAULT 'homologacao'  AFTER `fiscalSerie`,
  ADD COLUMN `fiscalFocusToken` VARCHAR(500) NULL                        AFTER `fiscalAmbiente`;
