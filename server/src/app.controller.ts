import { Controller, Get, Query, Header } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('youtube-embed')
  @Header('Content-Type', 'text/html')
  getYoutubeEmbed(@Query('v') videoId: string): string {
    const safeVideoId = videoId ? videoId.replace(/[^a-zA-Z0-9_-]/g, '') : '';
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          html, body, #yt-player { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #000; }
        </style>
      </head>
      <body>
        <div id="yt-player"></div>
        <script>
          var tag = document.createElement('script');
          tag.src = "https://www.youtube.com/iframe_api";
          var firstScriptTag = document.getElementsByTagName('script')[0];
          firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

          var player;
          var videoId = "${safeVideoId}";

          function onYouTubeIframeAPIReady() {
            player = new YT.Player('yt-player', {
              videoId: videoId,
              playerVars: {
                controls: 0,
                rel: 0,
                disablekb: 1,
                enablejsapi: 1,
                origin: window.location.origin
              },
              events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange
              }
            });
          }

          function onPlayerReady(event) {
            window.parent.postMessage(JSON.stringify({ event: 'initialDelivery', info: { duration: player.getDuration() } }), '*');
            
            setInterval(function() {
              if (player && player.getCurrentTime) {
                window.parent.postMessage(JSON.stringify({
                  event: 'infoDelivery',
                  info: {
                    currentTime: player.getCurrentTime(),
                    duration: player.getDuration(),
                    playerState: player.getPlayerState()
                  }
                }), '*');
              }
            }, 350);
          }

          function onPlayerStateChange(event) {
            window.parent.postMessage(JSON.stringify({ event: 'onStateChange', info: event.data }), '*');
          }

          window.addEventListener('message', function(e) {
            if (!player) return;
            try {
              var data = JSON.parse(e.data);
              if (data.event === 'command') {
                if (data.func === 'playVideo') {
                  player.playVideo();
                } else if (data.func === 'pauseVideo') {
                  player.pauseVideo();
                } else if (data.func === 'seekTo') {
                  player.seekTo(data.args[0], true);
                } else if (data.func === 'setVolume') {
                  player.setVolume(data.args[0]);
                } else if (data.func === 'mute') {
                  player.mute();
                } else if (data.func === 'unMute') {
                  player.unMute();
                }
              }
            } catch (err) {}
          });
        </script>
      </body>
      </html>
    `;
  }

  @Get('join')
  @Header('Content-Type', 'text/html')
  getJoinPage(@Query('room') roomCode: string): string {
    const safeRoomCode = roomCode ? roomCode.replace(/[^a-zA-Z0-9]/g, '') : '';
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Joining Room ${safeRoomCode}...</title>
        <style>
          body {
            background: #0b0f19;
            color: #f8fafc;
            font-family: 'Outfit', 'Inter', -apple-system, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            overflow: hidden;
          }
          .box {
            text-align: center;
            background: rgba(17, 24, 39, 0.7);
            padding: 40px;
            border-radius: 16px;
            border: 1px solid rgba(255, 255, 255, 0.08);
            backdrop-filter: blur(12px);
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            max-width: 400px;
            width: 90%;
          }
          h2 {
            margin: 0 0 10px 0;
            font-size: 22px;
            font-weight: 700;
          }
          .room-code {
            color: #6366f1;
            font-size: 26px;
            font-weight: 800;
            letter-spacing: 1px;
            display: block;
            margin: 15px 0;
          }
          p {
            color: #94a3b8;
            font-size: 14px;
            line-height: 1.5;
            margin: 0 0 20px 0;
          }
          .loader {
            width: 24px;
            height: 24px;
            border: 3px solid rgba(99, 102, 241, 0.2);
            border-top: 3px solid #6366f1;
            border-radius: 50%;
            margin: 0 auto 15px auto;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .status {
            font-size: 12px;
            color: #64748b;
          }
        </style>
      </head>
      <body>
        <div class="box">
          <div class="loader"></div>
          <h2>Joining Watch Party</h2>
          <span class="room-code">${safeRoomCode}</span>
          <p>Connecting to your Universal Watch Party extension to join the session automatically...</p>
          <div id="status" class="status">Connecting...</div>
        </div>
        <script>
          // Dispatch custom event that our content script can intercept
          setTimeout(function() {
            var event = new CustomEvent('AUTO_JOIN_ROOM', { detail: { roomCode: "${safeRoomCode}" } });
            document.dispatchEvent(event);
            document.getElementById('status').innerText = "Extension linked! Joining room now.";
          }, 800);
        </script>
      </body>
      </html>
    `;
  }
}
