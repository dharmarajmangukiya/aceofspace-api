/**
 * Route Mappings
 * (sails.config.routes)
 *
 * Your routes tell Sails what to do each time it receives a request.
 *
 * For more information on configuring custom routes, check out:
 * https://sailsjs.com/anatomy/config/routes-js
 */

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

  // 'GET /user': 'UserController.find',
  // 'POST /user': 'UserController.create',
  // 'GET /user/:id': 'UserController.findOne',
  // 'PUT /user/:id': 'UserController.update',
  // 'DELETE /user/:id': 'UserController.destroy',


   // Auth
   'POST /auth/register': 'AuthController.register',
   'POST /auth/verify-otp': 'AuthController.verifyOtp',
   'POST /auth/login': 'AuthController.login',

   // User routes (require isAuthenticated)
  'GET /user/profile': 'UserController.profile',
  'PUT /user/update': 'UserController.updateProfile',
  'POST /user/change-password': 'UserController.changePassword',

  // Admin routes (require isAdmin + isAuthenticated)
  'GET /admin/users': 'UserController.list',

   // Properties
   'POST /property': { controller: 'PropertyController', action: 'create', policy: 'isAuthenticated' },
   'GET /property': 'PropertyController.list',
   'GET /property/my': { controller: 'PropertyController', action: 'myProperties', policy: 'isAuthenticated' },


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
