-- Migração: campo nfcePdfUrl para link do DANFE NFC-e
ALTER TABLE `sales`
  ADD COLUMN `nfcePdfUrl` VARCHAR(2000) NULL AFTER `nfceXmlUrl`;
