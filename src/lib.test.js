const {
  getChangesViaAPI,
  getChangesViaGit,
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

test('getChangesViaGit', async () => {
  const commit = '66aa156a21ea5745bc04198541eb31f089aa3303';
  const expected = {
    deleted: [],
    renamed: [],
    modified: ['.eslintrc.yml'],
    added: ['src/lib.test.js'],
    all: ['.eslintrc.yml', 'src/lib.test.js'],
  };
  const actual = await getChangesViaGit([`${commit}^^`, commit]);
  return expect(actual).toStrictEqual(expected);
});
