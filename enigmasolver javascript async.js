const axios = require('axios');

class EnigmaSolver {
    static Proxy = class {
        static ProxyType = {
            HTTP: "http",
            SOCKS4: "socks4",
            SOCKS5: "socks5"
        };

        constructor(proxy_str, proxy_type) {
            this.proxy_str = proxy_str;
            this.proxy_type = proxy_type;
            this.parsed_proxy_dict = this._format_proxy();
        }

        _format_proxy() {
            const proxy = this.proxy_str;
            let host = "", port = "", user = "", password = "";
            if (proxy.split(":").length === 4) {
                [host, port, user, password] = proxy.split(":");
            } else if (proxy.split(":").length === 2) {
                [host, port] = proxy.split(":");
            } else if (proxy.split("@").length === 2 && proxy.split(":").length === 3) {
                [user, password] = proxy.split("@")[0].split(":");
                [host, port] = proxy.split("@")[1].split(":");
            } else {
                throw new Error("Invalid proxy format");
            }
            return {
                proxyAddress: host,
                proxyPort: parseInt(port),
                proxyLogin: user,
                proxyPassword: password,
                proxyType: this.proxy_type
            };
        }
    };

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
        RecaptchaV3: "RecaptchaV3Task",
        RecaptchaV2Enterprise: "RecaptchaV2EnterpriseTask",
        RecaptchaV3Enterprise: "RecaptchaV3EnterpriseTask",
        RecaptchaV2Proxyless: "RecaptchaV2TaskProxyless",
        RecaptchaV3Proxyless: "RecaptchaV3TaskProxyless",
        RecaptchaV2EnterpriseProxyless: "RecaptchaV2EnterpriseTaskProxyless",
        RecaptchaV3EnterpriseProxyless: "RecaptchaV3EnterpriseTaskProxyless"
    };

    constructor(api_key, timeout = 60) {
        this.base_url = "https://api.enigmasolver.net";
        this.api_key = api_key;
        this.timeout = timeout;
        this.session = axios.create({
            headers: { "content-type": "application/json" }
        });
    }

    async GetBalance() {
        return (await this._do_request("POST", "/getBalance", { clientKey: this.api_key })).data;
    }

    async ReCaptchaV2Proxyless(website_url, website_key, recaptcha_data_s_value = "", is_invisible = false, api_domain = "", page_action = "") {
        const post_data = {
            type: EnigmaSolver.CaptchaType.RecaptchaV2Proxyless,
            websiteURL: website_url,
            websiteKey: website_key,
            recaptchaDataSValue: recaptcha_data_s_value,
            isInvisible: is_invisible,
            apiDomain: api_domain,
            pageAction: page_action
        };
        return await this._process_task(post_data);
    }

    async ReCaptchaV2EnterpriseProxyless(website_url, website_key, enterprise_payload = {}, is_invisible = false, api_domain = "", page_action = "") {
        const post_data = {
            type: EnigmaSolver.CaptchaType.RecaptchaV2EnterpriseProxyless,
            websiteURL: website_url,
            websiteKey: website_key,
            enterprisePayload: enterprise_payload,
            isInvisible: is_invisible,
            apiDomain: api_domain,
            pageAction: page_action
        };
        return await this._process_task(post_data);
    }

    async ReCaptchaV3Proxyless(website_url, website_key, page_action = "", api_domain = "") {
        const post_data = {
            type: EnigmaSolver.CaptchaType.RecaptchaV3Proxyless,
            websiteURL: website_url,
            websiteKey: website_key,
            pageAction: page_action,
            apiDomain: api_domain
        };
        return await this._process_task(post_data);
    }

    async ReCaptchaV3EnterpriseProxyless(website_url, website_key, page_action = "", api_domain = "") {
        const post_data = {
            type: EnigmaSolver.CaptchaType.RecaptchaV3EnterpriseProxyless,
            websiteURL: website_url,
            websiteKey: website_key,
            pageAction: page_action,
            apiDomain: api_domain
        };
        return await this._process_task(post_data);
    }

    async ReCaptchaV2Enterprise(website_url, website_key, enterprise_payload = {}, is_invisible = false, api_domain = "", page_action = "", proxy) {
        const post_data = {
            type: EnigmaSolver.CaptchaType.RecaptchaV2Enterprise,
            websiteURL: website_url,
            websiteKey: website_key,
            enterprisePayload: enterprise_payload,
            isInvisible: is_invisible,
            apiDomain: api_domain,
            pageAction: page_action,
            ...proxy.parsed_proxy_dict
        };
        return await this._process_task(post_data);
    }

    async ReCaptchaV3(website_url, website_key, page_action = "", api_domain = "", proxy) {
        const post_data = {
            type: EnigmaSolver.CaptchaType.RecaptchaV3,
            websiteURL: website_url,
            websiteKey: website_key,
            pageAction: page_action,
            apiDomain: api_domain,
            ...proxy.parsed_proxy_dict
        };
        return await this._process_task(post_data);
    }

    async ReCaptchaV3Enterprise(website_url, website_key, page_action = "", api_domain = "", proxy) {
        const post_data = {
            type: EnigmaSolver.CaptchaType.RecaptchaV3Enterprise,
            websiteURL: website_url,
            websiteKey: website_key,
            pageAction: page_action,
            apiDomain: api_domain,
            ...proxy.parsed_proxy_dict
        };
        return await this._process_task(post_data);
    }

    async _do_request(method, path, post_data = null) {
        if (method === "GET") {
            return await this.session.get(this.base_url + path);
        }
        if (method === "POST") {
            return await this.session.post(this.base_url + path, post_data);
        }
        throw new Error("Invalid Method");
    }

    _process_response(response) {
        const result = new EnigmaSolver.Result();
        result.Status = response.status || "";
        result.Solved = result.Status === "ready";
        result.ErrorId = response.errorId || "";
        result.Error = response.errorDescription || "";
        result.Solution = response.solution?.gRecaptchaResponse || "";
        return result;
    }

    async _process_task(post_data) {
        const data = {
            clientKey: this.api_key,
            task: post_data
        };
        let resp = await this._do_request("POST", "/createTask", data);
        if (resp.status !== 200) {
            return this._process_response(resp.data);
        }
        const task_id = resp.data.taskId;
        const start_time = Date.now() / 1000;
        while (true) {
            if ((Date.now() / 1000) - start_time > this.timeout) {
                return this._process_response({ errorId: 12, errorDescription: "Timeout", status: "failed" });
            }
            resp = await this._do_request("POST", "/getTaskResult", { clientKey: this.api_key, taskId: task_id });
            if (resp.status !== 200) {
                return this._process_response(resp.data);
            }
            const status = resp.data.status;
            if (status === "ready" || status === "failed") {
                return this._process_response(resp.data);
            }
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
}

// USAGE EXAMPLE
(async () => {
    const apikey = "your_key";
    const enigmaSolver = new EnigmaSolver(apikey, 60);
    console.log(await enigmaSolver.GetBalance()); // GetBalance

    // PROXY TASK
    const task = await enigmaSolver.ReCaptchaV3(
        "https://www.example.com/",
        "6Le-wvkSAAAAAPBMRTvw0Q4M1uexq9bi0DJwx_mJ-",
        "",
        "",
        new EnigmaSolver.Proxy("username:password@proxy_ip:port", EnigmaSolver.Proxy.ProxyType.HTTP)
        //new EnigmaSolver.Proxy("proxy_ip:port", EnigmaSolver.Proxy.ProxyType.SOCKS4)
        //new EnigmaSolver.Proxy("proxy_ip:port:username:password", EnigmaSolver.Proxy.ProxyType.SOCKS5)
    );
    console.log("Task Status: " + task.Status);
    console.log("Task Solved: " + task.Solved);
    console.log("Task Error: " + task.Error);
    console.log("Task ErrorId: " + task.ErrorId);
    console.log("Task Solution: " + task.Solution);

    // PROXYLESS TASK
    const task2 = await enigmaSolver.ReCaptchaV2Proxyless(
        "https://www.example.com/",
        "6Le-wvkSAAAAAPBMRTvw0Q4M1uexq9bi0DJwx_mJ-"
    );
    console.log("Task Status: " + task2.Status);
    console.log("Task Solved: " + task2.Solved);
    console.log("Task Error: " + task2.Error);
    console.log("Task ErrorId: " + task2.ErrorId);
    console.log("Task Solution: " + task2.Solution);
})();