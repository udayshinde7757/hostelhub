const fs = require('fs');

const content = fs.readFileSync('script.js', 'utf8');
const lines = content.split('\n');
let newLines = [];
let skip = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.startsWith('<<<<<<< HEAD')) {
    skip = true;
  } else if (line.startsWith('=======')) {
    skip = false;
  } else if (line.startsWith('>>>>>>>')) {
    // just skip this line
  } else {
    if (!skip) {
      newLines.push(line);
    }
  }
}

fs.writeFileSync('script.js', newLines.join('\n'), 'utf8');
console.log('Fixed script.js');
