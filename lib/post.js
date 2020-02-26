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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
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
const jszip_1 = __importDefault(require("jszip"));
const klaw_1 = __importDefault(require("klaw"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const node_fetch_1 = __importDefault(require("node-fetch"));
let github;
const createDeploymentStatus = ({ state, description, environment_url, refName }) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const deploymentId = core.getState("deployment_id");
        const token = core.getInput("github_token");
        const { GITHUB_REPOSITORY } = process.env;
        if (deploymentId && GITHUB_REPOSITORY) {
            const deployment_id = parseInt(deploymentId);
            const [owner, repo] = GITHUB_REPOSITORY.split("/");
            if (!github) {
                github = new github_1.GitHub(token);
            }
            const deploymentURL = environment_url
                ? `${environment_url}/${refName}`
                : undefined;
            yield github.repos.createDeploymentStatus({
                deployment_id,
                repo,
                owner,
                state,
                description,
                log_url: deploymentURL,
                environment_url: deploymentURL,
                auto_inactive: false,
                mediaType: {
                    previews: ["ant-man-preview", "flash-preview"]
                }
            });
        }
        const deploymentProdId = core.getState("deployment_prod_id");
        if (deploymentProdId && GITHUB_REPOSITORY) {
            const deployment_id = parseInt(deploymentProdId);
            const [owner, repo] = GITHUB_REPOSITORY.split("/");
            yield github.repos.createDeploymentStatus({
                deployment_id,
                repo,
                owner,
                state,
                description,
                log_url: environment_url,
                environment_url,
                auto_inactive: true,
                mediaType: {
                    previews: ["ant-man-preview", "flash-preview"]
                }
            });
        }
    }
    catch (err) { }
});
function run() {
    var e_1, _a;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const deploymentId = core.getState("deployment_id");
            if (!deploymentId) {
                // we didn't completed the main step so bail out
                return;
            }
            const outputPath = core.getInput("output_folder");
            const uploadURL = core.getState("upload_url");
            const { GITHUB_REPOSITORY, GITHUB_SHA } = process.env;
            if (!GITHUB_REPOSITORY) {
                throw new Error("Missing GITHUB_REPOSITORY");
            }
            if (core.getInput("workflow_succeeded") !== "true") {
                yield createDeploymentStatus({
                    state: "error",
                    description: "The workflow failed."
                });
                return;
            }
            core.info(`Zip the output folder`);
            const zip = new jszip_1.default();
            try {
                for (var _b = __asyncValues(klaw_1.default(outputPath)), _c; _c = yield _b.next(), !_c.done;) {
                    const file = _c.value;
                    if (!file.stats.isDirectory()) {
                        core.debug(`Add ${file.path} to archive`);
                        zip.file(path.relative(path.resolve(outputPath), file.path), fs.createReadStream(file.path));
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) yield _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            core.info("Upload the archive to Lona's servers to deploy it");
            const body = yield zip.generateAsync({ type: "nodebuffer" });
            const res = yield node_fetch_1.default(uploadURL, {
                method: "PUT",
                body,
                headers: {
                    "Content-Type": "application/zip"
                }
            });
            if (!res.ok) {
                core.debug(yield res.text());
                throw new Error("Upload failed");
            }
            yield createDeploymentStatus({
                state: "success",
                environment_url: core.getState("lona_deploy_url"),
                refName: `${core.getInput("ref_name") || GITHUB_SHA}`,
                description: "Lona website documentation deployed."
            });
        }
        catch (error) {
            yield createDeploymentStatus({
                state: "failure",
                description: error.message
            });
            core.setFailed(error.message);
        }
    });
}
run();
