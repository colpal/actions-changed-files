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
            output.push(data.toString().trim());
          },
        },
      },
    );
    core.setOutput('json', output);
    core.setOutput('text', output.join('\n'));
  } catch (error) {
    core.setFailed(error.message);
  }
})();
