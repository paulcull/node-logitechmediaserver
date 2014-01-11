var LogitechMediaServer = require('./index');
//var lms = new LogitechMediaServer('192.168.0.106');
var lms = new LogitechMediaServer('localhost');
var player;
//var mac_address = '00:04:20:27:5f:75';   // kitchen
var mac_address = '93:15:45:55:15:fb'; //macbook

// Simple keypress detection
var readline = require('readline');
var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
// Hit enter to see the player status
rl.on('line', function (cmd) {
  console.log(player.inspect());
});

lms.on("registration_finished", function() {
  console.log("Registration finished.");

  // Find the player in the players dictionary
  player = lms.players[mac_address];
  //console.log('about to inspect'); 
  console.log(player.inspect());
  
  // For debugging/learning, output events to console.log
  // player.on("logitech_event", function(p) {
  //     console.log("logitech_event", p);
  // });

 // set subscriptions to each of the events
  'logitech_event,property,playlists,songinfo'
  .split(',').forEach(  function listenToNotification(eventName) {
    //self.app.log.debug('listening to %s on %s',eventName,mac.toUpperCase());
    player.on(eventName, function(e) {
      //ninja.devices('**** nb emit logitech event on %s for %s with value %s',mac.toUpperCase()+'-*-'+self.devices.displayProp.guid,eventName,e);
      //console.log('**** nb emit logitech event on %s for %s with value %s',mac.toUpperCase()+'-*-'+self.devices.displayProp.guid,eventName,e);
      console.log(eventName,e);
    });
  });


});

lms.start();
