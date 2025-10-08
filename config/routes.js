/**
 * Route Mappings
 * (sails.config.routes)
 *
 * This file defines all custom routes for your Sails.js application.
 * Routes tell Sails what to do each time it receives a specific HTTP request.
 *
 * For full documentation, see:
 * https://sailsjs.com/documentation/concepts/routes
 */

const API_PREFIX = '/api';

module.exports.routes = {

  /***************************************************************************
   * AUTHENTICATION ROUTES
   * -------------------------------------------------------------------------
   * Handles registration, login, OTP verification, and password management.
   ***************************************************************************/

  // User Registration & Authentication
  [`POST ${API_PREFIX}/auth/register`]: 'AuthController.register',
  [`POST ${API_PREFIX}/auth/login`]: 'AuthController.login',
  [`POST ${API_PREFIX}/auth/verify-otp`]: 'AuthController.verifyOtp',
  [`POST ${API_PREFIX}/auth/resend-otp`]: 'AuthController.resendOtp',

  // Password Management
  [`POST ${API_PREFIX}/auth/forgot-password`]: 'AuthController.forgotPassword',
  [`POST ${API_PREFIX}/auth/reset-password`]: 'AuthController.resetPassword',

  /***************************************************************************
   * USER ROUTES
   * -------------------------------------------------------------------------
   * Endpoints for user profile management and password changes.
   ***************************************************************************/

  [`GET ${API_PREFIX}/user/profile`]: 'UserController.profile',
  [`PUT ${API_PREFIX}/user/update`]: 'UserController.updateProfile',
  [`POST ${API_PREFIX}/user/change-password`]: 'UserController.changePassword',

  /***************************************************************************
   * KYC (Know Your Customer) ROUTES
   * -------------------------------------------------------------------------
   * Handles KYC upload and admin review process.
   ***************************************************************************/

  // User KYC Upload
  [`POST ${API_PREFIX}/kyc/upload`]: 'KycController.upload',

  // Admin KYC Management
  [`GET ${API_PREFIX}/admin/kyc/pending`]: 'KycController.listPending',
  [`PUT ${API_PREFIX}/admin/kyc/update/:id`]: 'KycController.updateStatus',

  /***************************************************************************
   * PROPERTY ROUTES
   * -------------------------------------------------------------------------
   * Manage properties for users and listing them publicly.
   ***************************************************************************/


  // Property APIs
  [`POST ${API_PREFIX}/property/add`]: 'PropertyController.add',
  // [`POST ${API_PREFIX}/property/upload/:id`]: 'PropertyController.uploadMedia',
  [`GET ${API_PREFIX}/property/list`]: 'PropertyController.list',
  [`GET ${API_PREFIX}/property/:id`]: 'PropertyController.detail',
  [`PUT ${API_PREFIX}/property/update/:id`]: 'PropertyController.update',
  [`DELETE ${API_PREFIX}/property/:id`]: 'PropertyController.delete',
  [`GET ${API_PREFIX}/property/search`]: 'PropertyController.search',
  [`GET ${API_PREFIX}/property/my`]: 'PropertyController.myProperties',

  // Favorite Properties APIs
  [`POST ${API_PREFIX}/favorites/add`]: 'FavoriteController.add',
  [`DELETE ${API_PREFIX}/favorites/remove`]: 'FavoriteController.remove',
  [`GET ${API_PREFIX}/favorites/list`]: 'FavoriteController.list',

  // Admin-only routes (use policy)

  [`PUT ${API_PREFIX}/admin/property/approve/:id`]: 'PropertyController.approve',

  // [`PUT ${API_PREFIX}/admin/property/approve/:id`]: {
  //   controller: 'PropertyController',
  //   action: 'approve',
  //   policy: 'isAdmin',
  // },
  // [`PUT ${API_PREFIX}/admin/property/reject/:id`]: {
  //   controller: 'PropertyController',
  //   action: 'reject',
  //   policy: 'isAdmin',
  // },

  /***************************************************************************
   * ADMIN ROUTES
   * -------------------------------------------------------------------------
   * Administrative endpoints for managing users and data.
   ***************************************************************************/

  [`GET ${API_PREFIX}/admin/users`]: 'UserController.list',

  /***************************************************************************
   * DEFAULT ROUTES
   * -------------------------------------------------------------------------
   * (Optional) You can define your homepage or other public routes here.
   ***************************************************************************/

  // '/': { view: 'pages/homepage' },

  /***************************************************************************
   * FALLBACK
   * -------------------------------------------------------------------------
   * Any request that doesn’t match a custom route will be handled by
   * Sails’ built-in “shadow routes” or static assets (if available).
   ***************************************************************************/
};
