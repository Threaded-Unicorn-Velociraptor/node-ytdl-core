const ytdlMultiStream = require('./index');
const os = require('os');

const threadCount = (os.cpus().length - 2) || 3;
const defaultThreadCount = 1;

ytdlMultiStream(threadCount);
ytdlMultiStream(defaultThreadCount);

