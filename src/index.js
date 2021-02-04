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
    core.setFailed('No compare URL found within the GitHub context object!');
    return process.exit();
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

  const lines = gitDiff(before, after).split('\n').map((x) => x.split('\t'));
  return {
    added: lines.filter(([x]) => x.startsWith('A')).map(second),
    deleted: lines.filter(([x]) => x.startsWith('D')).map(second),
    modified: lines.filter(([x]) => x.startsWith('M')).map(second),
    all: lines.map(second),
  };
}

async function getChangesViaAPI() {
  const token = core.getInput('token', { required: true });
  const octokit = github.getOctokit(token);
  const response = await octokit.pulls.listFiles({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    pull_number: github.context.payload.pull_request.number,
    page: 1,
    per_page: 100,
  });
  const files = response.data;
  const validStatuses = new Set(['added', 'modified', 'removed']);
  return {
    added: files.filter(({ status }) => status === 'added').map((x) => x.filename),
    modified: files.filter(({ status }) => status === 'modified').map((x) => x.filename),
    deleted: files.filter(({ status }) => status === 'removed').map((x) => x.filename),
    all: files.filter(({ status }) => validStatuses.has(status)).map((x) => x.filename),
  };
}

async function getChanges() {
  return github.context.eventName.startsWith('pull_request')
    ? getChangesViaAPI()
    : getChangesViaGit();
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
