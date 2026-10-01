Update the existing Admin dashboard prototype by adding the "Data Pesanan" page.

Do not change the existing Login page, authentication flow, visual identity, sidebar style, typography, colors, or overall dashboard layout.

The existing Admin authentication must remain:

Username:
admin

Password:
admin123

Role:
Admin

User Flow

The Admin has successfully logged in.

After authentication, the Admin is currently on:

Data Pelanggan

The Admin then clicks the "Data Pesanan" menu in the sidebar.

Required flow:

Login
↓
Authentication successful
↓
Data Pelanggan
↓
Admin clicks "Data Pesanan"
↓
Data Pesanan

When the Admin clicks the "Data Pesanan" sidebar menu, navigate directly to the Data Pesanan page.

Do not display a blank page.

Do not open the Data Pesanan page as an external page.

Keep the navigation within the same web application.

Admin Sidebar

Keep the existing Admin sidebar design.

Menu items:

Data Pelanggan
Data Pesanan
Logout

The currently active menu must be:

Data Pesanan

Highlight "Data Pesanan" using the same active-state style that is already used for "Data Pelanggan".

The Admin must not see:

Dashboard
Penjadwalan Prioritas
Prioritas Produksi
Mengelola Produksi
Laporan
Manajemen Pengguna
Pengaturan
Page Header

Main page title:

Data Pesanan

Subtitle:

Kelola data pesanan pelanggan Zamal Collection secara terstruktur dan mudah.

Keep the same header style as the existing Data Pelanggan page.

Display on the right side:

Search
Notification icon
Admin profile/avatar
"Admin"
Main Content

Create a clean and professional order management section.

At the top of the content area display:

Heading:

Data Pesanan

Description:

Menampilkan dan mengelola data pesanan yang diterima Zamal Collection.

Primary action button:

Tambah Pesanan

Use the same blue button style as the "+ Tambah Pelanggan" button.

Order Table

Create a responsive white table card.

The table must contain the following columns:

No.

ID Pesanan

Pelanggan

Tanggal Masuk

Deadline

Jumlah Pesanan

Tingkat Kesulitan

Status

Aksi

Use realistic Indonesian sample data.

Example:

ORD001 | Budi Santoso | 01/08/2026 | 10/08/2026 | 10 | Mudah | Menunggu

ORD002 | Sinta Amelia | 02/08/2026 | 12/08/2026 | 25 | Sedang | Menunggu

ORD003 | Andi Pratama | 03/08/2026 | 08/08/2026 | 15 | Sulit | Dalam Produksi

The "Aksi" column contains:

Edit
Hapus

Use simple and consistent icons.

Order Data Fields

When Admin adds or edits an order, use the following fields:

Pelanggan

Tanggal Masuk

Deadline

Jumlah Pesanan

Tingkat Kesulitan

Status

The customer field should use a dropdown containing existing customers from the Data Pelanggan data.

Example:

Budi Santoso
Sinta Amelia
Andi Pratama

For Tingkat Kesulitan, use a dropdown:

Mudah
Sedang
Sulit

For Status, use:

Menunggu
Dalam Produksi
Selesai

Tambah Pesanan

When Admin clicks:

Tambah Pesanan

Display a modal or form.

Form fields:

Pelanggan
Tanggal Masuk
Deadline
Jumlah Pesanan
Tingkat Kesulitan
Status

Buttons:

Simpan
Batal

Validation:

If Pelanggan is empty:

"Pelanggan wajib dipilih."

If Tanggal Masuk is empty:

"Tanggal masuk wajib diisi."

If Deadline is empty:

"Deadline wajib diisi."

If Jumlah Pesanan is empty:

"Jumlah pesanan wajib diisi."

If Tingkat Kesulitan is empty:

"Tingkat kesulitan wajib dipilih."

If the data is valid:

Save the order.

Display:

"Data pesanan berhasil disimpan."

Then refresh the Data Pesanan table.

Edit Pesanan

When Admin clicks:

Edit

Open the order form with the existing order data already filled.

The Admin can modify:

Pelanggan
Tanggal Masuk
Deadline
Jumlah Pesanan
Tingkat Kesulitan
Status

After successful update display:

"Data pesanan berhasil diperbarui."

Then refresh the order table.

Hapus Pesanan

When Admin clicks:

Hapus

Display a confirmation dialog:

"Apakah Anda yakin ingin menghapus data pesanan ini?"

Buttons:

Hapus
Batal

If Admin confirms:

Delete the selected order.

Display:

"Data pesanan berhasil dihapus."

Then refresh the order table.

Search

Add a search field with placeholder:

"Cari ID pesanan atau nama pelanggan..."

The Admin can search by:

ID Pesanan
Nama Pelanggan

Display matching results dynamically.

If no order is found:

"Data pesanan tidak ditemukan."

Empty State

If there are no orders:

"Belum ada data pesanan."

Display:

Tambah Pesanan
Data Relationship

The Data Pesanan page must use the customer data from Data Pelanggan.

Each order must be associated with one existing customer.

Example:

Pelanggan:
PLG001 — Budi Santoso

Order:
ORD001 — PLG001 — Budi Santoso

Do not require the Admin to manually type a customer ID when creating an order. The customer should be selected from the existing customer list.

Navigation

When Admin clicks:

Data Pelanggan
→ Navigate to Data Pelanggan

Data Pesanan
→ Navigate to Data Pesanan

Logout
→ Clear Admin authentication state
→ Navigate to Login

The Data Pesanan page must remain accessible only to the Admin role.

Important Role-Based Access Rules

Admin can access:

Data Pelanggan
Data Pesanan
Logout

Admin cannot access:

Dashboard Pemilik
Penjadwalan Prioritas
Hasil Prioritas
Laporan
Prioritas Produksi
Mengelola Produksi

Do not create additional roles.

Do not change the existing authentication credentials.

Design Consistency

The Data Pesanan page must use the same design system as the existing Data Pelanggan page:

Same sidebar
Same header
Same typography
Same colors
Same spacing
Same button style
Same table style
Same card style
Same border radius
Same icon style
Same light theme

The final Admin flow must be:

Login
↓
Authentication successful
↓
Data Pelanggan
↓
Click "Data Pesanan"
↓
Data Pesanan
↓
View / Add / Edit / Delete Order

Make the prototype functional and ensure clicking "Data Pesanan" in the sidebar actually displays the Data Pesanan page instead of a blank page.