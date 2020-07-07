const core = require('@actions/core');
const github = require('@actions/github');
const { exec } = require('@actions/exec');

(async () => {
  try {
    const output = [];
    await exec(
      'git',
      ['diff', '--name-only', github.context.payload.before, 'HEAD'],
      {
        silent: true,
        listeners: {
          stdout(data) {
            output.push(data.toString());
          },
        },
      },
    );
    core.setOutput('files', output.join('').trim());
  } catch (error) {
    core.setFailed(error.message);
  }
})();
