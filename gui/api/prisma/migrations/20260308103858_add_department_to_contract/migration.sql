-- AlterTable
ALTER TABLE "contracts" ADD COLUMN     "departmentId" TEXT;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
