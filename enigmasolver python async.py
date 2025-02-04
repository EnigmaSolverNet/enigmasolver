import aiohttp
import asyncio
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
        self.session = aiohttp.ClientSession(headers={"content-type": "application/json"})

    async def close(self):
        await self.session.close()

    async def GetBalance(self):
        return await self._do_request("POST", "/getBalance", post_data={"clientKey": self.api_key})

    async def ReCaptchaV2(self, website_url: str, website_key: str, recaptcha_data_s_value: str = "",
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
        return await self._process_task(post_data=post_data)

    async def ReCaptchaV2Enterprise(self, website_url: str, website_key: str, enterprise_payload: dict = {},
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
        return await self._process_task(post_data=post_data)

    async def ReCaptchaV3(self, website_url: str, website_key: str, page_action: str = "", api_domain: str = "") -> Result:
        post_data = {
            "type": self.CaptchaType.RecaptchaV3,
            "websiteURL": website_url,
            "websiteKey": website_key,
            "pageAction": page_action,
            "apiDomain": api_domain
        }
        return await self._process_task(post_data=post_data)

    async def ReCaptchaV3Enterprise(self, website_url: str, website_key: str, page_action: str = "", api_domain: str = "") -> Result:
        post_data = {
            "type": self.CaptchaType.RecaptchaV3Enterprise,
            "websiteURL": website_url,
            "websiteKey": website_key,
            "pageAction": page_action,
            "apiDomain": api_domain
        }
        return await self._process_task(post_data=post_data)

    async def _do_request(self, method: str, path: str, post_data: dict = None) -> dict:
        url = self.base_url + path
        method = method.upper()

        async with self.session.request(method, url, json=post_data) as response:
            response.raise_for_status()
            return await response.json()

    def _process_response(self, response: dict) -> Result:
        result = self.Result()
        result.Status = response.get("status", "")
        result.Solved = result.Status == "ready"
        result.ErrorId = response.get("errorId", "")
        result.Error = response.get("errorDescription", "")
        result.Solution = response.get("solution", {}).get("gRecaptchaResponse", "")
        return result

    async def _process_task(self, post_data: dict) -> Result:
        data = {
            "clientKey": self.api_key,
            "task": post_data,
        }
        resp = await self._do_request("POST", "/createTask", post_data=data)
        
        task_id = resp.get("taskId")
        if not task_id:
            return self._process_response(resp)

        start_time = time.time()
        while True:
            if time.time() - start_time > self.timeout:
                return self._process_response({"errorId": 12, "errorDescription": "Timeout", "status": "failed"})

            await asyncio.sleep(0.5) 
            
            resp = await self._do_request("POST", "/getTaskResult", post_data={"clientKey": self.api_key, "taskId": task_id})
            status = resp.get("status")
            
            if status in ["ready", "failed"]:
                return self._process_response(resp)
