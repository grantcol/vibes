if (Meteor.isClient) {

  // SET DEFAULTS IN SESSION 

  Session.set("c_Track", "");
  Session.set("c_Playlist", []);
  Session.set("c_Count", 0);
  Session.set("isPlaying", false);
  Session.set("c_query", "");
  Session.set("c_id", "");
  Session.set("c_info", {});
  Session.set("searchCache", null);
  Session.set("hasSearched", false);

  // LAY ROUTES FOR IRON ROUTER

  Router.configure({
    layoutTemplate: 'layout'
  });

  Router.route('/', {
    name: 'startPlay'
  });

  Router.route('/search', {
    name: 'searchResults'
  });

  Router.route('/artist', {
    name: 'artistDetails'
  });

  Router.route('/album', {
    name: 'albumDetails'
  });

  Template.layout.rendered = function() {

    Bender.initialize(this.find('#content-container'));
    Bender.animate('slideRight');
    configurePlayer();

  };

  Template.mini_player.helpers({
    c_track: function () {
      return Session.get("c_Track");
    }
  });

  Template.startPlay.events({
    'keypress input': function (event) {

      if (event.charCode == 13) {

            event.stopPropagation();
            var seed = $("#seed").val();
            Session.set("c_query", seed);
            Bender.go('/search', {}, { animation : 'fadeIn' });
            return false;
      }

    }
  });

  Template.searchResults.rendered = function() {

    $('#all_results').empty();
    searchSpotify(Session.get("c_query"), new SpotifyWebApi());

  };

  Template.searchResults.events({

    'click #newSearch' : function(event) {

        event.stopPropagation();
        Bender.go('/', {}, { animation : 'fadeOut' });
        return false;

    },

    'click .artistThumbnail' : function(event) {

        var artistInfo = { 
                              id   : event.currentTarget.id
                            , name : $(event.currentTarget).data("artistname")
                            , img  : $(event.currentTarget).data("src")
                          };

        Session.set("c_id", event.currentTarget.id);
        Session.set("c_info", artistInfo);
        event.stopPropagation();
        Bender.go('/artist', {}, {animation : 'fadeOut'});
        return false;
    }

  });

  Template.artistDetails.rendered = function() {

    getSpotifyArtistDetails(Session.get("c_id"), new SpotifyWebApi());

  };

  Template.artistDetails.events({

    'click #backToBrowse' : function(event) {
      event.stopPropagation();
      Bender.go('/', {}, {animation : 'fadeOut'});
      return false;
    },

    'click .artist-top-track' : function(event) {
      getTrackObject($(event.currentTarget), addToPlaylist);
      event.stopPropagation();
      return false;
    }

  });

  if (Meteor.isServer) {
    Meteor.startup(function () {
      // code to run on server at startup
    });
  }
}


// AUXILLARY FUNCTIONS 

function getTrackObject(rawTrackElement, callback) {

  var artist = rawTrackElement.data('trackartist');
  var album  = rawTrackElement.data('trackalbum');
  var image  = rawTrackElement.data('trackimage');
  var name   = rawTrackElement.data('trackname');
  var prev   = rawTrackElement.data('trackpreview');
  var uri    = rawTrackElement.data('trackuri')
  var id     = rawTrackElement.data('trackid');
  var track  = {
                    id      : id
                  , uri     : uri
                  , prev    : prev
                  , name    : name
                  , artist  : artist
                  , album   : album
                  , image   : image
                }
  callback(track);
}

function getSpotifyArtistDetails(id, sp) {

  if(Session.get("hasSearched") == true){
    sp.getArtistTopTracks(id, 'US', function(err, data){ showArtistDetails(data); });
  }

}

function showArtistDetails(data) {

  var sp            = new SpotifyWebApi();
  var artistInfo    = Session.get("c_info");
  var artistImg     = artistInfo['img'];
  var artistName    = $("<h3 class='artist-page-title'>" + artistInfo['name'] + "</h3>");
  var tracks        = $("<table class='table'>");
  var relArtists    = $('<ul class="artist-page-related">');

  // get related artists

  sp.getArtistRelatedArtists(artistInfo['id'], function(err, data) {

      data.artists.forEach(function(artist) {
        var img = $('<div class="artist-page-related-img-wrap"></div>');
        var a   = $('<p>' + artist.name + '</p>');
        var li  = $('<li>');

        img.css('background-image', 'url(' + artist.images[0].url + ')');

        li.append(img);
        li.append(a);
        relArtists.append(li);

  }); });

   // get artist albums

  sp.getArtistAlbums(artistInfo['id'], function(err, data) {

      console.log(err, data);
      var albumTable  = $('<div class="table-responsive"' 
                          + 'style="border-collapse: seperate; border-spacing: 5px 5px;"></div>');
      var tr          = $('<tr></tr>');
      var count       = 0;

      data.items.forEach(function(album) {
        var a   = $('<a href="#"'
                  + 'data-albumid="' + album.id + '"' 
                  + 'data-albumimg="' + album.images[0].src + '"'
                  + 'data-albumartist="' + artistInfo['name'] + '"'
                  + 'data-albumuri="' + album.uri + '">');
        var img = $('<img src="' + album.images[0].url + '" alt="' + album.name + '" class="artist-page-album-thumb">');
        var td  = $('<td></td>');

        if(count == 3) { 
          albumTable.append(tr);
          tr = $('<tr></tr>');
          count = 0; 
        }

        a.append(img);
        td.append(a);
        tr.append(td);
        count++;
      }); 

      $('#artist_albums').append(albumTable);
    });
   
  var count = 1;

  data.tracks.forEach(function(track){

    var t = $('<tr>'
               + '<td>' + count + '.</td>'
               + '<td><a href="#" class="artist-top-track"'
               + 'data-trackId="'     + track.id +'"' 
               + 'data-trackUri= "'   + track.uri + '"'
               + 'data-trackPreview="'+ track.preview_url + '"'
               + 'data-trackName="'   + track.name + '"'
               + 'data-trackArtist="' + track.artists[0].name +'"' 
               + 'data-trackAlbum="'  + track.album.name +'"'
               + 'data-trackImage="'  + track.album.images[0].url +'">'
               + track.name +'</a></td></tr>');

    tracks.append(t);

    count++;

  });

  $('#popular_tracks').append(tracks);
  $('#artist_image').css('background-image', 'url(' + artistImg + ')');
  $('#related_artists').append(relArtists);
  $('#artist_name_header').append(artistName);

}

function showAlbumDetails(album) {

}

function searchSpotify(query, sp) {

  var sp_api_key_id     = "01ef7d7bedc84630b550525fd1f01026";
  var sp_api_key_secret = "bf9074872a6b4c1d9cade5833bbb4195";
  var sp_base_url       = "https://api.spotify.com/v1/";

  $("#results_title").html("Results for "+query);
  sp.searchArtists(query, function(err, data){ if( data != undefined ) { showResults(data, "artists"); } } );
  sp.searchTracks(query,  function(err, data){ if( data != undefined ) { showResults(data, "tracks");  } } );
  sp.searchAlbums(query,  function(err, data){ if( data != undefined ) { showResults(data, "albums");  } } );
  Session.set("hasSearched", true);
}


function showResults(results, type) {

  var count             = 0;
  var row               = $('<div class="row">');
  var searchResultCache = {};

  if(type == "tracks"){

    results = results.tracks.items;

  } else if(type == "albums"){

    results = results.albums.items;

  } else if(type == "artists"){

    results = results.artists.items;

  }

  results.forEach(function(result){

    var col       = $('<div class="col-sm-6 col-md-3">');
    var thumbnail = $('<div class="thumbnail">');
    var image     = ""; //TODO FILL THIS WITH A PLACEHOLDER

    if(type == "tracks"){

      if(result.album.images.length != 0) { image = result.album.images[0].url; }
      image = $('<a href="#" id="'+result.id+'" data-src="'+image+'" data-><img src="'+image+'" alt="..."></a>');
      searchResultCache[result.id] = result.id;
      Session.set("searchCache", searchResultCache);

    }
    else if(type == "albums"){

      if(result.images.length != 0) { image = result.images[0].url; }
      image = $('<a href="#" id="'+result.id+'" data-src="'+image+'"><img src="'+image+'" alt="..."></a>');
      searchResultCache[result.id] = result.id;
      Session.set("searchCache", searchResultCache);

    }
    else if(type == 'artists'){

     if(result.images.length != 0) { image = result.images[0].url; }
     image = $('<a href="#" class="artistThumbnail" id="'+result.id+'" data-src="'+image+'" data-artistname="'+result.name+'"><img src="'+image+'" alt="..."></a>');
     searchResultCache[result.id] = result.id;
     Session.set("searchCache", searchResultCache);

   }

    var caption    =  $('<div class="caption">');
    var cap_label  =  $('<h4>'+result.name+'</h4>');

    caption.append(cap_label);
    thumbnail.append(image);
    thumbnail.append(caption);
    col.append(thumbnail);

    if(count == 0){

      var newRow = $('<div class="row">');
      row = newRow;

    } 

    row.append(col);
    $("#all_results").append(row);

    if(count == 3){ count = 0; }
    else { count++; }

  });
}

// PLAYER FUNCTIONS 

function configurePlayer() {

  var player = $('#player');

  player.on('play', function() {
    Session.set("isPlaying", true);
    // Will update current track details 
  });

  player.on('pause', function() {
    Session.set("isPlaying", false);
  });

  player.on('ended', function() {
    Session.set("isPlaying", false);
    playNextTrack();
  });

}

function addTracksToPlaylist(songs) {
  songs.forEach(function(song) {
    addToPlaylist(song);
  });
}

function addToPlaylist(song) {
  console.log(song);
  var embedHeader   = 'https://embed.spotify.com/?uri=';
  var trackDetails  = { 
                              fullUrl      : embedHeader+song.uri
                            , trackUri     : song.uri 
                            , trackpreview : song.prev
                            , trackName    : song.name
                            , trackArtist  : song.artist
                            , trackAlbum   : song.album
                            , trackImage   : song.image
                      };

  var pl = Session.get("c_Playlist");
  pl.push(trackDetails);
  Session.set("c_Playlist", pl);

  if(!Session.get("isPlaying")) { playNextTrack(); }

}

function playNextTrack() {

  var player    = $('#player');
  var playlist  = Session.get("c_Playlist");
  var currTrack = Session.get("c_Track");
  var currCount = Session.get("c_Count");
  var nextTrack = playlist[currCount];

  player.get(0).src = nextTrack.trackpreview;
  player.load();
  player.get(0).volume = 1;
  currTrack = nextTrack;
  player.get(0).play();

  Session.set("c_Track", currTrack);
  Session.set("c_Count", currCount);
  Session.set("isPlaying", true);

}

/* TODO: PUT THIS WRAPPER IN PACKAGE */
var SpotifyWebApi = (function() {

  'use strict';
  var _baseUri = 'https://api.spotify.com/v1';
  var _accessToken = null;
  var _promiseImplementation = null;

  var _promiseProvider = function(promiseFunction) {
    if (_promiseImplementation !== null) {
      var deferred = _promiseImplementation.defer();
      promiseFunction(function(resolvedResult) {
        deferred.resolve(resolvedResult);
      }, function(rejectedResult) {
        deferred.reject(rejectedResult);
      });
      return deferred.promise;
    } else {
      if (window.Promise) {
        return new window.Promise(promiseFunction);
      }
    }
    return null;
  };

  var _checkParamsAndPerformRequest = function(requestData, options, callback) {
    var opt = {};
    var cb = null;

    if (typeof options === 'object') {
      opt = options;
      cb = callback;
    } else if (typeof options === 'function') {
      cb = options;
    }

    // options extend postData, if any. Otherwise they extend parameters sent in the url
    var type = requestData.type || 'GET';
    if (type !== 'GET' && requestData.postData) {
      requestData.postData = _extend(requestData.postData, opt);
    } else {
      requestData.params = _extend(requestData.params, opt);
    }
    return _performRequest(requestData, cb);
  };

  var _performRequest = function(requestData, callback) {
    var promiseFunction = function(resolve, reject) {
      var req = new XMLHttpRequest();
      var type = requestData.type || 'GET';
      req.open(type, _buildUrl(requestData.url, requestData.params));
      if (_accessToken) {
        req.setRequestHeader('Authorization', 'Bearer ' + _accessToken);
      }

      req.onreadystatechange = function() {
        if (req.readyState === 4) {
          var data = null;
          try {
            data = req.responseText ? JSON.parse(req.responseText) : '';
          } catch (e) {}

          if (req.status === 200 || req.status === 201) {
            if (resolve) {
              resolve(data);
            }
            if (callback) {
              callback(null, data);
            }
          } else {
            if (reject) {
              reject(req);
            }
            if (callback) {
              callback(req, null);
            }
          }
        }
      };

      if (type === 'GET') {
        req.send(null);
      } else {
        req.send(JSON.stringify(requestData.postData));
      }
    };

    if (callback) {
      promiseFunction();
      return null;
    } else {
      return _promiseProvider(promiseFunction);
    }
  };

  var _extend = function() {
    var args = Array.prototype.slice.call(arguments);
    var target = args[0];
    var objects = args.slice(1);
    target = target || {};
    for (var i = 0; i < objects.length; i++) {
      for (var j in objects[i]) {
        target[j] = objects[i][j];
      }
    }
    return target;
  };

  var _buildUrl = function(url, parameters){
    var qs = '';
    for (var key in parameters) {
      if (parameters.hasOwnProperty(key)) {
        var value = parameters[key];
        qs += encodeURIComponent(key) + '=' + encodeURIComponent(value) + '&';
      }
    }
    if (qs.length > 0){
      qs = qs.substring(0, qs.length - 1); //chop off last '&'
      url = url + '?' + qs;
    }
    return url;
  };

  var Constr = function() {};

  Constr.prototype = {
    constructor: SpotifyWebApi
  };

  /**
   * Fetches a resource through a generic GET request.
   * @param {string} url The URL to be fetched
   * @param {function(Object, Object)} callback An optional callback
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getGeneric = function(url, callback) {
    var requestData = {
      url: url
    };
    return _checkParamsAndPerformRequest(requestData, callback);
  };

  /**
   * Fetches information about the current user.
   * See [Get Current User's Profile](https://developer.spotify.com/web-api/get-current-users-profile/) on
   * the Spotify Developer site for more information about the endpoint.
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object, Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getMe = function(options, callback) {
    var requestData = {
      url: _baseUri + '/me'
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Fetches current user's saved tracks.
   * See [Get Current User's Saved Tracks](https://developer.spotify.com/web-api/get-users-saved-tracks/) on
   * the Spotify Developer site for more information about the endpoint.
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object, Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getMySavedTracks = function(options, callback) {
    var requestData = {
      url: _baseUri + '/me/tracks'
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Adds a list of tracks to the current user's saved tracks.
   * See [Save Tracks for Current User](https://developer.spotify.com/web-api/save-tracks-user/) on
   * the Spotify Developer site for more information about the endpoint.
   * @param {Array<string>} trackIds The ids of the tracks. If you know their Spotify URI it is easy
   * to find their track id (e.g. spotify:track:<here_is_the_track_id>)
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object, Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.addToMySavedTracks = function(trackIds, options, callback) {
    var requestData = {
      url: _baseUri + '/me/tracks',
      type: 'PUT',
      postData: trackIds
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Remove a list of tracks from the current user's saved tracks.
   * See [Remove Tracks for Current User](https://developer.spotify.com/web-api/remove-tracks-user/) on
   * the Spotify Developer site for more information about the endpoint.
   * @param {Array<string>} trackIds The ids of the tracks. If you know their Spotify URI it is easy
   * to find their track id (e.g. spotify:track:<here_is_the_track_id>)
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object, Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.removeFromMySavedTracks = function(trackIds, options, callback) {
    var requestData = {
      url: _baseUri + '/me/tracks',
      type: 'DELETE',
      postData: trackIds
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Checks if the current user's saved tracks contains a certain list of tracks.
   * See [Check Current User's Saved Tracks](https://developer.spotify.com/web-api/check-users-saved-tracks/) on
   * the Spotify Developer site for more information about the endpoint.
   * @param {Array<string>} trackIds The ids of the tracks. If you know their Spotify URI it is easy
   * to find their track id (e.g. spotify:track:<here_is_the_track_id>)
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object, Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.containsMySavedTracks = function(trackIds, options, callback) {
    var requestData = {
      url: _baseUri + '/me/tracks/contains',
      params: { ids: trackIds.join(',') }
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Fetches information about a specific user.
   * See [Get a User's Profile](https://developer.spotify.com/web-api/get-users-profile/) on
   * the Spotify Developer site for more information about the endpoint.
   * @param {string} userId The id of the user. If you know the Spotify URI it is easy
   * to find the id (e.g. spotify:user:<here_is_the_id>)
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object, Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getUser = function(userId, options, callback) {
    var requestData = {
      url: _baseUri + '/users/' + userId
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Fetches a list of the current user's playlists.
   * See [Get a List of a User's Playlists](https://developer.spotify.com/web-api/get-list-users-playlists/) on
   * the Spotify Developer site for more information about the endpoint.
   * @param {string} userId The id of the user. If you know the Spotify URI it is easy
   * to find the id (e.g. spotify:user:<here_is_the_id>)
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object, Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getUserPlaylists = function(userId, options, callback) {
    var requestData = {
      url: _baseUri + '/users/' + userId + '/playlists'
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Fetches a specific playlist.
   * See [Get a Playlist](https://developer.spotify.com/web-api/get-playlist/) on
   * the Spotify Developer site for more information about the endpoint.
   * @param {string} userId The id of the user. If you know the Spotify URI it is easy
   * to find the user id (e.g. spotify:user:<here_is_the_user_id>:playlist:xxxx)
   * @param {string} playlistId The id of the playlist. If you know the Spotify URI it is easy
   * to find the playlist id (e.g. spotify:user:xxxx:playlist:<here_is_the_playlist_id>)
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object, Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getPlaylist = function(userId, playlistId, options, callback) {
    var requestData = {
      url: _baseUri + '/users/' + userId + '/playlists/' + playlistId
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Fetches the tracks from a specific playlist.
   * See [Get a Playlist's Tracks](https://developer.spotify.com/web-api/get-playlists-tracks/) on
   * the Spotify Developer site for more information about the endpoint.
   * @param {string} userId The id of the user. If you know the Spotify URI it is easy
   * to find the user id (e.g. spotify:user:<here_is_the_user_id>:playlist:xxxx)
   * @param {string} playlistId The id of the playlist. If you know the Spotify URI it is easy
   * to find the playlist id (e.g. spotify:user:xxxx:playlist:<here_is_the_playlist_id>)
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object, Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getPlaylistTracks = function(userId, playlistId, options, callback) {
    var requestData = {
      url: _baseUri + '/users/' + userId + '/playlists/' + playlistId + '/tracks'
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Creates a playlist and stores it in the current user's library.
   * See [Create a Playlist](https://developer.spotify.com/web-api/create-playlist/) on
   * the Spotify Developer site for more information about the endpoint.
   * @param {string} userId The id of the user. You may want to user the "getMe" function to
   * find out the id of the current logged in user
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object, Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.createPlaylist = function(userId, options, callback) {
    var requestData = {
      url: _baseUri + '/users/' + userId + '/playlists',
      type: 'POST',
      postData: options
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Change a playlist's name and public/private state
   * See [Change a Playlist's Details](https://developer.spotify.com/web-api/change-playlist-details/) on
   * the Spotify Developer site for more information about the endpoint.
   * @param {string} userId The id of the user. You may want to user the "getMe" function to
   * find out the id of the current logged in user
   * @param {string} playlistId The id of the playlist. If you know the Spotify URI it is easy
   * to find the playlist id (e.g. spotify:user:xxxx:playlist:<here_is_the_playlist_id>)
   * @param {Object} data A JSON object with the data to update. E.g. {name: 'A new name', public: true}
   * @param {function(Object, Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.changePlaylistDetails = function(userId, playlistId, data, callback) {
    var requestData = {
      url: _baseUri + '/users/' + userId + '/playlists/' + playlistId,
      type: 'PUT',
      postData: data
    };
    return _checkParamsAndPerformRequest(requestData, data, callback);
  };

  /**
   * Add tracks to a playlist.
   * See [Add Tracks to a Playlist](https://developer.spotify.com/web-api/add-tracks-to-playlist/) on
   * the Spotify Developer site for more information about the endpoint.
   * @param {string} userId The id of the user. If you know the Spotify URI it is easy
   * to find the user id (e.g. spotify:user:<here_is_the_user_id>:playlist:xxxx)
   * @param {string} playlistId The id of the playlist. If you know the Spotify URI it is easy
   * to find the playlist id (e.g. spotify:user:xxxx:playlist:<here_is_the_playlist_id>)
   * @param {Array<string>} uris An array of Spotify URIs for the tracks
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object, Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.addTracksToPlaylist = function(userId, playlistId, uris, options, callback) {
    var requestData = {
      url: _baseUri + '/users/' + userId + '/playlists/' + playlistId + '/tracks',
      type: 'POST',
      params: {
        uris: uris
      }
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Replace the tracks of a plsylist
   * See [Replace a Playlist's Tracks](https://developer.spotify.com/web-api/replace-playlists-tracks/) on
   * the Spotify Developer site for more information about the endpoint.
   * @param {string} userId The id of the user. If you know the Spotify URI it is easy
   * to find the user id (e.g. spotify:user:<here_is_the_user_id>:playlist:xxxx)
   * @param {string} playlistId The id of the playlist. If you know the Spotify URI it is easy
   * to find the playlist id (e.g. spotify:user:xxxx:playlist:<here_is_the_playlist_id>)
   * @param {Array<string>} uris An array of Spotify URIs for the tracks
   * @param {function(Object, Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.replaceTracksInPlaylist = function(userId, playlistId, uris, callback) {
    var requestData = {
      url: _baseUri + '/users/' + userId + '/playlists/' + playlistId + '/tracks',
      type: 'PUT',
      postData: {uris: uris}
    };
    return _checkParamsAndPerformRequest(requestData, {}, callback);
  };

  /**
   * Remove tracks from a playlist
   * See [Remove Tracks from a Playlist](https://developer.spotify.com/web-api/remove-tracks-playlist/) on
   * the Spotify Developer site for more information about the endpoint.
   * @param {string} userId The id of the user. If you know the Spotify URI it is easy
   * to find the user id (e.g. spotify:user:<here_is_the_user_id>:playlist:xxxx)
   * @param {string} playlistId The id of the playlist. If you know the Spotify URI it is easy
   * to find the playlist id (e.g. spotify:user:xxxx:playlist:<here_is_the_playlist_id>)
   * @param {Array<Object>} uris An array of tracks to be removed. Each element of the array can be either a
   * string, in which case it is treated as a URI, or an object containing the properties `uri` (which is a
   * string) and `positions` (which is an array of integers).
   * @param {function(Object, Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.removeTracksFromPlaylist = function(userId, playlistId, uris, callback) {
    var dataToBeSent = uris.map(function(uri) {
      if (typeof uri === 'string') {
        return { uri: uri };
      } else {
        return uri;
      }
    });

    var requestData = {
      url: _baseUri + '/users/' + userId + '/playlists/' + playlistId + '/tracks',
      type: 'DELETE',
      postData: {tracks: dataToBeSent}
    };
    return _checkParamsAndPerformRequest(requestData, {}, callback);
  };

  /**
   * Remove tracks from a playlist, specifying a snapshot id.
   * See [Remove Tracks from a Playlist](https://developer.spotify.com/web-api/remove-tracks-playlist/) on
   * the Spotify Developer site for more information about the endpoint.
   * @param {string} userId The id of the user. If you know the Spotify URI it is easy
   * to find the user id (e.g. spotify:user:<here_is_the_user_id>:playlist:xxxx)
   * @param {string} playlistId The id of the playlist. If you know the Spotify URI it is easy
   * to find the playlist id (e.g. spotify:user:xxxx:playlist:<here_is_the_playlist_id>)
   * @param {Array<Object>} uris An array of tracks to be removed. Each element of the array can be either a
   * string, in which case it is treated as a URI, or an object containing the properties `uri` (which is a
   * string) and `positions` (which is an array of integers).
   * @param {string} snapshotId The playlist's snapshot ID against which you want to make the changes
   * @param {function(Object, Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.removeTracksFromPlaylistWithSnapshotId = function(userId, playlistId, uris, snapshotId, callback) {
    /*jshint camelcase: false */
    var dataToBeSent = uris.map(function(uri) {
      if (typeof uri === 'string') {
        return { uri: uri };
      } else {
        return uri;
      }
    });

    var requestData = {
      url: _baseUri + '/users/' + userId + '/playlists/' + playlistId + '/tracks',
      type: 'DELETE',
      postData: {
        tracks: dataToBeSent,
        snapshot_id: snapshotId
      }
    };
    return _checkParamsAndPerformRequest(requestData, {}, callback);
  };
  /**
   * Fetches an album from the Spotify catalog.
   * See [Get an Album](https://developer.spotify.com/web-api/get-album/) on
   * the Spotify Developer site for more information about the endpoint.
   * @param {string} albumId The id of the album. If you know the Spotify URI it is easy
   * to find the album id (e.g. spotify:album:<here_is_the_album_id>)
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object, Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getAlbum = function(albumId, options, callback) {
    var requestData = {
      url: _baseUri + '/albums/' + albumId
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Fetches the tracks of an album from the Spotify catalog.
   * See [Get an Album's Tracks](https://developer.spotify.com/web-api/get-albums-tracks/) on
   * the Spotify Developer site for more information about the endpoint.
   * @param {string} albumId The id of the album. If you know the Spotify URI it is easy
   * to find the album id (e.g. spotify:album:<here_is_the_album_id>)
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object, Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getAlbumTracks = function(albumId, options, callback) {
    var requestData = {
      url: _baseUri + '/albums/' + albumId + '/tracks'
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Fetches multiple albums from the Spotify catalog.
   * See [Get Several Albums](https://developer.spotify.com/web-api/get-several-albums/) on
   * the Spotify Developer site for more information about the endpoint.
   * @param {Array<string>} albumIds The ids of the albums. If you know their Spotify URI it is easy
   * to find their album id (e.g. spotify:album:<here_is_the_album_id>)
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object, Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getAlbums = function(albumIds, options, callback) {
    var requestData = {
      url: _baseUri + '/albums/',
      params: { ids: albumIds.join(',') }
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Fetches a track from the Spotify catalog.
   * See [Get a Track](https://developer.spotify.com/web-api/get-track/) on
   * the Spotify Developer site for more information about the endpoint.
   * @param {string} trackId The id of the track. If you know the Spotify URI it is easy
   * to find the track id (e.g. spotify:track:<here_is_the_track_id>)
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object, Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getTrack = function(trackId, options, callback) {
    var requestData = {};
    requestData.url = _baseUri + '/tracks/' + trackId;
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Fetches multiple tracks from the Spotify catalog.
   * See [Get Several Tracks](https://developer.spotify.com/web-api/get-several-tracks/) on
   * the Spotify Developer site for more information about the endpoint.
   * @param {Array<string>} trackIds The ids of the tracks. If you know their Spotify URI it is easy
   * to find their track id (e.g. spotify:track:<here_is_the_track_id>)
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object, Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getTracks = function(trackIds, options, callback) {
    var requestData = {
      url: _baseUri + '/tracks/',
      params: { ids: trackIds.join(',') }
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Fetches an artist from the Spotify catalog.
   * See [Get an Artist](https://developer.spotify.com/web-api/get-artist/) on
   * the Spotify Developer site for more information about the endpoint.
   * @param {string} artistId The id of the artist. If you know the Spotify URI it is easy
   * to find the artist id (e.g. spotify:artist:<here_is_the_artist_id>)
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object, Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getArtist = function(artistId, options, callback) {
    var requestData = {
      url: _baseUri + '/artists/' + artistId
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Fetches multiple artists from the Spotify catalog.
   * See [Get Several Artists](https://developer.spotify.com/web-api/get-several-artists/) on
   * the Spotify Developer site for more information about the endpoint.
   * @param {Array<string>} artistIds The ids of the artists. If you know their Spotify URI it is easy
   * to find their artist id (e.g. spotify:artist:<here_is_the_artist_id>)
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object, Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getArtists = function(artistIds, options, callback) {
    var requestData = {
      url: _baseUri + '/artists/',
      params: { ids: artistIds.join(',') }
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Fetches the albums of an artist from the Spotify catalog.
   * See [Get an Artist's Albums](https://developer.spotify.com/web-api/get-artists-albums/) on
   * the Spotify Developer site for more information about the endpoint.
   * @param {string} artistId The id of the artist. If you know the Spotify URI it is easy
   * to find the artist id (e.g. spotify:artist:<here_is_the_artist_id>)
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object, Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getArtistAlbums = function(artistId, options, callback) {
    var requestData = {
      url: _baseUri + '/artists/' + artistId + '/albums'
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Fetches a list of top tracks of an artist from the Spotify catalog, for a specific country.
   * See [Get an Artist's Top Tracks](https://developer.spotify.com/web-api/get-artists-top-tracks/) on
   * the Spotify Developer site for more information about the endpoint.
   * @param {string} artistId The id of the artist. If you know the Spotify URI it is easy
   * to find the artist id (e.g. spotify:artist:<here_is_the_artist_id>)
   * @param {string} countryId The id of the country (e.g. ES for Spain or US for United States)
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object, Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getArtistTopTracks = function(artistId, countryId, options, callback) {
    var requestData = {
      url: _baseUri + '/artists/' + artistId + '/top-tracks',
      params: { country: countryId }
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Fetches a list of artists related with a given one from the Spotify catalog.
   * See [Get an Artist's Related Artists](https://developer.spotify.com/web-api/get-related-artists/) on
   * the Spotify Developer site for more information about the endpoint.
   * @param {string} artistId The id of the artist. If you know the Spotify URI it is easy
   * to find the artist id (e.g. spotify:artist:<here_is_the_artist_id>)
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object, Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getArtistRelatedArtists = function(artistId, options, callback) {
    var requestData = {
      url: _baseUri + '/artists/' + artistId + '/related-artists'
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Fetches a list of Spotify featured playlists (shown, for example, on a Spotify player's "Browse" tab).
   * See [Get a List of Featured Playlists](https://developer.spotify.com/web-api/get-list-featured-playlists/) on
   * the Spotify Developer site for more information about the endpoint.
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object, Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getFeaturedPlaylists = function(options, callback) {
    var requestData = {
      url: _baseUri + '/browse/featured-playlists'
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Fetches a list of new album releases featured in Spotify (shown, for example, on a Spotify player's "Browse" tab).
   * See [Get a List of New Releases](https://developer.spotify.com/web-api/get-list-new-releases/) on
   * the Spotify Developer site for more information about the endpoint.
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object, Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getNewReleases = function(options, callback) {
    var requestData = {
      url: _baseUri + '/browse/new-releases'
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Fetches albums from the Spotify catalog according to a query.
   * See [Search for an Item](https://developer.spotify.com/web-api/search-item/) on
   * the Spotify Developer site for more information about the endpoint.
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object, Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.searchAlbums = function(query, options, callback) {
    var requestData = {
      url: _baseUri + '/search/',
      params: {
        q: query,
        type: 'album'
      }
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Fetches artists from the Spotify catalog according to a query.
   * See [Search for an Item](https://developer.spotify.com/web-api/search-item/) on
   * the Spotify Developer site for more information about the endpoint.
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object, Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.searchArtists = function(query, options, callback) {
    var requestData = {
      url: _baseUri + '/search/',
      params: {
        q: query,
        type: 'artist'
      }
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Fetches tracks from the Spotify catalog according to a query.
   * See [Search for an Item](https://developer.spotify.com/web-api/search-item/) on
   * the Spotify Developer site for more information about the endpoint.
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object, Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.searchTracks = function(query, options, callback) {
    var requestData = {
      url: _baseUri + '/search/',
      params: {
        q: query,
        type: 'track'
      }
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Fetches playlists from the Spotify catalog according to a query.
   * See [Search for an Item](https://developer.spotify.com/web-api/search-item/) on
   * the Spotify Developer site for more information about the endpoint.
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object, Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.searchPlaylists = function(query, options, callback) {
    var requestData = {
      url: _baseUri + '/search/',
      params: {
        q: query,
        type: 'playlist'
      }
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Sets the access token to be used.
   * See [the Authorization Guide](https://developer.spotify.com/web-api/authorization-guide/) on
   * the Spotify Developer site for more information about obtaining an access token.
   * @param {string} accessToken The access token
   */
  Constr.prototype.setAccessToken = function(accessToken) {
    _accessToken = accessToken;
  };

  /**
   * Sets an implementation of Promises/A+ to be used. E.g. Q, when.
   * See [Conformant Implementations](https://github.com/promises-aplus/promises-spec/blob/master/implementations.md)
   * for a list of some available options
   * @param {Object} promiseImplementation A Promises/A+ valid implementation
   */
  Constr.prototype.setPromiseImplementation = function(promiseImplementation) {
    if (!('defer' in promiseImplementation)) {
      throw new Error('Unsupported implementation of Promises/A+');
    } else {
      _promiseImplementation = promiseImplementation;
    }
  };

  return Constr;
})();
