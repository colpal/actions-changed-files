const core = require('@actions/core');
const github = require('@actions/github');
const { exec } = require('@actions/exec');

function assert(boolean, message) {
  if (!boolean) {
    core.setFailed(message);
    process.exit();
  }
}
exports.assert = assert;

function second([, b]) {
  return b;
}
exports.second = second;

function setTextOutputs(o) {
  Object.keys(o).forEach((k) => {
    core.setOutput(k, o[k].join('\n'));
  });
}
exports.setTextOutputs = setTextOutputs;

function getSHAs() {
  const compareURL = github.context.payload.compare;

  assert(compareURL, 'No compare URL found within the GitHub context object!');

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
exports.getSHAs = getSHAs;

async function validateSHA(sha) {
  try {
    await exec('git', ['cat-file', '-e', sha], { silent: true });
    return true;
  } catch (_) {
    return false;
  }
}
exports.validateSHA = validateSHA;

async function gitDiff(before, after) {
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
  return output;
}
exports.gitDiff = gitDiff;

async function getChangesViaGit([before, after] = getSHAs()) {
  core.debug(`Before SHA: ${before}`);
  core.debug(`After SHA: ${after}`);

  assert(await validateSHA(before), `The before SHA (${before}) was not found in the git log`);
  assert(await validateSHA(after), `The after SHA (${after}) was not found in the git log`);

  const diff = await gitDiff(before, after);

  const lines = diff.split('\n').map((x) => x.split('\t'));
  return {
    renamed: lines.filter(([x]) => x.startsWith('R')).map(second),
    added: lines.filter(([x]) => x.startsWith('A')).map(second),
    deleted: lines.filter(([x]) => x.startsWith('D')).map(second),
    modified: lines.filter(([x]) => x.startsWith('M')).map(second),
    all: lines.map(second),
  };
}
exports.getChangesViaGit = getChangesViaGit;

async function getChangesViaAPI({
  owner,
  repo,
  pull_number, // eslint-disable-line camelcase
  token,
} = {
  owner: github.context.repo.owner,
  repo: github.context.repo.repo,
  pull_number: github.context.payload.pull_request.number,
  token: core.getInput('token', { required: true }),
}) {
  core.debug(`Owner: ${owner}`);
  core.debug(`Repository: ${repo}`);
  core.debug(`Pull Number: ${pull_number}`); // eslint-disable-line camelcase
  const response = await github.getOctokit(token).rest.pulls.listFiles({
    owner,
    repo,
    pull_number, // eslint-disable-line camelcase
    page: 1,
    per_page: 100,
  });
  const files = response.data;
  const validStatuses = new Set(['added', 'modified', 'removed', 'renamed']);
  return {
    renamed: files.filter(({ status }) => status === 'renamed').map((x) => x.filename),
    added: files.filter(({ status }) => status === 'added').map((x) => x.filename),
    modified: files.filter(({ status }) => status === 'modified').map((x) => x.filename),
    deleted: files.filter(({ status }) => status === 'removed').map((x) => x.filename),
    all: files.filter(({ status }) => validStatuses.has(status)).map((x) => x.filename),
  };
}
exports.getChangesViaAPI = getChangesViaAPI;

async function getChanges() {
  return github.context.eventName.startsWith('pull_request')
    ? getChangesViaAPI()
    : getChangesViaGit();
}
exports.getChanges = getChanges;
