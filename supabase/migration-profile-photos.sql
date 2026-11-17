-- Simpan foto profil akun peserta tanpa menghapus foto lama saat hanya nama yang diperbarui.
alter table public.external_users add column if not exists avatar_data_url text;
