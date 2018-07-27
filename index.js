var express = require('express')
var app = express()
var http = require("http");
const https = require('https');
const request = require('request');
const key = 'AIzaSyANFzcN4h9L4qwdwdarPR__Nv2ETalSfVg';

const port = process.env.PORT || 5050;
app.listen(port, () => console.log('Example app listening on port' + port))


// Serve static files from the React app
// if (process.env.NODE_ENV === 'production') {
  // app.use(express.static('client/build'));
// }

// CORS Problem
app.use(function (req, res, next) {

  // Website you wish to allow to connect
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Request methods you wish to allow
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

  // Request headers you wish to allow
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, content-type');

  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader('Access-Control-Allow-Credentials', true);

  // Pass to next layer of middleware
  next();
});


let currentSecond = 0;
let video_queue = [];

let intervalObj = setInterval(() => {
  if (video_queue.length > 0) {
    currentSecond = currentSecond + 1;

    if (currentSecond === video_queue[0].duration) {
      currentSecond = 0;
      video_queue.shift();
    }
  } else {
    clearInterval(intervalObj);
  }
}, 1000);

let convert_time = (duration) => {
  console.log('before convert: ', duration);
  var a = duration.match(/\d+/g);

  if (duration.indexOf('M') >= 0 && duration.indexOf('H') == -1 && duration.indexOf('S') == -1) {
    a = [0, a[0], 0];
  }

  if (duration.indexOf('H') >= 0 && duration.indexOf('M') == -1) {
    a = [a[0], 0, a[1]];
  }
  if (duration.indexOf('H') >= 0 && duration.indexOf('M') == -1 && duration.indexOf('S') == -1) {
    a = [a[0], 0, 0];
  }

  duration = 0;

  if (a.length == 3) {
    duration = duration + parseInt(a[0]) * 3600;
    duration = duration + parseInt(a[1]) * 60;
    duration = duration + parseInt(a[2]);
  }

  if (a.length == 2) {
    duration = duration + parseInt(a[0]) * 60;
    duration = duration + parseInt(a[1]);
  }

  if (a.length == 1) {
    duration = duration + parseInt(a[0]);
  }
  console.log('after convert: ', duration);
  return duration
};


app.get('/api/getSong', (req, res) => {
  if (video_queue.length > 0) {
    let playlist = video_queue.map(obj => {
      var rObj = {};
      rObj['title'] = obj.title;
      rObj['url'] = 'https://www.youtube.com/watch?v=' + obj.id
      return rObj;
    });

    console.log('PlayList: ', playlist);

    currentSong = video_queue[0];

    res.send({
      title: currentSong.title,
      YT_id: currentSong.id,
      seconds: currentSecond,
      video_queueLength: video_queue.length,
      playlist: JSON.stringify(playlist)
    });
  } else {
    res.send('No song left');
  }
});

app.get('/api/add-song', (req, cli_res) => {
  var videoId;
  var videoTitle;
  var params = req.query;
  var keyword = params.keyword;
  console.log('params: ', params);
  https.get(`https://www.googleapis.com/youtube/v3/search?q=${keyword}&part=snippet&key=${key}&maxResults=1`, (res) => {
    res.on('data', (data) => {
      d = JSON.parse(data);
      if (d.items[0] && d.items[0].id.videoId) {
        videoId = d.items[0].id.videoId;
        videoTitle = d.items[0].snippet.title;
        console.log('request url: ', `https://content.googleapis.com/youtube/v3/videos?id=${videoId}&part=contentDetails&key=AIzaSyANFzcN4h9L4qwdwdarPR__Nv2ETalSfVg`);
        request(`https://content.googleapis.com/youtube/v3/videos?id=${videoId}&part=contentDetails&key=AIzaSyANFzcN4h9L4qwdwdarPR__Nv2ETalSfVg`, function (error, response, body) {
          if (!error && response.statusCode == 200) {
            data = JSON.parse(body);
            // console.log(data);
            videoDuration = convert_time(data.items[0].contentDetails.duration.toString());
            video_queue.push({ id: videoId, title: videoTitle, duration: videoDuration });
            console.log(video_queue);
            console.log('Song pushed in queue successfully');
            cli_res.send('Song added');
          }
        });
      }
      else
        cli_res.send('Invlid query');
    });

  }).on('error', (e) => {
    console.error(e);
  });
});

// respond with "hello world" when a GET request is made to the homepage
app.get('/', function (req, res) {
  res.send('hello world')
})

/**
 * A Bot for Slack!
 */


/**
 * Define a function for initiating a conversation on installation
 * With custom integrations, we don't have a way to find out who installed us, so we can't message them :(
 */

function onInstallation(bot, installer) {
  if (installer) {
    bot.startPrivateConversation({ user: installer }, function (err, convo) {
      if (err) {
        console.log(err);
      } else {
        convo.say('I am a bot that has just joined your team');
        convo.say('You must now /invite me to a channel so that I can be of use!');
      }
    });
  }
}


/**
 * Configure the persistence options
 */

var config = {};
if (process.env.MONGOLAB_URI) {
  var BotkitStorage = require('botkit-storage-mongo');
  config = {
    storage: BotkitStorage({ mongoUri: process.env.MONGOLAB_URI }),
  };
} else {
  config = {
    json_file_store: ((process.env.TOKEN) ? './db_slack_bot_ci/' : './db_slack_bot_a/'), //use a different name if an app or CI
  };
}

/**
 * Are being run as an app or a custom integration? The initialization will differ, depending
 */

if (process.env.TOKEN || process.env.SLACK_TOKEN) {
  //Treat this as a custom integration
  var customIntegration = require('./lib/custom_integrations');
  var token = (process.env.TOKEN) ? process.env.TOKEN : process.env.SLACK_TOKEN;
  var controller = customIntegration.configure(token, config, onInstallation);
} else if (process.env.CLIENT_ID && process.env.CLIENT_SECRET && process.env.PORT) {
  //Treat this as an app
  var app = require('./lib/apps');
  var controller = app.configure(process.env.PORT, process.env.CLIENT_ID, process.env.CLIENT_SECRET, config, onInstallation);
} else {
  console.log('Error: If this is a custom integration, please specify TOKEN in the environment. If this is an app, please specify CLIENTID, CLIENTSECRET, and PORT in the environment');
  process.exit(1);
}


/**
 * A demonstration for how to handle websocket events. In this case, just log when we have and have not
 * been disconnected from the websocket. In the future, it would be super awesome to be able to specify
 * a reconnect policy, and do reconnections automatically. In the meantime, we aren't going to attempt reconnects,
 * WHICH IS A B0RKED WAY TO HANDLE BEING DISCONNECTED. So we need to fix this.
 *
 * TODO: fixed b0rked reconnect behavior
 */
// Handle events related to the websocket connection to Slack
controller.on('rtm_open', function (bot) {
  console.log('** The RTM api just connected!');
});

controller.on('rtm_close', function (bot) {
  console.log('** The RTM api just closed');
  // you may want to attempt to re-open
});


/**
 * Core bot logic goes here!
 */
// BEGIN EDITING HERE!
controller.on('bot_channel_join', function (bot, message) {
  bot.reply(message, "I'm here!")
});


controller.hears(['.songs'], 'direct_message,direct_mention,mention', function (bot, message) {
  bot.reply(message, "http://djfolio-demo.herokuapp.com/");
});

controller.hears(['.addSong (.*)'], 'direct_message,direct_mention,mention', function (bot, message) {
  var keyword = message.match[1];
  http.get('http://djfoliobackendbot.herokuapp.com/api/add-song?keyword=' + keyword, (res) => {
    res.on('data', (data) => {
      console.log(data);
    });
    
    res.on('end', function () {
      bot.reply(message, 'Song added!');
    });

    res.on('error', function (e) {
      console.log('Problem request: ' + e.message);
      bot.reply(message, "sorry, we met some problem.");
    });
  });
});

controller.hears(['.hello', '.hi', '.greetings'], 'direct_message', function (bot, message) {
  bot.reply(message, "Hello!");
});


/**
 * Weather api testing
*/
controller.hears(['weather in (.*)', '(.*) weather'], 'direct_message,direct_mention,mention', function (bot, message) {
  var city = message.match[1];
  console.log("city: " + city);
  if (undefined === city || '' === city || null === city) {
    bot.reply(message, "I am really sorry, currently I can't guess your city.");
  } else {
    var options = {
      protocol: 'http:',
      host: 'api.openweathermap.org',
      path: '/data/2.5/weather?q=' + city + '&appid=2565b52c1ca476941c04fc1d46fdd407',
      port: 80,
      method: 'GET'
    }

    var request = http.request(options, function (response) {
      var body = "";
      response.on('data', function (data) {
        body += data;
        weather = JSON.parse(body);
        if (weather === undefined || weather.weather === undefined || weather.weather.length == 0) {
          bot.api.reactions.add({
            timestamp: message.ts,
            channel: message.channel,
            name: 'confused',
          }, function (err) {
            if (err) {
              console.log(err)
            }
            bot.reply(message, "Don't have the information for that city");
          });
        } else {
          console.log(weather.weather[0].main);
          bot.reply(message, "It " + weather.weather[0].main + " in " + city);
          var reaction = "";
          switch (weather.weather[0].main) {
            case "Clear":
              reaction = "mostly_sunny";
              bot.reply(message, ":" + reaction);
              bot.reply(message, "It's a good idea to wear sunglasses before going out");
              break;
            case "Clouds":
            case "Cloud":
              reaction = "cloud";
              bot.reply(message, ":" + reaction);
              break;
            case "Smoke":
              reaction = "smoking";
              bot.reply(message, ":" + reaction);
              break;
            case "Rain":
              reaction = "rain_cloud";
              bot.reply(message, ":" + reaction);
              bot.reply(message, "Please bring an umbrella if you are in " + city);
              break;
            case "Thunderstorm":
              reaction = "thunder_cloud_and_rain";
              bot.reply(message, ":" + reaction);
              bot.reply(message, "Please don't go out if you are in " + city);
              break;
          }
          bot.api.reactions.add({
            timestamp: message.ts,
            channel: message.channel,
            name: reaction,
          }, function (err, res) {
            if (err) {
              bot.botkit.log('Failedadd emoji reaction :(', err);
            }
          });
        }
      });

      response.on('end', function () {
        /*res.send(JSON.parse(body));*/
      });
    });

    request.on('error', function (e) {
      console.log('Problemh request: ' + e.message);
      bot.reply(message, "sorry, couldn't find weather info for city " + city);
    });
    request.end();
  }
})


/**
 * AN example of what could be:
 * Any un-handled direct mention gets a reaction and a pat response!
 */
controller.on('direct_message,mention,direct_mention', function (bot, message) {
  bot.api.reactions.add({
    timestamp: message.ts,
    channel: message.channel,
    name: 'robot_face',
  }, function (err) {
    if (err) {
      console.log(err)
    }
    bot.reply(message, 'I heard you loud and clear boss.');
  });
});
