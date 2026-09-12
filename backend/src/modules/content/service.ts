import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../lib/errors';
import { signedUrl } from '../../services/storage.service';

const SINGLETON_ID = 'singleton';

/**
 * Singleton content (profile, vision/mission, prayer config) is readable before an
 * admin has ever written it — the public apps need a 200 with empty fields rather
 * than a 404 they would each have to special-case. These defaults express that.
 */
const EMPTY_PROFILE = {
  name: null,
  founded_date: null,
  kecamatan: null,
  kabupaten: null,
  kemukiman: null,
  area_size: null,
  elevation: null,
  contact_phone: null,
  email: null,
  map_lat: null,
  map_lng: null,
  description: null,
  photo_file_id: null,
  photo_url: null,
  updated_at: null,
};

const EMPTY_VISION_MISSION = { vision: null, missions: [] as string[], updated_at: null };

const EMPTY_PRAYER_CONFIG = {
  lat: null,
  lng: null,
  calc_method: null,
  timezone: 'Asia/Jakarta',
  aladhan_method: 99,
  fajr_angle: 20,
  isha_angle: 18,
  school: 0,
  fallback_times: {
    subuh: null,
    dhuhur: null,
    ashar: null,
    maghrib: null,
    isya: null,
  },
  adzan_file_id: null,
  adzan_url: null,
  updated_at: null,
};

/** `undefined` means "not supplied, leave alone"; `null` means "explicitly clear". */
function isSupplied<T>(value: T | undefined): value is T {
  return value !== undefined;
}

/** Drops keys whose value is `undefined` so Prisma leaves those columns untouched. */
function definedOnly<T extends Record<string, unknown>>(data: T): Partial<T> {
  return Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)) as Partial<T>;
}

function fileUrl(fileId: string | null | undefined): string | null {
  return fileId ? signedUrl(fileId) : null;
}

/**
 * Photo/image columns are plain FK strings, so a bad id would otherwise surface as an
 * opaque Prisma FK violation (500). Validate up front and return a 404 instead.
 */
async function assertFileExists(fileId: string | null | undefined): Promise<void> {
  if (!fileId) return;
  const file = await prisma.file.findUnique({ where: { id: fileId }, select: { id: true } });
  if (!file) throw ApiError.notFound('File tidak ditemukan');
}

async function assertAudioFile(fileId: string | null | undefined): Promise<void> {
  if (!fileId) return;
  const file = await prisma.file.findUnique({ where: { id: fileId }, select: { mime: true } });
  if (!file) throw ApiError.notFound('File tidak ditemukan');
  if (!file.mime.startsWith('audio/')) {
    throw ApiError.validation('Data yang dikirim tidak valid', {
      adzan_file_id: 'File audio azan harus berupa audio',
    });
  }
}

async function assertGalleryFile(fileId: string | null | undefined, mediaType: 'photo' | 'video'): Promise<void> {
  if (!fileId) return;
  const file = await prisma.file.findUnique({ where: { id: fileId }, select: { mime: true } });
  if (!file) throw ApiError.notFound('File tidak ditemukan');

  const valid = mediaType === 'photo' ? file.mime.startsWith('image/') : file.mime.startsWith('video/');
  if (!valid) {
    throw ApiError.validation('Data yang dikirim tidak valid', {
      file_id: mediaType === 'photo' ? 'File galeri foto harus berupa gambar' : 'File galeri video harus berupa video',
    });
  }
}

/* -------------------------------------------------------------------------- */
/* Banner slides                                                              */
/* -------------------------------------------------------------------------- */

type BannerRow = Prisma.BannerSlideGetPayload<Record<string, never>>;

function toBanner(row: BannerRow) {
  return {
    id: row.id,
    image_file_id: row.imageFileId,
    image_url: fileUrl(row.imageFileId),
    link_url: row.linkUrl,
    order: row.order,
    active: row.active,
    start_at: row.startAt ? row.startAt.toISOString() : null,
    end_at: row.endAt ? row.endAt.toISOString() : null,
  };
}

export async function listBanners() {
  const rows = await prisma.bannerSlide.findMany({ orderBy: [{ order: 'asc' }, { id: 'asc' }] });
  return rows.map(toBanner);
}

export async function createBanner(input: {
  image_file_id: string;
  link_url?: string | null;
  order?: number;
  active?: boolean;
  start_at?: string | null;
  end_at?: string | null;
}) {
  await assertFileExists(input.image_file_id);

  const row = await prisma.bannerSlide.create({
    data: {
      imageFileId: input.image_file_id,
      linkUrl: input.link_url ?? null,
      order: input.order ?? (await nextBannerOrder()),
      active: input.active ?? true,
      startAt: input.start_at ? new Date(input.start_at) : null,
      endAt: input.end_at ? new Date(input.end_at) : null,
    },
  });

  return toBanner(row);
}

async function nextBannerOrder() {
  const last = await prisma.bannerSlide.findFirst({ orderBy: { order: 'desc' }, select: { order: true } });
  return last ? last.order + 1 : 0;
}

export async function updateBanner(
  id: string,
  input: {
    image_file_id?: string;
    link_url?: string | null;
    order?: number;
    active?: boolean;
    start_at?: string | null;
    end_at?: string | null;
  },
) {
  await getBannerOrThrow(id);
  if (isSupplied(input.image_file_id)) await assertFileExists(input.image_file_id);

  const row = await prisma.bannerSlide.update({
    where: { id },
    data: definedOnly({
      imageFileId: input.image_file_id,
      linkUrl: input.link_url,
      order: input.order,
      active: input.active,
      startAt: isSupplied(input.start_at) ? (input.start_at ? new Date(input.start_at) : null) : undefined,
      endAt: isSupplied(input.end_at) ? (input.end_at ? new Date(input.end_at) : null) : undefined,
    }),
  });

  return toBanner(row);
}

export async function deleteBanner(id: string) {
  await getBannerOrThrow(id);
  await prisma.bannerSlide.delete({ where: { id } });
}

async function getBannerOrThrow(id: string) {
  const row = await prisma.bannerSlide.findUnique({ where: { id } });
  if (!row) throw ApiError.notFound('Banner tidak ditemukan');
  return row;
}

/**
 * Reorder is positional: the submitted id order becomes `order` 0..n-1. Every id must
 * exist, and the writes run in one transaction so a bad id cannot leave the list
 * half-reordered.
 */
export async function reorderBanners(ids: string[]) {
  const unique = new Set(ids);
  if (unique.size !== ids.length) {
    throw ApiError.validation('Daftar id banner mengandung duplikat');
  }

  const found = await prisma.bannerSlide.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  });

  if (found.length !== ids.length) {
    throw ApiError.notFound('Sebagian banner tidak ditemukan');
  }

  await prisma.$transaction(
    ids.map((id, index) => prisma.bannerSlide.update({ where: { id }, data: { order: index } })),
  );

  return listBanners();
}

/* -------------------------------------------------------------------------- */
/* Gallery                                                                    */
/* -------------------------------------------------------------------------- */

type GalleryRow = Prisma.GalleryItemGetPayload<Record<string, never>>;

function toGalleryItem(row: GalleryRow) {
  return {
    id: row.id,
    media_type: row.mediaType as 'photo' | 'video',
    file_id: row.fileId,
    media_url: fileUrl(row.fileId),
    title: row.title,
    caption: row.caption,
    order: row.order,
    active: row.active,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

export async function listGalleryItems(options: { includeInactive?: boolean } = {}) {
  const rows = await prisma.galleryItem.findMany({
    where: options.includeInactive ? undefined : { active: true },
    orderBy: [{ order: 'asc' }, { createdAt: 'desc' }, { id: 'asc' }],
  });
  return rows.map(toGalleryItem);
}

export async function createGalleryItem(input: {
  media_type: 'photo' | 'video';
  file_id: string;
  title: string;
  caption?: string | null;
  order?: number;
  active?: boolean;
}) {
  await assertGalleryFile(input.file_id, input.media_type);

  const row = await prisma.galleryItem.create({
    data: {
      mediaType: input.media_type,
      fileId: input.file_id,
      title: input.title,
      caption: input.caption ?? null,
      order: input.order ?? (await nextGalleryOrder()),
      active: input.active ?? true,
    },
  });

  return toGalleryItem(row);
}

async function nextGalleryOrder() {
  const last = await prisma.galleryItem.findFirst({ orderBy: { order: 'desc' }, select: { order: true } });
  return last ? last.order + 1 : 0;
}

export async function updateGalleryItem(
  id: string,
  input: {
    media_type?: 'photo' | 'video';
    file_id?: string;
    title?: string;
    caption?: string | null;
    order?: number;
    active?: boolean;
  },
) {
  const existing = await getGalleryItemOrThrow(id);
  const mediaType = input.media_type ?? (existing.mediaType as 'photo' | 'video');

  if (isSupplied(input.file_id) || isSupplied(input.media_type)) {
    await assertGalleryFile(input.file_id ?? existing.fileId, mediaType);
  }

  const row = await prisma.galleryItem.update({
    where: { id },
    data: definedOnly({
      mediaType: input.media_type,
      fileId: input.file_id,
      title: input.title,
      caption: input.caption,
      order: input.order,
      active: input.active,
    }),
  });

  return toGalleryItem(row);
}

export async function deleteGalleryItem(id: string) {
  await getGalleryItemOrThrow(id);
  await prisma.galleryItem.delete({ where: { id } });
}

async function getGalleryItemOrThrow(id: string) {
  const row = await prisma.galleryItem.findUnique({ where: { id } });
  if (!row) throw ApiError.notFound('Media galeri tidak ditemukan');
  return row;
}

export async function reorderGalleryItems(ids: string[]) {
  const unique = new Set(ids);
  if (unique.size !== ids.length) {
    throw ApiError.validation('Daftar id galeri mengandung duplikat');
  }

  const found = await prisma.galleryItem.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  });

  if (found.length !== ids.length) {
    throw ApiError.notFound('Sebagian media galeri tidak ditemukan');
  }

  await prisma.$transaction(
    ids.map((id, index) => prisma.galleryItem.update({ where: { id }, data: { order: index } })),
  );

  return listGalleryItems({ includeInactive: true });
}

/* -------------------------------------------------------------------------- */
/* Social media links                                                         */
/* -------------------------------------------------------------------------- */

const SOCIAL_ICON_DOMAINS: Record<string, string> = {
  facebook: 'facebook.com',
  instagram: 'instagram.com',
  youtube: 'youtube.com',
  tiktok: 'tiktok.com',
  whatsapp: 'whatsapp.com',
  x: 'x.com',
  website: 'gampongblangdigital.com',
  other: 'gampongblangdigital.com',
};

type SocialRow = Prisma.SocialMediaLinkGetPayload<Record<string, never>>;

function defaultSocialIconUrl(platform: string) {
  const domain = SOCIAL_ICON_DOMAINS[platform] ?? SOCIAL_ICON_DOMAINS.other;
  return `https://www.google.com/s2/favicons?sz=64&domain_url=https://${domain}`;
}

function toSocialLink(row: SocialRow) {
  return {
    id: row.id,
    platform: row.platform as 'facebook' | 'instagram' | 'youtube' | 'tiktok' | 'whatsapp' | 'x' | 'website' | 'other',
    label: row.label,
    url: row.url,
    icon_url: row.iconUrl ?? defaultSocialIconUrl(row.platform),
    order: row.order,
    active: row.active,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

export async function listSocialMediaLinks(options: { includeInactive?: boolean } = {}) {
  const rows = await prisma.socialMediaLink.findMany({
    where: options.includeInactive ? undefined : { active: true },
    orderBy: [{ order: 'asc' }, { id: 'asc' }],
  });
  return rows.map(toSocialLink);
}

export async function createSocialMediaLink(input: {
  platform: 'facebook' | 'instagram' | 'youtube' | 'tiktok' | 'whatsapp' | 'x' | 'website' | 'other';
  label: string;
  url: string;
  icon_url?: string | null;
  order?: number;
  active?: boolean;
}) {
  const row = await prisma.socialMediaLink.create({
    data: {
      platform: input.platform,
      label: input.label,
      url: input.url,
      iconUrl: input.icon_url ?? null,
      order: input.order ?? (await nextSocialLinkOrder()),
      active: input.active ?? true,
    },
  });

  return toSocialLink(row);
}

async function nextSocialLinkOrder() {
  const last = await prisma.socialMediaLink.findFirst({ orderBy: { order: 'desc' }, select: { order: true } });
  return last ? last.order + 1 : 0;
}

export async function updateSocialMediaLink(
  id: string,
  input: {
    platform?: 'facebook' | 'instagram' | 'youtube' | 'tiktok' | 'whatsapp' | 'x' | 'website' | 'other';
    label?: string;
    url?: string;
    icon_url?: string | null;
    order?: number;
    active?: boolean;
  },
) {
  await getSocialMediaLinkOrThrow(id);

  const row = await prisma.socialMediaLink.update({
    where: { id },
    data: definedOnly({
      platform: input.platform,
      label: input.label,
      url: input.url,
      iconUrl: input.icon_url,
      order: input.order,
      active: input.active,
    }),
  });

  return toSocialLink(row);
}

export async function deleteSocialMediaLink(id: string) {
  await getSocialMediaLinkOrThrow(id);
  await prisma.socialMediaLink.delete({ where: { id } });
}

async function getSocialMediaLinkOrThrow(id: string) {
  const row = await prisma.socialMediaLink.findUnique({ where: { id } });
  if (!row) throw ApiError.notFound('Media sosial tidak ditemukan');
  return row;
}

export async function reorderSocialMediaLinks(ids: string[]) {
  const unique = new Set(ids);
  if (unique.size !== ids.length) {
    throw ApiError.validation('Daftar id media sosial mengandung duplikat');
  }

  const found = await prisma.socialMediaLink.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  });

  if (found.length !== ids.length) {
    throw ApiError.notFound('Sebagian media sosial tidak ditemukan');
  }

  await prisma.$transaction(
    ids.map((id, index) => prisma.socialMediaLink.update({ where: { id }, data: { order: index } })),
  );

  return listSocialMediaLinks({ includeInactive: true });
}

/* -------------------------------------------------------------------------- */
/* Village profile (singleton)                                                */
/* -------------------------------------------------------------------------- */

export async function getProfile() {
  const row = await prisma.villageProfile.findUnique({ where: { id: SINGLETON_ID } });
  if (!row) return EMPTY_PROFILE;

  return {
    name: row.name,
    founded_date: row.foundedDate,
    kecamatan: row.kecamatan,
    kabupaten: row.kabupaten,
    kemukiman: row.kemukiman,
    area_size: row.areaSize,
    elevation: row.elevation,
    contact_phone: row.contactPhone,
    email: row.email,
    map_lat: row.mapLat,
    map_lng: row.mapLng,
    description: row.description,
    photo_file_id: row.photoFileId,
    photo_url: fileUrl(row.photoFileId),
    updated_at: row.updatedAt.toISOString(),
  };
}

export async function updateProfile(input: {
  name?: string;
  founded_date?: string | null;
  kecamatan?: string;
  kabupaten?: string;
  kemukiman?: string | null;
  area_size?: string | null;
  elevation?: string | null;
  contact_phone?: string | null;
  email?: string | null;
  map_lat?: number | null;
  map_lng?: number | null;
  description?: string | null;
  photo_file_id?: string | null;
}) {
  if (isSupplied(input.photo_file_id)) await assertFileExists(input.photo_file_id);

  const existing = await prisma.villageProfile.findUnique({ where: { id: SINGLETON_ID } });

  // `name`/`kecamatan`/`kabupaten` are non-nullable in the schema, so the very first
  // write has to supply them. Later writes may patch any subset.
  if (!existing) {
    const missing = (['name', 'kecamatan', 'kabupaten'] as const).filter((k) => !isSupplied(input[k]));
    if (missing.length > 0) {
      throw ApiError.validation(
        `Profil gampong belum pernah diisi, sehingga wajib menyertakan: ${missing.join(', ')}`,
        Object.fromEntries(missing.map((k) => [k, 'Wajib diisi'])),
      );
    }
  }

  const data = definedOnly({
    name: input.name,
    foundedDate: input.founded_date,
    kecamatan: input.kecamatan,
    kabupaten: input.kabupaten,
    kemukiman: input.kemukiman,
    areaSize: input.area_size,
    elevation: input.elevation,
    contactPhone: input.contact_phone,
    email: input.email,
    mapLat: input.map_lat,
    mapLng: input.map_lng,
    description: input.description,
    photoFileId: input.photo_file_id,
  });

  // Not an upsert: Prisma validates the `create` branch even when it takes `update`,
  // so a partial PATCH (no name/kecamatan/kabupaten) would fail validation there.
  if (existing) {
    await prisma.villageProfile.update({ where: { id: SINGLETON_ID }, data });
  } else {
    await prisma.villageProfile.create({
      data: {
        id: SINGLETON_ID,
        name: input.name!,
        kecamatan: input.kecamatan!,
        kabupaten: input.kabupaten!,
        kemukiman: input.kemukiman ?? null,
        areaSize: input.area_size ?? null,
        elevation: input.elevation ?? null,
        foundedDate: input.founded_date ?? null,
        contactPhone: input.contact_phone ?? null,
        email: input.email ?? null,
        mapLat: input.map_lat ?? null,
        mapLng: input.map_lng ?? null,
        description: input.description ?? null,
        photoFileId: input.photo_file_id ?? null,
      },
    });
  }

  return getProfile();
}

/* -------------------------------------------------------------------------- */
/* Vision & mission (singleton)                                               */
/* -------------------------------------------------------------------------- */

/** `missions` is a Json column; coerce defensively so a hand-edited row cannot 500 a GET. */
function toMissions(value: Prisma.JsonValue | null): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((m): m is string => typeof m === 'string');
}

export async function getVisionMission() {
  const row = await prisma.visionMission.findUnique({ where: { id: SINGLETON_ID } });
  if (!row) return EMPTY_VISION_MISSION;

  return {
    vision: row.vision,
    missions: toMissions(row.missions),
    updated_at: row.updatedAt.toISOString(),
  };
}

export async function updateVisionMission(input: { vision?: string; missions?: string[] }) {
  const existing = await prisma.visionMission.findUnique({ where: { id: SINGLETON_ID } });

  if (!existing && !isSupplied(input.vision)) {
    throw ApiError.validation('Visi belum pernah diisi, sehingga wajib disertakan', {
      vision: 'Wajib diisi',
    });
  }

  // Split rather than upsert — see the note in updateProfile.
  if (existing) {
    await prisma.visionMission.update({
      where: { id: SINGLETON_ID },
      data: definedOnly({ vision: input.vision, missions: input.missions }),
    });
  } else {
    await prisma.visionMission.create({
      data: { id: SINGLETON_ID, vision: input.vision!, missions: input.missions ?? [] },
    });
  }

  return getVisionMission();
}

/* -------------------------------------------------------------------------- */
/* Officials                                                                  */
/* -------------------------------------------------------------------------- */

type OfficialRow = Prisma.OfficialGetPayload<Record<string, never>>;

function toOfficial(row: OfficialRow) {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    photo_file_id: row.photoFileId,
    photo_url: fileUrl(row.photoFileId),
    order: row.order,
    is_leadership_highlight: row.isLeadershipHighlight,
  };
}

export async function listOfficials() {
  const rows = await prisma.official.findMany({ orderBy: [{ order: 'asc' }, { id: 'asc' }] });
  return rows.map(toOfficial);
}

export async function createOfficial(input: {
  name: string;
  role: string;
  photo_file_id?: string | null;
  order?: number;
  is_leadership_highlight?: boolean;
}) {
  await assertFileExists(input.photo_file_id);

  const row = await prisma.official.create({
    data: {
      name: input.name,
      role: input.role,
      photoFileId: input.photo_file_id ?? null,
      order: input.order ?? 0,
      isLeadershipHighlight: input.is_leadership_highlight ?? false,
    },
  });

  return toOfficial(row);
}

export async function updateOfficial(
  id: string,
  input: {
    name?: string;
    role?: string;
    photo_file_id?: string | null;
    order?: number;
    is_leadership_highlight?: boolean;
  },
) {
  const existing = await prisma.official.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Perangkat gampong tidak ditemukan');
  if (isSupplied(input.photo_file_id)) await assertFileExists(input.photo_file_id);

  const row = await prisma.official.update({
    where: { id },
    data: definedOnly({
      name: input.name,
      role: input.role,
      photoFileId: input.photo_file_id,
      order: input.order,
      isLeadershipHighlight: input.is_leadership_highlight,
    }),
  });

  return toOfficial(row);
}

export async function deleteOfficial(id: string) {
  const existing = await prisma.official.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Perangkat gampong tidak ditemukan');
  await prisma.official.delete({ where: { id } });
}

/* -------------------------------------------------------------------------- */
/* Village strengths                                                          */
/* -------------------------------------------------------------------------- */

type StrengthRow = Prisma.VillageStrengthGetPayload<Record<string, never>>;

function toStrength(row: StrengthRow) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    photo_file_id: row.photoFileId,
    photo_url: fileUrl(row.photoFileId),
    order: row.order,
  };
}

export async function listStrengths() {
  const rows = await prisma.villageStrength.findMany({ orderBy: [{ order: 'asc' }, { id: 'asc' }] });
  return rows.map(toStrength);
}

export async function createStrength(input: {
  title: string;
  body: string;
  photo_file_id?: string | null;
  order?: number;
}) {
  await assertFileExists(input.photo_file_id);

  const row = await prisma.villageStrength.create({
    data: {
      title: input.title,
      body: input.body,
      photoFileId: input.photo_file_id ?? null,
      order: input.order ?? 0,
    },
  });

  return toStrength(row);
}

export async function updateStrength(
  id: string,
  input: { title?: string; body?: string; photo_file_id?: string | null; order?: number },
) {
  const existing = await prisma.villageStrength.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Potensi gampong tidak ditemukan');
  if (isSupplied(input.photo_file_id)) await assertFileExists(input.photo_file_id);

  const row = await prisma.villageStrength.update({
    where: { id },
    data: definedOnly({
      title: input.title,
      body: input.body,
      photoFileId: input.photo_file_id,
      order: input.order,
    }),
  });

  return toStrength(row);
}

export async function deleteStrength(id: string) {
  const existing = await prisma.villageStrength.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Potensi gampong tidak ditemukan');
  await prisma.villageStrength.delete({ where: { id } });
}

/* -------------------------------------------------------------------------- */
/* Mosques                                                                    */
/* -------------------------------------------------------------------------- */

type MosqueRow = Prisma.MosqueGetPayload<Record<string, never>>;

function toMosque(row: MosqueRow) {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    landmark: row.landmark,
    photo_file_id: row.photoFileId,
    photo_url: fileUrl(row.photoFileId),
  };
}

export async function listMosques() {
  const rows = await prisma.mosque.findMany({ orderBy: [{ name: 'asc' }] });
  return rows.map(toMosque);
}

export async function createMosque(input: {
  name: string;
  address: string;
  landmark?: string | null;
  photo_file_id?: string | null;
}) {
  await assertFileExists(input.photo_file_id);

  const row = await prisma.mosque.create({
    data: {
      name: input.name,
      address: input.address,
      landmark: input.landmark ?? null,
      photoFileId: input.photo_file_id ?? null,
    },
  });

  return toMosque(row);
}

export async function updateMosque(
  id: string,
  input: { name?: string; address?: string; landmark?: string | null; photo_file_id?: string | null },
) {
  const existing = await prisma.mosque.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Masjid/meunasah tidak ditemukan');
  if (isSupplied(input.photo_file_id)) await assertFileExists(input.photo_file_id);

  const row = await prisma.mosque.update({
    where: { id },
    data: definedOnly({
      name: input.name,
      address: input.address,
      landmark: input.landmark,
      photoFileId: input.photo_file_id,
    }),
  });

  return toMosque(row);
}

export async function deleteMosque(id: string) {
  const existing = await prisma.mosque.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Masjid/meunasah tidak ditemukan');
  await prisma.mosque.delete({ where: { id } });
}

/* -------------------------------------------------------------------------- */
/* Prayer config (singleton)                                                  */
/* -------------------------------------------------------------------------- */

export async function getPrayerConfig() {
  const row = await prisma.prayerConfig.findUnique({ where: { id: SINGLETON_ID } });
  if (!row) return EMPTY_PRAYER_CONFIG;

  return {
    lat: row.lat,
    lng: row.lng,
    calc_method: row.calcMethod,
    timezone: row.timezone,
    aladhan_method: row.aladhanMethod,
    fajr_angle: row.fajrAngle,
    isha_angle: row.ishaAngle,
    school: row.school,
    fallback_times: {
      subuh: row.fallbackSubuh,
      dhuhur: row.fallbackDhuhur,
      ashar: row.fallbackAshar,
      maghrib: row.fallbackMaghrib,
      isya: row.fallbackIsya,
    },
    adzan_file_id: row.adzanFileId,
    adzan_url: fileUrl(row.adzanFileId),
    updated_at: row.updatedAt.toISOString(),
  };
}

export async function updatePrayerConfig(input: {
  lat?: number;
  lng?: number;
  calc_method?: string;
  timezone?: string;
  aladhan_method?: number;
  fajr_angle?: number;
  isha_angle?: number;
  school?: number;
  fallback_subuh?: string | null;
  fallback_dhuhur?: string | null;
  fallback_ashar?: string | null;
  fallback_maghrib?: string | null;
  fallback_isya?: string | null;
  adzan_file_id?: string | null;
}) {
  const existing = await prisma.prayerConfig.findUnique({ where: { id: SINGLETON_ID } });

  if (!existing) {
    const missing = (['lat', 'lng', 'calc_method'] as const).filter((k) => !isSupplied(input[k]));
    if (missing.length > 0) {
      throw ApiError.validation(
        `Konfigurasi waktu shalat belum pernah diisi, sehingga wajib menyertakan: ${missing.join(', ')}`,
        Object.fromEntries(missing.map((k) => [k, 'Wajib diisi'])),
      );
    }
  }

  if (isSupplied(input.adzan_file_id)) await assertAudioFile(input.adzan_file_id);

  // Split rather than upsert — see the note in updateProfile.
  if (existing) {
    await prisma.prayerConfig.update({
      where: { id: SINGLETON_ID },
      data: definedOnly({
        lat: input.lat,
        lng: input.lng,
        calcMethod: input.calc_method,
        timezone: input.timezone,
        aladhanMethod: input.aladhan_method,
        fajrAngle: input.fajr_angle,
        ishaAngle: input.isha_angle,
        school: input.school,
        fallbackSubuh: input.fallback_subuh,
        fallbackDhuhur: input.fallback_dhuhur,
        fallbackAshar: input.fallback_ashar,
        fallbackMaghrib: input.fallback_maghrib,
        fallbackIsya: input.fallback_isya,
        adzanFileId: input.adzan_file_id,
      }),
    });
  } else {
    await prisma.prayerConfig.create({
      data: {
        id: SINGLETON_ID,
        lat: input.lat!,
        lng: input.lng!,
        calcMethod: input.calc_method!,
        ...definedOnly({
          timezone: input.timezone,
          aladhanMethod: input.aladhan_method,
          fajrAngle: input.fajr_angle,
          ishaAngle: input.isha_angle,
          school: input.school,
          fallbackSubuh: input.fallback_subuh,
          fallbackDhuhur: input.fallback_dhuhur,
          fallbackAshar: input.fallback_ashar,
          fallbackMaghrib: input.fallback_maghrib,
          fallbackIsya: input.fallback_isya,
          adzanFileId: input.adzan_file_id,
        }),
      },
    });
  }

  return getPrayerConfig();
}

/* -------------------------------------------------------------------------- */
/* Demographics                                                               */
/* -------------------------------------------------------------------------- */

type DemographicRow = Prisma.DemographicStatBlockGetPayload<Record<string, never>>;

function toDemographicBlock(row: DemographicRow) {
  return {
    key: row.key,
    label: row.label,
    type: row.type,
    data: row.data,
    order: row.order,
    visible: row.visible,
  };
}

export async function listDemographics() {
  const rows = await prisma.demographicStatBlock.findMany({
    orderBy: [{ order: 'asc' }, { key: 'asc' }],
  });
  return rows.map(toDemographicBlock);
}

/**
 * Blocks are upserted by `key` so the dashboard can PATCH the subset it edited without
 * resending — or accidentally deleting — the rest.
 */
export async function updateDemographics(
  blocks: Array<{
    key: string;
    label: string;
    type: 'number' | 'split' | 'bar' | 'pie';
    data?: unknown;
    order?: number;
    visible?: boolean;
  }>,
) {
  const keys = new Set(blocks.map((b) => b.key));
  if (keys.size !== blocks.length) {
    throw ApiError.validation('Daftar blok demografi mengandung key duplikat');
  }

  await prisma.$transaction(
    blocks.map((block, index) => {
      const data = (block.data ?? {}) as Prisma.InputJsonValue;
      const order = block.order ?? index;

      return prisma.demographicStatBlock.upsert({
        where: { key: block.key },
        create: {
          key: block.key,
          label: block.label,
          type: block.type,
          data,
          order,
          visible: block.visible ?? true,
        },
        update: definedOnly({
          label: block.label,
          type: block.type,
          data,
          order,
          visible: block.visible,
        }),
      });
    }),
  );

  return listDemographics();
}
