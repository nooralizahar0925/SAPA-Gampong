import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { setStoredSession } from '../auth/session';
import { AppRoutes } from '../routes';
import { contentState } from '../test/server';

function renderApp(initialEntries: string[]) {
  setStoredSession({
    token: 'test-token',
    user: {
      id: 'admin-1',
      name: 'Admin Gampong',
      email: 'admin@gampongblang.id',
      role: 'admin',
    },
  });

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <AppRoutes />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** The hub commits the active tab through one header button. */
function saveButton() {
  return screen.getByRole('button', { name: /simpan perubahan/i });
}

describe('content hub shell', () => {
  it('renders the six content tabs and marks the routed one active', async () => {
    renderApp(['/content/profile']);

    await screen.findByRole('heading', { name: /manajemen konten/i });

    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      'Banner',
      'Profil & Visi Misi',
      'Perangkat',
      'Masjid & Sholat',
      'Demografi',
      'Potensi Desa',
    ]);

    expect(screen.getByRole('tab', { name: 'Profil & Visi Misi' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('switches tabs on click', async () => {
    const user = userEvent.setup();
    renderApp(['/content/banners']);

    await user.click(screen.getByRole('tab', { name: 'Demografi' }));

    await waitFor(() =>
      expect(screen.getByRole('tab', { name: 'Demografi' })).toHaveAttribute(
        'aria-selected',
        'true',
      ),
    );
  });
});

describe('demographics tab', () => {
  // This is the case named in PLAN.md Task 17 step 1.
  it('saves an edited demographics number via PATCH /content/demographics', async () => {
    const user = userEvent.setup();
    renderApp(['/content/demographics']);

    const input = await screen.findByLabelText(/^Total Penduduk$/i);
    await waitFor(() => expect(input).toHaveValue(1240));

    await user.clear(input);
    await user.type(input, '1301');
    await user.click(saveButton());

    await waitFor(() => {
      const block = contentState.demographics.find((d) => d.key === 'total_penduduk');
      expect((block?.data as { value: number }).value).toBe(1301);
    });
  });

  it('hides a block from the citizen app by toggling it off', async () => {
    const user = userEvent.setup();
    renderApp(['/content/demographics']);

    const toggle = await screen.findByRole('button', {
      name: /tampilkan total penduduk di aplikasi warga/i,
    });
    expect(toggle).toHaveAttribute('aria-pressed', 'true');

    await user.click(toggle);
    await user.click(saveButton());

    await waitFor(() => {
      const block = contentState.demographics.find((d) => d.key === 'total_penduduk');
      expect(block?.visible).toBe(false);
    });
  });
});

describe('profile tab', () => {
  it('saves identity fields, including the ones added for the mock', async () => {
    const user = userEvent.setup();
    renderApp(['/content/profile']);

    const phone = await screen.findByLabelText(/kontak kantor desa/i);
    await waitFor(() => expect(phone).toHaveValue('0651-123456'));

    const kemukiman = screen.getByLabelText(/kemukiman/i);
    expect(kemukiman).toHaveValue('Calang');

    await user.clear(phone);
    await user.type(phone, '0651-999888');
    await user.clear(kemukiman);
    await user.type(kemukiman, 'Krueng Sabee');
    await user.click(saveButton());

    await waitFor(() => {
      expect(contentState.profile.contact_phone).toBe('0651-999888');
      expect(contentState.profile.kemukiman).toBe('Krueng Sabee');
    });
  });

  it('saves the vision and mission alongside the profile', async () => {
    const user = userEvent.setup();
    renderApp(['/content/profile']);

    const vision = await screen.findByLabelText(/^visi$/i);
    await waitFor(() => expect(vision).toHaveValue('Gampong mandiri dan sejahtera.'));

    await user.clear(vision);
    await user.type(vision, 'Gampong maju dan islami.');
    await user.click(saveButton());

    await waitFor(() => expect(contentState.visionMission.vision).toBe('Gampong maju dan islami.'));
  });

  it('shows the demographic block summary in the aside', async () => {
    renderApp(['/content/profile']);

    await screen.findByRole('heading', { name: /blok statistik demografi/i });
    expect(await screen.findByText('Total Penduduk')).toBeInTheDocument();
    expect(screen.getByText('Jenis Kelamin')).toBeInTheDocument();
  });
});

describe('banner tab', () => {
  it('lists banners and persists a reorder', async () => {
    const user = userEvent.setup();
    renderApp(['/content/banners']);

    await waitFor(() => expect(screen.getAllByTestId('banner-row')).toHaveLength(2));

    const rows = screen.getAllByTestId('banner-row');
    await user.click(within(rows[1]).getByRole('button', { name: /naikkan/i }));

    await waitFor(() => {
      expect(contentState.banners.map((b) => b.id)).toEqual(['banner-2', 'banner-1']);
    });
  });

  it('removes a banner', async () => {
    const user = userEvent.setup();
    renderApp(['/content/banners']);

    await waitFor(() => expect(screen.getAllByTestId('banner-row')).toHaveLength(2));

    const rows = screen.getAllByTestId('banner-row');
    await user.click(within(rows[0]).getByRole('button', { name: /hapus/i }));

    await waitFor(() => expect(contentState.banners).toHaveLength(1));
  });
});

describe('perangkat tab', () => {
  it('adds a new official', async () => {
    const user = userEvent.setup();
    renderApp(['/content/officials']);

    await screen.findByText(/Sofian/);

    await user.type(screen.getByLabelText(/nama perangkat/i), 'Nurul Huda');
    await user.type(screen.getByLabelText(/jabatan/i), 'Sekretaris');
    await user.click(screen.getByRole('button', { name: /tambah perangkat/i }));

    await waitFor(() => expect(contentState.officials).toHaveLength(2));
    expect(contentState.officials[1].name).toBe('Nurul Huda');
  });
});

describe('potensi desa tab', () => {
  it('adds a village strength', async () => {
    const user = userEvent.setup();
    renderApp(['/content/strengths']);

    await screen.findByText(/Wisata Pantai/);

    await user.type(screen.getByLabelText(/judul potensi/i), 'Kopi Gampong');
    await user.type(screen.getByLabelText(/deskripsi potensi/i), 'Kopi arabika khas gampong.');
    await user.click(screen.getByRole('button', { name: /tambah potensi/i }));

    await waitFor(() => expect(contentState.strengths).toHaveLength(2));
  });
});

describe('masjid & sholat tab', () => {
  it('saves prayer coordinates through the header save action', async () => {
    const user = userEvent.setup();
    renderApp(['/content/mosques']);

    const lat = await screen.findByLabelText(/^latitude$/i);
    await waitFor(() => expect(lat).toHaveValue('4.7'));

    await user.clear(lat);
    await user.type(lat, '4.85');
    await user.click(saveButton());

    await waitFor(() => expect(contentState.prayerConfig.lat).toBeCloseTo(4.85));
  });

  it('adds a mosque', async () => {
    const user = userEvent.setup();
    renderApp(['/content/mosques']);

    await screen.findByText(/Masjid Baiturrahim/);

    await user.type(screen.getByLabelText(/nama masjid/i), 'Meunasah Blang');
    await user.type(screen.getByLabelText(/alamat masjid/i), 'Dusun Tengah');
    await user.click(screen.getByRole('button', { name: /tambah masjid/i }));

    await waitFor(() => expect(contentState.mosques).toHaveLength(2));
  });
});

describe('app settings page', () => {
  it('saves letterhead and signatory blocks', async () => {
    const user = userEvent.setup();
    renderApp(['/settings/app']);

    const keuchik = await screen.findByLabelText(/nama keuchik/i);
    await waitFor(() => expect(keuchik).toHaveValue('SOFIAN'));

    await user.clear(keuchik);
    await user.type(keuchik, 'MUHAMMAD YUSUF');
    await user.click(screen.getByRole('button', { name: /simpan pengaturan/i }));

    await waitFor(() => expect(contentState.appSettings.keuchik_name).toBe('MUHAMMAD YUSUF'));
  });

  it('updates a letter number counter', async () => {
    const user = userEvent.setup();
    renderApp(['/settings/app']);

    const counter = await screen.findByLabelText(/nomor terakhir L1/i);
    await waitFor(() => expect(counter).toHaveValue(12));

    await user.clear(counter);
    await user.type(counter, '40');
    await user.click(screen.getByRole('button', { name: /simpan nomor L1/i }));

    await waitFor(() => {
      const l1 = contentState.letterCounters.find((c) => c.letter_type === 'L1');
      expect(l1?.last_number).toBe(40);
    });
  });
});
