import { Router } from 'express';
import { errorResponse } from '../../openapi/components';
import { defineRoute } from '../../openapi/define-route';
import {
  BannerSlideListResponse,
  BannerSlideResponse,
  ContentIdParams,
  CreateBannerSlideBody,
  CreateMosqueBody,
  CreateOfficialBody,
  CreateVillageStrengthBody,
  DemographicBlockListResponse,
  MosqueListResponse,
  MosqueResponse,
  OfficialListResponse,
  OfficialResponse,
  PrayerConfigResponse,
  ReorderBannerSlidesBody,
  UpdateBannerSlideBody,
  UpdateDemographicsBody,
  UpdateMosqueBody,
  UpdateOfficialBody,
  UpdatePrayerConfigBody,
  UpdateVillageProfileBody,
  UpdateVillageStrengthBody,
  UpdateVisionMissionBody,
  VillageProfileResponse,
  VillageStrengthListResponse,
  VillageStrengthResponse,
  VisionMissionResponse,
} from './schemas';
import {
  createBanner,
  createMosque,
  createOfficial,
  createStrength,
  deleteBanner,
  deleteMosque,
  deleteOfficial,
  deleteStrength,
  getPrayerConfig,
  getProfile,
  getVisionMission,
  listBanners,
  listDemographics,
  listMosques,
  listOfficials,
  listStrengths,
  reorderBanners,
  updateBanner,
  updateDemographics,
  updateMosque,
  updateOfficial,
  updatePrayerConfig,
  updateProfile,
  updateStrength,
  updateVisionMission,
} from './service';

export const contentRouter = Router();

const TAGS = ['Content'];

/* -------------------------------------------------------------------------- */
/* Banner slides                                                              */
/* -------------------------------------------------------------------------- */

defineRoute(contentRouter, {
  method: 'get',
  path: '/banners',
  fullPath: '/api/content/banners',
  tags: TAGS,
  summary: 'List banner slides for the mobile home carousel',
  responses: {
    200: {
      description: 'Banner slides ordered for display',
      content: { 'application/json': { schema: BannerSlideListResponse } },
    },
  },
  handler: async ({ res }) => {
    res.json(await listBanners());
  },
});

defineRoute(contentRouter, {
  method: 'post',
  path: '/banners',
  fullPath: '/api/content/banners',
  tags: TAGS,
  summary: 'Create a banner slide',
  auth: 'admin',
  body: CreateBannerSlideBody,
  responses: {
    201: {
      description: 'Created banner slide',
      content: { 'application/json': { schema: BannerSlideResponse } },
    },
    400: errorResponse('Invalid banner payload'),
    401: errorResponse('Authentication is required'),
    404: errorResponse('Referenced image file was not found'),
  },
  handler: async ({ body, res }) => {
    res.status(201).json(await createBanner(body));
  },
});

// Registered before "/banners/:id" so the literal segment is not captured as an id.
defineRoute(contentRouter, {
  method: 'post',
  path: '/banners/reorder',
  fullPath: '/api/content/banners/reorder',
  tags: TAGS,
  summary: 'Persist a new banner display order',
  auth: 'admin',
  body: ReorderBannerSlidesBody,
  responses: {
    200: {
      description: 'Banner slides in their new order',
      content: { 'application/json': { schema: BannerSlideListResponse } },
    },
    400: errorResponse('Invalid reorder payload'),
    401: errorResponse('Authentication is required'),
    404: errorResponse('One or more banner slides were not found'),
  },
  handler: async ({ body, res }) => {
    res.json(await reorderBanners(body.ids));
  },
});

defineRoute(contentRouter, {
  method: 'patch',
  path: '/banners/:id',
  fullPath: '/api/content/banners/{id}',
  tags: TAGS,
  summary: 'Update a banner slide',
  auth: 'admin',
  params: ContentIdParams,
  body: UpdateBannerSlideBody,
  responses: {
    200: {
      description: 'Updated banner slide',
      content: { 'application/json': { schema: BannerSlideResponse } },
    },
    400: errorResponse('Invalid banner payload'),
    401: errorResponse('Authentication is required'),
    404: errorResponse('Banner slide was not found'),
  },
  handler: async ({ params, body, res }) => {
    res.json(await updateBanner(params.id, body));
  },
});

defineRoute(contentRouter, {
  method: 'delete',
  path: '/banners/:id',
  fullPath: '/api/content/banners/{id}',
  tags: TAGS,
  summary: 'Delete a banner slide',
  auth: 'admin',
  params: ContentIdParams,
  responses: {
    204: { description: 'Banner slide deleted' },
    401: errorResponse('Authentication is required'),
    404: errorResponse('Banner slide was not found'),
  },
  handler: async ({ params, res }) => {
    await deleteBanner(params.id);
    res.status(204).send();
  },
});

/* -------------------------------------------------------------------------- */
/* Village profile                                                            */
/* -------------------------------------------------------------------------- */

defineRoute(contentRouter, {
  method: 'get',
  path: '/profile',
  fullPath: '/api/content/profile',
  tags: TAGS,
  summary: 'Get the village profile',
  responses: {
    200: {
      description: 'Village profile',
      content: { 'application/json': { schema: VillageProfileResponse } },
    },
  },
  handler: async ({ res }) => {
    res.json(await getProfile());
  },
});

defineRoute(contentRouter, {
  method: 'patch',
  path: '/profile',
  fullPath: '/api/content/profile',
  tags: TAGS,
  summary: 'Update the village profile',
  auth: 'admin',
  body: UpdateVillageProfileBody,
  responses: {
    200: {
      description: 'Updated village profile',
      content: { 'application/json': { schema: VillageProfileResponse } },
    },
    400: errorResponse('Invalid profile payload'),
    401: errorResponse('Authentication is required'),
    404: errorResponse('Referenced photo file was not found'),
  },
  handler: async ({ body, res }) => {
    res.json(await updateProfile(body));
  },
});

/* -------------------------------------------------------------------------- */
/* Vision & mission                                                           */
/* -------------------------------------------------------------------------- */

defineRoute(contentRouter, {
  method: 'get',
  path: '/vision-mission',
  fullPath: '/api/content/vision-mission',
  tags: TAGS,
  summary: 'Get the village vision and mission',
  responses: {
    200: {
      description: 'Vision and mission',
      content: { 'application/json': { schema: VisionMissionResponse } },
    },
  },
  handler: async ({ res }) => {
    res.json(await getVisionMission());
  },
});

defineRoute(contentRouter, {
  method: 'patch',
  path: '/vision-mission',
  fullPath: '/api/content/vision-mission',
  tags: TAGS,
  summary: 'Update the village vision and mission',
  auth: 'admin',
  body: UpdateVisionMissionBody,
  responses: {
    200: {
      description: 'Updated vision and mission',
      content: { 'application/json': { schema: VisionMissionResponse } },
    },
    400: errorResponse('Invalid vision/mission payload'),
    401: errorResponse('Authentication is required'),
  },
  handler: async ({ body, res }) => {
    res.json(await updateVisionMission(body));
  },
});

/* -------------------------------------------------------------------------- */
/* Officials                                                                  */
/* -------------------------------------------------------------------------- */

defineRoute(contentRouter, {
  method: 'get',
  path: '/officials',
  fullPath: '/api/content/officials',
  tags: TAGS,
  summary: 'List village officials',
  responses: {
    200: {
      description: 'Village officials in display order',
      content: { 'application/json': { schema: OfficialListResponse } },
    },
  },
  handler: async ({ res }) => {
    res.json(await listOfficials());
  },
});

defineRoute(contentRouter, {
  method: 'post',
  path: '/officials',
  fullPath: '/api/content/officials',
  tags: TAGS,
  summary: 'Create a village official',
  auth: 'admin',
  body: CreateOfficialBody,
  responses: {
    201: {
      description: 'Created official',
      content: { 'application/json': { schema: OfficialResponse } },
    },
    400: errorResponse('Invalid official payload'),
    401: errorResponse('Authentication is required'),
    404: errorResponse('Referenced photo file was not found'),
  },
  handler: async ({ body, res }) => {
    res.status(201).json(await createOfficial(body));
  },
});

defineRoute(contentRouter, {
  method: 'patch',
  path: '/officials/:id',
  fullPath: '/api/content/officials/{id}',
  tags: TAGS,
  summary: 'Update a village official',
  auth: 'admin',
  params: ContentIdParams,
  body: UpdateOfficialBody,
  responses: {
    200: {
      description: 'Updated official',
      content: { 'application/json': { schema: OfficialResponse } },
    },
    400: errorResponse('Invalid official payload'),
    401: errorResponse('Authentication is required'),
    404: errorResponse('Official was not found'),
  },
  handler: async ({ params, body, res }) => {
    res.json(await updateOfficial(params.id, body));
  },
});

defineRoute(contentRouter, {
  method: 'delete',
  path: '/officials/:id',
  fullPath: '/api/content/officials/{id}',
  tags: TAGS,
  summary: 'Delete a village official',
  auth: 'admin',
  params: ContentIdParams,
  responses: {
    204: { description: 'Official deleted' },
    401: errorResponse('Authentication is required'),
    404: errorResponse('Official was not found'),
  },
  handler: async ({ params, res }) => {
    await deleteOfficial(params.id);
    res.status(204).send();
  },
});

/* -------------------------------------------------------------------------- */
/* Village strengths                                                          */
/* -------------------------------------------------------------------------- */

defineRoute(contentRouter, {
  method: 'get',
  path: '/strengths',
  fullPath: '/api/content/strengths',
  tags: TAGS,
  summary: 'List village strengths',
  responses: {
    200: {
      description: 'Village strengths in display order',
      content: { 'application/json': { schema: VillageStrengthListResponse } },
    },
  },
  handler: async ({ res }) => {
    res.json(await listStrengths());
  },
});

defineRoute(contentRouter, {
  method: 'post',
  path: '/strengths',
  fullPath: '/api/content/strengths',
  tags: TAGS,
  summary: 'Create a village strength',
  auth: 'admin',
  body: CreateVillageStrengthBody,
  responses: {
    201: {
      description: 'Created village strength',
      content: { 'application/json': { schema: VillageStrengthResponse } },
    },
    400: errorResponse('Invalid strength payload'),
    401: errorResponse('Authentication is required'),
    404: errorResponse('Referenced photo file was not found'),
  },
  handler: async ({ body, res }) => {
    res.status(201).json(await createStrength(body));
  },
});

defineRoute(contentRouter, {
  method: 'patch',
  path: '/strengths/:id',
  fullPath: '/api/content/strengths/{id}',
  tags: TAGS,
  summary: 'Update a village strength',
  auth: 'admin',
  params: ContentIdParams,
  body: UpdateVillageStrengthBody,
  responses: {
    200: {
      description: 'Updated village strength',
      content: { 'application/json': { schema: VillageStrengthResponse } },
    },
    400: errorResponse('Invalid strength payload'),
    401: errorResponse('Authentication is required'),
    404: errorResponse('Village strength was not found'),
  },
  handler: async ({ params, body, res }) => {
    res.json(await updateStrength(params.id, body));
  },
});

defineRoute(contentRouter, {
  method: 'delete',
  path: '/strengths/:id',
  fullPath: '/api/content/strengths/{id}',
  tags: TAGS,
  summary: 'Delete a village strength',
  auth: 'admin',
  params: ContentIdParams,
  responses: {
    204: { description: 'Village strength deleted' },
    401: errorResponse('Authentication is required'),
    404: errorResponse('Village strength was not found'),
  },
  handler: async ({ params, res }) => {
    await deleteStrength(params.id);
    res.status(204).send();
  },
});

/* -------------------------------------------------------------------------- */
/* Mosques                                                                    */
/* -------------------------------------------------------------------------- */

defineRoute(contentRouter, {
  method: 'get',
  path: '/mosques',
  fullPath: '/api/content/mosques',
  tags: TAGS,
  summary: 'List mosques and meunasah',
  responses: {
    200: {
      description: 'Mosques and meunasah',
      content: { 'application/json': { schema: MosqueListResponse } },
    },
  },
  handler: async ({ res }) => {
    res.json(await listMosques());
  },
});

defineRoute(contentRouter, {
  method: 'post',
  path: '/mosques',
  fullPath: '/api/content/mosques',
  tags: TAGS,
  summary: 'Create a mosque or meunasah',
  auth: 'admin',
  body: CreateMosqueBody,
  responses: {
    201: {
      description: 'Created mosque',
      content: { 'application/json': { schema: MosqueResponse } },
    },
    400: errorResponse('Invalid mosque payload'),
    401: errorResponse('Authentication is required'),
    404: errorResponse('Referenced photo file was not found'),
  },
  handler: async ({ body, res }) => {
    res.status(201).json(await createMosque(body));
  },
});

defineRoute(contentRouter, {
  method: 'patch',
  path: '/mosques/:id',
  fullPath: '/api/content/mosques/{id}',
  tags: TAGS,
  summary: 'Update a mosque or meunasah',
  auth: 'admin',
  params: ContentIdParams,
  body: UpdateMosqueBody,
  responses: {
    200: {
      description: 'Updated mosque',
      content: { 'application/json': { schema: MosqueResponse } },
    },
    400: errorResponse('Invalid mosque payload'),
    401: errorResponse('Authentication is required'),
    404: errorResponse('Mosque was not found'),
  },
  handler: async ({ params, body, res }) => {
    res.json(await updateMosque(params.id, body));
  },
});

defineRoute(contentRouter, {
  method: 'delete',
  path: '/mosques/:id',
  fullPath: '/api/content/mosques/{id}',
  tags: TAGS,
  summary: 'Delete a mosque or meunasah',
  auth: 'admin',
  params: ContentIdParams,
  responses: {
    204: { description: 'Mosque deleted' },
    401: errorResponse('Authentication is required'),
    404: errorResponse('Mosque was not found'),
  },
  handler: async ({ params, res }) => {
    await deleteMosque(params.id);
    res.status(204).send();
  },
});

/* -------------------------------------------------------------------------- */
/* Prayer config                                                              */
/* -------------------------------------------------------------------------- */

defineRoute(contentRouter, {
  method: 'get',
  path: '/prayer-config',
  fullPath: '/api/content/prayer-config',
  tags: TAGS,
  summary: 'Get prayer-time coordinates for local computation on the mobile app',
  responses: {
    200: {
      description: 'Prayer configuration',
      content: { 'application/json': { schema: PrayerConfigResponse } },
    },
  },
  handler: async ({ res }) => {
    res.json(await getPrayerConfig());
  },
});

defineRoute(contentRouter, {
  method: 'patch',
  path: '/prayer-config',
  fullPath: '/api/content/prayer-config',
  tags: TAGS,
  summary: 'Update prayer-time coordinates and calculation method',
  auth: 'admin',
  body: UpdatePrayerConfigBody,
  responses: {
    200: {
      description: 'Updated prayer configuration',
      content: { 'application/json': { schema: PrayerConfigResponse } },
    },
    400: errorResponse('Invalid prayer configuration payload'),
    401: errorResponse('Authentication is required'),
  },
  handler: async ({ body, res }) => {
    res.json(await updatePrayerConfig(body));
  },
});

/* -------------------------------------------------------------------------- */
/* Demographics                                                               */
/* -------------------------------------------------------------------------- */

defineRoute(contentRouter, {
  method: 'get',
  path: '/demographics',
  fullPath: '/api/content/demographics',
  tags: TAGS,
  summary: 'List demographic stat blocks',
  responses: {
    200: {
      description: 'Demographic stat blocks in display order',
      content: { 'application/json': { schema: DemographicBlockListResponse } },
    },
  },
  handler: async ({ res }) => {
    res.json(await listDemographics());
  },
});

defineRoute(contentRouter, {
  method: 'patch',
  path: '/demographics',
  fullPath: '/api/content/demographics',
  tags: TAGS,
  summary: 'Create or update demographic stat blocks by key',
  auth: 'admin',
  body: UpdateDemographicsBody,
  responses: {
    200: {
      description: 'Demographic stat blocks after the update',
      content: { 'application/json': { schema: DemographicBlockListResponse } },
    },
    400: errorResponse('Invalid demographics payload'),
    401: errorResponse('Authentication is required'),
  },
  handler: async ({ body, res }) => {
    res.json(await updateDemographics(body.blocks));
  },
});
