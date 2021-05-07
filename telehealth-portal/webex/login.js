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

const axios = require('axios');

/**
 * Gets the user details of a guest user via token.
 *
 * @param {string} jwtToken
 * @returns {object} User Object from the /people/me endpoint
 */
async function loginWebexGuest(jwtToken) {
  const guestLoginOptions = {
    headers: {
      authorization: `Bearer ${jwtToken}`,
    },
    method: 'POST',
    url: 'https://api.ciscospark.com/v1/jwt/login',
  };

  try {
    const response = await axios(guestLoginOptions);
    const guestAccessToken = response.data.token;
    const getMeOptions = {
      headers: {
        authorization: `Bearer ${guestAccessToken}`,
      },
      method: 'GET',
      url: 'https://api.ciscospark.com/v1/people/me',
    };
    const guestUser = await axios(getMeOptions);

    const data = {
      guestAccessToken: guestAccessToken,
      guestAccessTokenExpiresIn: response.data.expiresIn,
      guestUser: guestUser.data
    };
    return data;
  } catch (error) {
    console.error(error);
  }
}

module.exports = { loginWebexGuest };
