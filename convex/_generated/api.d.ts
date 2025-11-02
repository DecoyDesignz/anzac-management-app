/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as crons from "../crons.js";
import type * as dashboard from "../dashboard.js";
import type * as events from "../events.js";
import type * as helpers from "../helpers.js";
import type * as http from "../http.js";
import type * as migrations from "../migrations.js";
import type * as passwordMigration from "../passwordMigration.js";
import type * as personnel from "../personnel.js";
import type * as qualifications from "../qualifications.js";
import type * as ranks from "../ranks.js";
import type * as rateLimiting from "../rateLimiting.js";
import type * as schools from "../schools.js";
import type * as seed from "../seed.js";
import type * as seedActions from "../seedActions.js";
import type * as systemSettings from "../systemSettings.js";
import type * as userActions from "../userActions.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  crons: typeof crons;
  dashboard: typeof dashboard;
  events: typeof events;
  helpers: typeof helpers;
  http: typeof http;
  migrations: typeof migrations;
  passwordMigration: typeof passwordMigration;
  personnel: typeof personnel;
  qualifications: typeof qualifications;
  ranks: typeof ranks;
  rateLimiting: typeof rateLimiting;
  schools: typeof schools;
  seed: typeof seed;
  seedActions: typeof seedActions;
  systemSettings: typeof systemSettings;
  userActions: typeof userActions;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
