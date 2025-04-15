import requests
import time

class EnigmaSolver:
    class Proxy:
        class ProxyType:
            HTTP = "http"
            SOCKS4 = "socks4"
            SOCKS5 = "socks5"

        def __init__(self, proxy_str: str, proxy_type: ProxyType):
            self.proxy_str = proxy_str
            self.proxy_type = proxy_type
            parsed = self._format_proxy()
            self.parsed_proxy_dict = parsed

        def _format_proxy(self) -> tuple:
            proxy = self.proxy_str
            host, port, user, password = "", "", "", ""
            if proxy.count(":") == 3:
                host, port, user, password = proxy.split(":")
            elif proxy.count(":") == 1:
                host, port = proxy.split(":")
            elif proxy.count("@") == 1 and proxy.count(":") == 2:
                user, password = proxy.split("@")[0].split(":")
                host, port = proxy.split("@")[1].split(":")
            else:
                raise ValueError("Invalid proxy format")
            return {"proxyAddress": host, "proxyPort": int(port), "proxyLogin": user, "proxyPassword": password, "proxyType": self.proxy_type}
        
    class Result:
        def __init__(self):
            self.Status = ""
            self.Solved = False
            self.ErrorId = ""
            self.Error = ""
            self.Solution = ""
    
    class CaptchaType:
        RecaptchaV3 = "RecaptchaV3Task"
        RecaptchaV2Enterprise = "RecaptchaV2EnterpriseTask"
        RecaptchaV3Enterprise = "RecaptchaV3EnterpriseTask"

        RecaptchaV2Proxyless = "RecaptchaV2TaskProxyless"
        RecaptchaV3Proxyless = "RecaptchaV3TaskProxyless"
        RecaptchaV2EnterpriseProxyless = "RecaptchaV2EnterpriseTaskProxyless"
        RecaptchaV3EnterpriseProxyless = "RecaptchaV3EnterpriseTaskProxyless"
        
    def __init__(self, api_key: str, timeout: int = 60):
        self.base_url = "https://api.enigmasolver.net"
        self.api_key = api_key
        self.timeout = timeout
        self.session = requests.session()
        self.session.headers = {"content-type": "application/json"}
        
    def GetBalance(self):
        return self._do_request("POST", "/getBalance", post_data={"clientKey": self.api_key}).json()
    
    def ReCaptchaV2Proxyless(self, website_url: str, website_key: str, recaptcha_data_s_value: str = "",
                    is_invisible: bool = False, api_domain: str = "", page_action: str = "") -> Result:
        post_data = {
            "type": self.CaptchaType.RecaptchaV2Proxyless,
            "websiteURL": website_url,
            "websiteKey": website_key,
            "recaptchaDataSValue": recaptcha_data_s_value,
            "isInvisible": is_invisible,
            "apiDomain": api_domain,
            "pageAction": page_action
        }
        return self._process_task(post_data=post_data)
    
    def ReCaptchaV2EnterpriseProxyless(self, website_url: str, website_key: str, enterprise_payload: dict = {},
                              is_invisible: bool = False, api_domain: str = "", page_action: str = "") -> Result:
        post_data = {
            "type": self.CaptchaType.RecaptchaV2EnterpriseProxyless,
            "websiteURL": website_url,
            "websiteKey": website_key,
            "enterprisePayload": enterprise_payload,
            "isInvisible": is_invisible,
            "apiDomain": api_domain,
            "pageAction": page_action

        }
        return self._process_task(post_data=post_data)
    
    def ReCaptchaV3Proxyless(self, website_url: str, website_key: str, page_action: str = "", api_domain: str = "") -> Result:
        post_data = {
            "type": self.CaptchaType.RecaptchaV3Proxyless,
            "websiteURL": website_url,
            "websiteKey": website_key,
            "pageAction": page_action,
            "apiDomain": api_domain
        }
        return self._process_task(post_data=post_data)
    
    def ReCaptchaV3EnterpriseProxyless(self, website_url: str, website_key: str, page_action: str = "", api_domain: str = "") -> Result:
        post_data = {
            "type": self.CaptchaType.RecaptchaV3EnterpriseProxyless,
            "websiteURL": website_url,
            "websiteKey": website_key,
            "pageAction": page_action,
            "apiDomain": api_domain
        }
        return self._process_task(post_data=post_data)
    
    def ReCaptchaV2Enterprise(self, website_url: str, website_key: str, enterprise_payload: dict = {},
                              is_invisible: bool = False, api_domain: str = "", page_action: str = "", proxy=Proxy) -> Result:
        post_data = {
            "type": self.CaptchaType.RecaptchaV2Enterprise,
            "websiteURL": website_url,
            "websiteKey": website_key,
            "enterprisePayload": enterprise_payload,
            "isInvisible": is_invisible,
            "apiDomain": api_domain,
            "pageAction": page_action
        }
        post_data.update(proxy.parsed_proxy_dict)
        return self._process_task(post_data=post_data)
    
    def ReCaptchaV3(self, website_url: str, website_key: str, page_action: str = "", api_domain: str = "", proxy=Proxy) -> Result:
        post_data = {
            "type": self.CaptchaType.RecaptchaV3,
            "websiteURL": website_url,
            "websiteKey": website_key,
            "pageAction": page_action,
            "apiDomain": api_domain
        }
        post_data.update(proxy.parsed_proxy_dict)
        return self._process_task(post_data=post_data)
    
    def ReCaptchaV3Enterprise(self, website_url: str, website_key: str, page_action: str = "", api_domain: str = "", proxy=Proxy) -> Result:
        post_data = {
            "type": self.CaptchaType.RecaptchaV3Enterprise,
            "websiteURL": website_url,
            "websiteKey": website_key,
            "pageAction": page_action,
            "apiDomain": api_domain
        }
        post_data.update(proxy.parsed_proxy_dict)
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
    
    
# USAGE EXAMPLE
if __name__ == "__main__":  
    apikey = "your_key"
    enigmaSolver = EnigmaSolver(api_key=apikey, timeout=60)
    print(enigmaSolver.GetBalance()) # GetBalance

    # PROXY TASK
    proxy = enigmaSolver.Proxy("username:password@proxy_ip:port", enigmaSolver.Proxy.ProxyType.HTTP)
    #proxy = enigmaSolver.Proxy("proxy_ip:port", enigmaSolver.Proxy.ProxyType.SOCKS4)
    #proxy = enigmaSolver.Proxy("proxy_ip:port:username:password", enigmaSolver.Proxy.ProxyType.SOCKS5)
    task = enigmaSolver.ReCaptchaV3(
        website_key="6Le-wvkSAAAAAPBMRTvw0Q4M1uexq9bi0DJwx_mJ-", 
        website_url="https://www.example.com/", 
        proxy=proxy
        )
    print("Task Status: "+task.Status)
    print("Task Solved: "+str(task.Solved))
    print("Task Error: "+task.Error)
    print("Task ErrorId: "+str(task.ErrorId))
    print("Task Solution: "+task.Solution)

    # PROXYLESS TASK
    task = enigmaSolver.ReCaptchaV2Proxyless(
        website_key="6Le-wvkSAAAAAPBMRTvw0Q4M1uexq9bi0DJwx_mJ-", 
        website_url="https://www.example.com/",
        )
    print("Task Status: "+task.Status)
    print("Task Solved: "+str(task.Solved))
    print("Task Error: "+task.Error)
    print("Task ErrorId: "+str(task.ErrorId))
    print("Task Solution: "+task.Solution)