"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github_1 = require("@actions/github");
const node_fetch_1 = __importDefault(require("node-fetch"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function run() {
    return __awaiter(this, void 0, void 0, function* () {
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
            const res = yield node_fetch_1.default(`${baseURL}/getUploadURL?github_token=${encodeURIComponent(token)}&owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&ref=${encodeURIComponent(refName || GITHUB_SHA)}`);
            if (!res.ok) {
                const error = yield res.json();
                core.setFailed(error.message);
                return;
            }
            const data = yield res.json();
            core.saveState("upload_url", data.uploadURL);
            core.saveState("lona_organization_id", data.orgId);
            core.saveState("lona_deploy_url", data.deployURL);
            const isTag = !!refName && refName.startsWith("refs/tags/");
            const github = new github_1.GitHub(token);
            const deployments = yield github.repos.listDeployments({
                repo,
                owner,
                ref: refName
            });
            const deployment = deployments && deployments.data.length
                ? deployments.data[0]
                : (yield github.repos.createDeployment({
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
            core.saveState("deployment_id", `${deployment.id}`);
            if (isTag) {
                core.debug(`it is a tag (${refName}) so we will create the prod deployment at the same time`);
                const prodDeployment = yield github.repos.createDeployment({
                    ref: GITHUB_SHA,
                    owner,
                    repo,
                    description: "Lona workspace documentation website - production",
                    required_contexts: [],
                    environment: "production",
                    mediaType: {
                        previews: ["ant-man-preview", "flash-preview"]
                    }
                });
                core.saveState("deployment_prod_id", `${prodDeployment.data.id}`);
                yield github.repos.createDeploymentStatus({
                    deployment_id: prodDeployment.data.id,
                    repo,
                    owner,
                    state: "in_progress",
                    description: "Starting Lona website documentation deployment - production",
                    mediaType: {
                        previews: ["ant-man-preview", "flash-preview"]
                    }
                });
            }
            yield github.repos.createDeploymentStatus({
                deployment_id: deployment.id,
                repo,
                owner,
                state: "in_progress",
                description: "Starting Lona website documentation deployment",
                mediaType: {
                    previews: ["ant-man-preview", "flash-preview"]
                }
            });
        }
        catch (error) {
            console.error(error);
            core.setFailed(error.message);
        }
    });
}
run();
