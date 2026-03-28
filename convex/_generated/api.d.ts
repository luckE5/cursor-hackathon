/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai from "../ai.js";
import type * as crons from "../crons.js";
import type * as friendships from "../friendships.js";
import type * as lib_password from "../lib/password.js";
import type * as lib_publicUser from "../lib/publicUser.js";
import type * as lib_time from "../lib/time.js";
import type * as lib_userAvatar from "../lib/userAvatar.js";
import type * as meetings from "../meetings.js";
import type * as organizations from "../organizations.js";
import type * as reminders from "../reminders.js";
import type * as requests from "../requests.js";
import type * as scheduler_engine from "../scheduler/engine.js";
import type * as scheduler_models from "../scheduler/models.js";
import type * as scheduler_nlParser from "../scheduler/nlParser.js";
import type * as schedules from "../schedules.js";
import type * as tasks from "../tasks.js";
import type * as users from "../users.js";
import type * as utils_email from "../utils/email.js";
import type * as utils_emailNode from "../utils/emailNode.js";
import type * as utils_timeUtils from "../utils/timeUtils.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  crons: typeof crons;
  friendships: typeof friendships;
  "lib/password": typeof lib_password;
  "lib/publicUser": typeof lib_publicUser;
  "lib/time": typeof lib_time;
  "lib/userAvatar": typeof lib_userAvatar;
  meetings: typeof meetings;
  organizations: typeof organizations;
  reminders: typeof reminders;
  requests: typeof requests;
  "scheduler/engine": typeof scheduler_engine;
  "scheduler/models": typeof scheduler_models;
  "scheduler/nlParser": typeof scheduler_nlParser;
  schedules: typeof schedules;
  tasks: typeof tasks;
  users: typeof users;
  "utils/email": typeof utils_email;
  "utils/emailNode": typeof utils_emailNode;
  "utils/timeUtils": typeof utils_timeUtils;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
