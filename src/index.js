const { setOutput } = require('@actions/core');
const github = require('@actions/github');
const { exec } = require('@actions/exec');

(async () => {
  const output = [];
  await exec(
    'git',
    ['diff', '--name-only', github.event.before, 'HEAD'],
    {
      silent: true,
      listeners: {
        stdout(data) {
          output.push(data.toString());
        },
      },
    },
  );
  setOutput('files', output.join('').trim());
})();
