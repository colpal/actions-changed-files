Changed Files
=============

Determine which files have changed since the last workflow run.

Usage
-----

```yaml
steps:
  - uses: actions/checkout@v2.3.1
    with:
      fetch-depth: 0 # Be sure to set the fetch-depth to 0 to allow arbitrary analysis of previous commits

# - ...

  - id: changed # Be sure to set an ID on the step that invokes this action. We need this later to access outputs!
    uses: colpal/actions-changed-files@v1.0.0

  - run: echo '${{ steps.changed.outputs.text }}'
    # Access the changed files as a plain text list. For example:
    #   src/index.js
    #   README.md

  - run: echo '${{ steps.changed.outputs.json }}'
    # Access the changed files as a JSON formatted array. For example:
    #   ["src/index.js", "README.md"]
```
