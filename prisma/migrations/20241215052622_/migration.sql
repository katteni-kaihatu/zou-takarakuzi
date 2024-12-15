/*
  Warnings:

  - A unique constraint covering the columns `[class,number]` on the table `LotteryTicket` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "LotteryTicket_class_number_key" ON "LotteryTicket"("class", "number");
