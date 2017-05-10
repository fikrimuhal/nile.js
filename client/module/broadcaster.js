// import * as WebTorrent from 'webtorrent';
// import * as MediaStreamRecorder from 'msr';
const WebTorrent = require('./webtorrent.min.js');
const MediaStreamRecorder = require('msr');

class Broadcaster {
  constructor(
    recordInterval, // the Interval that the webcam recording should seed each segment of the video
    videoNodeIDForPlayback, // The id of the video node in the html where the broadcaster can see their own recording
    startStreamID, // The id of the button node that BEGINS the recording/live streaming
    stopStreamID // The id of the button node that ENDS the recording/live streaming
  ) {
    this.recordInterval = recordInterval;
    this.videoNodeIDForPlayback = videoNodeIDForPlayback;
    this.startStreamID = startStreamID;
    this.stopStreamID = stopStreamID;
  }

  startStream() {
    // interval to record video at (in ms)
    const _recordInterval = this.recordInterval;
    const sendMagnetToServer = this.sendMagnetToServer;
    console.log(sendMagnetToServer)
    let videoStream = null;
    let $video = document.getElementById(`${this.videoNodeIDForPlayback}`);

    // // set recorder
    // this.$video.defaultMuted = true;

    // allows you to see yourself while recording
    let createSrc = (window.URL) ? window.URL.createObjectURL : function (stream) { return stream };

    // creates a new instance of torrent so that user is able to seed the video/webm file
    let broadcaster = new WebTorrent();
    let magnetURI1;
    let magnetURI2;
    let magnetURI3;
    let _wasLastBroadcaster_1 = false;
    let _wasLastBroadcaster_2 = false;

    // when pressing the play button, start recording
    document.getElementById(`${this.startStreamID}`).addEventListener('click', function () {
      var mediaConstraints = {
        audio: true,
        video: true
      };

      // begin using the webcam
      navigator.getUserMedia(mediaConstraints, onMediaSuccess, onMediaError);

      function onMediaSuccess(stream) {
        let mediaRecorder = new MediaStreamRecorder(stream);
        // record a blob every _recordInterval amount of time
        mediaRecorder.start(_recordInterval);
        mediaRecorder.mimeType = 'video/webm';

        // every _recordInterval, make a new torrent file and start seeding it
        mediaRecorder.ondataavailable = function (blob) {

          const file = new File([blob], 'nilejs.webm', {
            type: 'video/webm'
          });

          // /* So that there is no delay in streaming between torrents, this section is going to 
          //  * make instances of webtorrent and then alternate the seeding between the two
          //  * once each seed is done, destroy the seed and initiate the next one
          // */
          if (_wasLastBroadcaster_1 && _wasLastBroadcaster_2) {
            if (magnetURI3) {
              broadcaster.remove(magnetURI3, function () {
                console.log('magnet removed')
              });
            }

            // start seeding the new torrent
            broadcaster.seed(file, function (torrent) {
              magnetURI3 = torrent.magnetURI;
              console.log('broadcaster3 is seeding ' + torrent.magnetURI)
              sendMagnetToServer(magnetURI3);
            });

            _wasLastBroadcaster_1 = _wasLastBroadcaster_2 = false;


          } else if (_wasLastBroadcaster_1) {
            // if there is already a seed occuring, destroy it and re-seed
            if (magnetURI2) {
              broadcaster.remove(magnetURI2, function () {
                console.log('magnet removed')
              });
            }

            // start seeding the new torrent
            broadcaster.seed(file, function (torrent) {
              magnetURI2 = torrent.magnetURI;
              console.log('broadcaster2 is seeding ' + torrent.magnetURI)
              sendMagnetToServer(magnetURI2);
            });

            _wasLastBroadcaster_2 = true;
          } else {
            if (magnetURI1) {
              broadcaster.remove(magnetURI1, function () {
                console.log('magnet removed')
              });
            }

            // start seeding the new torrent
            broadcaster.seed(file, function (torrent) {
              magnetURI1 = torrent.magnetURI;
              console.log('broadcaster3 is seeding ' + torrent.magnetURI)
              sendMagnetToServer(magnetURI1);
            });

            _wasLastBroadcaster_1 = true;
          }
        };

        // check for if an error occurs, if it does, garbage collection and return error
        broadcaster.on('error', function (err) {
          console.log('webtorrents has encountered an error', err)
        })

        // retrieve the devices that are being used to record
        videoStream = stream.getTracks();

        // play back the recording to the broadcaster
        $video.src = createSrc(stream);
        $video.play();
      }

      function onMediaError(e) {
        console.error('media error', e);
      }
    })

    // when the user pauses the video, stop the stream and send data to server
    document.getElementById(`${this.stopStreamID}`).addEventListener('click', function () {
      // Pause the video
      $video.pause();

      // stops the the audio and video from recording
      videoStream.forEach((stream) => stream.stop());
    });
  }

  // send magnet to server
  sendMagnetToServer(magnetURI) {
    // send to server
    let xhr = new XMLHttpRequest();

    xhr.open('POST', '/magnet', true);

    xhr.onreadystatechange = function () {
      if (this.status === 200) {
        console.log('Magnet Emitted')
      } else {
        console.log('Emit Failed')
      }
    }

    xhr.setRequestHeader("Content-type", "application/json");
    xhr.send(JSON.stringify({ 'magnetURI': magnetURI }));
  }
}

// export default Broadcaster
module.exports = Broadcaster