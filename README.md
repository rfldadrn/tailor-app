This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

Configure PostgreSQL before starting the application:

```bash
copy .env.example .env
```

Set `DATABASE_URL` in `.env` to your PostgreSQL connection string and `AUTH_SECRET` to a random secret (generate one with `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"`), then apply the schema:

```bash
npm install
npm run db:migrate
npm run dev
```

In production, run `npm run db:migrate:deploy` to apply committed migrations. This creates the PostgreSQL schema but does not transfer data from an existing SQLite database.

For an empty development database, set `SEED_PASSWORD` in `.env` to a unique value of at least 12 characters, then run `npm run db:seed` to add demo data. The seed resets transactions for its demo organization; do not run it where those transactions must be kept.

Open [http://localhost:3000](http://localhost:3000) to view the application.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Jalankan di laptop pengguna dengan Docker

Pengguna hanya perlu Docker Desktop; Node.js dan PostgreSQL tidak perlu dipasang di host. Setiap laptop mendapat salinan database awal sendiri, lalu perubahan setelahnya hanya tersimpan di laptop tersebut.

### Buat dan bagikan snapshot awal

Di komputer yang memiliki database lokal, pastikan Docker Desktop berjalan lalu jalankan:

```powershell
powershell -ExecutionPolicy Bypass -File .\docker\export-snapshot.ps1
```

Script membaca `DATABASE_URL` dari `.env` dan membuat `docker/init/10-local-snapshot.sql`. File ini berisi data aplikasi dan akun pengguna, jadi bagikan secara privat. Jangan commit ke Git atau masukkan ke image Docker.

### Jalankan di laptop pengguna

1. Pasang dan jalankan Docker Desktop.
2. Clone repository.
3. Salin file snapshot yang dibagikan secara privat ke `docker/init/10-local-snapshot.sql`.
4. Dari folder proyek, jalankan:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\docker\start.ps1
   ```

Script membuat `.env.docker` dengan rahasia baru untuk instalasi itu, membangun image production, menjalankan migrasi, dan memulai aplikasi. Buka `http://localhost:3000` lalu login menggunakan akun dari snapshot.

PostgreSQL disimpan dalam Docker volume `kasapp-postgres-data`. `docker compose --env-file .env.docker down` menghentikan aplikasi tanpa menghapus datanya. Hindari `docker compose down -v` kecuali memang ingin menghapus database lokal.

Snapshot hanya dimuat saat volume database pertama kali dibuat. Untuk laptop lain, bagikan file SQL secara terpisah; jangan mengunggahnya ke repository atau registry image.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
