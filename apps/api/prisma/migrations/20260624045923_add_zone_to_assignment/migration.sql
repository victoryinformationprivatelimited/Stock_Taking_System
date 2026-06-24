-- AlterTable
ALTER TABLE "count_assignments" ADD COLUMN     "zoneId" TEXT;

-- AddForeignKey
ALTER TABLE "count_assignments" ADD CONSTRAINT "count_assignments_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "layout_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
