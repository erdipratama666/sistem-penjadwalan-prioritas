-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'PEMILIK', 'PENGELOLA_PRODUKSI');

-- CreateEnum
CREATE TYPE "StatusProduksi" AS ENUM ('MENUNGGU', 'DALAM_PRODUKSI', 'SELESAI');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('MUDAH', 'SEDANG', 'SULIT');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "id_user" VARCHAR(10) NOT NULL,
    "nama" VARCHAR(20) NOT NULL,
    "username" VARCHAR(20) NOT NULL,
    "password" VARCHAR(100) NOT NULL,
    "role" "Role" NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pelanggan" (
    "id" SERIAL NOT NULL,
    "id_pelanggan" VARCHAR(10) NOT NULL,
    "nama" VARCHAR(20) NOT NULL,
    "alamat" VARCHAR(100) NOT NULL,
    "no_hp" VARCHAR(15) NOT NULL,

    CONSTRAINT "Pelanggan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pesanan" (
    "id" SERIAL NOT NULL,
    "id_pesanan" VARCHAR(10) NOT NULL,
    "pelangganId" INTEGER NOT NULL,
    "nama_produk" VARCHAR(30) NOT NULL,
    "tanggal_masuk" TIMESTAMP(3) NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "jumlah" INTEGER NOT NULL,
    "tingkat_kesulitan" "Difficulty" NOT NULL,
    "status" "StatusProduksi" NOT NULL DEFAULT 'MENUNGGU',

    CONSTRAINT "Pesanan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prioritas" (
    "id" SERIAL NOT NULL,
    "id_prioritas" VARCHAR(10) NOT NULL,
    "pesananId" INTEGER NOT NULL,
    "urutan_prioritas" INTEGER NOT NULL,
    "tanggal_penjadwalan" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prioritas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Produksi" (
    "id" SERIAL NOT NULL,
    "id_produksi" VARCHAR(10) NOT NULL,
    "pesananId" INTEGER NOT NULL,
    "status_produksi" "StatusProduksi" NOT NULL DEFAULT 'MENUNGGU',
    "tanggal_mulai" TIMESTAMP(3),
    "tanggal_selesai" TIMESTAMP(3),

    CONSTRAINT "Produksi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_id_user_key" ON "User"("id_user");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Pelanggan_id_pelanggan_key" ON "Pelanggan"("id_pelanggan");

-- CreateIndex
CREATE UNIQUE INDEX "Pesanan_id_pesanan_key" ON "Pesanan"("id_pesanan");

-- CreateIndex
CREATE UNIQUE INDEX "Prioritas_id_prioritas_key" ON "Prioritas"("id_prioritas");

-- CreateIndex
CREATE UNIQUE INDEX "Prioritas_pesananId_key" ON "Prioritas"("pesananId");

-- CreateIndex
CREATE UNIQUE INDEX "Produksi_id_produksi_key" ON "Produksi"("id_produksi");

-- CreateIndex
CREATE UNIQUE INDEX "Produksi_pesananId_key" ON "Produksi"("pesananId");

-- AddForeignKey
ALTER TABLE "Pesanan" ADD CONSTRAINT "Pesanan_pelangganId_fkey" FOREIGN KEY ("pelangganId") REFERENCES "Pelanggan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prioritas" ADD CONSTRAINT "Prioritas_pesananId_fkey" FOREIGN KEY ("pesananId") REFERENCES "Pesanan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Produksi" ADD CONSTRAINT "Produksi_pesananId_fkey" FOREIGN KEY ("pesananId") REFERENCES "Pesanan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
