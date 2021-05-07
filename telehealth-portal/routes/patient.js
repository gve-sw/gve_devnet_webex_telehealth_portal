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

var express = require('express');
var router = express.Router();
const Webex = require('webex');
var nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');

require('dotenv').config();
const { createUser } = require('../webex/jwt.js');
const { loginWebexGuest } = require('../webex/login.js');

const accountSid = process.env.TWILIO_ACCOUNTSID;
const authToken = process.env.TWILIO_AUTHTOKEN;
const twilio = require('twilio')(accountSid, authToken);

let Patient = require('../models/patient.js');

// patient registration page
router.get('/register', function(req, res, next) {
  if(req.session.type == "patient" && req.session.uuid){
    res.redirect(`/patient/${req.session.uuid}`);
  }else{
    res.render('patient_register');
  }
});

// patient registration validation
router.post('/register', function(req, res, next) {
  if(req.session.type == "patient" && req.session.uuid){
    res.redirect(`/patient/${req.session.uuid}`);
  }else{
    Patient.find({ name: req.body.patient_name, medical_id: req.body.medical_id }, async (err, result) => {
      if(result.length > 0){
        patient_details = result[0];
        req.session.user = patient_details.name;
        req.session.type = "patient";

        if(!patient_details.uuid){
          // create a guest account for the patient if he / she does not have one
          console.log("Generating guest access...");
          const uuid = uuidv4();
          const displayName = patient_details.name;
          const guestJWT = await createUser({ displayName });
          const guestUser = await loginWebexGuest(guestJWT);

          const response = {
            guestJWT,
            guestAccessToken: guestUser.guestAccessToken,
            guestAccessTokenExpiresIn: guestUser.guestAccessTokenExpiresIn,
            guestUser: guestUser.guestUser
          };

          const webex = Webex.init({
            credentials: {
              access_token: guestUser.guestAccessToken
            }
          });
          const guestRoomId = await webex.rooms.create({ title: `${displayName}'s Guest Room` }).then((room) => {
            return room.id;
          });

          // save all the generated information in DB
          Patient.findOneAndUpdate({ name: req.body.patient_name, medical_id: req.body.medical_id }, {
            $set: {
              uuid: uuid,
              webex_guest: response,
              guest_room: guestRoomId
            }
          }, (err2, result2) => {
            if(err2){
              console.log(err2);
            }else{
              console.log(result2);
            }
          });

          req.session.uuid = uuid;
          req.session.access_token = guestUser.guestAccessToken;
          res.redirect(`/patient/${uuid}`);
        }else{
          req.session.uuid = patient_details.uuid;
          req.session.access_token = patient_details.webex_guest.guestAccessToken;
          res.redirect(`/patient/${patient_details.uuid}`);
        }
      }else{
        res.render('patient_register', { err: 'No record on this patient' });
      }
    });
  }
});

// patient main page
router.get('/:uuid', function(req, res, next) {
  if(req.session.type == "patient" && req.params.uuid == req.session.uuid){
    res.render('patient_main', {
      access_token: req.session.access_token,
      name: req.session.user,
      uuid: req.session.uuid
    });
  }else{
    res.redirect('/patient/register');
  }
});

// patient consultation meeting page
router.get('/:uuid/consultation', function(req, res, next){
  Patient.find({ uuid: req.params.uuid }, (err, result) => {
    if(result.length > 0){
      res.render('patient_meet', {
        access_token: result[0].webex_guest.guestAccessToken,
        destination: result[0].consultation,
        destination_type: 'userId'
      });
    }
  });
});

// patient guest room page
router.get('/:uuid/guest', function(req, res, next){
  if(req.session.type == "patient" && req.params.uuid == req.session.uuid){
    Patient.find({ uuid: req.session.uuid }, (err, result) => {
      res.render('patient_guest', {
        uuid: req.session.uuid,
        guests: result[0].guests
      });
    });
  }else{
    res.redirect('/patient/register');
  }
});

// patient sends guest the invite
router.post('/:uuid/guest', async function(req, res, next){
  var host = req.get('host');
  if(req.session.type == "patient" && req.params.uuid == req.session.uuid){
    // create a guest account for each new guest
    if(req.body.newname != ""){
      var names = req.body.newname.split(",");
      var contacts = req.body.newcontact.split(",");
      for(var i=0; i<names.length-1; i++){
        const displayName = names[i];
        const guestJWT = await createUser({ displayName });
        const guestUser = await loginWebexGuest(guestJWT);
        Patient.findOneAndUpdate({ uuid: req.session.uuid }, {
          $push: {
            guests: {
              name: names[i],
              contact: contacts[i],
              guestAccessToken: guestUser.guestAccessToken
            }
          }
        }, async (err, result) => {
          const webex = Webex.init({
            credentials: {
              access_token: req.session.access_token
            }
          });
          await webex.memberships.create({
            personId: guestUser.guestUser.id,
            roomId: result.guest_room
          });
        });
      }
    }

    // send invite link via SMS or email to guests
    var invitees = (req.body.old + req.body.newcontact).split(',');
    console.log(invitees);
    Patient.find({ uuid: req.session.uuid }, (err, result) => {
      var guests = result[0].guests;
      for(var i=0; i<invitees.length-1; i++){
        console.log(invitees[i]);
        guests.map((entry) => {
          if(entry.contact == invitees[i]){
            if(invitees[i].startsWith("+")){
              console.log("Generating SMS...");
              twilio.messages.create({
                body: `\n[Cisco Webex Telehealth Portal] ${req.session.user} invites you to his/her Guest Room. Please join via the link below.\nhttps://${host}/guest/${entry.guestAccessToken}/${result[0].guest_room}`,
                from: process.env.TWILIO_PHONE,
                to: invitees[i]
              }).then(message => console.log(message.sid));
            }else if(invitees[i].includes("@")){
              console.log("Generating email...");
              var transporter = nodemailer.createTransport({
                service: process.env.MAIL_SERVICE,
                auth: {
                  user: process.env.MAIL_USER,
                  pass: process.env.MAIL_PASS
                }
              });
              var mailOptions = {
                from: process.env.MAIL_USER,
                to: invitees[i],
                subject: `[Cisco Webex Telehealth Portal] ${req.session.user}'s Guest Room Invitation`,
                text: `${req.session.user} invites you to his/her Guest Room. Please join via the link below.\nhttps://${host}/guest/${entry.guestAccessToken}/${result[0].guest_room}`
              };
              transporter.sendMail(mailOptions, function(error, info){
                if(error){
                  console.log(error);
                }else{
                  console.log('Email sent: ' + info.response);
                }
              });
            }
          }
        });
      }
    });
    res.redirect(`/patient/${req.session.uuid}/guestroom`);
  }else{
    res.redirect('/patient/register');
  }
});

// patient joining his / her guest room for virtual visit
router.get('/:uuid/guestroom', function(req, res, next){
  if(req.session.type == "patient" && req.params.uuid == req.session.uuid){
    Patient.find({ uuid: req.session.uuid }, (err, result) => {
      res.render('patient_meet', {
        access_token: req.session.access_token,
        destination: result[0].guest_room,
        destination_type: 'spaceId'
      });
    });
  }else{
    res.redirect('/patient/register');
  }
});

module.exports = router;
