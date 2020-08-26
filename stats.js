const os = require('os');

const cpus = os.cpus();
cpus.forEach(({ model, speed }, idx) => {
  console.log(`CPU ${idx} / Speed ${speed}: ${model}`);
});
