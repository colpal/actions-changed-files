const core = require('@actions/core');
const github = require('@actions/github');
const { exec } = require('@actions/exec');

function second([, b]) {
  return b;
}

function setTextOutputs(o) {
  Object.keys(o).forEach((k) => {
    core.setOutput(k, o[k].join('\n'));
  });
}

(async () => {
  try {
    if (github.context.ref.startsWith('refs/tags/')
        && github.context.payload.before === '0000000000000000000000000000000000000000') {
      const json = {
        all: [],
        added: [],
        deleted: [],
        modified: [],
      };
      core.setOutput('json', json);
      setTextOutputs(json);
      return;
    }

    const buffer = [];
    await exec('git', ['diff', '--name-status', github.context.payload.before, 'HEAD'], {
      silent: true,
      listeners: {
        stdout(data) {
          buffer.push(data.toString());
        },
      },
    });

    const lines = buffer
      .join('')
      .trim()
      .split('\n')
      .map((x) => x.split('\t'));

    const json = {
      added: lines.filter(([x]) => x.startsWith('A')).map(second),
      deleted: lines.filter(([x]) => x.startsWith('D')).map(second),
      modified: lines.filter(([x]) => x.startsWith('M')).map(second),
      all: lines.map(second),
    };

    core.setOutput('json', json);
    setTextOutputs(json);
  } catch (error) {
    core.setFailed(error.message);
  }
})();
