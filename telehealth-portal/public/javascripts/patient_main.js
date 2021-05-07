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

var timer;

const webex = Webex.init({
  credentials: {
    access_token: access_token
  }
});

webex.messages.listen().then(() => {
    webex.messages.on('created', (event) => {
        if(event.data.text.startsWith('[Call]')){
            $('#caller').text(event.data.text.replace('[Call]', ''));
            $('.notification').show();
            playSound();
            timer = setTimeout(function(){
              stopSound();
              $('.notification').hide();
              botNotify(event.data.text.replace('[Call]', ''));
            }, 30000);
        }
    });
}).catch(reason => {
    console.log(reason);
});

function accept(){
  var host = window.location.host;
  window.location.href = `https://${host}/patient/${uuid}/consultation`;
}

function deny(){
  clearTimeout(timer);
  stopSound();
  $('.notification').hide();
  var text = $('#caller').text();
  botNotify(text);
}

function playSound(){
  $("#sound")[0].play();
}

function stopSound(){
  $("#sound")[0].pause();
}

function testSound(){
  playSound();
  $('.enableAudio').hide();
  setTimeout(function(){
    stopSound();
  }, 1);
}

function guestVisit(){
  var host = window.location.host;
  window.location.href = `https://${host}/patient/${uuid}/guest`;
}

function botNotify(caregiver){
  webex.messages.create({
    toPersonEmail: 'telehealthbot@webex.bot',
    text: `Unsuccessful In-Patient Consultation:\nCaregiver - ${caregiver}\nPatient - ${name}`
  });
}
