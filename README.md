Changed Files
=============

Determine which files have changed since the last workflow run.

Usage
-----

```yaml
steps:
  - uses: actions/checkout@v2
    with:
      # Be sure to set the fetch-depth to 0 to allow arbitrary analysis of previous commits
      fetch-depth: 0

  # Be sure to set an ID on the step that invokes the action. We need this later to access outputs!
  - id: changed
    uses: colpal/actions-changed-files@v2

  - run: echo '${{ steps.changed.outputs.all }}'
    # Access all changed files as a plain text list. For example:
    #   src/index.js
    #   README.md

  - run: echo '${{ steps.changed.outputs.modified }}'
    # Access the modified files as a plain text list. For example:

  - run: echo '${{ steps.changed.outputs.added }}'
    # Access the added files as a plain text list. For example:
    #   README.md

  - run: echo '${{ steps.changed.outputs.deleted }}'
    # Access the deleted files as a plain text list. For example:
    #   src/index.js

  - run: echo '${{ steps.changed.outputs.json }}'
    # Access the changed files as a JSON string with added, modified, deleted, and all keys
    #   {
    #     "all": ["src/index.js", "README.md"],
    #     "modified": [],
    #     "added": ["README.md"],
    #     "deleted": ["src/index.js"]
    #   }
```
