import * as core from "@actions/core";
import fetch from "node-fetch";

async function run() {
  try {
    const token = core.getInput("github_token");
    const baseURL = core.getInput("lona_api_base_url");
    const { GITHUB_REPOSITORY, GITHUB_SHA } = process.env;

    if (!token) {
      core.setFailed("Missing github_token input");
      return;
    }

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

    core.setOutput("output_url", data.uploadURL);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
