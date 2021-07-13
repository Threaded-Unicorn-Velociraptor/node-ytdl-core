/* eslint-disable */
console.warn = () => {};
const fs = require('fs');
const os = require('os');
const childProcess = require('child_process');
const ytdl = require('../lib');
const {readdir} = require('fs/promises');
const path = require('path');

const startTime = new Date();
let endTime, totalDurationInSeconds;

console.log(`Process started at ${startTime}`);
let tmpDir, outDir;
const tempDirPrefix = 'velociraptor-temp';
const outDirPrefix = 'velociraptor-out';
const createDir = (dirPrefix) => {
    try {
        if(!fs.existsSync(path.join(__dirname, dirPrefix))) {
            fs.mkdirSync(path.join(__dirname, dirPrefix));
        }
        return path.join(__dirname, dirPrefix);
    }
    catch (error) {
        console.error(error);
    }
}

tmpDir = createDir(tempDirPrefix);
outDir = createDir(outDirPrefix);

let childProcessIds = [];

const url = `https://www.youtube.com/watch?v=QJpZuWwdi_U`;
let bitrate, time, totalBits, rangeSize;


async function main(threadCount) {
    try {
        const data = await ytdl.getInfo(url);
        // video duration in seconds
        time = data.player_response.videoDetails.lengthSeconds;
        // select video quality based on itag - 360p selected
        const format = data.formats.filter(format => format.itag === 18);
        bitrate = format[0]["bitrate"];
        totalBits = time * bitrate;
        totalBytes = totalBits / 8;
        rangeSize = Math.floor(totalBytes / threadCount);
        const ranges = getRanges(rangeSize, threadCount);
        const fileName = "output";
        
        ranges.forEach((range, index) => {
          // create readable stream in a new child process to download video for each range calculated
            const child = childProcess.fork('./src/childProcess.js');
            console.log(`started child process ${index} with process id ${child.pid}`);
            childProcessIds.push(child.pid);
            const outputFile = `${tmpDir}/${fileName}-${index}.txt`;
            child.on('message', (message) => {
                childProcessIds = childProcessIds.filter(id => {
                    if(id === child.pid) {
                        process.kill(child.pid);
                        console.log(`killing child process ${child.pid}`);
                    }
                    return id !== child.pid;
                });
                if(childProcessIds.length === 0) {
                    console.log("killed all child processes ", childProcessIds)
                    readFiles();
                }
            });

            child.send({event: 'START', range, url, outputFile});
        });

    } catch (err) {
        console.log(err);
    }
}


const getRanges = (size, count) => {
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


const readFiles = async () => {
    try {
        const files = await readdir(tmpDir);
        const extension = ".txt";
        const textFiles = files.filter(file => file.indexOf(extension) !== -1);
        const writableStream = fs.createWriteStream(`${outDir}/output.mp4`);
        for(i = 0; i < textFiles.length; i++) {
            const isLastIndex = textFiles.length - 1 === i;
            const inputFile = `${tmpDir}/${textFiles[i]}`;
            const readFileStream = fs.createReadStream(inputFile);
            readFileStream.pipe(writableStream, {end: isLastIndex});
            await new Promise((resolve, reject) => {
                readFileStream.on('end', resolve);
                readFileStream.on('error', reject);
            })
        }
        try {
            if (tmpDir) {
              fs.rmSync(tmpDir, { recursive: true });
            }
          }
          catch (e) {
            console.error(`An error has occurred while removing the temp folder at ${tmpDir}. Please remove it manually. Error: ${e}`);
          }
        endTime = new Date();
        totalDurationInSeconds = (endTime - startTime) / 1000;
        console.log(`******************************************************`);
        console.log(`Process started at ${startTime}`);
        console.log(`Process ended at ${endTime}`);
        console.log(`Total duration of process: ${totalDurationInSeconds}`);
        console.log(`******************************************************`);
            
    } catch (err) {
        console.error(err);
    }
}

const threadCount = (os.cpus().length - 2) || 3;
const defaultThreadCount = 1;

main(threadCount);
module.exports = main;