/**
 * Policy Mappings
 * (sails.config.policies)
 *
 * Policies are simple functions which run **before** your actions.
 *
 * For more information on configuring policies, check out:
 * https://sailsjs.com/docs/concepts/policies
 */

module.exports.policies = {

  /***************************************************************************
  *                                                                          *
  * Default policy for all controllers and actions, unless overridden.       *
  * (`true` allows public access)                                            *
  *                                                                          *
  ***************************************************************************/

  // '*': true,

   // Public APIs (no token needed)
    AuthController: {
      '*': true,  // allow all by default
      profile: 'isAuthenticated', // (if you want auth/profile here)
    },

    // User APIs (require token)
    UserController: {
      '*': 'isAuthenticated',   // all actions need token
      list: ['isAuthenticated', 'isAdmin'] // custom policy for admin
    },
    // ✅ Protect KYC routes
    KycController: {
      upload: 'isAuthenticated',   // users must be logged in
      listPending: ['isAuthenticated', 'isAdmin'], // admin-only
      updateStatus: ['isAuthenticated', 'isAdmin'] // admin-only
    }

};
