/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `guildId` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `mode` on the `Match` table. All the data in the column will be lost.
  - The primary key for the `Player` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `discordId` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `Player` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Match" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Match" ("id") SELECT "id" FROM "Match";
DROP TABLE "Match";
ALTER TABLE "new_Match" RENAME TO "Match";
CREATE TABLE "new_Player" (
    "nickname" TEXT NOT NULL PRIMARY KEY,
    "score" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Player" ("createdAt", "losses", "nickname", "score", "updatedAt", "wins") SELECT "createdAt", "losses", "nickname", "score", "updatedAt", "wins" FROM "Player";
DROP TABLE "Player";
ALTER TABLE "new_Player" RENAME TO "Player";
CREATE TABLE "new__LoserPlayers" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_LoserPlayers_A_fkey" FOREIGN KEY ("A") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_LoserPlayers_B_fkey" FOREIGN KEY ("B") REFERENCES "Player" ("nickname") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new__LoserPlayers" ("A", "B") SELECT "A", "B" FROM "_LoserPlayers";
DROP TABLE "_LoserPlayers";
ALTER TABLE "new__LoserPlayers" RENAME TO "_LoserPlayers";
CREATE UNIQUE INDEX "_LoserPlayers_AB_unique" ON "_LoserPlayers"("A", "B");
CREATE INDEX "_LoserPlayers_B_index" ON "_LoserPlayers"("B");
CREATE TABLE "new__WinnerPlayers" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_WinnerPlayers_A_fkey" FOREIGN KEY ("A") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_WinnerPlayers_B_fkey" FOREIGN KEY ("B") REFERENCES "Player" ("nickname") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new__WinnerPlayers" ("A", "B") SELECT "A", "B" FROM "_WinnerPlayers";
DROP TABLE "_WinnerPlayers";
ALTER TABLE "new__WinnerPlayers" RENAME TO "_WinnerPlayers";
CREATE UNIQUE INDEX "_WinnerPlayers_AB_unique" ON "_WinnerPlayers"("A", "B");
CREATE INDEX "_WinnerPlayers_B_index" ON "_WinnerPlayers"("B");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
