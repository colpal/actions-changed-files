const github = require('@actions/github');
const core = require('@actions/core');

const { getChanges, setTextOutputs } = require('./lib');

(async () => {
  try {
    core.debug(JSON.stringify(github.context, null, 2));
    const json = await getChanges();
    core.setOutput('json', json);
    setTextOutputs(json);
  } catch (error) {
    core.setFailed(error.message);
  }
})();
