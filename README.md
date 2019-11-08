# Lona GitHub Action

A Github Action to check if Lona can run on the repo and upload a documentation website to Lona.

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
      - uses: Lona/lona-github-action@v1
        id: lona
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          workflow_succeeded: ${{ job.status == 'Success' }}
      # put some files in ${{ steps.lona.outputs.output_folder }}
```

### Inputs

- **`github_token`** _(required)_ - Required for permission to tag the repo. Usually `${{ secrets.GITHUB_TOKEN }}`.
- **`workflow_succeeded`** _(required)_ - Required for setting the deployment state. Usually `${{ job.status == 'Success' }}`.
- **`lona_api_base_url`** - The Lona API server URL.
- **`output_folder`** - The folder that will get deployed to Lona's servers.
- **`lona_deploy_url`** - The Lona URL where the websites are deployed.

### Outputs

- **`upload_url`** - The URL to upload the docs to.
- **`lona_organization_id`** - The id of the Lona organization this repo is part of.
- **`deployment_id`** - The id of the GitHub deployment that was started by this action.
- **`output_folder`** - The folder that will get deployed to Lona's servers.
