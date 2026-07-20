import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { setConfirmHandlerForTests } from '../lib/alerts';
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

/**
 * Records the confirmation prompts raised during a test and answers them. SweetAlert2
 * cannot be driven under jsdom (it reports isVisible() === false because jsdom has no
 * computed styles), so the dialog is stubbed at the seam instead.
 */
function stubConfirm(answer: boolean) {
  const titles: string[] = [];
  setConfirmHandlerForTests((title) => {
    titles.push(title);
    return answer;
  });
  return titles;
}

afterEach(() => setConfirmHandlerForTests(null));

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

    const input = await screen.findByLabelText(/^total penduduk$/i);
    await waitFor(() => expect(input).toHaveValue(1240));

    await user.clear(input);
    await user.type(input, '1301');
    await user.click(saveButton());

    await waitFor(() => {
      const block = contentState.demographics.find((d) => d.key === 'total_penduduk');
      expect((block?.data as { value: number }).value).toBe(1301);
    });
  });

  // Jumlah Penduduk and Jenis Kelamin keep a fixed shape the citizen app depends on,
  // so their labels are not editable and no add/remove controls are offered.
  it('renders the fixed blocks as plain inputs without row controls', async () => {
    renderApp(['/content/demographics']);

    await screen.findByLabelText(/^total penduduk$/i);
    expect(
      screen.queryByRole('button', { name: /tambah baris pada total penduduk/i }),
    ).not.toBeInTheDocument();
  });

  it('adds a row to an open-ended block', async () => {
    const user = userEvent.setup();
    renderApp(['/content/demographics']);

    await screen.findByRole('heading', { name: /tingkat pendidikan/i });
    await user.click(
      screen.getByRole('button', { name: /tambah baris pada tingkat pendidikan/i }),
    );

    await user.type(
      await screen.findByLabelText(/^tingkat pendidikan · label 3$/i),
      'Pascasarjana',
    );
    const amount = screen.getByLabelText(/^tingkat pendidikan · jumlah 3$/i);
    await user.clear(amount);
    await user.type(amount, '18');
    await user.click(saveButton());

    await waitFor(() => {
      const block = contentState.demographics.find((d) => d.key === 'tingkat_pendidikan');
      expect((block?.data as Record<string, number>).pascasarjana).toBe(18);
    });
  });

  it('renames a row label in an open-ended block', async () => {
    const user = userEvent.setup();
    renderApp(['/content/demographics']);

    const label = await screen.findByLabelText(/^tingkat pendidikan · label 1$/i);
    await waitFor(() => expect(label).toHaveValue('Sd'));

    await user.clear(label);
    await user.type(label, 'SD Sederajat');
    await user.click(saveButton());

    await waitFor(() => {
      const block = contentState.demographics.find((d) => d.key === 'tingkat_pendidikan');
      expect(Object.keys(block?.data as object)).toContain('sd_sederajat');
    });
  });

  it('removes a row from an open-ended block', async () => {
    const user = userEvent.setup();
    renderApp(['/content/demographics']);

    await screen.findByRole('heading', { name: /tingkat pendidikan/i });
    await user.click(screen.getByRole('button', { name: /^hapus sd$/i }));
    await user.click(saveButton());

    await waitFor(() => {
      const block = contentState.demographics.find((d) => d.key === 'tingkat_pendidikan');
      expect(Object.keys(block?.data as object)).not.toContain('sd');
    });
  });

  // Visibility is owned by the Profil tab, so no toggles appear here.
  it('does not offer visibility toggles', async () => {
    renderApp(['/content/demographics']);

    await screen.findByLabelText(/^total penduduk$/i);
    expect(
      screen.queryByRole('button', { name: /tampilkan .* di aplikasi warga/i }),
    ).not.toBeInTheDocument();
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

  it('reorders misi and saves the new order', async () => {
    const user = userEvent.setup();
    renderApp(['/content/profile']);

    // Fixture ships one mission; add a second so there is an order to change.
    await screen.findByLabelText(/^misi 1$/i);
    await user.click(screen.getByRole('button', { name: /tambah misi/i }));
    await user.type(await screen.findByLabelText(/^misi 2$/i), 'Memperkuat ekonomi warga');

    await user.click(screen.getByRole('button', { name: /naikkan misi 2/i }));
    await user.click(saveButton());

    await waitFor(() =>
      expect(contentState.visionMission.missions[0]).toBe('Memperkuat ekonomi warga'),
    );
  });

  it('shows the demographic block summary in the aside', async () => {
    renderApp(['/content/profile']);

    await screen.findByRole('heading', { name: /blok statistik demografi/i });
    expect(await screen.findByText('Total Penduduk')).toBeInTheDocument();
    expect(screen.getByText('Jenis Kelamin')).toBeInTheDocument();
  });

  // The aside toggles used to be decorative spans, which read as broken controls.
  it('toggles a demographic block straight from the aside', async () => {
    const user = userEvent.setup();
    renderApp(['/content/profile']);

    const toggle = await screen.findByRole('button', {
      name: /tampilkan total penduduk di aplikasi warga/i,
    });
    expect(toggle).toHaveAttribute('aria-pressed', 'true');

    await user.click(toggle);

    await waitFor(() => {
      const block = contentState.demographics.find((d) => d.key === 'total_penduduk');
      expect(block?.visible).toBe(false);
    });
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

  it('removes a banner after the admin confirms', async () => {
    const user = userEvent.setup();
    const prompts = stubConfirm(true);
    renderApp(['/content/banners']);

    await waitFor(() => expect(screen.getAllByTestId('banner-row')).toHaveLength(2));

    const rows = screen.getAllByTestId('banner-row');
    await user.click(within(rows[0]).getByRole('button', { name: /hapus/i }));

    await waitFor(() => expect(contentState.banners).toHaveLength(1));
    expect(prompts).toEqual(['Hapus banner 1?']);
  });

  it('keeps the banner when the admin cancels', async () => {
    const user = userEvent.setup();
    stubConfirm(false);
    renderApp(['/content/banners']);

    await waitFor(() => expect(screen.getAllByTestId('banner-row')).toHaveLength(2));

    const rows = screen.getAllByTestId('banner-row');
    await user.click(within(rows[0]).getByRole('button', { name: /hapus/i }));

    await waitFor(() => expect(screen.getAllByTestId('banner-row')).toHaveLength(2));
    expect(contentState.banners).toHaveLength(2);
  });

  it('uploads a new banner', async () => {
    const user = userEvent.setup();
    renderApp(['/content/banners']);

    await waitFor(() => expect(screen.getAllByTestId('banner-row')).toHaveLength(2));

    const file = new File(['x'], 'banner.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText(/unggah banner/i, { selector: 'input' }), file);

    await waitFor(() => expect(contentState.banners).toHaveLength(3));
  });
});

describe('perangkat tab', () => {
  it('lists officials in a table, with initials when there is no photo', async () => {
    renderApp(['/content/officials']);

    const table = await screen.findByRole('table');
    expect(within(table).getByText('Sofian')).toBeInTheDocument();
    expect(within(table).getByText('Keuchik')).toBeInTheDocument();
    // Sofian has no photo in the fixture, so the avatar falls back to initials.
    expect(within(table).getByText('S')).toBeInTheDocument();
  });

  it('adds a new official through the modal form', async () => {
    const user = userEvent.setup();
    renderApp(['/content/officials']);

    await screen.findByText(/Sofian/);
    await user.click(screen.getByRole('button', { name: /tambah perangkat/i }));

    await user.type(await screen.findByLabelText(/nama perangkat/i), 'Nurul Huda');
    await user.type(screen.getByLabelText(/jabatan/i), 'Sekretaris');
    await user.click(screen.getByRole('button', { name: /^simpan$/i }));

    await waitFor(() => expect(contentState.officials).toHaveLength(2));
    expect(contentState.officials[1].name).toBe('Nurul Huda');
  });

  it('edits an existing official', async () => {
    const user = userEvent.setup();
    renderApp(['/content/officials']);

    await screen.findByText(/Sofian/);
    await user.click(screen.getByRole('button', { name: /ubah sofian/i }));

    const roleInput = await screen.findByLabelText(/jabatan/i);
    await user.clear(roleInput);
    await user.type(roleInput, 'Keuchik Gampong Blang');
    await user.click(screen.getByRole('button', { name: /^simpan$/i }));

    await waitFor(() => expect(contentState.officials[0].role).toBe('Keuchik Gampong Blang'));
  });

  it('confirms before deleting an official', async () => {
    const user = userEvent.setup();
    const prompts = stubConfirm(true);
    renderApp(['/content/officials']);

    await screen.findByText(/Sofian/);
    await user.click(screen.getByRole('button', { name: /hapus sofian/i }));

    await waitFor(() => expect(contentState.officials).toHaveLength(0));
    expect(prompts).toEqual(['Hapus Sofian?']);
  });
});

describe('potensi desa tab', () => {
  it('lists potensi in a table', async () => {
    renderApp(['/content/strengths']);

    const table = await screen.findByRole('table');
    expect(within(table).getByText('Wisata Pantai')).toBeInTheDocument();
    expect(within(table).getByText(/pantai bersih sepanjang tahun/i)).toBeInTheDocument();
  });

  it('adds a village strength through the modal form', async () => {
    const user = userEvent.setup();
    renderApp(['/content/strengths']);

    await screen.findByText(/Wisata Pantai/);
    await user.click(screen.getByRole('button', { name: /tambah potensi/i }));

    await user.type(await screen.findByLabelText(/judul potensi/i), 'Kopi Gampong');
    await user.type(screen.getByLabelText(/deskripsi potensi/i), 'Kopi arabika khas gampong.');
    await user.click(screen.getByRole('button', { name: /^simpan$/i }));

    await waitFor(() => expect(contentState.strengths).toHaveLength(2));
  });

  it('edits an existing potensi', async () => {
    const user = userEvent.setup();
    renderApp(['/content/strengths']);

    await screen.findByText(/Wisata Pantai/);
    await user.click(screen.getByRole('button', { name: /ubah wisata pantai/i }));

    const title = await screen.findByLabelText(/judul potensi/i);
    await user.clear(title);
    await user.type(title, 'Wisata Pantai Blang');
    await user.click(screen.getByRole('button', { name: /^simpan$/i }));

    await waitFor(() => expect(contentState.strengths[0].title).toBe('Wisata Pantai Blang'));
  });

  it('confirms before deleting a potensi', async () => {
    const user = userEvent.setup();
    const prompts = stubConfirm(true);
    renderApp(['/content/strengths']);

    await screen.findByText(/Wisata Pantai/);
    await user.click(screen.getByRole('button', { name: /hapus wisata pantai/i }));

    await waitFor(() => expect(contentState.strengths).toHaveLength(0));
    expect(prompts).toEqual(['Hapus Wisata Pantai?']);
  });
});

describe('masjid & sholat tab', () => {
  it('saves village coordinates through the header save action', async () => {
    const user = userEvent.setup();
    renderApp(['/content/mosques']);

    const lat = await screen.findByLabelText(/latitude gampong/i);
    await waitFor(() => expect(lat).toHaveValue('4.7'));

    await user.clear(lat);
    await user.type(lat, '4.85');
    await user.click(saveButton());

    await waitFor(() => expect(contentState.prayerConfig.lat).toBeCloseTo(4.85));
  });

  // The mobile app falls back to a fixed schedule when offline; these values drive it
  // instead of the constants that were hardcoded in the Flutter app.
  it('saves the offline fallback schedule', async () => {
    const user = userEvent.setup();
    renderApp(['/content/mosques']);

    const subuh = await screen.findByLabelText(/^subuh$/i);
    await waitFor(() => expect(subuh).toHaveValue('04:58'));

    await user.clear(subuh);
    await user.type(subuh, '05:02');
    await user.click(saveButton());

    await waitFor(() => expect(contentState.prayerConfig.fallback_times.subuh).toBe('05:02'));
  });

  it('exposes the Aladhan angles the mobile app sends when online', async () => {
    renderApp(['/content/mosques']);

    await waitFor(() => expect(screen.getByLabelText(/sudut subuh/i)).toHaveValue(20));
    expect(screen.getByLabelText(/sudut isya/i)).toHaveValue(18);
    expect(screen.getByLabelText(/mazhab ashar/i)).toHaveValue('0');
  });

  it('adds a mosque through the modal form', async () => {
    const user = userEvent.setup();
    renderApp(['/content/mosques']);

    await screen.findByText(/Masjid Baiturrahim/);
    await user.click(screen.getByRole('button', { name: /tambah masjid/i }));

    await user.type(await screen.findByLabelText(/nama masjid/i), 'Meunasah Blang');
    await user.type(screen.getByLabelText(/alamat masjid/i), 'Dusun Tengah');
    await user.click(screen.getByRole('button', { name: /^simpan$/i }));

    await waitFor(() => expect(contentState.mosques).toHaveLength(2));
  });
});

describe('settings navigation', () => {
  // Regression: renaming the sidebar entry once left the email provider page
  // reachable only by typing its URL.
  it('reaches the email provider page from the settings tabs', async () => {
    const user = userEvent.setup();
    renderApp(['/settings/app']);

    await screen.findByRole('heading', { name: /^pengaturan$/i });
    await user.click(screen.getByRole('tab', { name: /email provider/i }));

    expect(
      await screen.findByRole('heading', { name: /ringkasan provider aktif/i }),
    ).toBeInTheDocument();
  });

  it('gets back to app settings from the email provider tab', async () => {
    const user = userEvent.setup();
    renderApp(['/settings/email-provider']);

    await screen.findByRole('tab', { name: /pengaturan aplikasi/i });
    await user.click(screen.getByRole('tab', { name: /pengaturan aplikasi/i }));

    expect(await screen.findByLabelText(/nama keuchik/i)).toBeInTheDocument();
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
    await user.click(saveButton());

    await waitFor(() => expect(contentState.appSettings.keuchik_name).toBe('MUHAMMAD YUSUF'));
  });

  it('updates letter number counters in one save', async () => {
    const user = userEvent.setup();
    renderApp(['/settings/app']);

    const counter = await screen.findByLabelText(/^nomor terakhir L1$/i);
    await waitFor(() => expect(counter).toHaveValue(12));

    await user.clear(counter);
    await user.type(counter, '40');
    await user.click(screen.getByRole('button', { name: /simpan nomor/i }));

    await waitFor(() => {
      const l1 = contentState.letterCounters.find((c) => c.letter_type === 'L1');
      expect(l1?.last_number).toBe(40);
    });
  });

  it('loads a different year of counters when the year changes', async () => {
    const user = userEvent.setup();
    renderApp(['/settings/app']);

    const counter = await screen.findByLabelText(/^nomor terakhir L1$/i);
    await waitFor(() => expect(counter).toHaveValue(12));

    await user.selectOptions(screen.getByLabelText(/tahun penomoran surat/i), '2025');

    // 2025 has no usage in the fixture, so the same row reloads at zero.
    await waitFor(() =>
      expect(screen.getByLabelText(/^nomor terakhir L1$/i)).toHaveValue(0),
    );
    expect(screen.getByText(/menampilkan tahun 2025/i)).toBeInTheDocument();
  });

  it('names each letter type instead of showing a bare code', async () => {
    renderApp(['/settings/app']);

    const table = await screen.findByRole('table');
    expect(within(table).getByText('L1')).toBeInTheDocument();
    expect(within(table).getByText('Surat Keterangan Berdomisili')).toBeInTheDocument();
  });

  it('previews the letterhead as the admin types', async () => {
    const user = userEvent.setup();
    renderApp(['/settings/app']);

    const line1 = await screen.findByLabelText(/^baris 1$/i);
    await waitFor(() => expect(line1).toHaveValue('PEMERINTAH KABUPATEN ACEH JAYA'));

    await user.clear(line1);
    await user.type(line1, 'PEMERINTAH ACEH');

    const preview = screen.getByRole('heading', { name: /pratinjau kop surat/i })
      .closest('section') as HTMLElement;
    expect(within(preview).getByText('PEMERINTAH ACEH')).toBeInTheDocument();
  });

  it('keeps the counter save disabled until a number is edited', async () => {
    const user = userEvent.setup();
    renderApp(['/settings/app']);

    const save = await screen.findByRole('button', { name: /simpan nomor/i });
    await waitFor(() => expect(save).toBeDisabled());

    const counter = screen.getByLabelText(/^nomor terakhir L1$/i);
    await user.clear(counter);
    await user.type(counter, '13');

    expect(screen.getByRole('button', { name: /simpan nomor \(1\)/i })).toBeEnabled();
  });

  // Read from the API's updated_at, so it survives a reload rather than resetting.
  it('shows when the settings were last saved', async () => {
    renderApp(['/settings/app']);

    expect(await screen.findByText(/terakhir disimpan 20 Jul 2026/i)).toBeInTheDocument();
  });

  it('only enables save once something changes', async () => {
    const user = userEvent.setup();
    renderApp(['/settings/app']);

    const save = await screen.findByRole('button', { name: /simpan perubahan/i });
    await waitFor(() => expect(save).toBeDisabled());

    await user.type(screen.getByLabelText(/nama keuchik/i), 'X');
    expect(save).toBeEnabled();
  });
});
