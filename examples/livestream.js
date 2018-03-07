#!node

'use strict';

const { spawn } = require('child_process');
const fs = require("fs")
const hlss = require('hlss');

if(process.argv.length < 7) {
    console.log("Usage: " + process.argv[1] + " <urlType> <cameraURL> <outputFolder/port> <width> <height> [transport tcp|udp]");
    process.exit(0)
}
// TODO: handle withaudio. Needs change in the ffmpeg cmd line params.
// "rtsp://root:pass@192.168.10.49:554/axis-media/media.amp?resolution=640X480&fps=15"
var urlType = process.argv[2];
var srcUrl = process.argv[3];
var width = process.argv[5];
var height = process.argv[6];
var transport = process.argv.length > 7 ? process.argv[7] : "tcp";

if(urlType == "ws") {
    var port = process.argv[4];
    const Stream = require('node-rtsp-stream');
    const stream = new Stream({
        name: 'LiveStream',
        streamUrl: srcUrl,
        wsPort: parseInt(port),
        width: width,
        height: height,
        transport: transport
    });
}
else {
    var outputFolder = process.argv[4];
    var size = width + "x" + height;
    var ffmpegParams = [];
    if(transport === "file") {
        ffmpegParams = ['-re', '-i', srcUrl, '-s', size, '-an', '-c', 'copy', '-bsf', 'h264_mp4toannexb', '-f', 'mpegts', '-'];
    }
    else {
        ffmpegParams = ['-re', '-rtsp_transport', transport, '-i', srcUrl, '-s', size, '-an', '-c', 'copy', '-bsf', 'h264_mp4toannexb', '-f', 'mpegts', '-']
    }
    const ffmpeg = spawn("ffmpeg", ffmpegParams, 
    	                  {stdio: ['ignore', 'pipe', 'ignore']});
    console.log("ffmpeg id:", ffmpeg.pid);

    const segmenter = new hlss({
      outPath: outputFolder,
      streamName: 'test',
      segDuration: 5,
      segNumber: 4,
      deleteFiles: true
    });

    segmenter.on('done', () => {
      console.log('all done!');
    });

    segmenter.start(ffmpeg.stdout);

    if(ffmpeg.stderr) {
    	ffmpeg.stderr.on('data', (data) => {
    		console.log(`ffmpeg stderr: ${data}`);
    	});
    }

    ffmpeg.on('close', (code) => {
        if(code != 0) {
        	console.log(`ffmpeg process exited (close) with code ${code}`);
        }
        process.exit(0);
    });

    ffmpeg.on('error', (code) => {
        if(code != 0) {
        	console.log(`ffmpeg process exited (error) with code ${code}`);
        }
        process.exit(0);
    });

    ffmpeg.on('exit', (code) => {
        if(code != 0) {
        	console.log(`ffmpeg process exited with code ${code}`);
        }
        process.exit(0);
    });
}
