/** Credentials - Handles email and password for influencer login and routes to models/Credentials.js */
var Credentials = require('../models/Credentials');

var credentials_controller = {};

/**
Create authentication credentials
@param {string} email - User email address on account
@param {string} password - Desired password that gets hashed
*/
credentials_controller.push = async (email, password) => {
    return await Credentials.push(email, password);
};

/**
Delete authentication credentials
@param {integer} id - Authentication id
*/
credentials_controller.remove = async (id) => {
    return await Credentials.remove(id);
};

/**
 * Delete authentication credentials
 * @param {string} email 
 */
credentials_controller.removeCredentials = async (email) => {
    return await Credentials.removeCredentials(email);
};

/**
Find authentication credentials
@param {integer} id - Authentication id
*/
credentials_controller.findByIds = async (id) => {
    return await Credentials.findByIds(id);
};

/**
 * Check authentication credentials 
 * @param {string} email the email 
 */
credentials_controller.findCredentials = async (email) => {
    return await Credentials.findCredentials(email);
};

/**
 * Find all credentials of influencers 
 */
credentials_controller.findAllCredentials = async () => {
    return await Credentials.findAllCredentials();
};

/**
Update authentication credentials
@param {integer} id - Authentication id
@param {string} email - Account email
@param {string} password - New desired password
*/
credentials_controller.update = async (id, email, password) => {
    return await Credentials.update(id, email, password);
};

/**
 * Update authentication credentials
 * @param {string} previous_email
 * @param {string} email
 * @param {string} password 
 */
credentials_controller.updateCredentials = async (previous_email, email, password) => {
    return await Credentials.updateCredentials(previous_email, email, password);
};

/**
 * Check user is authenticated.
 */
credentials_controller.authenticate = async (profile) => {
    return await Credentials.authenticate(profile);
};

module.exports = credentials_controller;
