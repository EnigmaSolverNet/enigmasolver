const axios = require('axios');
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class EnigmaSolver {
    static Result = class {
        constructor() {
            this.Status = "";
            this.Solved = false;
            this.ErrorId = "";
            this.Error = "";
            this.Solution = "";
        }
    };

    static CaptchaType = {
        RecaptchaV2: "RecaptchaV2TaskProxyless",
        RecaptchaV3: "RecaptchaV3TaskProxyless",
        RecaptchaV2Enterprise: "RecaptchaV2EnterpriseTaskProxyless",
        RecaptchaV3Enterprise: "RecaptchaV3EnterpriseTaskProxyless"
    };

    constructor(apiKey, timeout = 60) {
        this.baseUrl = "https://api.enigmasolver.net";
        this.apiKey = apiKey;
        this.timeout = timeout;
        this.session = axios.create({
            headers: { "Content-Type": "application/json" }
        });
    }

    async GetBalance() {
        const response = await this._doRequest("POST", "/getBalance", { clientKey: this.apiKey });
        return response.data;
    }

    async ReCaptchaV2(websiteUrl, websiteKey, recaptchaDataSValue = "", isInvisible = false, apiDomain = "", pageAction = "") {
        const postData = {
            type: EnigmaSolver.CaptchaType.RecaptchaV2,
            websiteURL: websiteUrl,
            websiteKey: websiteKey,
            recaptchaDataSValue: recaptchaDataSValue,
            isInvisible: isInvisible,
            apiDomain: apiDomain,
            pageAction: pageAction
        };
        return await this._processTask(postData);
    }

    async ReCaptchaV2Enterprise(websiteUrl, websiteKey, enterprisePayload = {}, isInvisible = false, apiDomain = "", pageAction = "") {
        const postData = {
            type: EnigmaSolver.CaptchaType.RecaptchaV2Enterprise,
            websiteURL: websiteUrl,
            websiteKey: websiteKey,
            enterprisePayload: enterprisePayload,
            isInvisible: isInvisible,
            apiDomain: apiDomain,
            pageAction: pageAction
        };
        return await this._processTask(postData);
    }

    async ReCaptchaV3(websiteUrl, websiteKey, pageAction = "", apiDomain = "") {
        const postData = {
            type: EnigmaSolver.CaptchaType.RecaptchaV3,
            websiteURL: websiteUrl,
            websiteKey: websiteKey,
            pageAction: pageAction,
            apiDomain: apiDomain
        };
        return await this._processTask(postData);
    }

    async ReCaptchaV3Enterprise(websiteUrl, websiteKey, pageAction = "", apiDomain = "") {
        const postData = {
            type: EnigmaSolver.CaptchaType.RecaptchaV3Enterprise,
            websiteURL: websiteUrl,
            websiteKey: websiteKey,
            pageAction: pageAction,
            apiDomain: apiDomain
        };
        return await this._processTask(postData);
    }

    async _doRequest(method, path, postData = null) {
        try {
            if (method === "GET") {
                return await this.session.get(this.baseUrl + path);
            } else if (method === "POST") {
                return await this.session.post(this.baseUrl + path, postData);
            } else {
                throw new Error("Invalid Method");
            }
        } catch (error) {
            throw error;
        }
    }

    _processResponse(response) {
        const result = new EnigmaSolver.Result();
        result.Status = response.status || "";
        result.Solved = result.Status === "ready";
        result.ErrorId = response.errorId || "";
        result.Error = response.errorDescription || "";
        result.Solution = response.solution?.gRecaptchaResponse || "";
        return result;
    }

    async _processTask(postData) {
        const data = {
            clientKey: this.apiKey,
            task: postData
        };
        let resp = await this._doRequest("POST", "/createTask", data);
        if (resp.status !== 200) {
            return this._processResponse(resp.data);
        }
        const taskId = resp.data.taskId;
        const startTime = Date.now();
        while (true) {
            if (Date.now() - startTime > this.timeout * 1000) {
                return this._processResponse({ errorId: 12, errorDescription: "Timeout", status: "failed" });
            }
            resp = await this._doRequest("POST", "/getTaskResult", { clientKey: this.apiKey, taskId: taskId });
            if (resp.status !== 200) {
                return this._processResponse(resp.data);
            }
            const status = resp.data.status;
            if (status === "ready") {
                return this._processResponse(resp.data);
            }
            if (status === "failed") {
                return this._processResponse(resp.data);
            }
            await sleep(500);
        }
    }
}

(async () => {
    const ak = "your_key";
    const enigmaSolver = new EnigmaSolver(apiKey=ak, timeout=60);
    console.log(await enigmaSolver.GetBalance()); 
    const task = await enigmaSolver.ReCaptchaV2(websiteKey="6Le-wvkSAAAAAPBMRTvw0Q4M1uexq9bi0DJwx_mJ-", websiteUrl="https://www.google.com/recaptcha/api2/demo");
    console.log("Task Status: " + task.Status);
    console.log("Task Solved: " + task.Solved);
    console.log("Task Error: " + task.Error);
    console.log("Task ErrorId: " + task.ErrorId);
    console.log("Task Solution: " + task.Solution);
})();