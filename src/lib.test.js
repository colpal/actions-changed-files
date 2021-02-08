const {
  getChangesViaAPI,
} = require('./lib');

test('getChangesViaAPI', async () => {
  const expected = {
    deleted: [],
    modified: ['.github/workflows/main.yaml'],
    added: ['file.txt'],
    all: ['.github/workflows/main.yaml', 'file.txt'],
  };
  const actual = await getChangesViaAPI({
    owner: 'colpal',
    repo: 'actions-changed-files',
    pull_number: 5,
    token: process.env.GITHUB_TOKEN,
  });
  return expect(actual).toStrictEqual(expected);
});
