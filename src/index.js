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

async function validateSHA(sha) {
  try {
    await exec('git', ['cat-file', '-e', sha], { silent: true });
    return true;
  } catch (_) {
    return false;
  }
}

async function getChangesViaGit() {
  const [before, after] = getSHAs();
  core.debug(`Before SHA: ${before}`);
  core.debug(`After SHA: ${after}`);

  if (!await validateSHA(before)) {
    core.setFailed(`The before SHA (${before}) was not found in the git log`);
    process.exit();
  }

  if (!await validateSHA(after)) {
    core.setFailed(`The after SHA (${after}) was not found in the git log`);
    process.exit();
  }

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
  return {
    added: lines.filter(([x]) => x.startsWith('A')).map(second),
    deleted: lines.filter(([x]) => x.startsWith('D')).map(second),
    modified: lines.filter(([x]) => x.startsWith('M')).map(second),
    all: lines.map(second),
  };
}

async function getChanges() {
  return getChangesViaGit();
}

(async () => {
  try {
    core.debug(JSON.stringify(github.context.payload, null, 2));
    const json = await getChanges();
    core.setOutput('json', json);
    setTextOutputs(json);
  } catch (error) {
    core.setFailed(error.message);
  }
})();
