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

function getSHAs() {
  const regex = /([^/]+)\.\.\.([^/]+)$/;
  const compareURL = github.context.payload.compare;
  const matches = compareURL.match(regex);
  if (!matches) {
    const m = `Could not determine commit SHAs from compare URL: ${compareURL}`;
    core.setFailed(m);
    throw new Error(m);
  }
  const [, before, after] = matches;
  return [before, after];
}

(async () => {
  try {
    const [before, after] = getSHAs();

    const buffer = [];
    await exec('git', ['diff', '--name-status', before, after], {
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
