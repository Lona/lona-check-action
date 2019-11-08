import * as core from "@actions/core";
import { GitHub } from "@actions/github";
import JSZip from "jszip";
import klaw from "klaw";
import * as fs from "fs";
import * as path from "path";
import fetch from "node-fetch";

async function run() {
  console.log(process.env);
  try {
    const deploymentId = core.getState("deployment_id");
    if (!deploymentId) {
      // we didn't completed the main step so bail out
      return;
    }

    const deployment_id = parseInt(deploymentId);
    const token = core.getInput("github_token", { required: true });
    const outputPath = core.getInput("output_folder");
    const uploadURL = core.getState("upload_url");

    const { GITHUB_REPOSITORY, GITHUB_SHA } = process.env;

    if (!GITHUB_REPOSITORY) {
      throw new Error("Missing GITHUB_REPOSITORY");
    }

    const [owner, repo] = GITHUB_REPOSITORY.split("/");

    const github = new GitHub(token);

    if (process.env.WORKFLOW_SUCCEEDED !== "true") {
      await github.repos.createDeploymentStatus({
        deployment_id,
        repo,
        owner,
        state: "failure",
        description: "The workflow failed."
      });
      return;
    }

    core.info(`Zip the output folder`);
    const zip = new JSZip();
    for await (const file of klaw(outputPath)) {
      if (!file.stats.isDirectory()) {
        core.debug(`Add ${file.path} to archive`);
        zip.file(
          path.relative(path.resolve(outputPath), file.path),
          fs.createReadStream(file.path)
        );
      }
    }

    core.info("Upload the archive to Lona's servers to deploy it");
    const body = await zip.generateAsync({ type: "nodebuffer" });

    const res = await fetch(uploadURL, {
      method: "PUT",
      body,
      headers: {
        "Content-Type": "application/zip"
      }
    });

    if (!res.ok) {
      core.debug(await res.text());
      throw new Error("Upload failed");
    }

    await github.repos.createDeploymentStatus({
      deployment_id,
      repo,
      owner,
      state: "success",
      log_url: `${core.getInput("lona_deploy_url")}/${core.getState(
        "lona_organization_id"
      )}/${GITHUB_SHA}`,
      target_url: `${core.getInput("lona_deploy_url")}/${core.getState(
        "lona_organization_id"
      )}/${GITHUB_SHA}`,
      description: "Lona website documentation deployed."
    });
  } catch (error) {
    try {
      const deploymentId = core.getState("deployment_id");
      const token = core.getInput("github_token");

      const { GITHUB_REPOSITORY } = process.env;

      if (deploymentId && GITHUB_REPOSITORY) {
        const deployment_id = parseInt(deploymentId);
        const [owner, repo] = GITHUB_REPOSITORY.split("/");
        const github = new GitHub(token);

        await github.repos.createDeploymentStatus({
          deployment_id,
          repo,
          owner,
          state: "failure"
        });
      }
    } catch (err) {}

    core.setFailed(error.message);
  }
}

run();
