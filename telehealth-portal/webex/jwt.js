/*
Copyright (c) 2020 Cisco and/or its affiliates.

This software is licensed to you under the terms of the Cisco Sample
Code License, Version 1.1 (the "License"). You may obtain a copy of the
License at

               https://developer.cisco.com/docs/licenses

All use of the material herein must be in accordance with the terms of
the License. All rights not expressly granted by the License are
reserved. Unless required by applicable law or agreed to separately in
writing, software distributed under the License is distributed on an "AS
IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
or implied.
*/
/**
 * Tools for generating a guest user token
 *
 * Online docs:
 * https://developer.webex.com/docs/guest-issuer
 */

const jwt = require('jsonwebtoken');
const uuid = require('uuid');

require('dotenv').config();

// const { GUEST_ISSUER_ID, GUEST_SHARED_SECRET, GUEST_TOKEN_EXPIRATION } = process.env;
// retrieve configured token expiration value in seconds. If none, set to 90 minutes
const tokenExpiration = parseInt(process.env.GUEST_TOKEN_EXPIRATION) || 5400;

/**
 * Creates a jwt user token
 * @param {object} options
 * @param {String} options.displayName *required*
 * @param {Number} options.expiresInSeconds
 * @param {String} options.issuer Guest Issuer ID
 * @param {String} options.userId *no spaces*
 * @returns {Promise<object>}
 */
async function createUser({ displayName }) {
  const payload = {
    name: displayName,
  };
  const options = {
    // change value of expiresIn below as needed (seconds)
    expiresIn: tokenExpiration,
    issuer: process.env.GUEST_ISSUER_ID,
    subject: uuid.v4(),
  };
  const secret = Buffer.from(process.env.GUEST_SHARED_SECRET, 'base64');
  try {
    const jwtToken = jwt.sign(payload, secret, options);
    return Promise.resolve(jwtToken);
  } catch (e) {
    return Promise.reject(e);
  }
}

module.exports = { createUser };
