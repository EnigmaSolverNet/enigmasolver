import requests
import time

class EnigmaSolver:
    class Result:
        def __init__(self):
            self.Status = ""
            self.Solved = False
            self.ErrorId = ""
            self.Error = ""
            self.Solution = ""
    
    class CaptchaType:
        RecaptchaV2 = "RecaptchaV2TaskProxyless"
        RecaptchaV3 = "RecaptchaV3TaskProxyless"
        RecaptchaV2Enterprise = "RecaptchaV2EnterpriseTaskProxyless"
        RecaptchaV3Enterprise = "RecaptchaV3EnterpriseTaskProxyless"
        
    def __init__(self, api_key: str, timeout: int = 60):
        self.base_url = "https://api.enigmasolver.net"
        self.api_key = api_key
        self.timeout = timeout
        self.session = requests.session()
        self.session.headers = {"content-type": "application/json"}
        
    def GetBalance(self):
        return self._do_request("POST", "/getBalance", post_data={"clientKey": self.api_key}).json()
    
    def ReCaptchaV2(self, website_url: str, website_key: str, recaptcha_data_s_value: str = "",
                    is_invisible: bool = False, api_domain: str = "", page_action: str = "") -> Result:
        post_data = {
            "type": self.CaptchaType.RecaptchaV2,
            "websiteURL": website_url,
            "websiteKey": website_key,
            "recaptchaDataSValue": recaptcha_data_s_value,
            "isInvisible": is_invisible,
            "apiDomain": api_domain,
            "pageAction": page_action
        }
        return self._process_task(post_data=post_data)
    
    def ReCaptchaV2Enterprise(self, website_url: str, website_key: str, enterprise_payload: dict = {},
                              is_invisible: bool = False, api_domain: str = "", page_action: str = "") -> Result:
        post_data = {
            "type": self.CaptchaType.RecaptchaV2Enterprise,
            "websiteURL": website_url,
            "websiteKey": website_key,
            "enterprisePayload": enterprise_payload,
            "isInvisible": is_invisible,
            "apiDomain": api_domain,
            "pageAction": page_action

        }
        return self._process_task(post_data=post_data)
    
    def ReCaptchaV3(self, website_url: str, website_key: str, page_action: str = "", api_domain: str = "") -> Result:
        post_data = {
            "type": self.CaptchaType.RecaptchaV3,
            "websiteURL": website_url,
            "websiteKey": website_key,
            "pageAction": page_action,
            "apiDomain": api_domain
        }
        return self._process_task(post_data=post_data)
    
    def ReCaptchaV3Enterprise(self, website_url: str, website_key: str, page_action: str = "", api_domain: str = "") -> Result:
        post_data = {
            "type": self.CaptchaType.RecaptchaV3Enterprise,
            "websiteURL": website_url,
            "websiteKey": website_key,
            "pageAction": page_action,
            "apiDomain": api_domain
        }
        return self._process_task(post_data=post_data)
    
    
    def _do_request(self, method: str, path: str, post_data: dict = None) -> requests.Response:
        if method == "GET":
            return self.session.get(self.base_url+path)
        if method == "POST":
            return self.session.post(self.base_url+path, json=post_data)
        raise "Invalid Method"
    
    def _process_response(self, response: dict) -> Result:
        result = self.Result()
        result.Status = response.get("status", "")
        result.Solved = result.Status == "ready"
        result.ErrorId = response.get("errorId", "")
        result.Error = response.get("errorDescription", "")
        result.Solution = response.get("solution", {}).get("gRecaptchaResponse", "")
        return result
    
    def _process_task(self, post_data: dict) -> Result:
        data = {
            "clientKey": self.api_key,
            "task": post_data,
        }
        resp = self._do_request("POST", "/createTask", post_data=data)
        if resp.status_code != 200:
            return self._process_response(response=resp.json())
        resp = resp.json()
        task_id = resp.get("taskId")
        start_time = time.time()
        while True:
            if time.time() - start_time > self.timeout:
                return self._process_response(response={"errorId": 12, "errorDescription": "Timeout", "status": "failed"})
            
            resp = self._do_request("POST", "/getTaskResult", post_data={"clientKey": self.api_key, "taskId": task_id})
            if resp.status_code != 200:
                return self._process_response(response=resp.json())
            status = resp.json().get("status")
            if status == "ready":
                return self._process_response(response=resp.json())
            if status == "failed":
                return self._process_response(response=resp.json())
            time.sleep(0.5)
    
    
# example  
ak = "your_key"
enigmaSolver = EnigmaSolver(api_key=ak, timeout=60)
print(enigmaSolver.GetBalance()) # GetBalance
task = enigmaSolver.ReCaptchaV2(website_key="6Le-wvkSAAAAAPBMRTvw0Q4M1uexq9bi0DJwx_mJ-", website_url="https://www.google.com/recaptcha/api2/demo")
print("Task Status: "+task.Status)
print("Task Solved: "+str(task.Solved))
print("Task Error: "+task.Error)
print("Task ErrorId: "+str(task.ErrorId))
print("Task Solution: "+task.Solution)