-- Execute após atualizar o schema (ou use: npx prisma db push)

CREATE TABLE IF NOT EXISTS `accounts_payable` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(30) NOT NULL,
  `description` VARCHAR(191) NOT NULL,
  `supplierId` VARCHAR(191) NULL,
  `purchaseOrderId` VARCHAR(191) NULL,
  `category` ENUM('FORNECEDOR','ALUGUEL','SALARIO','IMPOSTO','SERVICO','OUTROS') NOT NULL DEFAULT 'OUTROS',
  `amount` DECIMAL(10, 2) NOT NULL,
  `paidAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `dueDate` DATETIME(3) NOT NULL,
  `paidAt` DATETIME(3) NULL,
  `status` ENUM('PENDENTE','PARCIAL','PAGO','CANCELADO') NOT NULL DEFAULT 'PENDENTE',
  `paymentMethod` ENUM('DINHEIRO','PIX','DEBITO','CREDITO','VALE') NULL,
  `notes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `deletedAt` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  INDEX `accounts_payable_tenantId_dueDate_idx` (`tenantId`, `dueDate`),
  INDEX `accounts_payable_tenantId_status_idx` (`tenantId`, `status`),
  INDEX `accounts_payable_tenantId_deletedAt_idx` (`tenantId`, `deletedAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT IGNORE INTO `permissions` (`id`, `code`, `description`, `createdAt`)
VALUES
  (UUID(), 'contas_pagar.ver', 'contas_pagar.ver', NOW(3)),
  (UUID(), 'contas_pagar.crud', 'contas_pagar.crud', NOW(3)),
  (UUID(), 'contas_pagar.pagar', 'contas_pagar.pagar', NOW(3));

-- Vincular ao ADMIN e GERENTE (ajuste os IDs conforme seu banco)
INSERT IGNORE INTO `role_permissions` (`id`, `role`, `permissionId`)
SELECT UUID(), 'ADMIN', p.id FROM `permissions` p WHERE p.code LIKE 'contas_pagar.%';

INSERT IGNORE INTO `role_permissions` (`id`, `role`, `permissionId`)
SELECT UUID(), 'GERENTE', p.id FROM `permissions` p WHERE p.code LIKE 'contas_pagar.%';
