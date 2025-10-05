/**
 * Route Mappings
 * (sails.config.routes)
 *
 * Your routes tell Sails what to do each time it receives a request.
 *
 * For more information on configuring custom routes, check out:
 * https://sailsjs.com/anatomy/config/routes-js
 */

const API_PREFIX = '/api';

module.exports.routes = {

  /***************************************************************************
  *                                                                          *
  * Make the view located at `views/homepage.ejs` your home page.            *
  *                                                                          *
  * (Alternatively, remove this and add an `index.html` file in your         *
  * `assets` directory)                                                      *
  *                                                                          *
  ***************************************************************************/

  // '/': { view: 'pages/homepage' },



  // Auth
  //  'POST /api/auth/register': 'AuthController.register',
  //  'POST /auth/verify-otp': 'AuthController.verifyOtp',
  //  'POST /auth/login': 'AuthController.login',

  [`POST ${API_PREFIX}/auth/register`]: 'AuthController.register',
  [`POST ${API_PREFIX}/auth/verify-otp`]: 'AuthController.verifyOtp',
  [`POST ${API_PREFIX}/auth/login`]: 'AuthController.login',
  [`POST ${API_PREFIX}/auth/resend-otp`]: 'AuthController.forgotPassword',
  [`POST ${API_PREFIX}/auth/resend-otp`]: 'AuthController.resendOtp',
  [`POST ${API_PREFIX}/auth/forgot-password`]: 'AuthController.forgotPassword',
  [`POST ${API_PREFIX}/auth/reset-password`]: 'AuthController.resetPassword',




  // User
  [`GET ${API_PREFIX}/user/profile`]: 'UserController.profile',
  [`PUT ${API_PREFIX}/user/update`]: 'UserController.updateProfile',
  [`POST ${API_PREFIX}/user/change-password`]: 'UserController.changePassword',


  // ============================
  // USER KYC ROUTES
  // ============================
  [`POST ${API_PREFIX}/kyc/upload`]: 'KycController.upload',

  // ============================
  // ADMIN KYC ROUTES
  // ============================
  [`GET ${API_PREFIX}/admin/kyc/pending`]: 'KycController.listPending',
  [`PUT ${API_PREFIX}/admin/kyc/update/:id`]: 'KycController.updateStatus',


  // Properties
  [`POST ${API_PREFIX}/property/add`]: 'PropertyController.add',
  [`POST ${API_PREFIX}/property/upload-image`]: 'PropertyController.uploadImage',
  [`GET ${API_PREFIX}/property/my`]: 'PropertyController.myProperties',
  [`GET ${API_PREFIX}/property/list`]: 'PropertyController.list',
  [`GET ${API_PREFIX}/property/:id`]: 'PropertyController.detail',

  // [`POST ${API_PREFIX}/property`]: { controller: 'PropertyController', action: 'create', policy: 'isAuthenticated' },
  // [`GET ${API_PREFIX}/property`]: 'PropertyController.list',
  // [`GET ${API_PREFIX}/property/my`]: { controller: 'PropertyController', action: 'myProperties', policy: 'isAuthenticated' },

  // Admin
  [`GET ${API_PREFIX}/admin/users`]: 'UserController.list',


  /***************************************************************************
  *                                                                          *
  * More custom routes here...                                               *
  * (See https://sailsjs.com/config/routes for examples.)                    *
  *                                                                          *
  * If a request to a URL doesn't match any of the routes in this file, it   *
  * is matched against "shadow routes" (e.g. blueprint routes).  If it does  *
  * not match any of those, it is matched against static assets.             *
  *                                                                          *
  ***************************************************************************/


};
