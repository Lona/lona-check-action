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
    const refName = core.getInput("ref_name");
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
      )}&ref=${encodeURIComponent(refName || GITHUB_SHA)}`
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

    const isTag = !!refName && refName.startsWith("refs/tags/");

    const github = new GitHub(token);

    const deployments = await github.repos.listDeployments({
      repo,
      owner,
      ref: refName
    });

    const deployment =
      deployments && deployments.data.length
        ? deployments.data[0]
        : (await github.repos.createDeployment({
            ref: refName || GITHUB_SHA,
            owner,
            repo,
            description: "Lona workspace documentation website",
            required_contexts: [],
            environment: isTag ? "staging" : "qa",
            mediaType: {
              previews: ["ant-man-preview", "flash-preview"]
            }
          })).data;

    core.setOutput("deployment_id", `${deployment.id}`);
    core.saveState("deployment_id", `${deployment.id}`);

    if (isTag) {
      core.debug(
        `it is a tag (${refName}) so we will create the prod deployment at the same time`
      );
      const prodDeployment = await github.repos.createDeployment({
        ref: GITHUB_SHA,
        owner,
        repo,
        description: "Lona workspace documentation website - production",
        required_contexts: [],
        environment: "production",
        transient_environment: true,
        mediaType: {
          previews: ["ant-man-preview", "flash-preview"]
        }
      });

      core.saveState("deployment_prod_id", `${prodDeployment.data.id}`);

      await github.repos.createDeploymentStatus({
        deployment_id: prodDeployment.data.id,
        repo,
        owner,
        state: "in_progress",
        description:
          "Starting Lona website documentation deployment - production",
        mediaType: {
          previews: ["ant-man-preview", "flash-preview"]
        }
      });
    }

    await github.repos.createDeploymentStatus({
      deployment_id: deployment.id,
      repo,
      owner,
      state: "in_progress",
      description: "Starting Lona website documentation deployment",
      mediaType: {
        previews: ["ant-man-preview", "flash-preview"]
      }
    });
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
