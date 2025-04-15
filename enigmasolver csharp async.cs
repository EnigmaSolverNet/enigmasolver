using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Newtonsoft.Json;

public class EnigmaSolver
{
    public class Proxy
    {
        public class ProxyType
        {
            public const string HTTP = "http";
            public const string SOCKS4 = "socks4";
            public const string SOCKS5 = "socks5";
        }

        public string ProxyStr { get; set; }
        public string ProxyTypeVal { get; set; }
        public Dictionary<string, object> ParsedProxyDict { get; set; }

        public Proxy(string proxyStr, string proxyType)
        {
            ProxyStr = proxyStr;
            ProxyTypeVal = proxyType;
            ParsedProxyDict = _format_proxy();
        }

        private Dictionary<string, object> _format_proxy()
        {
            string proxy = ProxyStr;
            string host = "", port = "", user = "", password = "";

            if (proxy.Split(':').Length == 4)
            {
                var parts = proxy.Split(':');
                host = parts[0];
                port = parts[1];
                user = parts[2];
                password = parts[3];
            }
            else if (proxy.Split(':').Length == 2)
            {
                var parts = proxy.Split(':');
                host = parts[0];
                port = parts[1];
            }
            else if (proxy.Contains("@") && proxy.Split(':').Length == 3)
            {
                var parts = proxy.Split('@');
                var userPass = parts[0].Split(':');
                var hostPort = parts[1].Split(':');
                user = userPass[0];
                password = userPass[1];
                host = hostPort[0];
                port = hostPort[1];
            }
            else
            {
                throw new ArgumentException("Invalid proxy format");
            }

            return new Dictionary<string, object>
            {
                { "proxyAddress", host },
                { "proxyPort", int.Parse(port) },
                { "proxyLogin", user },
                { "proxyPassword", password },
                { "proxyType", ProxyTypeVal }
            };
        }
    }

    public class Result
    {
        public string Status { get; set; } = "";
        public bool Solved { get; set; } = false;
        public string ErrorId { get; set; } = "";
        public string Error { get; set; } = "";
        public string Solution { get; set; } = "";
    }

    public class CaptchaType
    {
        public const string RecaptchaV3 = "RecaptchaV3Task";
        public const string RecaptchaV2Enterprise = "RecaptchaV2EnterpriseTask";
        public const string RecaptchaV3Enterprise = "RecaptchaV3EnterpriseTask";

        public const string RecaptchaV2Proxyless = "RecaptchaV2TaskProxyless";
        public const string RecaptchaV3Proxyless = "RecaptchaV3TaskProxyless";
        public const string RecaptchaV2EnterpriseProxyless = "RecaptchaV2EnterpriseTaskProxyless";
        public const string RecaptchaV3EnterpriseProxyless = "RecaptchaV3EnterpriseTaskProxyless";
    }

    private readonly string baseUrl = "https://api.enigmasolver.net";
    private readonly string apiKey;
    private readonly int timeout;
    private readonly HttpClient client;

    public EnigmaSolver(string apiKey, int timeout = 60)
    {
        this.apiKey = apiKey;
        this.timeout = timeout;
        client = new HttpClient();
        client.DefaultRequestHeaders.Add("Content-Type", "application/json");
    }

    public async Task<Dictionary<string, object>> GetBalance()
    {
        var response = await _do_request("POST", "/getBalance", new Dictionary<string, object> { { "clientKey", apiKey } });
        return JsonConvert.DeserializeObject<Dictionary<string, object>>(response);
    }

    public async Task<Result> ReCaptchaV2Proxyless(string websiteUrl, string websiteKey, string recaptchaDataSValue = "",
        bool isInvisible = false, string apiDomain = "", string pageAction = "")
    {
        var postData = new Dictionary<string, object>
        {
            { "type", CaptchaType.RecaptchaV2Proxyless },
            { "websiteURL", websiteUrl },
            { "websiteKey", websiteKey },
            { "recaptchaDataSValue", recaptchaDataSValue },
            { "isInvisible", isInvisible },
            { "apiDomain", apiDomain },
            { "pageAction", pageAction }
        };
        return await _process_task(postData);
    }

    public async Task<Result> ReCaptchaV2EnterpriseProxyless(string websiteUrl, string websiteKey,
        Dictionary<string, object> enterprisePayload = null, bool isInvisible = false, string apiDomain = "", string pageAction = "")
    {
        enterprisePayload = enterprisePayload ?? new Dictionary<string, object>();
        var postData = new Dictionary<string, object>
        {
            { "type", CaptchaType.RecaptchaV2EnterpriseProxyless },
            { "websiteURL", websiteUrl },
            { "websiteKey", websiteKey },
            { "enterprisePayload", enterprisePayload },
            { "isInvisible", isInvisible },
            { "apiDomain", apiDomain },
            { "pageAction", pageAction }
        };
        return await _process_task(postData);
    }

    public async Task<Result> ReCaptchaV3Proxyless(string websiteUrl, string websiteKey, string pageAction = "", string apiDomain = "")
    {
        var postData = new Dictionary<string, object>
        {
            { "type", CaptchaType.RecaptchaV3Proxyless },
            { "websiteURL", websiteUrl },
            { "websiteKey", websiteKey },
            { "pageAction", pageAction },
            { "apiDomain", apiDomain }
        };
        return await _process_task(postData);
    }

    public async Task<Result> ReCaptchaV3EnterpriseProxyless(string websiteUrl, string websiteKey, string pageAction = "", string apiDomain = "")
    {
        var postData = new Dictionary<string, object>
        {
            { "type", CaptchaType.RecaptchaV3EnterpriseProxyless },
            { "websiteURL", websiteUrl },
            { "websiteKey", websiteKey },
            { "pageAction", pageAction },
            { "apiDomain", apiDomain }
        };
        return await _process_task(postData);
    }

   

    public async Task<Result> ReCaptchaV2Enterprise(string websiteUrl, string websiteKey,
        Dictionary<string, object> enterprisePayload = null, bool isInvisible = false, string apiDomain = "", string pageAction = "", Proxy proxy = null)
    {
        enterprisePayload = enterprisePayload ?? new Dictionary<string, object>();
        var postData = new Dictionary<string, object>
        {
            { "type", CaptchaType.RecaptchaV2Enterprise },
            { "websiteURL", websiteUrl },
            { "websiteKey", websiteKey },
            { "enterprisePayload", enterprisePayload },
            { "isInvisible", isInvisible },
            { "apiDomain", apiDomain },
            { "pageAction", pageAction }
        };
        if (proxy != null)
        {
            foreach (var kvp in proxy.ParsedProxyDict)
            {
                postData[kvp.Key] = kvp.Value;
            }
        }
        return await _process_task(postData);
    }

    public async Task<Result> ReCaptchaV3(string websiteUrl, string websiteKey, string pageAction = "", string apiDomain = "", Proxy proxy = null)
    {
        var postData = new Dictionary<string, object>
        {
            { "type", CaptchaType.RecaptchaV3 },
            { "websiteURL", websiteUrl },
            { "websiteKey", websiteKey },
            { "pageAction", pageAction },
            { "apiDomain", apiDomain }
        };
        if (proxy != null)
        {
            foreach (var kvp in proxy.ParsedProxyDict)
            {
                postData[kvp.Key] = kvp.Value;
            }
        }
        return await _process_task(postData);
    }

    public async Task<Result> ReCaptchaV3Enterprise(string websiteUrl, string websiteKey, string pageAction = "", string apiDomain = "", Proxy proxy = null)
    {
        var postData = new Dictionary<string, object>
        {
            { "type", CaptchaType.RecaptchaV3Enterprise },
            { "websiteURL", websiteUrl },
            { "websiteKey", websiteKey },
            { "pageAction", pageAction },
            { "apiDomain", apiDomain }
        };
        if (proxy != null)
        {
            foreach (var kvp in proxy.ParsedProxyDict)
            {
                postData[kvp.Key] = kvp.Value;
            }
        }
        return await _process_task(postData);
    }

    private async Task<string> _do_request(string method, string path, object postData = null)
    {
        HttpResponseMessage response;
        if (method == "GET")
        {
            response = await client.GetAsync(baseUrl + path);
        }
        else if (method == "POST")
        {
            var json = JsonConvert.SerializeObject(postData);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            response = await client.PostAsync(baseUrl + path, content);
        }
        else
        {
            throw new ArgumentException("Invalid Method");
        }

        return await response.Content.ReadAsStringAsync();
    }

    private Result _process_response(Dictionary<string, object> response)
    {
        var result = new Result();
        result.Status = response.TryGetValue("status", out var status) ? status.ToString() : "";
        result.Solved = result.Status == "ready";
        result.ErrorId = response.TryGetValue("errorId", out var errorId) ? errorId.ToString() : "";
        result.Error = response.TryGetValue("errorDescription", out var errorDesc) ? errorDesc.ToString() : "";
        if (response.TryGetValue("solution", out var solution) && solution is Dictionary<string, object> solDict)
        {
            result.Solution = solDict.TryGetValue("gRecaptchaResponse", out var gRecaptcha) ? gRecaptcha.ToString() : "";
        }
        return result;
    }

    private async Task<Result> _process_task(Dictionary<string, object> postData)
    {
        var data = new Dictionary<string, object>
        {
            { "clientKey", apiKey },
            { "task", postData }
        };

        var resp = await _do_request("POST", "/createTask", data);
        var respData = JsonConvert.DeserializeObject<Dictionary<string, object>>(resp);

        if (!respData.ContainsKey("taskId"))
        {
            return _process_response(respData);
        }

        var taskId = respData["taskId"].ToString();
        var startTime = DateTime.Now;

        while (true)
        {
            if ((DateTime.Now - startTime).TotalSeconds > timeout)
            {
                return _process_response(new Dictionary<string, object>
                {
                    { "errorId", "12" },
                    { "errorDescription", "Timeout" },
                    { "status", "failed" }
                });
            }

            resp = await _do_request("POST", "/getTaskResult", new Dictionary<string, object>
            {
                { "clientKey", apiKey },
                { "taskId", taskId }
            });
            respData = JsonConvert.DeserializeObject<Dictionary<string, object>>(resp);

            var status = respData.TryGetValue("status", out var statusVal) ? statusVal.ToString() : "";
            if (status == "ready" || status == "failed")
            {
                return _process_response(respData);
            }

            await Task.Delay(500);
        }
    }

    // USAGE EXAMPLE
    public static async Task Main()
    {
        string apiKey = "your_key";
        var enigmaSolver = new EnigmaSolver(apiKey, 60);
        Console.WriteLine(JsonConvert.SerializeObject(await enigmaSolver.GetBalance()));

        // PROXY TASK
        var proxy = new Proxy("username:password@proxy_ip:port", Proxy.ProxyType.HTTP);
        //var proxy = new Proxy("proxy_ip:port", Proxy.ProxyType.SOCKS4);
        //var proxy = new Proxy("proxy_ip:port:username:password", Proxy.ProxyType.SOCKS5);
        var task = await enigmaSolver.ReCaptchaV3(
            websiteUrl: "https://www.example.com/",
            websiteKey: "6Le-wvkSAAAAAPBMRTvw0Q4M1uexq9bi0DJwx_mJ-",
            proxy: proxy
        );
        Console.WriteLine($"Task Status: {task.Status}");
        Console.WriteLine($"Task Solved: {task.Solved}");
        Console.WriteLine($"Task Error: {task.Error}");
        Console.WriteLine($"Task ErrorId: {task.ErrorId}");
        Console.WriteLine($"Task Solution: {task.Solution}");

        // PROXYLESS TASK
        task = await enigmaSolver.ReCaptchaV2Proxyless(
            websiteUrl: "https://www.example.com/",
            websiteKey: "6Le-wvkSAAAAAPBMRTvw0Q4M1uexq9bi0DJwx_mJ-"
        );
        Console.WriteLine($"Task Status: {task.Status}");
        Console.WriteLine($"Task Solved: {task.Solved}");
        Console.WriteLine($"Task Error: {task.Error}");
        Console.WriteLine($"Task ErrorId: {task.ErrorId}");
        Console.WriteLine($"Task Solution: {task.Solution}");
    }
}