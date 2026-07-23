import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getLetterTemplatePreviewRequest,
  listLetterTemplatesRequest,
  updateLetterTemplateRequest,
  type LetterTemplateDefinition,
  type LetterTypeCode,
} from '../api/client';
import { DashboardFrame } from '../components/DashboardFrame';
import { SettingsTabs } from '../components/SettingsTabs';
import { AppIcon } from '../components/AppIcon';
import { Modal } from '../components/content/Modal';
import { PdfPreview } from '../components/PdfPreview';
import { alertApiError, toastSuccess } from '../lib/alerts';
import { formatSavedAt } from '../lib/format';

type TemplateForm = {
  name: string;
  description: string;
  signatory: string;
  subject_is_applicant: boolean;
  required_attachments: string[];
  active: boolean;
};

const ATTACHMENT_OPTIONS = ['KTP', 'KK'] as const;
const SIGNATORY_OPTIONS = ['Keuchik', 'Sekretaris Gampong a.n. Keuchik'] as const;

function toForm(template: LetterTemplateDefinition): TemplateForm {
  return {
    name: template.name,
    description: template.description,
    signatory: template.signatory,
    subject_is_applicant: template.subject_is_applicant,
    required_attachments: template.required_attachments,
    active: template.active,
  };
}

export function LetterTemplateSettingsPage() {
  const queryClient = useQueryClient();
  const [selectedCode, setSelectedCode] = useState<LetterTypeCode | null>(null);
  const [form, setForm] = useState<TemplateForm | null>(null);
  const [dirty, setDirty] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['settings', 'letter-templates'],
    queryFn: listLetterTemplatesRequest,
  });

  const templates = query.data ?? [];
  const selected = templates.find((template) => template.code === selectedCode) ?? templates[0];

  useEffect(() => {
    if (!selected) {
      setSelectedCode(null);
      setForm(null);
      setDirty(false);
      return;
    }

    if (!selectedCode) setSelectedCode(selected.code);
    setForm(toForm(selected));
    setDirty(false);
  }, [selected?.code, selected?.updated_at]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selected || !form) return null;
      return updateLetterTemplateRequest(selected.code, {
        name: form.name.trim(),
        description: form.description.trim(),
        signatory: form.signatory.trim(),
        subject_is_applicant: form.subject_is_applicant,
        required_attachments: form.required_attachments,
        active: form.active,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['settings', 'letter-templates'] });
      await queryClient.invalidateQueries({ queryKey: ['letter-types'] });
      toastSuccess('Template surat tersimpan');
    },
    onError: (error) => alertApiError(error, 'Template surat gagal disimpan.'),
  });

  const previewMutation = useMutation({
    mutationFn: (code: LetterTypeCode) => getLetterTemplatePreviewRequest(code),
    onSuccess: (blob) => {
      if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(createPreviewUrl(blob));
    },
    onError: (error) => alertApiError(error, 'Pratinjau PDF gagal dibuat.'),
  });

  useEffect(
    () => () => {
      if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  function setField<K extends keyof TemplateForm>(key: K, value: TemplateForm[K]) {
    setDirty(true);
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function setRequiredAttachment(kind: string, required: boolean) {
    setDirty(true);
    setForm((prev) => {
      if (!prev) return prev;
      const current = new Set(prev.required_attachments);
      if (required) current.add(kind);
      else current.delete(kind);
      return {
        ...prev,
        required_attachments: ATTACHMENT_OPTIONS.filter((option) => current.has(option)),
      };
    });
  }

  function openPreview() {
    if (!selected) return;
    setPreviewOpen(true);
    previewMutation.mutate(selected.code);
  }

  const savedLabel = formatSavedAt(selected?.updated_at);
  const canSave =
    Boolean(form?.name.trim()) &&
    Boolean(form?.description.trim()) &&
    Boolean(form?.signatory.trim()) &&
    dirty &&
    !saveMutation.isPending;

  return (
    <DashboardFrame
      header={
        <div className="content-header">
          <div className="dashboard-topbar-copy">
            <h1>Pengaturan Surat</h1>
            <p>Template layanan surat, status aktif, dan copy yang tampil di aplikasi warga.</p>
          </div>

          <div className="content-header-actions">
            <span className="content-saved-at">
              {dirty
                ? 'Ada perubahan belum disimpan'
                : savedLabel
                  ? `Terakhir disimpan ${savedLabel}`
                  : 'Belum ada perubahan tersimpan'}
            </span>
            <button
              className="primary-button"
              type="button"
              disabled={!canSave}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </div>
      }
    >
      <SettingsTabs />

      {query.isLoading ? <div className="loading-state">Memuat template surat...</div> : null}

      <div className="content-layout">
        <div className="content-main">
          <section className="detail-card">
            <div className="detail-card-head">
              <h2>Daftar Template</h2>
            </div>

            <div className="template-list">
              {templates.map((template) => (
                <button
                  key={template.code}
                  type="button"
                  className={`template-list-item${selected?.code === template.code ? ' active' : ''}`}
                  onClick={() => setSelectedCode(template.code)}
                >
                  <span className="pill">{template.code}</span>
                  <span>
                    <b>{template.name}</b>
                    <small>{template.description}</small>
                  </span>
                  <span className={`status-pill ${template.active ? 'ready' : 'muted'}`}>
                    {template.active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <aside className="content-aside wide">
          <section className="detail-card">
            <div className="detail-card-head">
              <h2>{selected ? `Edit ${selected.code}` : 'Edit Template'}</h2>
              {selected ? (
                <div className="template-edit-actions">
                  <button
                    className="secondary-button compact-button"
                    type="button"
                    onClick={openPreview}
                  >
                    <AppIcon name="eye" />
                    Pratinjau
                  </button>
                </div>
              ) : null}
            </div>

            {selected && form ? (
              <div className="content-form-grid template-form">
                <label className="template-toggle span-2">
                  <input
                    type="checkbox"
                    role="switch"
                    checked={form.active}
                    onChange={(event) => setField('active', event.target.checked)}
                  />
                  <span className="template-toggle-control" aria-hidden="true" />
                  <span className="template-toggle-copy">
                    <b>Tampilkan di aplikasi warga</b>
                    <small>{form.active ? 'Template aktif di katalog layanan.' : 'Template disembunyikan dari katalog layanan.'}</small>
                  </span>
                </label>

                <div className="field span-2">
                  <label htmlFor="template-name">Nama surat</label>
                  <input
                    id="template-name"
                    value={form.name}
                    onChange={(event) => setField('name', event.target.value)}
                  />
                </div>

                <div className="field span-2">
                  <label htmlFor="template-description">Deskripsi singkat</label>
                  <textarea
                    id="template-description"
                    rows={4}
                    value={form.description}
                    onChange={(event) => setField('description', event.target.value)}
                  />
                </div>

                <div className="field span-2">
                  <label htmlFor="template-signatory">Penanda tangan</label>
                  <select
                    id="template-signatory"
                    value={form.signatory}
                    onChange={(event) => setField('signatory', event.target.value)}
                  >
                    {SIGNATORY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field span-2 template-attachment-field">
                  <label>Lampiran wajib</label>
                  <div className="template-attachment-options">
                    {ATTACHMENT_OPTIONS.map((kind) => (
                      <label key={kind} className="template-attachment-option">
                        <input
                          type="checkbox"
                          checked={form.required_attachments.includes(kind)}
                          onChange={(event) => setRequiredAttachment(kind, event.target.checked)}
                        />
                        <span className="template-attachment-check" aria-hidden="true">
                          <AppIcon name="check" />
                        </span>
                        <span>
                          <b>{kind}</b>
                          <small>
                            {form.required_attachments.includes(kind)
                              ? 'Wajib di aplikasi warga'
                              : 'Opsional di aplikasi warga'}
                          </small>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <label className="template-toggle span-2">
                  <input
                    type="checkbox"
                    role="switch"
                    checked={form.subject_is_applicant}
                    onChange={(event) => setField('subject_is_applicant', event.target.checked)}
                  />
                  <span className="template-toggle-control" aria-hidden="true" />
                  <span className="template-toggle-copy">
                    <b>Subjek surat sama dengan pemohon</b>
                    <small>{form.subject_is_applicant ? 'Data pemohon dipakai sebagai subjek surat.' : 'Subjek surat diisi terpisah dari pemohon.'}</small>
                  </span>
                </label>
              </div>
            ) : (
              <p className="empty-state">Belum ada template yang dipilih.</p>
            )}
          </section>
        </aside>
      </div>

      {previewOpen && selected && form ? (
        <Modal
          title={`Pratinjau ${selected.code}`}
          className="sapa-modal-pdf"
          onClose={() => setPreviewOpen(false)}
        >
          {previewMutation.isPending ? (
            <div className="loading-state">Membuat pratinjau PDF...</div>
          ) : previewMutation.isError ? (
            <div className="error-box" role="alert">
              Pratinjau PDF tidak dapat dibuat.
            </div>
          ) : (
            <PdfPreview pdfUrl={previewUrl} title={form.name || selected.code} />
          )}
        </Modal>
      ) : null}
    </DashboardFrame>
  );
}

function createPreviewUrl(blob: Blob) {
  if (typeof URL.createObjectURL === 'function') return URL.createObjectURL(blob);
  return `data:${blob.type || 'application/pdf'};base64,`;
}
