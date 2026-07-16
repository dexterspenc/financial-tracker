import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import './PrivacyPolicyPage.css';

const CONTACT_EMAIL = 'johanesabel@gmail.com';

function PrivacyPolicyPage() {
  return (
    <div className="privacy-page">
      <div className="privacy-card">
        <Link to="/register" className="privacy-back">
          <ArrowLeft size={15} /> Kembali
        </Link>

        <h1>Kebijakan Privasi</h1>
        <p className="privacy-updated">Berlaku sejak 16 Juli 2026 — fase uji terbatas</p>

        <p>
          Financial Tracker (nama sementara) sedang dalam <strong>fase uji terbatas</strong>.
          Halaman ini menjelaskan apa adanya: data apa yang kami simpan, di mana, dan hak kamu
          atas data itu.
        </p>

        <h2>Data yang disimpan</h2>
        <ul>
          <li>Email dan kata sandi akun (kata sandi ter-hash, kami tidak bisa membacanya). Jika daftar via Google: email dan nama profil Google.</li>
          <li>Data keuangan yang kamu input sendiri: transaksi (jumlah, kategori, tanggal, catatan), akun &amp; saldo, budget, dan pengaturan aplikasi.</li>
        </ul>
        <p>Kami tidak mengakses rekening bank, e-wallet, atau data finansial dari sumber lain mana pun.</p>

        <h2>Di mana data disimpan</h2>
        <ul>
          <li>Seluruh data tersimpan di <strong>Supabase</strong> (server region Singapura). Artinya ada transfer data ke luar Indonesia.</li>
          <li>Jika kamu memakai fitur <strong>AI Advisor</strong>, isi percakapan beserta ringkasan data keuanganmu dikirim ke <strong>Anthropic</strong> (Amerika Serikat) untuk diproses model AI, sesuai kebijakan privasi Anthropic. Fitur ini opsional — kalau tidak dipakai, tidak ada data yang dikirim ke Anthropic.</li>
        </ul>

        <h2>Yang TIDAK kami lakukan</h2>
        <ul>
          <li>Data kamu tidak dijual dan tidak dibagikan ke pihak ketiga mana pun di luar dua pemroses di atas.</li>
          <li>Tidak ada iklan dan tidak ada tracker analitik pihak ketiga.</li>
          <li>Data antar pengguna terisolasi di level database (row level security) — pengguna lain tidak bisa membaca datamu.</li>
        </ul>

        <h2>Hak kamu</h2>
        <ul>
          <li><strong>Export</strong>: kamu bisa mengunduh seluruh transaksimu sebagai CSV kapan pun dari halaman Analytics.</li>
          <li><strong>Hapus akun</strong>: kirim permintaan ke email di bawah, seluruh data akunmu dihapus permanen maksimal 7 hari kerja. (Hapus akun mandiri dari dalam aplikasi menyusul sebelum rilis publik.)</li>
          <li><strong>Pertanyaan / keberatan</strong>: hubungi kontak di bawah.</li>
        </ul>

        <h2>Kontak</h2>
        <p>
          Johanes — <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>

        <p className="privacy-note">
          Kebijakan ini akan diperbarui (dan diberi tahu ke semua pengguna) sebelum aplikasi
          dirilis ke publik.
        </p>
      </div>
    </div>
  );
}

export default PrivacyPolicyPage;
