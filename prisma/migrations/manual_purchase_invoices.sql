-- Execute no MySQL se `prisma db push` não rodar automaticamente:
CREATE TABLE IF NOT EXISTS `purchase_invoices` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(30) NOT NULL,
  `supplierId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `number` VARCHAR(50) NULL,
  `issueDate` DATETIME(3) NOT NULL,
  `amount` DECIMAL(12, 2) NOT NULL,
  `status` ENUM('PENDENTE', 'PAGO', 'CANCELADO') NOT NULL DEFAULT 'PENDENTE',
  `paymentMethod` ENUM('DINHEIRO', 'PIX', 'BOLETO', 'TRANSFERENCIA', 'CARTAO') NULL,
  `paymentDate` DATETIME(3) NULL,
  `fileUrl` VARCHAR(191) NULL,
  `fileMime` VARCHAR(100) NULL,
  `notes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `deletedAt` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  INDEX `purchase_invoices_tenantId_issueDate_idx` (`tenantId`, `issueDate`),
  INDEX `purchase_invoices_tenantId_status_idx` (`tenantId`, `status`),
  INDEX `purchase_invoices_tenantId_supplierId_idx` (`tenantId`, `supplierId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
