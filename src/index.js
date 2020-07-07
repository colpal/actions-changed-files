const core = require('@actions/core');
const github = require('@actions/github');
const { exec } = require('@actions/exec');

(async () => {
  if (!github || !github.context || !github.context.payload || !github.context.payload.before) {
    core.setOutput('text', '');
    core.setOutput('json', []);
    return;
  }

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
    const text = output.join('').trim();
    core.setOutput('text', text);
    const json = text.split('\n');
    core.setOutput('json', json);
  } catch (error) {
    core.setFailed(error.message);
  }
})();
