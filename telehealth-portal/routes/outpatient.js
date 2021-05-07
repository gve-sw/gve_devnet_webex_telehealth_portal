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

let Outpatient = require('../models/outpatient');

// out-patient consultation meeting page
router.get('/:uuid/:person_id', function(req, res ,next){
  Outpatient.find({ uuid: req.params.uuid }, async (err, result) => {
    var consultations = result[0].consultation;
    for(var i=0; i<consultations.length; i++){
      if(consultations[i].caregiver == req.params.person_id && ((parseInt(consultations[i].date_time) - Date.now())/1000)/60 < 5 && ((parseInt(consultations[i].date_time) - Date.now())/1000)/60 > -5 ){
        res.render('patient_meet', {
          access_token: result[0].guestAccessToken,
          destination: req.params.person_id,
          destination_type: 'userId'
        });
      }
    }
    res.render('outpatient_early', {
      message: 'Please come back 5 minutes before the schedule time.'
    });
  });
});

module.exports = router;
