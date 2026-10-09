import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { setStoredSession } from '../auth/session';
import { AppRoutes } from '../routes';
import { server } from '../test/server';

function renderApp(path: string) {
  setStoredSession({ token: 'test-token', user: {
    id: 'admin-1', name: 'Admin Gampong', email: 'admin@gampongblang.id', role: 'admin', active: true,
  } });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}><AppRoutes /></MemoryRouter></QueryClientProvider>);
}

describe('Nomor Induk Surat in Pengaturan Surat', () => {
  it('opens inside letter settings and shows all ten codes from the API', async () => {
    const user = userEvent.setup();
    renderApp('/settings/letters');
    await user.click(await screen.findByRole('tab', { name: 'Nomor Induk Surat' }));
    const table = await screen.findByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(11);
    const expected = ['400.12.2.1', '400.10.4.4', '400.10.2.2', '400.10.4.3', '400.1.4.3',
      '400.12.2.2', '400.12.3.1', '400.10.2.4', '400.12.2.3', '400.10.2.3'];
    for (const prefix of expected) expect(within(table).getByText(prefix)).toBeInTheDocument();
    expect(within(table).getByText(`400.12.3.1/01/${new Date().getFullYear()}`)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Simpan Perubahan' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Kode setiap kategori mengacu/)).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Tahun agenda' })).toHaveClass('field-select', 'compact');
  });

  it('supports a direct link and changes the displayed year without allocating numbers', async () => {
    const user = userEvent.setup();
    let writes = 0;
    server.use(http.patch('http://localhost:8080/api/settings/letter-counters', () => {
      writes += 1;
      return HttpResponse.json({});
    }));
    renderApp('/settings/letters?tab=numbers');
    await screen.findByRole('table');
    const initialExample = within(screen.getByRole('table')).getAllByRole('row')[1].lastElementChild?.textContent;
    const nextYear = new Date().getFullYear() + 1;
    await user.selectOptions(screen.getByLabelText('Tahun agenda'), String(nextYear));
    await screen.findByText(`400.12.2.1/01/${nextYear}`);
    const previousYear = new Date().getFullYear() - 1;
    await user.selectOptions(screen.getByLabelText('Tahun agenda'), String(previousYear));
    await screen.findByText(`400.12.2.1/01/${previousYear}`);
    await user.selectOptions(screen.getByLabelText('Tahun agenda'), String(new Date().getFullYear()));
    await screen.findByText(initialExample!);
    expect(writes).toBe(0);
  });

  it('shows a retry action if numbering cannot load', async () => {
    server.use(http.get('http://localhost:8080/api/settings/letter-counters', () =>
      HttpResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Unavailable' } }, { status: 500 })));
    renderApp('/settings/letters?tab=numbers');
    expect(await screen.findByRole('alert')).toHaveTextContent('Informasi nomor surat tidak dapat dimuat');
    expect(screen.getByRole('button', { name: 'Coba lagi' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('preserves an unsaved template edit when switching tabs', async () => {
    const user = userEvent.setup();
    renderApp('/settings/letters');
    const name = await screen.findByLabelText('Nama surat');
    await user.clear(name);
    await user.type(name, 'Nama belum disimpan');
    await user.click(screen.getByRole('tab', { name: 'Nomor Induk Surat' }));
    await screen.findByRole('table');
    await user.click(screen.getByRole('tab', { name: 'Template Surat' }));
    expect(await screen.findByLabelText('Nama surat')).toHaveValue('Nama belum disimpan');
    expect(screen.getByRole('button', { name: 'Simpan Perubahan' })).toBeEnabled();
  });
});

describe('editable KOP text', () => {
  it('saves the dedicated KOP address/postal fields and updates the visible preview', async () => {
    const user = userEvent.setup();
    renderApp('/settings/app');
    await screen.findByDisplayValue('Jln. Pendidikan, Lr. Mesjid Al-Istiqamah, Dusun Kuini Gp. Blang');
    const address = await screen.findByLabelText('Alamat pada kop surat');
    await user.clear(address);
    await user.type(address, 'Alamat KOP terbaru');
    const postal = screen.getByLabelText('Kode pos pada kop surat');
    await user.clear(postal);
    await user.type(postal, '23655');
    await user.click(screen.getByRole('button', { name: 'Simpan Perubahan' }));
    expect(await screen.findByText('Alamat : Alamat KOP terbaru')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Simpan Perubahan' })).toBeDisabled());
    expect(screen.getByText('Kode POS. 23655')).toBeInTheDocument();
    expect(screen.getByLabelText('Alamat kantor')).toHaveValue('Jl. Pesisir No. 1');
  });
});
