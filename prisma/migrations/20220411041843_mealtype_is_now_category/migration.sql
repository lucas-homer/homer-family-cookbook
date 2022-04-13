/*
  Warnings:

  - You are about to drop the `MealType` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_MealTypeToRecipe` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_MealTypeToRecipe" DROP CONSTRAINT "_MealTypeToRecipe_A_fkey";

-- DropForeignKey
ALTER TABLE "_MealTypeToRecipe" DROP CONSTRAINT "_MealTypeToRecipe_B_fkey";

-- DropTable
DROP TABLE "MealType";

-- DropTable
DROP TABLE "_MealTypeToRecipe";

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CategoryToRecipe" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_CategoryToRecipe_AB_unique" ON "_CategoryToRecipe"("A", "B");

-- CreateIndex
CREATE INDEX "_CategoryToRecipe_B_index" ON "_CategoryToRecipe"("B");

-- AddForeignKey
ALTER TABLE "_CategoryToRecipe" ADD FOREIGN KEY ("A") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CategoryToRecipe" ADD FOREIGN KEY ("B") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
