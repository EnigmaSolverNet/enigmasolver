const axios = require('axios');

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

    GetBalance(callback) {
        this._doRequest("POST", "/getBalance", { clientKey: this.apiKey }, callback);
    }

    ReCaptchaV2(websiteUrl, websiteKey, callback, recaptchaDataSValue = "", isInvisible = false, apiDomain = "", pageAction = "") {
        const postData = {
            type: EnigmaSolver.CaptchaType.RecaptchaV2,
            websiteURL: websiteUrl,
            websiteKey: websiteKey,
            recaptchaDataSValue: recaptchaDataSValue,
            isInvisible: isInvisible,
            apiDomain: apiDomain,
            pageAction: pageAction
        };
        this._processTask(postData, callback);
    }

    ReCaptchaV2Enterprise(websiteUrl, websiteKey, callback, enterprisePayload = {}, isInvisible = false, apiDomain = "", pageAction = "") {
        const postData = {
            type: EnigmaSolver.CaptchaType.RecaptchaV2Enterprise,
            websiteURL: websiteUrl,
            websiteKey: websiteKey,
            enterprisePayload: enterprisePayload,
            isInvisible: isInvisible,
            apiDomain: apiDomain,
            pageAction: pageAction
        };
        this._processTask(postData, callback);
    }

    ReCaptchaV3(websiteUrl, websiteKey, callback, pageAction = "", apiDomain = "") {
        const postData = {
            type: EnigmaSolver.CaptchaType.RecaptchaV3,
            websiteURL: websiteUrl,
            websiteKey: websiteKey,
            pageAction: pageAction,
            apiDomain: apiDomain
        };
        this._processTask(postData, callback);
    }

    ReCaptchaV3Enterprise(websiteUrl, websiteKey, callback, pageAction = "", apiDomain = "") {
        const postData = {
            type: EnigmaSolver.CaptchaType.RecaptchaV3Enterprise,
            websiteURL: websiteUrl,
            websiteKey: websiteKey,
            pageAction: pageAction,
            apiDomain: apiDomain
        };
        this._processTask(postData, callback);
    }

    _doRequest(method, path, postData = null, callback) {
        try {
            if (method === "GET") {
                this.session.get(this.baseUrl + path)
                    .then(response => callback(null, response))
                    .catch(error => callback(error));
            } else if (method === "POST") {
                this.session.post(this.baseUrl + path, postData)
                    .then(response => callback(null, response))
                    .catch(error => callback(error));
            } else {
                callback(new Error("Invalid Method"));
            }
        } catch (error) {
            callback(error);
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

    _processTask(postData, callback) {
        const data = {
            clientKey: this.apiKey,
            task: postData
        };

        const startTime = Date.now();
        const checkResult = (taskId) => {
            if (Date.now() - startTime > this.timeout * 1000) {
                callback(null, this._processResponse({ 
                    errorId: 12, 
                    errorDescription: "Timeout", 
                    status: "failed" 
                }));
                return;
            }

            this._doRequest("POST", "/getTaskResult", { 
                clientKey: this.apiKey, 
                taskId: taskId 
            }, (error, resp) => {
                if (error || resp.status !== 200) {
                    callback(null, this._processResponse(resp?.data));
                    return;
                }

                const status = resp.data.status;
                if (status === "ready" || status === "failed") {
                    callback(null, this._processResponse(resp.data));
                    return;
                }

                setTimeout(() => checkResult(taskId), 500);
            });
        };

        this._doRequest("POST", "/createTask", data, (error, resp) => {
            if (error || resp.status !== 200) {
                callback(null, this._processResponse(resp?.data));
                return;
            }
            checkResult(resp.data.taskId);
        });
    }
}

const ak = "your_key";
const enigmaSolver = new EnigmaSolver(ak, 60);

enigmaSolver.GetBalance((error, balance) => {
    console.log(balance.data);
    
    enigmaSolver.ReCaptchaV2(
        "https://www.google.com/recaptcha/api2/demo",
        "6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-",
        (error, task) => {
            console.log("Task Status: " + task.Status);
            console.log("Task Solved: " + task.Solved);
            console.log("Task Error: " + task.Error);
            console.log("Task ErrorId: " + task.ErrorId);
            console.log("Task Solution: " + task.Solution);
        }
    );
});
