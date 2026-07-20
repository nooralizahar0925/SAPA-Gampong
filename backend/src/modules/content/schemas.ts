import { z } from 'zod';
import { registry } from '../../openapi/registry';

/** Shared param shape for the id-addressed collection resources. */
export const ContentIdParams = registry.register(
  'ContentIdParams',
  z.object({ id: z.string().min(1) }),
);

/* -------------------------------------------------------------------------- */
/* Banner slides                                                              */
/* -------------------------------------------------------------------------- */

export const BannerSlideResponse = registry.register(
  'BannerSlideResponse',
  z.object({
    id: z.string(),
    image_file_id: z.string(),
    image_url: z.string().nullable(),
    link_url: z.string().nullable(),
    order: z.number().int(),
    active: z.boolean(),
    start_at: z.string().nullable(),
    end_at: z.string().nullable(),
  }),
);

export const BannerSlideListResponse = registry.register(
  'BannerSlideListResponse',
  z.array(BannerSlideResponse),
);

export const CreateBannerSlideBody = registry.register(
  'CreateBannerSlideBody',
  z.object({
    image_file_id: z.string().min(1),
    link_url: z.string().url().nullish(),
    order: z.number().int().min(0).optional(),
    active: z.boolean().optional(),
    start_at: z.string().datetime().nullish(),
    end_at: z.string().datetime().nullish(),
  }),
);

export const UpdateBannerSlideBody = registry.register(
  'UpdateBannerSlideBody',
  CreateBannerSlideBody.partial(),
);

export const ReorderBannerSlidesBody = registry.register(
  'ReorderBannerSlidesBody',
  z.object({
    ids: z.array(z.string().min(1)).min(1),
  }),
);

/* -------------------------------------------------------------------------- */
/* Village profile (singleton)                                                */
/* -------------------------------------------------------------------------- */

export const VillageProfileResponse = registry.register(
  'VillageProfileResponse',
  z.object({
    name: z.string().nullable(),
    founded_date: z.string().nullable(),
    kecamatan: z.string().nullable(),
    kabupaten: z.string().nullable(),
    contact_phone: z.string().nullable(),
    email: z.string().nullable(),
    map_lat: z.number().nullable(),
    map_lng: z.number().nullable(),
    description: z.string().nullable(),
    photo_file_id: z.string().nullable(),
    photo_url: z.string().nullable(),
    updated_at: z.string().nullable(),
  }),
);

export const UpdateVillageProfileBody = registry.register(
  'UpdateVillageProfileBody',
  z.object({
    name: z.string().min(1).max(160).optional(),
    founded_date: z.string().max(64).nullish(),
    kecamatan: z.string().min(1).max(120).optional(),
    kabupaten: z.string().min(1).max(120).optional(),
    contact_phone: z.string().max(40).nullish(),
    email: z.string().email().nullish(),
    map_lat: z.number().min(-90).max(90).nullish(),
    map_lng: z.number().min(-180).max(180).nullish(),
    description: z.string().max(5000).nullish(),
    photo_file_id: z.string().min(1).nullish(),
  }),
);

/* -------------------------------------------------------------------------- */
/* Vision & mission (singleton)                                               */
/* -------------------------------------------------------------------------- */

export const VisionMissionResponse = registry.register(
  'VisionMissionResponse',
  z.object({
    vision: z.string().nullable(),
    missions: z.array(z.string()),
    updated_at: z.string().nullable(),
  }),
);

export const UpdateVisionMissionBody = registry.register(
  'UpdateVisionMissionBody',
  z.object({
    vision: z.string().min(1).max(2000).optional(),
    missions: z.array(z.string().min(1).max(1000)).optional(),
  }),
);

/* -------------------------------------------------------------------------- */
/* Officials                                                                  */
/* -------------------------------------------------------------------------- */

export const OfficialResponse = registry.register(
  'OfficialResponse',
  z.object({
    id: z.string(),
    name: z.string(),
    role: z.string(),
    photo_file_id: z.string().nullable(),
    photo_url: z.string().nullable(),
    order: z.number().int(),
    is_leadership_highlight: z.boolean(),
  }),
);

export const OfficialListResponse = registry.register(
  'OfficialListResponse',
  z.array(OfficialResponse),
);

export const CreateOfficialBody = registry.register(
  'CreateOfficialBody',
  z.object({
    name: z.string().min(1).max(160),
    role: z.string().min(1).max(160),
    photo_file_id: z.string().min(1).nullish(),
    order: z.number().int().min(0).optional(),
    is_leadership_highlight: z.boolean().optional(),
  }),
);

export const UpdateOfficialBody = registry.register(
  'UpdateOfficialBody',
  CreateOfficialBody.partial(),
);

/* -------------------------------------------------------------------------- */
/* Village strengths                                                          */
/* -------------------------------------------------------------------------- */

export const VillageStrengthResponse = registry.register(
  'VillageStrengthResponse',
  z.object({
    id: z.string(),
    title: z.string(),
    body: z.string(),
    photo_file_id: z.string().nullable(),
    photo_url: z.string().nullable(),
    order: z.number().int(),
  }),
);

export const VillageStrengthListResponse = registry.register(
  'VillageStrengthListResponse',
  z.array(VillageStrengthResponse),
);

export const CreateVillageStrengthBody = registry.register(
  'CreateVillageStrengthBody',
  z.object({
    title: z.string().min(1).max(200),
    body: z.string().min(1).max(5000),
    photo_file_id: z.string().min(1).nullish(),
    order: z.number().int().min(0).optional(),
  }),
);

export const UpdateVillageStrengthBody = registry.register(
  'UpdateVillageStrengthBody',
  CreateVillageStrengthBody.partial(),
);

/* -------------------------------------------------------------------------- */
/* Mosques                                                                    */
/* -------------------------------------------------------------------------- */

export const MosqueResponse = registry.register(
  'MosqueResponse',
  z.object({
    id: z.string(),
    name: z.string(),
    address: z.string(),
    landmark: z.string().nullable(),
    photo_file_id: z.string().nullable(),
    photo_url: z.string().nullable(),
  }),
);

export const MosqueListResponse = registry.register('MosqueListResponse', z.array(MosqueResponse));

export const CreateMosqueBody = registry.register(
  'CreateMosqueBody',
  z.object({
    name: z.string().min(1).max(160),
    address: z.string().min(1).max(300),
    landmark: z.string().max(200).nullish(),
    photo_file_id: z.string().min(1).nullish(),
  }),
);

export const UpdateMosqueBody = registry.register('UpdateMosqueBody', CreateMosqueBody.partial());

/* -------------------------------------------------------------------------- */
/* Prayer config (singleton)                                                  */
/* -------------------------------------------------------------------------- */

export const PrayerConfigResponse = registry.register(
  'PrayerConfigResponse',
  z.object({
    lat: z.number().nullable(),
    lng: z.number().nullable(),
    calc_method: z.string().nullable(),
    timezone: z.string(),
    updated_at: z.string().nullable(),
  }),
);

export const UpdatePrayerConfigBody = registry.register(
  'UpdatePrayerConfigBody',
  z.object({
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    calc_method: z.string().min(1).max(80).optional(),
    timezone: z.string().min(1).max(80).optional(),
  }),
);

/* -------------------------------------------------------------------------- */
/* Demographics                                                               */
/* -------------------------------------------------------------------------- */

export const DemographicBlockTypeEnum = registry.register(
  'DemographicBlockTypeEnum',
  z.enum(['number', 'split', 'bar', 'pie']),
);

export const DemographicBlockResponse = registry.register(
  'DemographicBlockResponse',
  z.object({
    key: z.string(),
    label: z.string(),
    type: DemographicBlockTypeEnum,
    data: z.unknown(),
    order: z.number().int(),
    visible: z.boolean(),
  }),
);

export const DemographicBlockListResponse = registry.register(
  'DemographicBlockListResponse',
  z.array(DemographicBlockResponse),
);

export const UpdateDemographicsBody = registry.register(
  'UpdateDemographicsBody',
  z.object({
    blocks: z
      .array(
        z.object({
          key: z.string().min(1).max(80),
          label: z.string().min(1).max(200),
          type: DemographicBlockTypeEnum,
          data: z.unknown(),
          order: z.number().int().min(0).optional(),
          visible: z.boolean().optional(),
        }),
      )
      .min(1),
  }),
);
