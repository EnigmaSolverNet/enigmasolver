using System;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Text.Json;

public class EnigmaSolver
{
    public class Result
    {
        public string Status { get; set; } = "";
        public bool Solved { get; set; } = false;
        public string ErrorId { get; set; } = "";
        public string Error { get; set; } = "";
        public string Solution { get; set; } = "";
    }

    public static class CaptchaType
    {
        public const string RecaptchaV2 = "RecaptchaV2TaskProxyless";
        public const string RecaptchaV3 = "RecaptchaV3TaskProxyless";
        public const string RecaptchaV2Enterprise = "RecaptchaV2EnterpriseTaskProxyless";
        public const string RecaptchaV3Enterprise = "RecaptchaV3EnterpriseTaskProxyless";
    }

    private readonly string baseUrl = "https://api.enigmasolver.net";
    private readonly string apiKey;
    private readonly int timeout;
    private readonly HttpClient client;

    public EnigmaSolver(string apiKey, int timeout = 60)
    {
        this.apiKey = apiKey;
        this.timeout = timeout;
        this.client = new HttpClient();
    }

    public string GetBalance()
    {
        var data = new { clientKey = apiKey };
        var response = DoRequest("POST", "/getBalance", data);
        return response;
    }

    public Result ReCaptchaV2(string websiteUrl, string websiteKey, string recaptchaDataSValue = "",
        bool isInvisible = false, string apiDomain = "", string pageAction = "")
    {
        var postData = new
        {
            type = CaptchaType.RecaptchaV2,
            websiteURL = websiteUrl,
            websiteKey = websiteKey,
            recaptchaDataSValue = recaptchaDataSValue,
            isInvisible = isInvisible,
            apiDomain = apiDomain,
            pageAction = pageAction
        };
        return ProcessTask(postData);
    }

    public Result ReCaptchaV2Enterprise(string websiteUrl, string websiteKey, object enterprisePayload = null,
        bool isInvisible = false, string apiDomain = "", string pageAction = "")
    {
        var postData = new
        {
            type = CaptchaType.RecaptchaV2Enterprise,
            websiteURL = websiteUrl,
            websiteKey = websiteKey,
            enterprisePayload = enterprisePayload ?? new { },
            isInvisible = isInvisible,
            apiDomain = apiDomain,
            pageAction = pageAction
        };
        return ProcessTask(postData);
    }

    public Result ReCaptchaV3(string websiteUrl, string websiteKey, string pageAction = "", string apiDomain = "")
    {
        var postData = new
        {
            type = CaptchaType.RecaptchaV3,
            websiteURL = websiteUrl,
            websiteKey = websiteKey,
            pageAction = pageAction,
            apiDomain = apiDomain
        };
        return ProcessTask(postData);
    }

    public Result ReCaptchaV3Enterprise(string websiteUrl, string websiteKey, string pageAction = "", string apiDomain = "")
    {
        var postData = new
        {
            type = CaptchaType.RecaptchaV3Enterprise,
            websiteURL = websiteUrl,
            websiteKey = websiteKey,
            pageAction = pageAction,
            apiDomain = apiDomain
        };
        return ProcessTask(postData);
    }

    private string DoRequest(string method, string path, object postData = null)
    {
        try
        {
            if (method == "GET")
            {
                return client.GetStringAsync(baseUrl + path).Result;
            }
            else if (method == "POST")
            {
                var content = new StringContent(
                    JsonSerializer.Serialize(postData),
                    Encoding.UTF8,
                    "application/json");
                return client.PostAsync(baseUrl + path, content).Result.Content.ReadAsStringAsync().Result;
            }
            throw new Exception("Invalid Method");
        }
        catch (Exception ex)
        {
            throw ex;
        }
    }

    private Result ProcessResponse(JsonElement response)
    {
        var result = new Result
        {
            Status = response.TryGetProperty("status", out var status) ? status.GetString() : "",
            ErrorId = response.TryGetProperty("errorId", out var errorId) ? errorId.ToString() : "",
            Error = response.TryGetProperty("errorDescription", out var error) ? error.GetString() : ""
        };

        result.Solved = result.Status == "ready";
        if (response.TryGetProperty("solution", out var solution) &&
            solution.TryGetProperty("gRecaptchaResponse", out var gRecaptchaResponse))
        {
            result.Solution = gRecaptchaResponse.GetString();
        }

        return result;
    }

    private Result ProcessTask(object postData)
    {
        var data = new
        {
            clientKey = apiKey,
            task = postData
        };

        var resp = DoRequest("POST", "/createTask", data);
        var jsonResponse = JsonSerializer.Deserialize<JsonElement>(resp);

        if (!jsonResponse.TryGetProperty("taskId", out var taskIdElement))
        {
            return ProcessResponse(jsonResponse);
        }

        var taskId = taskIdElement.ToString();
        var startTime = DateTime.Now;

        while (true)
        {
            if ((DateTime.Now - startTime).TotalSeconds > timeout)
            {
                return ProcessResponse(JsonSerializer.Deserialize<JsonElement>(
                    JsonSerializer.Serialize(new
                    {
                        errorId = 12,
                        errorDescription = "Timeout",
                        status = "failed"
                    })));
            }

            var taskData = new { clientKey = apiKey, taskId = taskId };
            resp = DoRequest("POST", "/getTaskResult", taskData);
            jsonResponse = JsonSerializer.Deserialize<JsonElement>(resp);

            if (jsonResponse.TryGetProperty("status", out var statusElement))
            {
                var status = statusElement.GetString();
                if (status == "ready" || status == "failed")
                {
                    return ProcessResponse(jsonResponse);
                }
            }

            Thread.Sleep(500);
        }
    }

    public static void Main()
    {
        var ak = "your_key";
        var enigmaSolver = new EnigmaSolver(ak, 60);
        Console.WriteLine(enigmaSolver.GetBalance());

        var task = enigmaSolver.ReCaptchaV2(
            websiteKey: "6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-",
            websiteUrl: "https://www.google.com/recaptcha/api2/demo");

        Console.WriteLine($"Task Status: {task.Status}");
        Console.WriteLine($"Task Solved: {task.Solved}");
        Console.WriteLine($"Task Error: {task.Error}");
        Console.WriteLine($"Task ErrorId: {task.ErrorId}");
        Console.WriteLine($"Task Solution: {task.Solution}");
    }
}
