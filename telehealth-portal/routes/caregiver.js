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
const request = require('request');
const Webex = require('webex');
var nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');

const { createUser } = require('../webex/jwt.js');
const { loginWebexGuest } = require('../webex/login.js');

require('dotenv').config();

let Caregiver = require('../models/caregiver.js');
let Patient = require('../models/patient.js');
let Outpatient = require('../models/outpatient.js');

const accountSid = process.env.TWILIO_ACCOUNTSID;
const authToken = process.env.TWILIO_AUTHTOKEN;
const twilio = require('twilio')(accountSid, authToken);

// simply for redirection
router.get('/', function(req, res ,next){
  if(req.session.type == "caregiver"){
    res.redirect('/caregiver/inpatient');
  }else{
    res.render('caregiver_login');
  }
});

// caregiver login page
router.get('/login', function(req, res, next) {
  if(req.session.type == "caregiver"){
    res.redirect('/caregiver/inpatient');
  }else{
    res.render('caregiver_login');
  }
});

// caregiver login validation
router.post('/login', function(req, res, next) {
  if(req.session.type == "caregiver"){
    res.redirect('/caregiver/inpatient');
  }else{
    Caregiver.find({username: req.body.username, password: req.body.password}, (err, result) => {
      if(result.length > 0){
        req.session.user = result[0].name;
        req.session.type = "caregiver";
        req.session.access_token = result[0].access_token;
        req.session.person_id = result[0].person_id;
        res.redirect('/caregiver/inpatient');
      }else{
        res.render('caregiver_login', { err: 'Incorrect username/password' });
      }
    });
  }
});

// caregiver landing page, for in-patient consultation
router.get('/inpatient', function(req, res, next) {
  if(req.session.type == "caregiver"){
    Patient.find({ uuid: { $exists: true } }, (err, result) => {
      res.render('caregiver_inpatient', { patients: result });
    });
  }else{
    res.redirect('/caregiver/login');
  }
});

// caregiver consultation page
router.get('/meet/:uuid', function(req, res, next){
  if(req.session.type == "caregiver"){
    Patient.findOneAndUpdate({ uuid: req.params.uuid }, {
      $set: {
        consultation: req.session.person_id
      }
    }, (err, result) => {
      if(result.phone){
        var host = req.get('host');
        // SMS is sent if the patient owns his / her device
        twilio.messages.create({
          body: `\n[Cisco Webex Telehealth Portal] Doctor ${req.session.user} requests a consultation with you. Please join the consultation via the link below.\nhttps://${host}/patient/${req.params.uuid}/consultation`,
          from: process.env.TWILIO_PHONE,
          to: result.phone
        }).then(message => console.log(message.sid))
        .catch(e => { console.error('Got an error:', e.code, e.message); });
      }else{
        // trigger web notification for patient with iPad
        const webex = Webex.init({
          credentials: {
            access_token: req.session.access_token
          }
        });
        webex.messages.create({
          toPersonId: result.webex_guest.guestUser.id,
          text: `[Call]${req.session.user}`
        });
      }
      res.render('caregiver_meet', {
        patient: result,
        access_token: req.session.access_token,
        destination_type: 'userId'
      });
    });
  }else{
    res.redirect('/caregiver/login');
  }
});

// out-patient consultation scheduling page
router.get('/outpatient', function(req, res, next) {
  if(req.session.type == "caregiver"){
    Outpatient.find({}, (err, result) => {
      res.render('caregiver_outpatient', { patients: result });
    });
  }else{
    res.redirect('/caregiver/login');
  }
});

// schedule out-patient consultation
router.post('/outpatient', async function(req, res, next) {
  if(req.session.type == "caregiver"){
    // create a guest account for patients without it
    var patient = req.body.patient.split(',');
    var uuid = uuidv4();
    const displayName = patient[0];
    const guestJWT = await createUser({ displayName });
    const guestUser = await loginWebexGuest(guestJWT);
    Outpatient.findOneAndUpdate({ name: patient[0], medical_id: patient[1], uuid: { $exists: false } },{
      $set: {
        uuid: uuid,
        guestAccessToken: guestUser.guestAccessToken,
        person_id: guestUser.guestUser.id
      }
    }, (err, result) => {
      if(result){ console.log("Added uuid & guest account"); }
    });
    // save the scheduled consultation details
    Outpatient.findOneAndUpdate({ name: patient[0], medical_id: patient[1] }, {
      $push: {
        consultation: {
          caregiver: req.session.person_id,
          date_time: Date.parse(req.body.date_time)
        }
      }
    }, (err, result) => {
      var host = req.get('host');
      if(result.contact.startsWith("+")){
        console.log("Generating SMS...");
        // create SMS for out-patient notification
        twilio.messages.create({
          body: `\n[Cisco Webex Telehealth Portal] ${req.session.user} sends you a consultation appointment at ${new Date(req.body.date_time).toString()}. Please join via the link below at the scheduled time.\nhttps://${host}/outpatient/${result.uuid}/${req.session.person_id}`,
          from: process.env.TWILIO_PHONE,
          to: result.contact
        }).then(message => console.log(message.sid));
      }else if(result.contact.includes("@")){
        console.log("Generating email...");
        // send email for out-patient notification
        var transporter = nodemailer.createTransport({
          service: process.env.MAIL_SERVICE,
          auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS
          }
        });
        var mailOptions = {
          from: process.env.MAIL_USER,
          to: result.contact,
          subject: `[Cisco Webex Telehealth Portal] ${req.session.user}'s Consultation Appointment`,
          text: `${req.session.user} sends you a consultation appointment at ${new Date(req.body.date_time).toString()}. Please join via the link below at the scheduled time.\nhttps://${host}/outpatient/${result.uuid}/${req.session.person_id}`
        };
        transporter.sendMail(mailOptions, function(error, info){
          if(error){
            console.log(error);
          }else{
            console.log('Email sent: ' + info.response);
          }
        });
      }
    });
    res.redirect('/caregiver/mycalendar');
  }else{
    res.redirect('/caregiver/login');
  }
});

// caregiver out-patient consultation meeting page
router.get('/outpatient/:uuid', function(req, res, next) {
  if(req.session.type == "caregiver"){
    Outpatient.find({ uuid: req.params.uuid }, (err, result) =>{
      res.render('caregiver_consultation', {
        patient: result[0],
        access_token: req.session.access_token,
        destination_type: 'userId'
      });
    });
  }else{
    res.redirect('/caregiver/login');
  }
});

// caregiver calendar page
router.get('/mycalendar', function(req, res, next) {
  if(req.session.type == "caregiver"){
    Outpatient.find({}, (err, result) =>{
      var consultations = [];
      for(var i=0; i<result.length; i++){
        for(var j=0; j<result[i].consultation.length; j++){
          if(result[i].consultation[j].caregiver == req.session.person_id && ((parseInt(result[i].consultation[j].date_time) - Date.now())/1000)/60 > -5){
            consultations.push({
              name: result[i].name,
              medical_id: result[i].medical_id,
              uuid: result[i].uuid,
              consultation: result[i].consultation[j]
            });
          }
        }
      }
      res.render('caregiver_mycalendar', { consultations: consultations });
    });
  }else{
    res.redirect('/caregiver/login');
  }
});

// caregiver logout
router.get('/logout', function(req, res){
	req.session.destroy((err) => {
		if(err){
			console.log("Cannot access session");
		}
	});
	res.redirect('/caregiver/login');
});

module.exports = router;
