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

var extra = 0;

$(document).ready(function(){
  $('#guestform').on('submit', function(){
    for(var i=0; i<extra; i++){
      $('#newname').val($('#newname').val()+$('#name'+i.toString()).val()+',');
      $('#newcontact').val($('#newcontact').val()+$('#contact'+i.toString()).val()+',');
    }
    return true;
  });
});

function addGuest(){
  $('#guestlist').append(`<tr><td><input type='checkbox' checked disabled></input></td><td><input type='text' id='name${extra}'></input></td><td><input type='text' id='contact${extra}'></input></td></tr>`);
  extra++;
}

function toggleGuest(e){
  if(e.checked){
    $('#old').val($('#old').val()+e.value+',');
  }else{
    $('#old').val($('#old').val().replace(e.value+',', ''));
  }
}
