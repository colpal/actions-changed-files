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
  const compareURL = github.context.payload.compare;

  if (!compareURL) {
    return [
      github.context.payload.pull_request.base.sha,
      github.context.payload.pull_request.head.sha,
    ];
  }

  const multiRegex = /([^/]+)\.\.\.([^/]+)$/;
  const multiMatches = compareURL.match(multiRegex);
  if (multiMatches) {
    const [, before, after] = multiMatches;
    return [before, after];
  }

  const singleRegex = /([^/]+$)/;
  const singleMatch = compareURL.match(singleRegex);
  if (singleMatch) {
    const [, after] = singleMatch;
    return [`${after}^`, after];
  }

  core.setFailed(`Could not determine commit SHAs from compare URL: ${compareURL}`);
  return process.exit();
}

(async () => {
  try {
    const [before, after] = getSHAs();
    core.debug(`Before:After: ${before}:${after}`);

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
    core.debug(`Raw output:\n${output}`);

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
