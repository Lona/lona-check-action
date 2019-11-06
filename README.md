# Lona Check Action

A Github Action to check if Lona can run on the repo and get a URL to upload the docs.

## Usage

```yaml
name: Lona
on:
  push:
    branches:
      - master
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@master
      - uses: Lona/lona-check-action@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

### Inputs

- **github_token** _(required)_ - Required for permission to tag the repo. Usually `${{ secrets.GITHUB_TOKEN }}`.
- **lona_api_base_url** - The Lona API server URL.

### Outputs

- **output_url** - The URL to upload the docs to.
