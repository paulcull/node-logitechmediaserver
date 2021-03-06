var util = require('util');
var EventEmitter = require('events').EventEmitter;

function startsWith(search, s) {
    return s.substr(0,search.length) == search;
}

// TODO there is probably a better JS library function for this kind of string parsing
// but I don't know it.
function songinfoToProp(s) {
    var _ret = {};
    var _pos = 0;
    var _start = 0;
    var _lastSpace = 0;
    var _lastColon = 0;
    var _prevProp = '';
    var notFirst = false;
    var _results = '{';
    while (_pos <= s.length) {
        _char = s.substr(_pos,1);
        _Colon = _char==':' ? _pos : _lastColon;
        _Space = _char==' ' ? _pos : _lastSpace;
        // Uncomment this to see each character
        // console.log('Char is: %s ~ Colon is %s ~ Space is %s',_char,_Colon,_Space);
        if (_char==':'||_pos==s.length) {
            _PropIs = s.substr(_Space,_Colon-_Space);
            //  _PropIs = s.substr(_Space+1,_Colon-_Space-1);
            if (notFirst) {
                if (_pos==s.length) {
                    _PropValue = s.substr(_lastColon+1,_pos-_lastColon-1).trim();
                } else {
                    _PropValue = s.substr(_lastColon+1,_pos-_lastColon-1-_PropIs.length).trim();
                }
                // Uncomment this to see the songDetails properties
                // console.log('ThingIs %s and value is %s',_prevProp,_PropValue);
                if (_results.length > 1) {
                    _results = _results + ',"' + _prevProp + '":"' + _PropValue +'"';
                }else{
                    _results = _results + '"' + _prevProp + '":"' + _PropValue +'"';
                }
            } else {
                _PropValue = s.substr(_lastColon,_pos-_lastColon-_PropIs.length).trim();
                // Uncomment this to see the songDetails properties
                // console.log('ThingIs %s and value is %s',_prevProp,_PropValue);
                _results = _results + '"' + _prevProp + '":"' + _PropValue +'"';
            }
            _prevProp = _PropIs.substr(_PropIs.lastIndexOf(':')+1).trim();
            notFirst = true;
        }
        _lastSpace = _Space;
        _lastColon = _Colon;
        _pos = _pos+1;
    }
    _results = _results +'}';
    _ret = JSON.parse(_results);
    // Uncomment to see full object returned
     // console.log("results object");
     // console.log(JSON.stringify(_results));
    return _ret;
}


function SqueezePlayer(telnet) {
  var self = this;
  this.telnet = telnet;
  this.volume = 0;
  // periodically check this player's parameters
  setInterval(function() {
    self.runTelnetCmd("mixer volume ?");
    self.runTelnetCmd("signalstrength ?");
    self.runTelnetCmd("power ?");    
  }, 30 * 1000);
}
util.inherits(SqueezePlayer, EventEmitter);

SqueezePlayer.prototype.runTelnetCmd = function(cmdstring) {
    this.telnet.writeln(this.id + " " + cmdstring);
}

SqueezePlayer.prototype.handleServerData = function(strEvent, raw_buffer) {
    var self = this;
    //console.log('+++++ %s',strEvent);
    //console.log('+++++ %s',raw_buffer);
    if (startsWith("mixer volume", strEvent)) {
        var v = strEvent.match(/^mixer volume\s(.*?)$/)[1];
        // incremental change
        if (startsWith("+", v) || startsWith("-", v)) {
            self.volume += parseInt(v);
        }
        // explicit value
        else {
            self.volume = parseInt(v);
        }
        this.emit("volume", v);
    
    } else if (startsWith("playlist", strEvent)) {
        this.emit("playlist",strEvent);
    
    } else if (startsWith("current_title", strEvent)) {
        this.emit("current_title",strEvent);
    
    } else if (startsWith("songinfo", strEvent)) {
        this._songInfo = songinfoToProp(strEvent);
        this.emit('song_details',this._songInfo);
    
    } else if (startsWith("path", strEvent)) {
        // Spotify
        if (strEvent.search('spotify') > 0 ) {
            var _songPath = songinfoToProp(strEvent);
            _songPath.spotify_path = strEvent.substring(5);
            _songPath.id = strEvent.substring(21);
            _songPath.source = 'spotify';
            this.emit('spotify_details',_songPath);
        // Radio
        } else if (strEvent.search('opml.radiotime') > 0 ) {
            var _songPath = songinfoToProp(strEvent);
            _songPath.radio_path = strEvent.substring(5);
            _songPath.source = 'radio';
            this.emit('radio_details',_songPath);
        // Normal track
        } else {
            this._songPath = songinfoToProp(strEvent);
            this._songPath.source = 'file';
            this.emit('song_path',this._songPath);
        }
    } else {
        this.emit("logitech_event", strEvent);
    }
}

SqueezePlayer.prototype.getSongInfo = function(songUrl) {
    this.emit('player_log','Getting Player Current Details');
    this.runTelnetCmd("songinfo 0 100 tags:acdejlNoKRsituwxy url:"+songUrl);
}

SqueezePlayer.prototype.getPlayerSong = function() {
    this.emit('player_log','Getting Player Current Song');
    this.runTelnetCmd("path ?");
    this.runTelnetCmd("current_title ?");
}

SqueezePlayer.prototype.switchOn = function() {
    this.emit('player_log','Switching On');
    this.runTelnetCmd("power 1");
}

SqueezePlayer.prototype.switchOff = function() {
    this.emit('player_log','Switching Off');
    this.runTelnetCmd("power 0");
}

SqueezePlayer.prototype.getPower = function() {
    this.emit('player_log','Getting Power Status');
    this.runTelnetCmd("power ?");
}

SqueezePlayer.prototype.volup = function() {
    var _cmd = "button volup";
    this.emit('player_log','Function sending: '+_cmd);
    this.runTelnetCmd(_cmd);
}

SqueezePlayer.prototype.voldown = function() {
    var _cmd = "button voldown";
    this.emit('player_log','Function sending: '+_cmd);
    this.runTelnetCmd(_cmd);
}

SqueezePlayer.prototype.runcmd = function(_cmd) {
    //var _cmd = "button voldown";
    this.emit('player_log','Function sending: runcmd: '+_cmd);
    this.runTelnetCmd(_cmd);
}

SqueezePlayer.prototype.jumpfwd = function() {
    var _cmd = "button fwd.single";
    this.emit('player_log','Function sending: '+_cmd);
    this.runTelnetCmd(_cmd);}

SqueezePlayer.prototype.jumprew = function() {
    var _cmd = "button rew.single";
    this.emit('player_log','Function sending: '+_cmd);
    this.runTelnetCmd(_cmd);
}

SqueezePlayer.prototype.play = function() {
    var _cmd = "play";
    this.emit('player_log','Function sending: '+_cmd);
    this.runTelnetCmd(_cmd);
}

SqueezePlayer.prototype.pause = function() {
    var _cmd = "pause";
    this.emit('player_log','Function sending: '+_cmd);
    this.runTelnetCmd(_cmd);
}

SqueezePlayer.prototype.setProperty = function(property, state) {
    this[property] = state;
    this.emit(property, state);
}

SqueezePlayer.prototype.getNoiseLevel = function() {
    var nl = this.volume;
    if (this.mode == "stop" || this.mode == "pause" || this.mode == "off" || this.power == 0) {
        nl = 0;
    }
    return nl;
}

SqueezePlayer.prototype.inspect = function() {
    // Convenience method for debugging/logging.
    // Return self but without certain lengthy sub-objects.
    var self = this;
    var x = {};
    Object.keys(self).forEach(function(k) {
        if (["telnet", "_events"].indexOf(k) == -1) {
            x[k] = self[k];
        }
    });
    x.noise_level = self.getNoiseLevel();
    return x;
}

module.exports = SqueezePlayer;

