/* eslint-disable */
const fs = require('fs');
const os = require('os');
const childProcess = require('child_process');
const ytdl = require('../lib');

const url = `https://www.youtube.com/watch?v=QJpZuWwdi_U`;
let bitrate;
let time;
let totalBits;
let rangeSize;
const threadCount = os.cpus().length - 2 || 3;
// const threadCount = 1;
async function main() {
    try {
        const data = await ytdl.getInfo(url);
        // video duration in seconds
        time = data.player_response.videoDetails.lengthSeconds;
        // select video quality based on itag - 360p selected
        const format = data.formats.filter(format => format.itag === 22);
        bitrate = format[0]["bitrate"];
        totalBits = time * bitrate;
        totalBytes = totalBits / 8;
        rangeSize = Math.floor(totalBytes / threadCount);
        const ranges = getRanges(totalBytes, rangeSize, threadCount);
        const fileName = "output";
        
        ranges.forEach((range, index) => {
          // create readable stream in a new child process to download video for each range calculated
            const child = childProcess.fork('./src/childProcess.js');
            const outputFile = `${__dirname}/${fileName}-${index}.txt`;
            child.on('message', (message) => {
            console.log(message, new Date());
            });

            child.send({event: 'START', range, url, outputFile });
        });
        // const writable = fs.createWriteStream('Dharma.mp4');
        // readableStreams[0].pipe(writable, {end:false});
        // readableStreams[0].on('end', function() {
        //     readableStreams[1].pipe(writable);
        // })

    } catch (err) {
        console.log(err);
    }
}

main();


const getRanges = (totalBytes, size, count) => {
    const ranges = [];
    let start = 0;
    while(count > 0) {
        const rangeBlock = {};
        rangeBlock.start = start;
        rangeBlock.end = start + size;
        start = rangeBlock.end + 1;
        ranges.push(rangeBlock);
        count--;
    }
    ranges[ranges.length-1]["end"] = undefined;
    return ranges;
}

// const rs1 = fs.createReadStream('output-0.txt');
// const rs2 = fs.createReadStream('output-1.txt');

// const writable = fs.createWriteStream('Dharma.mp4');
// rs1.pipe(writable, {end:false});
// rs1.on('end', function() {
//     rs2.pipe(writable);
// })



// const createReadableStreams = chunkedOutputFiles => {
//     return chunkedOutputFiles.map((chunkedOutputFile) => {
//         return fs.createReadStream(chunkedOutputFile);
//     });
// };
