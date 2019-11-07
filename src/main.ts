import * as core from "@actions/core";
import { GitHub } from "@actions/github";
import fetch from "node-fetch";
import * as fs from "fs";
import * as path from "path";

async function run() {
  try {
    const token = core.getInput("github_token", { required: true });
    const baseURL = core.getInput("lona_api_base_url");
    const outputFolder = core.getInput("output_folder");
    core.setOutput("output_folder", outputFolder);

    fs.mkdirSync(path.join(process.cwd(), outputFolder), { recursive: true });

    const { GITHUB_REPOSITORY, GITHUB_SHA } = process.env;

    if (!GITHUB_REPOSITORY) {
      core.setFailed("Missing GITHUB_REPOSITORY");
      return;
    }

    if (!GITHUB_SHA) {
      core.setFailed("Missing GITHUB_SHA");
      return;
    }

    const [owner, repo] = GITHUB_REPOSITORY.split("/");

    const res = await fetch(
      `${baseURL}/getUploadURL?github_token=${encodeURIComponent(
        token
      )}&owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(
        repo
      )}&ref=${encodeURIComponent(GITHUB_SHA)}`
    );

    if (!res.ok) {
      const error = await res.json();
      core.setFailed(error.message);
      return;
    }

    const data = await res.json();

    core.setOutput("upload_url", data.uploadURL);
    core.setOutput("lona_organization_id", data.orgId);
    core.saveState("upload_url", data.uploadURL);
    core.saveState("lona_organization_id", data.orgId);

    const github = new GitHub(token);
    const deployment = await github.repos.createDeployment({
      ref: GITHUB_SHA,
      owner,
      repo,
      description: "Lona workspace documentation website"
    });

    await github.repos.createDeploymentStatus({
      deployment_id: deployment.data.id,
      repo,
      owner,
      state: "in_progress"
    });

    core.setOutput("deployment_id", `${deployment.data.id}`);
    core.saveState("deployment_id", `${deployment.data.id}`);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
