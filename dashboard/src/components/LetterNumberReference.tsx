import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getLetterCountersRequest, listLetterTemplatesRequest } from '../api/client';

export function LetterNumberReference() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const counters = useQuery({
    queryKey: ['settings', 'letter-counters', year],
    queryFn: () => getLetterCountersRequest(year),
  });
  const templates = useQuery({
    queryKey: ['settings', 'letter-templates'],
    queryFn: listLetterTemplatesRequest,
  });
  const names = new Map(templates.data?.map((template) => [template.code, template.name]));
  const loading = counters.isPending || templates.isPending;
  const failed = counters.isError || templates.isError;

  return (
    <section className="detail-card letter-number-reference" aria-label="Referensi nomor induk surat">
      <div className="detail-card-head">
        <div>
          <h2>Nomor Induk Surat</h2>
        </div>
        <div className="card-head-controls">
          <label className="inline-field">
            <span>Tahun agenda</span>
            <select className="field-select compact" value={year} onChange={(event) => setYear(Number(event.target.value))}>
              {[currentYear - 1, currentYear, currentYear + 1].map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className="letter-number-guide">
        <b>Format: Nomor Induk / Nomor Agenda / Tahun</b>
        <p>Nomor agenda berurutan untuk setiap jenis surat dan tahun: 01, 02, 03, …, 99, 100.
          Tahun baru memiliki urutan tersendiri. Nomor surat yang sudah diterbitkan tidak diubah.</p>
        <p>Contoh nomor berikutnya dihitung dari agenda terakhir. Melihat halaman ini tidak mengambil
          atau memesan nomor; nomor sebenarnya ditetapkan saat surat diproses.</p>
      </div>
      {loading ? <p className="loading-state" role="status">Memuat nomor induk surat...</p> : null}
      {failed ? (
        <div className="error-box" role="alert">
          <p>Informasi nomor surat tidak dapat dimuat.</p>
          <button className="secondary-button" type="button" onClick={() => {
            void counters.refetch();
            void templates.refetch();
          }}>Coba lagi</button>
        </div>
      ) : null}
      {!loading && !failed && counters.data ? (
        <div className="letter-number-table-wrap">
          <table className="letter-number-table">
            <caption className="sr-only">Nomor induk dan agenda surat tahun {year}</caption>
            <thead><tr>
              <th scope="col">Kode</th><th scope="col">Kategori Surat</th>
              <th scope="col">Nomor Induk</th><th scope="col">Agenda Terakhir</th>
              <th scope="col">Contoh Nomor Berikutnya</th>
            </tr></thead>
            <tbody>{counters.data.counters.map((counter) => (
              <tr key={counter.letter_type}>
                <td><span className="pill">{counter.letter_type}</span></td>
                <th scope="row">{names.get(counter.letter_type) ?? counter.letter_type}</th>
                <td><code>{counter.nomor_induk}</code></td>
                <td>{counter.last_number === 0 ? 'Belum ada' : String(counter.last_number).padStart(2, '0')}</td>
                <td><code>{counter.next_number}</code></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
