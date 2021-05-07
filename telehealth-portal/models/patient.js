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

let mongoose = require('mongoose');

let patientSchema = mongoose.Schema({
  name: String,
	medical_id: String,
  location: String,
  phone: String,
	webex_guest: {
    guestJWT: String,
    guestAccessToken: String,
    guestAccessTokenExpiresIn: String,
    guestUser: {
      id: String,
      emails: [ String ],
      phoneNumbers: [ String ],
      displayName: String,
      nickName: String,
      avatar: String,
      orgId: String,
      created: String,
      status: String,
      type: String
    }
  },
  uuid: String,
  consultation: String,
  guests: [ {
    name: String,
    contact: String,
    guestAccessToken: String
  } ],
  guest_room: String
}, { typeKey: '$type' });

let Patient = module.exports = mongoose.model('Patient', patientSchema, 'Patient')
