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
  core.debug(`Event Name: ${github.context.eventName}`);
  switch (github.context.eventName) {
    case 'pull_request':
      return [
        github.context.payload.pull_request.base.sha,
        github.context.payload.pull_request.head.sha,
      ];
    case 'push':
      return [
        (github.context.payload.before === '0000000000000000000000000000000000000000'
          ? 'HEAD^'
          : github.context.payload.before),
        github.context.payload.after,
      ];
    default: {
      const m = `Unsupported event type: ${github.context.eventName}`;
      core.setFailed(m);
      throw new Error(m);
    }
  }
}

(async () => {
  try {
    const [before, after] = getSHAs();

    core.debug(`SHAs: ${before}, ${after}`);

    const buffer = [];
    await exec('git', ['diff', '--name-status', before, after], {
      silent: true,
      listeners: {
        stdout(data) {
          buffer.push(data.toString());
        },
      },
    });

    const output = buffer.join('').trim();
    core.debug(`Output: ${output}`);

    const lines = output.split('\n').map((x) => x.split('\t'));

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
