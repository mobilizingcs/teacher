$(function(){
  
      
  $("#submitbutton").on("click", function createsurvey(e){
    e.preventDefault();
    var timestamp = new Date().getTime();
    var campaign_urn = "urn:campaign:lausd:admin:account_policy";
    var campaign_timestamp = "2013-08-15 10:35:03"
    var json = '[' 
      +'{ "survey_key":"'+uuid()+'", "time":'+timestamp+', "timezone":"America/Los_Angeles", "location_status":"unavailable", '
      +'"survey_launch_context": { "launch_time":'+timestamp+', "launch_timezone":"America/Los_Angeles", "active_triggers":[] }, '
      +'"survey_id":"policy1", "responses": [ { "prompt_id":"confirmPolicy", "value":1 } ] } ]';  
    oh.survey.upload(campaign_urn, campaign_timestamp, json, function(){  
        alert("Thanks for your submission, your account should be prepared in 15 minutes.");
        window.location.href = "index.html";
    });         
  });
  
  //uuid generator
  function uuid() {
   var uuid = "", i, random;
   for (i = 0; i < 32; i++) {
      random = Math.random() * 16 | 0;
      if (i == 8 || i == 12 || i == 16 || i == 20) {
         uuid += "-"
      }
        uuid += (i == 12 ? 4 : (i == 16 ? (random & 3 | 8) : random)).toString(16);
      }
    return uuid;
  }


  //init page
  oh.ping(function(){
    oh.user.whoami(function(x){
        oh.keepalive();
    });
  });
});