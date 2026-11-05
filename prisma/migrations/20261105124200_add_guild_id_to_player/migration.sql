-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Match" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "guildId" TEXT NOT NULL DEFAULT '700943698526994443',
    "mode" TEXT NOT NULL DEFAULT '밸런스',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Match" ("id") SELECT "id" FROM "Match";
DROP TABLE "Match";
ALTER TABLE "new_Match" RENAME TO "Match";

CREATE TABLE "new_Player" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "guildId" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Player" ("guildId", "nickname", "score", "wins", "losses", "createdAt", "updatedAt")
SELECT '700943698526994443', "nickname", "score", "wins", "losses", "createdAt", "updatedAt" FROM "Player";
DROP TABLE "Player";
ALTER TABLE "new_Player" RENAME TO "Player";
CREATE UNIQUE INDEX "Player_guildId_nickname_key" ON "Player"("guildId", "nickname");

CREATE TABLE "new__LoserPlayers" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_LoserPlayers_A_fkey" FOREIGN KEY ("A") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_LoserPlayers_B_fkey" FOREIGN KEY ("B") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new__LoserPlayers" ("A", "B")
SELECT l."A", p."id"
FROM "_LoserPlayers" l
JOIN "Player" p ON l."B" = p."nickname" OR CAST(l."B" AS TEXT) = CAST(p."id" AS TEXT);
DROP TABLE "_LoserPlayers";
ALTER TABLE "new__LoserPlayers" RENAME TO "_LoserPlayers";
CREATE UNIQUE INDEX "_LoserPlayers_AB_unique" ON "_LoserPlayers"("A", "B");
CREATE INDEX "_LoserPlayers_B_index" ON "_LoserPlayers"("B");

CREATE TABLE "new__WinnerPlayers" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_WinnerPlayers_A_fkey" FOREIGN KEY ("A") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_WinnerPlayers_B_fkey" FOREIGN KEY ("B") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new__WinnerPlayers" ("A", "B")
SELECT w."A", p."id"
FROM "_WinnerPlayers" w
JOIN "Player" p ON w."B" = p."nickname" OR CAST(w."B" AS TEXT) = CAST(p."id" AS TEXT);
DROP TABLE "_WinnerPlayers";
ALTER TABLE "new__WinnerPlayers" RENAME TO "_WinnerPlayers";
CREATE UNIQUE INDEX "_WinnerPlayers_AB_unique" ON "_WinnerPlayers"("A", "B");
CREATE INDEX "_WinnerPlayers_B_index" ON "_WinnerPlayers"("B");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
